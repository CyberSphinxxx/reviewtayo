import { SEED_LEVELS, SEED_SUBJECTS } from "@/db/seed-data";

/**
 * Explicit exam-identity resolution (Phase 0 — exam identity normalization).
 *
 * Rule: domain identity must never be derived from display strings. These
 * helpers consume only explicit identifiers — the question's `subjectId`
 * (a stable DB id), the seed level's `trackId`, or a caller-supplied
 * `examLevelId` — and return `undefined`/`null` when identity is unknown
 * instead of guessing a CSE default.
 */

// Module-level id maps are safe: the seed registry is static content.
const SUBJECT_ID_TO_LEVEL_ID = new Map<string, string>();
for (const level of SEED_LEVELS) {
  for (const subject of SEED_SUBJECTS) {
    if (subject.examLevelId === level.id) {
      SUBJECT_ID_TO_LEVEL_ID.set(subject.id, level.id);
    }
  }
}
const LEVEL_ID_TO_TRACK_ID = new Map<string, string>();
for (const level of SEED_LEVELS) {
  LEVEL_ID_TO_TRACK_ID.set(level.id, level.trackId);
}

/**
 * Resolves the exam level for an attempt from explicit identity only.
 *
 * Precedence: a caller-supplied `examLevelId` (preferred — call sites should
 * pass what they already know) → the question's subject → its seed level's
 * `trackId` (e.g. "professional"). Legacy fallback: some historical records
 * only carry DB-level ids like "cse-professional", which are accepted as-is.
 * Returns undefined when identity cannot be determined — callers must handle
 * that honestly (e.g. skip the server-side FK) rather than misattribute the
 * attempt to CSE.
 */
export function resolveExamLevelIdForAttempt(
  subjectIds?: (string | undefined)[],
  examLevelId?: string
): string | undefined {
  if (examLevelId) return examLevelId;
  for (const subjectId of subjectIds ?? []) {
    if (!subjectId) continue;
    const levelId = SUBJECT_ID_TO_LEVEL_ID.get(subjectId);
    const trackId = levelId ? LEVEL_ID_TO_TRACK_ID.get(levelId) : undefined;
    if (trackId) return trackId;
  }
  return undefined;
}

/**
 * The workspace an attempt/draft/bookmark belongs to. Callers should pass the
 * workspace id they already hold (the active workspace at session start);
 * when they legitimately have none (pre-onboarding sessions), this returns
 * null — no CSE workspace is fabricated for them.
 */
export function getWorkspaceIdForAttempt(workspaceId?: string): string | null {
  return workspaceId ?? null;
}
