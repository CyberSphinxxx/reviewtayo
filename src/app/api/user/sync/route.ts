import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { testAttempts, userAnswers, bookmarks, choices } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { resolveExamLevelIdForAttempt } from "@/lib/exam-context";
import {
  MAX_SYNC_BODY_BYTES,
  type SyncAttemptAnswer,
  type SyncPayloadV2,
} from "@/lib/storage/sync-payload";

/** Single bulk-insert chunk size (keeps statements well under parameter limits). */
const INSERT_CHUNK = 100;
/** Maximum accepted request body size — mirrors the 2 MB client backup guard. */
const MAX_BODY_BYTES = MAX_SYNC_BODY_BYTES;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function POST(request: Request) {
  try {
    let reqHeaders: Headers;
    try {
      reqHeaders = request?.headers || (await headers());
    } catch {
      reqHeaders = request?.headers || new Headers();
    }

    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required to sync data to cloud account." },
        { status: 401 }
      );
    }

    const contentLength = Number(reqHeaders.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Sync payload too large. Export fewer attempts or contact support." },
        { status: 413 }
      );
    }

    const userId = session.user.id;
    let payload: SyncPayloadV2;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const warnings: string[] = [];
    let syncedAttempts = 0;
    let skippedDuplicateAttempts = 0;
    let failedAttempts = 0;
    let syncedBookmarks = 0;
    let skippedDuplicateBookmarks = 0;
    let failedBookmarks = 0;

    // 1. Sync bookmarks — batched; only rows actually inserted count as synced.
    // (The mistake bank has no server table this phase — it is reported as
    // skipped below, never as synced.)
    const bookmarkInputs = (payload.bookmarks ?? [])
      .map((bm) => ({ bm, qId: bm.id }))
      .filter((entry): entry is { bm: { id: string; bookmarkedAt?: string }; qId: string } =>
        Boolean(entry.qId)
      );

    for (const group of chunk(bookmarkInputs, INSERT_CHUNK)) {
      try {
        const inserted = await db
          .insert(bookmarks)
          .values(
            group.map(({ bm, qId }) => ({
              id: `bm_${userId}_${qId}`,
              userId,
              questionId: qId,
              createdAt: bm.bookmarkedAt ? new Date(bm.bookmarkedAt) : new Date(),
            }))
          )
          .onConflictDoNothing()
          .returning({ id: bookmarks.id });
        syncedBookmarks += inserted.length;
        skippedDuplicateBookmarks += group.length - inserted.length;
      } catch (err) {
        // FK violations (question no longer exists) or transient DB errors:
        // report honestly instead of counting failures as synced.
        failedBookmarks += group.length;
        warnings.push(
          `${group.length} bookmark(s) could not be synced. Your local data is safe.`
        );
        console.warn("[sync] bookmark batch failed:", err);
      }
    }

    // 2. Sync attempts — one transaction per attempt so the attempt row and
    // its answers commit atomically (no half-migrated attempts).
    const attemptsMap = payload.attempts || {};
    const historyList = payload.history || [];
    const processedIds = new Set<string>();

    // Correctness is resolved server-side from the choices table — the client
    // no longer ships question/choice content (privacy + payload size), and
    // client-claimed correctness is never trusted.
    const answerRows: SyncAttemptAnswer[] = historyList.flatMap(
      (h) => attemptsMap[h.id]?.answers ?? []
    );
    const questionIds = Array.from(
      new Set(answerRows.map((a) => a.questionId).filter(Boolean))
    );
    const correctChoiceIds = new Set<string>();
    const choiceByQuestion = new Map<string, string>();
    if (questionIds.length > 0) {
      try {
        const rows = await db
          .select({
            id: choices.id,
            questionId: choices.questionId,
            isCorrect: choices.isCorrect,
          })
          .from(choices)
          .where(inArray(choices.questionId, questionIds));
        for (const row of rows) {
          choiceByQuestion.set(row.questionId, row.id);
          if (row.isCorrect) correctChoiceIds.add(row.id);
        }
      } catch (err) {
        warnings.push(
          "Answer correctness could not be resolved from the question bank; answers were synced without it."
        );
        console.warn("[sync] choice lookup failed:", err);
      }
    }

    for (const h of historyList) {
      if (!h || !h.id || processedIds.has(h.id)) continue;
      processedIds.add(h.id);

      const detail = attemptsMap[h.id];
      const attemptId = `att_${userId}_${h.id}`;
      // Explicit exam identity only (guide §25): the attempt's stored
      // examLevelId wins; otherwise resolve from the subject ids themselves.
      // Legacy records carry DB-level ids ("cse-professional"); new records
      // carry track ids ("professional").
      const subjectIds = detail?.subjectIds;
      let effectiveExamLevelId = resolveExamLevelIdForAttempt(subjectIds, h.examLevelId);

      if (!effectiveExamLevelId) {
        // LEGACY COMPATIBILITY SHIM — remove in Phase 1 once all clients send
        // examLevelId. Attempts recorded before exam identity existed are all
        // CSE (the only exam at the time); their data is genuinely CSE even
        // though the record carries no ids. Records that mention another exam
        // without carrying explicit identity are skipped: we never guess for
        // anything created in the multi-exam era.
        const isLegacyCsePayload = !h.title?.toLowerCase().includes("let");
        if (!isLegacyCsePayload) {
          console.warn(`[sync] Skipping attempt ${h.id}: no exam identity available.`);
          continue;
        }
        effectiveExamLevelId = "cse-professional";
      }

      let duplicateAttempt = false;
      try {
        await db.transaction(async (tx) => {
          const insertedAttempt = await tx
            .insert(testAttempts)
            .values({
              id: attemptId,
              userId: userId,
              examLevelId: effectiveExamLevelId,
              mode: h.mode || "practice",
              totalQuestions: h.totalQuestions || 1,
              score: h.rawScore || 0,
              percentage: String(h.percentage ?? "0.00"),
              passed: Boolean(h.passed),
              timeSpentSeconds: 0,
              status: "completed",
              startedAt: new Date(h.date),
              completedAt: new Date(h.date),
            })
            .onConflictDoNothing()
            .returning({ id: testAttempts.id });

          // Already synced previously: nothing to do, not a failure.
          if (insertedAttempt.length === 0) {
            duplicateAttempt = true;
            return;
          }

          const answers = detail?.answers ?? [];
          if (answers.length === 0) return;

          const answerValues = answers
            .filter((ans) => ans && ans.questionId)
            .map((ans, i) => ({
              id: `ans_${attemptId}_${i}`,
              testAttemptId: attemptId,
              questionId: ans.questionId,
              selectedChoiceId: ans.selectedChoiceId || null,
              isCorrect: ans.selectedChoiceId
                ? correctChoiceIds.has(ans.selectedChoiceId)
                : false,
              isFlagged: false,
              timeSpentSeconds: ans.timeSpentSeconds || 0,
            }));

          for (const group of chunk(answerValues, INSERT_CHUNK)) {
            await tx
              .insert(userAnswers)
              .values(group)
              .onConflictDoNothing();
          }
        });
        if (duplicateAttempt) {
          skippedDuplicateAttempts++;
        } else {
          syncedAttempts++;
        }
      } catch (err) {
        failedAttempts++;
        warnings.push(
          `1 attempt could not be synced. Your local data is safe — retry from Settings.`
        );
        console.warn(`[sync] attempt ${h.id} failed:`, err);
      }
    }

    const mistakeBankSize = payload.mistakeBankCount ?? 0;
    if (mistakeBankSize > 0) {
      // Honest note: the SRS mistake bank has no server table this phase, so
      // it is NOT synced — never claim it was.
      warnings.push(
        `${mistakeBankSize} mistake-bank item(s) stay on this device (cloud sync of the mistake bank is not available yet).`
      );
    }

    const success = failedAttempts === 0 && failedBookmarks === 0;
    const totalAttemptCount = historyList.length;

    return NextResponse.json({
      success,
      message: success
        ? totalAttemptCount === 0 && bookmarkInputs.length === 0
          ? "Nothing to sync — your account is already up to date."
          : "Study data successfully synchronized with cloud account."
        : `Partially synced: ${syncedAttempts} of ${totalAttemptCount} attempts and ${syncedBookmarks} of ${bookmarkInputs.length} bookmarks. Failed items were NOT synced — your local data is safe. Please retry.`,
      synced: {
        attempts: syncedAttempts,
        bookmarks: syncedBookmarks,
        mistakes: 0,
      },
      skipped: {
        attempts: skippedDuplicateAttempts,
        bookmarks: skippedDuplicateBookmarks,
        mistakes: mistakeBankSize,
      },
      failed: {
        attempts: failedAttempts,
        bookmarks: failedBookmarks,
      },
      warnings,
    });
  } catch (error) {
    console.error("[SyncAPI] Synchronization error:", error);
    return NextResponse.json(
      {
        error: "Internal server error during synchronization.",
      },
      { status: 500 }
    );
  }
}
