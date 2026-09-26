# CSEReviewerPH / ReviewTayo — Current Handoff

Full prior status is archived in `ARCHIVES/progress-history.md`.

**Current status: PROJECT AUDIT — 6 CONFIRMED FINDINGS FIXED (VERIFY EXIT 0 — 84 FILES / 586 TESTS; E2E 81 PASSED / 2 SKIPPED)**

## Audit round (latest)

Full project audit (bugs, inefficiencies, scalability) — plan, findings, and non-findings in `implementation_plan.md` ("Project audit" section). Six confirmed findings, all fixed, all pinned by tests, all verified against the production build.

**Fixed (each pinned by a behavior test)**

- **P0-1 sync fabricated success** — `POST /api/user/sync` rewrote `src/app/api/user/sync/route.ts`: real success counting via `.returning({id})`; failed inserts now yield `success:false` + per-item `warnings` (message `/NOT synced/i`), conflicts are `skipped`; each attempt + its answers insert atomically in `db.transaction`; inserts batched (100/row); correctness resolved server-side from the `choices` table via one `inArray` query (client-claimed correctness never trusted); `mistakeBank` reported `skipped` + warning (honest — no server table exists); 413 for bodies > 5 MB (`MAX_SYNC_BODY_BYTES`). Tests: `tests/unit/api/user-sync.test.ts` (12).
- **P0-2 non-transactional account deletion** — `DELETE /api/user/account` now wraps all 6 deletes in `db.transaction` (partial-deletion state impossible; a mid-delete failure rolls back and returns an honest 500). `GET` export collects `warnings` when a table read fails instead of silently omitting data (P2-5). Tests: `tests/unit/api/user-account.test.ts` (6).
- **P1-3 fat sync payload** — new slim contract `src/lib/storage/sync-payload.ts` (`SyncPayloadV2`) + `LocalStorageService.buildSyncPayload()`: summaries + answer selections + bookmark ids only; question text, choices, and explanations never leave the device. `syncGuestDataToCloud()` sends it; the route consumes it. Payload-shape test pins the contract.
- **P1-4 attempt-id truncation collision** — sync no longer truncates attempt ids to 64 chars; deterministic full ids (long-prefix distinct ids pinned by test).
- **P1-6 statically baked exams (confirmed in browser)** — `generateStaticParams` prerendered one fixed question order for every visitor on the 4 exam/practice session pages. Added `export const dynamic = "force-dynamic"` to `src/app/(app)/exams/[level]/{quick,medium,full}/page.tsx` and `src/app/(app)/practice/[topicId]/page.tsx`. Build output: zero prerendered exam/practice session HTML; selector tests add 5-draw variation + no-duplicate-ids.
- **P2-5** covered above (export warnings); **non-findings** documented: schema indexes adequate, exam-engine purity intact, double-submit already guarded (`isSubmittingRef`), timer drift already handled by wall-clock deltas (`tests/unit/exam-engine/timer-drift.test.ts`).

**Browser evidence (production build, port 3457)**: `/exams/professional/quick` Question 1 differs across two independent browser sessions (number-sequence vs Constitution item); `/practice/top-pro-vocab` Question 1 varies across reloads of the same URL ("masinop" vs "meticulous" item) — per-request selection confirmed on both surfaces.

**Verification (actual results)**

- `npm run verify`: **exit 0** — typecheck clean, ESLint clean, architecture guard PASS, Vitest **84 files / 586 tests** (was 573), production build clean (87 routes; `/exams/[level]/*` now `ƒ` Dynamic).
- `PORT=3457 npm run test:e2e`: **81 passed / 2 skipped (pre-existing) / 0 failed** against the production build.
- Note: the build summary still labels `/practice/[topicId]` `●` SSG, but the prerender manifest contains no topic routes and no topic HTML is emitted — nothing is baked (cosmetic label; `force-dynamic` + `generateStaticParams` interplay).

## Onboarding round

Implemented the 8-step onboarding flow per `docs/onboarding-handoff/ONBOARDING_PLAN.md` (localStorage-first state `rt_onboarding_v1`, guest/account identity, config-driven exam step, skippable optional steps, review + edit links, personalize, atomic finish into workspace + first activity), then ran an **independent review pass** — code audit + real-browser journeys — which found and fixed five gaps. All fixes re-verified in the browser against the production build.

**Fixed during the review round (each pinned by a behavior test)**

- **Consent gate on the flow itself**: onboarding now shows its own privacy gate before collecting any answers (`Before we start` → Accept all / Essential only / Decline & leave) writing the same `csereviewer_cookie_consent` record the global banner uses; nothing is recorded (status stays `not_started`) until a choice is made, and every advance control re-checks consent. The global banner no longer renders on `/onboarding` (previously its fixed overlay swallowed clicks on "Skip for now"), and it now honors external `cookie-consent-updated` events from any surface. Tests: `tests/unit/components/reviewtayo-home.test.tsx`.
- **Returning-guest hero CTA**: `HeroSection` signed-out branch now treats a visitor with saved onboarding state (not just attempt history/workspaces) as returning → "Continue studying →" (`/dashboard`) + "Update my study plan" (`/onboarding?edit=1`); brand-new visitors keep "Get started" + "Sign in". Previously a completed guest saw "Get started" again.
- **Edit mode is real**: completed users can re-enter via `?edit=1` (hero secondary CTA, dashboard `SetupPlanCard`), land on the review step, change answers (service no longer freezes completed state), and re-finish; re-finishing updates the same single workspace (explicit choices win; skipped answers keep existing workspace values via createWorkspace merge) and `completedAt` is preserved (first completion wins, not overwritten). Dismissed users stay locked out. Tests in `tests/unit/onboarding/onboarding-service.test.ts`.
- **RA 10173 deletion coverage**: `clearAllGuestData` now sweeps `rt_onboarding*` (the new onboarding answers were previously missed), and account deletion (`UserNav` → `DELETE /api/user/account`) clears device-local data before sign-out. Test in `tests/unit/storage/notes-service.test.ts`.
- **Missing step-transition animation**: `animate-onboarding-step` was referenced but had no CSS; added a 200 ms slide/fade keyframe in `globals.css` (auto-collapsed by the global reduced-motion rules — verified live: computed duration 1e-05s under reduce).

**Browser evidence (production build, port 3457)**: fresh guest desktop+mobile (390×844) end-to-end; refresh resumes saved step with answers; in-app Back and browser Back/Forward keep state; failed sign-in shows `role="alert"` and escapes to the previous step; homepage modal cancel restores focus and records nothing; direct `/dashboard` entry as a fresh user renders a functional empty state (no broken forced flow); legacy user sees dismissible `SetupPlanCard`, dismissal persists (`dismissed`) across reload; keyboard-only step advance (Tab/Space/Enter, focus moves to each step heading); live region announces "Step N of 8"; radiogroup/`aria-pressed` semantics present; text-size preview applies live (16→20px) and persists; skipped optional steps keep truthful progress and defaults.

**Verification (actual results)**

- `npm run verify`: **exit 0** — typecheck clean, ESLint clean, architecture guard PASS, Vitest **84 files / 573 tests**, production build clean (93 routes).
- `PORT=3457 npm run test:e2e`: **81 passed / 2 skipped (pre-existing) / 0 failed** against the production build.
- Known non-blocking noise: recurring `net::ERR_CONTENT_DECODING_FAILED` console entries from the PWA service worker (pre-existing, unrelated to onboarding; pages function). Windows dev quirk: rebuilding while `next start` runs corrupts `.next` — always stop the server before `npm run build`.

## Prior rounds

- External-audit fixes (A01/A03/A07/A08, partial A02/A14), auth modal rebuild, dashboard v2 shell, exam-hall/coach theming, hero + /cse redesign — see `ARCHIVES/progress-history.md` and the lower sections of `walkthrough.md`.

## Blocked

- Real signed-in migration journey against a live database (needs a dev DB with Better Auth credentials on this machine); sync migration is covered by unit tests + mocked-session e2e.

## Needs Human

- Dev DB credentials for the live signed-in migration journey; real SMTP credentials for A13 reset-email delivery.

## Next

- From the external audit (unchanged): A02 full deadline recovery, A04 sync idempotency (sync is now honest but client retry dedupe is still open), A05 publication lifecycle, A13 real reset-email delivery (needs credentials), dependency upgrades (drizzle-orm, next major versions).
- Optional: signed-in first-login journey against a real dev database (auth currently only testable via mocked-session e2e specs on this machine).
- Optional: e2e spec for the onboarding consent gate (unit-tested; browser-verified manually).
- From the external audit (unchanged): A02 full deadline recovery, A04 sync idempotency, A05 publication lifecycle, A13 real reset-email delivery (needs credentials), dependency upgrades (drizzle-orm, next major versions).
