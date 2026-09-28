# CSEReviewerPH / ReviewTayo — Current Handoff

Full prior status is archived in `ARCHIVES/progress-history.md`.

**Current status: QA & PRODUCT UPDATE — ALL 9 WORK ITEMS DONE (VERIFY EXIT 0 — 86 FILES / 608 TESTS; E2E 91 PASSED / 2 SKIPPED / 0 FAILED)**

## QA & product update round (latest)

The nine work items from the QA mission, each with its root cause, fix, tests, and browser evidence below. Plan and verification approach in `implementation_plan.md` ("QA & product update" section).

**Fixed (each pinned by a behavior test)**

- **WI-1 Quick Drill 404** — PracticeHubView embedded the `{level}` route template verbatim, so Quick drill launched `/exams/{level}/quick` → 404. Added `resolveRunnerLevelSlug()` + `getPracticeModeHrefForLevel()` in `src/config/practice-modes.ts` (handles "professional"/"subprofessional"/"cse-professional"/legacy "track-pro"/"track-subpro"), used by PracticeHubView resolveHref/openSetup; invalid levels render a new in-app `ExamLevelUnavailable` state (recovery links, no bare 404) wired into all three runner pages in place of `notFound()`. Tests: `tests/e2e/practice-hub-quick-drill.spec.ts` (7), `tests/unit/dashboard/practice-sheet.test.tsx`, `tests/unit/config/practice-modes.test.ts`.
- **WI-2 Practice answer gate** — study-mode runners let learners flip through with explanations gated only behind Next, so the explanation leaked before committing. ExamRunner practice flow now: "Answer" (disabled until a choice is selected, hint `#practice-answer-hint`), commit locks all choices, verdict (`role="status"`) + owl explanation appear only after commit, then "Next". Exam mode unchanged (no verdict, quiet chrome). Tests: `tests/e2e/practice-answer-gate.spec.ts`, `tests/unit/practice/ExamRunner.test.tsx` (26).
- **WI-3 Runner spacing/reflow** — ExamRunner card padding, choice list, and nav spacing tightened; CoachPanel owl stage 190→132px, tighter paddings; question heading gets a ref + focus after navigation (skips when fully visible, respects reduced-motion). Pinned by ExamRunner unit tests; fit verified live at 1280×800, 1440×900, 390×844 (no horizontal scroll).
- **WI-4 Dashboard flicker** — DashboardView greeted with a mounted-flip ("Good evening" → "Welcome back") and computed longestStreak during render. Now a stable "Welcome back", `longestStreak` measured in an effect, sectionIntro() replaces negative-margin overlap, tabular-nums on KPI numbers. Tests: `tests/unit/dashboard/` (58 across the suite).
- **WI-5 About page + branding** — `/about` rewritten (why/who/how, what's live CSE-only, planned-not-live list, multi-exam framing, non-affiliation note); "CSE Reviewer PH" → "ReviewTayo" in csc-domain disclaimers, exam-guide sections, AuthForm/AuthStandaloneForm. Pinned by content tests + updated SEO e2e pins.
- **WI-6 FAQ** — FAQ types extended with general categories (`FAQ_GENERAL_CATEGORIES`), 11 honest general entries, /faq rebuilt (general first, per-exam groups CSE-first, CSC-verified badge on exam-only categories, accessible accordion h3>button aria-expanded/aria-controls + role=region, "Other exams" placeholder without fabricated Q&A, search across both). Tests: `tests/unit/content/faq-structure.test.ts` (5).
- **WI-7 Dashboard chrome/fonts** — AppShell skeleton target-card rule fixed (gated test now passes), streak/daily-goal "—" until measured (no effect→render flicker); Google Fonts CSS @import removed from globals.css, next/font (Bricolage Grotesque 500/800, Figtree 400–800) in layout.tsx, vestigial fonts.googleapis preconnects removed — zero Google-Fonts network dependency. Tests: dashboard + gated regression tests.
- **WI-8 DatePicker** — study-period, onboarding exam-date, and custom-target-date native `<input type=date>` replaced with a new `src/components/ui/DatePicker.tsx` (grid popover, min/max clamping, full keyboard map, focus return, aria grid semantics, YYYY-MM-DD contract). Fixed two real bugs found by its tests: civil-date parsing (parseManilaDate midnight ≠ UTC day) and mixed timestamp-space month-boundary compares. Tests: `tests/unit/ui/date-picker.test.tsx` (8).
- **WI-9 Streak chip** — CoachPanel hides the streak chip at streak 0 (panel + compact), shows "Streak ×N" from the first correct answer. Pinned by ExamRunner unit tests (`coach-streak` assertions across streak states).

**Browser evidence (production build, port 3457, Chromium)**

- **WI-1**: dashboard practice → Quick drill → Exam mode → Start → `/exams/professional/quick?feedback=exam`, timer running, no `{level}` in URL.
- **WI-2**: `/practice/top-pro-grammar` — Answer disabled pre-selection with hint; commit locks choices; "Correct. Nicely done." via role=status + owl explanation + "Streak ×1 🔥"; button becomes Next. Streak chip absent at 0 (WI-9) in the same snapshot.
- **WI-3**: quick runner + topic practice fit 1280×800, 1440×900, 390×844 with no horizontal scroll (scrollWidth == clientWidth checked live).
- **WI-4/WI-7**: dashboard at 1440×900 — stable "Welcome back", measured "Longest streak 2 days", tabular-nums, daily-goal "—" placeholder, Bricolage Grotesque computed on .font-display, no fonts.googleapis resource on the page.
- **WI-5**: /about renders owl + full narrative; CSE-only honesty, planned list, non-affiliation text confirmed.
- **WI-6**: /faq — 21 accordion entries, first opens (aria-expanded true + region visible), search filters, badges + "Other exams" present.
- **WI-8**: settings/study custom target — picker opens on the value month (Mar 2027, day 14 focused+selected), ArrowRight+Enter commits Mar 15, 2027, dialog closes, Save enables.

**Verification (actual results)**

- `npm run verify`: **exit 0** — typecheck clean, ESLint clean, architecture guard PASS, Vitest **86 files / 608 tests**, production build clean.
- `PORT=3457 npm run test:e2e`: **91 passed / 2 skipped (pre-existing deprecated visual suite) / 0 failed** against the production build.
- Test additions this round: practice-hub e2e (7), practice answer-gate e2e, faq-structure (5), date-picker (9), updated ExamRunner/SEO pins; `tests/setup.ts` mocks next/font.
- Fixed during verification: my new e2e specs initially assumed an onboarded profile (hub locked for fresh contexts) — seeded completed CSE-professional onboarding like the existing onboarding spec; SEO spec's /about + /faq title/H1 pins updated to the intentionally rewritten pages (schema/canonical assertions untouched, still pass).

## Post-completion audit (same round)

An independent audit pass re-checked every acceptance criterion against the committed code (not the walkthrough) and every documented claim. Findings, all fixed and re-gated:

- **DatePicker missing promised features** — the plan promised year navigation and the component doc-comment promised Shift+arrow week moves, but neither shipped. Restored: previous/next-year header buttons (ChevronsLeft/Right, same min/max boundary state as month buttons), Shift+arrows ±7d, Shift+ArrowUp/Down ±28d, Shift+PageUp/Down ±365d. New test pins year-button navigation (`date-picker.test.tsx`, now 9 tests).
- **Missing `aria-busy`** — the plan's WI-4 item promised `aria-busy` while the workspace loads; DashboardView never rendered it. Added `aria-busy={!isLoaded || undefined}` to the dashboard root.
- **Stale CSP font sources** — `next.config.ts` still allowed `fonts.googleapis.com`/`fonts.gstatic.com` after the next/font migration. Tightened `style-src`/`font-src`.
- **Doc claims corrected** (no code impact): faq-structure test count is 5, not 14; WI-9 is pinned by ExamRunner tests (no standalone CoachPanel test file); verdict string is "Incorrect — the highlighted answer is correct.", not "Not quite." (implementation_plan wording fixed).
- Verified non-issues: `resolveRunnerLevelSlug` covers all documented id shapes (tests pin `cse-*`, `track-*`, `cse-subprofessional`, undefined); FAQ JSON-LD covers rendered questions (FAQPage schema present); exam-mode no-reveal coverage exists in ExamRunner tests.

Re-verification after fixes: `npm run verify` exit 0 (86 files / 609 tests), `PORT=3457 npm run test:e2e` 91 passed / 2 skipped / 0 failed.

## Project audit round (prior)

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
- Practice-hub modes beyond Quick/Medium/Full/Diagnostic (Spaced review, Mistake bank, etc.) are designed and queued in the hub; each unlocks as its data lands.
