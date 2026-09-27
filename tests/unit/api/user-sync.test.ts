import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/user/sync/route";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { LocalStorageService } from "@/lib/storage/local-storage-service";
import type { SyncPayloadV2 } from "@/lib/storage/sync-payload";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/db", () => {
  // Separate chains for the top-level db (bookmarks, choices select) and the
  // transaction handle (attempt + answers) so assertions can't bleed across.
  const dbInsertChain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "x" }]),
  };
  const txInsertChain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "x" }]),
  };
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  const tx = { insert: vi.fn().mockReturnValue(txInsertChain) };
  return {
    db: {
      insert: vi.fn().mockReturnValue(dbInsertChain),
      select: vi.fn().mockReturnValue(selectChain),
      transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<void>) => fn(tx)),
      __dbInsertChain: dbInsertChain,
      __txInsertChain: txInsertChain,
      __selectChain: selectChain,
    },
  };
});

const dbMock = db as unknown as {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  __dbInsertChain: {
    values: ReturnType<typeof vi.fn>;
    onConflictDoNothing: ReturnType<typeof vi.fn>;
    returning: ReturnType<typeof vi.fn>;
  };
  __txInsertChain: {
    values: ReturnType<typeof vi.fn>;
    onConflictDoNothing: ReturnType<typeof vi.fn>;
    returning: ReturnType<typeof vi.fn>;
  };
  __selectChain: { where: ReturnType<typeof vi.fn> };
};

type SessionData = Awaited<ReturnType<typeof auth.api.getSession>>;

function authedSession() {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: "u-123", email: "juan@example.ph", name: "Juan" },
    session: { id: "s-123", userId: "u-123" },
  } as unknown as SessionData);
}

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/user/sync", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const baseHistory = {
  id: "att-1",
  title: "CSE Professional Quick Test",
  examLevelId: "professional",
  mode: "quick",
  rawScore: 8,
  percentage: 80,
  totalQuestions: 10,
  passed: true,
  date: "2026-09-10T12:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Restore chain behavior (clearAllMocks wipes queued Once results but keeps
  // mockReturnValue/mockImplementation wiring from the factory).
  dbMock.__dbInsertChain.values.mockReturnThis();
  dbMock.__dbInsertChain.onConflictDoNothing.mockReturnThis();
  dbMock.__dbInsertChain.returning.mockResolvedValue([{ id: "x" }]);
  dbMock.__txInsertChain.values.mockReturnThis();
  dbMock.__txInsertChain.onConflictDoNothing.mockReturnThis();
  dbMock.__txInsertChain.returning.mockResolvedValue([{ id: "x" }]);
  dbMock.__selectChain.where.mockResolvedValue([]);
});

describe("User Sync API Endpoint (/api/user/sync) — honest migration", () => {
  it("returns 401 when no authenticated session is present", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as unknown as SessionData);

    const res = await POST(makeRequest({ history: [] }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Authentication required/);
  });

  it("returns 400 when payload is invalid JSON", async () => {
    authedSession();

    const req = new NextRequest("http://localhost:3000/api/user/sync", {
      method: "POST",
      body: "not-a-json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid JSON/);
  });

  it("counts a genuinely inserted attempt and bookmark as synced", async () => {
    authedSession();

    const res = await POST(
      makeRequest({
        history: [baseHistory],
        attempts: {
          "att-1": { examLevelId: "professional", answers: [] },
        },
        bookmarks: [{ id: "q-prof-1", bookmarkedAt: "2026-09-10T12:00:00Z" }],
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.synced.attempts).toBe(1);
    expect(data.synced.bookmarks).toBe(1);
    expect(data.failed.attempts).toBe(0);
    expect(data.failed.bookmarks).toBe(0);
    expect(data.warnings).toHaveLength(0);
  });

  it("reports a failed insert as failed, not synced (no fabricated success)", async () => {
    authedSession();
    dbMock.__txInsertChain.onConflictDoNothing.mockRejectedValueOnce(new Error("FK violation"));

    const res = await POST(makeRequest({ history: [baseHistory] }));
    expect(res.status).toBe(200); // request itself handled; content reports the failure

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.synced.attempts).toBe(0);
    expect(data.failed.attempts).toBe(1);
    expect(data.warnings.length).toBeGreaterThan(0);
    expect(data.message).toMatch(/NOT synced/i);
  });

  it("reports failed bookmark batches as failed instead of counting them as synced", async () => {
    authedSession();
    dbMock.__dbInsertChain.onConflictDoNothing.mockRejectedValueOnce(new Error("FK violation"));

    const res = await POST(
      makeRequest({ bookmarks: [{ id: "q-1" }, { id: "q-2" }] })
    );

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.synced.bookmarks).toBe(0);
    expect(data.failed.bookmarks).toBe(2);
    expect(data.warnings.length).toBeGreaterThan(0);
  });

  it("counts conflicts as skipped, not synced and not failed", async () => {
    authedSession();
    // Bookmark batch runs first, then the attempt transaction.
    dbMock.__dbInsertChain.returning.mockResolvedValueOnce([]);
    dbMock.__txInsertChain.returning.mockResolvedValueOnce([]);

    const res = await POST(
      makeRequest({
        history: [baseHistory],
        bookmarks: [{ id: "q-dup" }],
      })
    );

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.synced.attempts).toBe(0);
    expect(data.skipped.attempts).toBe(1);
    expect(data.synced.bookmarks).toBe(0);
    expect(data.skipped.bookmarks).toBe(1);
  });

  it("never claims the mistake bank was synced (no server table this phase)", async () => {
    authedSession();

    const res = await POST(makeRequest({ history: [], mistakeBankCount: 5 }));

    const data = await res.json();
    expect(data.synced.mistakes).toBe(0);
    expect(data.skipped.mistakes).toBe(5);
    expect(data.warnings.some((w: string) => /mistake/.test(w))).toBe(true);
  });

  it("rejects oversized payloads with 413", async () => {
    authedSession();

    const res = await POST(
      makeRequest({ history: [] }, { "content-length": String(6 * 1024 * 1024) })
    );
    expect(res.status).toBe(413);
  });

  it("syncs attempt answers inside the same transaction as the attempt row", async () => {
    authedSession();
    dbMock.__selectChain.where.mockResolvedValue([
      { id: "c1", questionId: "q-1", isCorrect: true },
      { id: "c2", questionId: "q-1", isCorrect: false },
      { id: "c3", questionId: "q-2", isCorrect: true },
    ]);

    const res = await POST(
      makeRequest({
        history: [baseHistory],
        attempts: {
          "att-1": {
            examLevelId: "professional",
            answers: [
              { questionId: "q-1", selectedChoiceId: "c1", timeSpentSeconds: 12 },
              { questionId: "q-1", selectedChoiceId: "c2", timeSpentSeconds: 5 },
              { questionId: "q-2", selectedChoiceId: "c3", timeSpentSeconds: 8 },
            ],
          },
        },
      })
    );

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(dbMock.transaction).toHaveBeenCalled();

    const attemptValues = dbMock.__txInsertChain.values.mock.calls[0][0];
    expect(attemptValues.id).toBe("att_u-123_att-1");
    expect(attemptValues.examLevelId).toBe("professional");

    const answerValues = dbMock.__txInsertChain.values.mock.calls[1][0];
    expect(answerValues).toHaveLength(3);
    expect(answerValues[0].isCorrect).toBe(true); // resolved server-side
    expect(answerValues[1].isCorrect).toBe(false); // c2 is not the correct choice
    expect(answerValues[2].isCorrect).toBe(true);
  });

  it("keeps the legacy CSE shim and skips unidentifiable non-CSE records", async () => {
    authedSession();

    await POST(
      makeRequest({
        history: [
          { ...baseHistory, id: "legacy-1", examLevelId: undefined, title: "Quick Test" },
          { ...baseHistory, id: "let-1", examLevelId: undefined, title: "LET Mock Exam" },
        ],
      })
    );

    const firstCall = dbMock.__txInsertChain.values.mock.calls[0][0];
    expect(firstCall.examLevelId).toBe("cse-professional");
    // Only the legacy-CSE record reached the insert; the LET record was skipped.
    expect(dbMock.__txInsertChain.values.mock.calls).toHaveLength(1);
  });

  it("produces distinct deterministic ids for attempts whose legacy ids share a long prefix", async () => {
    authedSession();

    const longA = "a".repeat(80) + "-A";
    const longB = "a".repeat(80) + "-B";

    const res = await POST(
      makeRequest({
        history: [
          { ...baseHistory, id: longA },
          { ...baseHistory, id: longB },
        ],
      })
    );

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.synced.attempts).toBe(2);

    const ids = dbMock.__txInsertChain.values.mock.calls.map((c) => c[0].id);
    expect(new Set(ids).size).toBe(2); // no truncation collision
  });
});

describe("LocalStorageService.buildSyncPayload — slim migration payload", () => {
  beforeEach(() => {
    window.localStorage.clear();
    LocalStorageService.resetMigrationForTesting();
  });

  it("sends answers and bookmark ids but never question/choice content", () => {
    const seedQuestion = {
      id: "q-1",
      topicId: "t-1",
      topicName: "T",
      topicSlug: "t",
      subjectId: "s-1",
      subjectName: "S",
      subjectSlug: "s",
      questionText: "Long question text that must not leave the device",
      explanation: "Long explanation that must not leave the device",
      difficulty: "easy" as const,
      language: "en" as const,
      choices: [
        { id: "c-1", choiceLabel: "A", text: "Option", isCorrect: true, order: 1 },
        { id: "c-2", choiceLabel: "B", text: "Other", isCorrect: false, order: 2 },
      ],
    };

    // Seed the local attempt store directly (summary + details) the way a
    // completed session would have written it.
    window.localStorage.setItem(
      "cse_guest_attempts_history",
      JSON.stringify([
        {
          id: "seed-1",
          title: "Quick Test",
          examLevelId: "professional",
          mode: "quick",
          percentage: 50,
          rawScore: 1,
          totalQuestions: 2,
          passed: false,
          date: new Date().toISOString(),
        },
      ])
    );
    window.localStorage.setItem(
      "cse_guest_attempt_seed-1",
      JSON.stringify({
        id: "seed-1",
        title: "Quick Test",
        examLevelId: "professional",
        mode: "quick",
        answers: [
          { questionId: "q-1", selectedChoiceId: "c-1", isFlagged: false, timeSpentSeconds: 9 },
        ],
        questions: [seedQuestion],
      })
    );

    // Use the real bookmark API. runMigration (triggered inside
    // buildSyncPayload) provisions workspace_cse for the seeded legacy-style
    // history, so the no-arg call shares that bucket with the sync read.
    LocalStorageService.toggleBookmark(seedQuestion);

    const payload: SyncPayloadV2 = LocalStorageService.buildSyncPayload();

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("must not leave the device");
    expect(serialized).not.toContain('"choiceLabel"');
    expect(serialized).not.toContain('"isCorrect"');

    expect(payload.history.length).toBe(1);
    const detail = Object.values(payload.attempts)[0];
    expect(detail.answers[0]).toEqual({
      questionId: "q-1",
      selectedChoiceId: "c-1",
      timeSpentSeconds: 9,
    });
    // The stored bookmark carries the fat question object; the payload ships
    // only its id + timestamp (same question as the seeded attempt).
    expect(payload.bookmarks.some((b) => b.id === "q-1")).toBe(true);
    expect(payload.bookmarks.every((b) => !("question" in b))).toBe(true);
    expect(payload.mistakeBankCount).toBe(0);
  });
});
