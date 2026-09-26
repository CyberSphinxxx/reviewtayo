# Implementation Plan — ReviewTayo Onboarding (docs/onboarding-handoff)

> **Note:** this file previously held the onboarding implementation plan (stages complete,
> verified in `walkthrough.md`). The current task is the full project audit; the audit plan
> lives in the "Project audit" section at the bottom. Original onboarding plan preserved below.

Task: implement the guided first-session onboarding from `docs/onboarding-handoff/ONBOARDING_PLAN.md`,
staged per `docs/onboarding-handoff/IMPLEMENTATION_LOOP.md`, per `AGENTS.md` process.

## Interpretation (restated)

"Get started" on the homepage opens a focused, animated, accessible `/onboarding` flow that:
offers account-vs-guest honestly, collects only the data needed for a useful study setup
(exam, level, starting point, weekly rhythm, daily goal, appearance, optional referral),
previews the resulting plan, saves atomically, and routes to a real first activity.
Returning/established users resume the app instead of replaying onboarding. Guest→account
migration reuses the existing sync mechanism without losing or duplicating progress.

## Audit findings (Stage 0 — what the code actually does today)

### Entry routes and current CTAs
- Homepage `/` → `src/components/home/ReviewTayoHomeView.tsx` → `HeroSection.tsx`.
- Standalone auth pages: `/sign-in`, `/create-account`, `/forgot-password`, `/reset-password`
  via `AuthStandaloneLayout`/`AuthStandaloneForm`. Post-auth destination routes through
  `getPostAuthDestinationFromState()` (destination.ts matrix).

### Auth, session, and existing guest-data sync
- Better Auth (email) via `src/lib/auth/auth-client.ts` (`signIn`, `signUp`, `useSession`).
- `AuthModal` implements the post-auth guest-data migration screen: counts local
  history + bookmarks, "Sync to Cloud Now" calls `LocalStorageService.syncGuestDataToCloud()`
  → POST `/api/user/sync` (push-only, `onConflictDoNothing`).

### Data model (reconciled against handoff assumptions)
- **Decision (handoff deviation, flagged):** onboarding state and answers live in a
  **versioned localStorage namespace (`rt_onboarding_v1`)**, not in a new DB table/column.
  Rationale: localStorage-first platform; adding server-side personal-data fields would
  extend the RA 10173 privacy-notice scope for no functional gain this phase.

### Legacy-user rule (confirmed against code)
- `established = hasAttemptHistory || hasWorkspaces` — established users never routed into
  onboarding; dashboard shows the dismissible "Set up your study plan" card.

### Design system to reuse
- Tokens: maroon `#8a1630`, gold `#f6b93b`, blush `#fbeff0`, ink `#1b1216`, `font-display`,
  focus style `focus-visible:outline-2 outline-[#86152d] dark:outline-[#ffd27a]`.
- Mascot: `ReviewTayoOwl`. Motion: CSS transitions/keyframes + reduced-motion guards; no new
  dependency.

## Stage plan (per IMPLEMENTATION_LOOP.md)
0. Plan + route/state map. ✔
1–4. Data contract, UI, steps, integrations — complete (see `walkthrough.md`).
5. Verification — complete: verify exit 0, e2e 81/2, browser evidence.

## Verification Plan (onboarding)
- Unit/integration suites in `tests/unit/onboarding/*` + `tests/unit/components/reviewtayo-home.test.tsx`.
- E2E `tests/e2e/onboarding.spec.ts`.
- Gates: `npm run verify` exit 0; `npm run test:e2e`; manual browser evidence.

## Explicit non-goals (per handoff)
No reminders/notifications, no paid upsell, no new analytics, no scraped/external question
content, no exam-specific engine branches, no per-section timers, no server-side preferences
migration.

---

# Project audit (current task)

## Scope

Correctness & user journeys (onboarding, exam flow, sync/migration, settings), data & privacy
(schema, transactions, idempotency, authz, deletion, consent, secrets), performance &
scalability (queries, batching, payloads, concurrency), maintainability & a11y (duplication,
engine purity, test gaps). Evidence-gated: every finding below cites code read this session.

## Confirmed findings (prioritized)

### P0-1 — `/api/user/sync` fabricates successful migration (data loss risk)
**Evidence** (`src/app/api/user/sync/route.ts`):
- Bookmark insert failure → `catch { syncedBookmarks++; }` — failed rows counted as synced.
- Attempt insert failure → `catch { syncedAttempts++; }` — same.
- `mistakes` is reported in the response (`syncedMistakes = payload.mistakeBank?.length`) but
  **never written to any table** — the SRS mistake bank silently does not migrate.
- Response is always `{success: true, message: "successfully synchronized"}` regardless of
  failures. UI copy (AuthModal, settings/data, UserNav, DataStorageSection) then tells the
  user data was migrated when it was not. This is the same fabricated-success class the
  external audit flagged (A08) — but on the migration path where users rely on it.
**Impact**: users believe guest progress is safe in the cloud; local data later cleared →
permanent loss. RA 10173 accuracy-of-processing concern.
**Fix**: count only real successes using `.returning({ id })` (detects actual inserts vs
conflict-skip); report `skipped` items honestly; per-attempt `db.transaction` so an attempt
and its answers commit atomically; batch bookmark/answer inserts (removes N-query loops —
scalability); stop reporting mistakes as synced (`skipped.mistakes` + server log — mistake
bank has no server table by design this phase); return `success: failedCount === 0` with a
honest message so existing UI failure copy shows. Add payload size guard (5 MB).
**Verify**: rewritten `tests/unit/api/user-sync.test.ts` — success counting, failure →
`success:false`, transactionality asserted, batch shapes, 401/400 unchanged, mistakes
reported as skipped.

### P0-2 — Account deletion is non-transactional (partial erasure)
**Evidence** (`src/app/api/user/account/route.ts` DELETE): five sequential deletes
(bookmarks → progress → attempts → sessions → accounts → users) with no transaction; a
mid-sequence failure returns 500 leaving the account half-deleted (e.g. progress gone,
attempts remain) — violating both data-integrity and the RA 10173 erasure contract.
**Fix**: wrap the erasure in `db.transaction`; any failure rolls back everything (the
existing 500 message "Account data was not deleted" becomes true).
**Verify**: unit tests — transaction used; partial-failure path rolls back (mock throws).

### P1-3 — Sync payload ships full question/choice content
**Evidence**: `exportAllGuestData()` sends each attempt's `questions[]` with all choices and
explanations to `/api/user/sync`; the server only uses `choices.find(isCorrect)` —
correctness is *client-claimed*. Large payloads (hundreds of KB per attempt history) on a
hot path; wrong data can be asserted by the client.
**Fix**: build the sync payload with answers only (`questionId`, `selectedChoiceId`,
`timeSpentSeconds`); server resolves `isCorrect` from the `choices` table (single `inArray`
query). `examLevelId` resolution falls back to `h.examLevelId` / legacy shim (new attempts
always carry it per `AttemptSummary`). Local storage/results rendering unchanged.
**Verify**: unit tests for payload shape + server correctness resolution.

### P1-4 — `att_…` id truncation can collide
**Evidence**: `const attemptId = `att_${userId}_${h.id}`.slice(0, 64);` — the slice can cut
mid-identifier; two distinct attempts sharing a 64-char prefix collide → second insert
conflicts and (before P0-1's fix) was counted as synced. The column is `text` — no length
limit justifies truncation.
**Fix**: drop the slice (deterministic full id). Pre-production note: any previously
truncated-and-synced rows would re-sync under their full id (dev-only data; documented).
**Verify**: unit test — two long ids produce distinct attempt ids.

### P2-5 — Account export swallows read failures silently
**Evidence**: GET `/api/user/account` catches per-table read errors and returns empty arrays
— a privacy export could omit data with no signal.
**Fix**: collect `warnings` in the response when a read fails; log remains.
**Verify**: unit test — read failure surfaces a warning field.

### P2-6 — Sync request has no payload size limit
**Fix**: reject bodies > 5 MB with 413 (mirrors the 2 MB client import guard).
**Verify**: unit test.

## Non-findings (checked, no change — with reasons)

- Schema constraints/indexes: FKs cascade correctly; `idx_test_attempts_user_id`,
  `idx_bookmarks_user_id`, `idx_user_answers_attempt_id`, etc. cover the hot queries read
  this session. No missing index evidenced.
- `resolveExamLevelIdForAttempt` legacy shim title-sniffing: documented, logged, Phase-1
  removal note present; not a live bug.
- Multi-tab onboarding: last-writer-wins per key is the documented convention; no fix.
- Exam engine purity: `check:architecture` passes; no exam branches found in engine code.
- Consent gating: onboarding gate + banner suppression shipped in the onboarding round
  (test-pinned); no new finding.

## Data/privacy implications

- P0-1/P1-3 make migration honest and reduce personal-data-in-motion (no question content
  leaves the device during sync). No new data collected; no privacy-notice change.
- P0-2 strengthens the erasure guarantee (all-or-nothing).
- No new tables/columns → **no Drizzle migration required** this round.

## Verification Plan

- Focused unit tests per fix (`tests/unit/api/user-sync.test.ts`, `tests/unit/api/user-account.test.ts`,
  `tests/unit/storage/local-storage-service.test.ts` for payload shape).
- Full gates: `npm run verify` (must exit 0); `PORT=3457 npm run test:e2e` (sync touches the
  migration/auth journeys covered by e2e).
- Browser: re-verify the journeys affected by client changes (settings/data sync button copy,
  AuthModal sync screen renders; full live migration needs a real dev DB — covered by unit
  tests + mocked-session e2e; documented honestly).
- `PROGRESS.md` updated after each unit; final factual `walkthrough.md` with actual exit
  codes and remaining risks.
