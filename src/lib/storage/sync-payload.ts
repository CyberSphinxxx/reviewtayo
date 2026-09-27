/**
 * Contract for the guest→account cloud-sync payload, shared by the client
 * exporter (`LocalStorageService.buildSyncPayload`) and the server route
 * (`/api/user/sync`).
 *
 * Deliberately SLIM: no question text, choices, or explanations ever leave
 * the device during migration (RA 10173 data-minimization + payload size).
 * The server resolves answer correctness from its own `choices` table —
 * client-claimed correctness is never trusted.
 */

import type { AttemptSummary } from "./types";

export interface SyncAttemptAnswer {
  questionId: string;
  selectedChoiceId?: string | null;
  timeSpentSeconds?: number;
}

export interface SyncAttemptDetail {
  examLevelId?: string;
  answers: SyncAttemptAnswer[];
  /** Optional legacy hint only — subject ids the attempt's questions belong to. */
  subjectIds?: string[];
}

export interface SyncPayloadV2 {
  history: AttemptSummary[];
  attempts: Record<string, SyncAttemptDetail>;
  bookmarks: { id: string; bookmarkedAt?: string }[];
  /** Reported as skipped by the server — no server table exists this phase. */
  mistakeBankCount?: number;
}

/** Maximum accepted request body size for the sync endpoint (5 MB). */
export const MAX_SYNC_BODY_BYTES = 5 * 1024 * 1024;
