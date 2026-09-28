# Walkthrough — QA & product update round (current), audit + onboarding (prior), with full change history below

## QA & product update round (latest)

The nine QA mission work items. Plan, root-cause analysis, and verification approach in `implementation_plan.md`. Every fix below is pinned by a test and verified against the production build; nothing is marked done on faith.

### What changed, by work item

1. **WI-1 Quick Drill 404** — `PracticeHubView` embedded the catalog's `{level}` route template verbatim, so Quick drill navigated to the literal `/exams/{level}/quick`. Fixed at the source: `resolveRunnerLevelSlug()` + `getPracticeModeHrefForLevel()` in `src/config/practice-modes.ts` normalize workspace levelIds ("professional"/"subprofessional"/"cse-professional" and legacy "track-pro"/"track-subpro") into runner slugs; the hub's resolveHref and openSetup use them. The three runner pages now render a new in-app `ExamLevelUnavailable` state (with working recovery links) instead of `notFound()` for levels without a question pool — an unknown level shows an honest in-app page, not a bare 404.
2. **WI-2 Practice answer gate** — in study mode the explanation was reachable before committing an answer. ExamRunner practice flow now: primary button "Answer" disabled until a choice is selected (hint text `#practice-answer-hint`); commit locks every choice (pointer + keyboard); verdict "Correct./Incorrect" (`role="status"` `data-testid="practice-verdict"`) and the owl explanation render only post-commit; the button then becomes "Next". Exam mode keeps quiet assessment chrome (no verdict, no reveal-on-select). `currentQuestion`/`currentAnswer` hoisted above derived state (a TDZ bug this surfaced is fixed).
3. **WI-3 Runner spacing/reflow** — tighter main/card padding, choice-list and nav margins; CoachPanel owl stage 190→132px with tightened paddings; question heading receives focus after navigation (skipped when already fully visible, respects `prefers-reduced-motion`).
4. **WI-4 Dashboard flicker** — greeting no longer flips mounted→"Welcome back" on the client (stable server render); `longestStreak` measured in an effect instead of at render time; `sectionIntro()` removes the negative-margin card overlap; tabular-nums on KPI numbers.
5. **WI-5 About + branding** — `/about` rewritten: why the site exists (pass rates, honest framing), who it helps, how to study with it, what is live (CSE only), what is planned but not live, multi-exam platform framing, non-affiliation note. "CSE Reviewer PH" → "ReviewTayo" across csc-domain disclaimers, SchoolAssignmentSection, ResultsSection, and both auth forms.
6. **WI-6 FAQ** — FAQ types gained general categories (`FAQ_GENERAL_CATEGORIES`); 11 general entries (the website, getting started, practice vs exam mode, progress, accounts, support) prepended in `src/lib/content/faqs.ts`; `/faq` rebuilt: general first, per-exam groups from EXAM_ORDER (CSE first), CSC-verified badge only on exam-only categories, accessible accordion (h3>button, aria-controls/aria-expanded, role=region aria-labelledby), an "Other exams" placeholder with no fabricated Q&A, and search across both sections. Layout title: "Frequently Asked Questions on Exam Review & Preparation" (brand-suffix rule).
7. **WI-7 Dashboard chrome & fonts** — AppShell target-card skeleton now keyed off `!target && !(isLoaded && !hasExam)` (fixes the gated regression), streak chip and daily goal render "—" until measured instead of flickering 0→N; Google Fonts `@import` removed from globals.css and replaced with `next/font` (Bricolage Grotesque 500/800 as `--font-display`, Figtree 400–800 as `--font-body`) in layout.tsx; the vestigial fonts.googleapis preconnects were removed after browser verification found them still in the document head. `.font-display`/`.font-body` consume the CSS vars with system fallbacks. Tests setup mocks `next/font/google`.
8. **WI-8 DatePicker** — the three native `<input type="date">` fields (study-plan study period, onboarding exam date, settings custom target) replaced by `src/components/ui/DatePicker.tsx`: trigger + month-grid popover, min/max clamping, month **and year** navigation buttons, full keyboard map (arrows, Shift+arrows weeks, PageUp/Down months, Shift+PageUp/Down years, Home/End/Enter/Escape/Tab), focus returns to the trigger, aria grid semantics, commit-on-select to preserve each consumer's validation, plain YYYY-MM-DD contract. Two real date bugs were caught by its own tests and fixed: civil dates must be parsed from the ISO string (parseManilaDate yields Manila midnight = previous UTC civil day), and month-boundary compares must live in one timestamp space (the first implementation mixed UTC-midnight and Manila-midnight, leaving "Previous month" enabled at the min boundary and clamping to the wrong day). The year buttons and Shift-modifier keys were restored during the post-completion audit (plan promised them; first implementation shipped without).
9. **WI-9 Streak chip** — CoachPanel hides the streak chip when streak is 0 (both panel and compact variants); it reappears with "Streak ×N" from the first correct answer. Pinned by ExamRunner unit tests (not a standalone CoachPanel file).

### Browser flows and viewports checked (production build, port 3457, Chromium)

- 1280×800: dashboard practice hub → Quick drill card → setup sheet (subject, Study/Exam mode, timer switch) → Exam mode → Start → `/exams/professional/quick?feedback=exam`, timer counting, no `{level}` anywhere (WI-1).
- `/practice/top-pro-grammar`: Answer disabled + hint before selection; choice B → Answer enabled; commit → all choices disabled, "Selected" marker, `role="status"` verdict "Correct. Nicely done.", owl explanation bubble, "Streak ×1 🔥" chip, button now "Next" (WI-2, WI-9 at both streak states).
- Same runner at 1280×800 and 390×844, plus topic practice and quick runner: `scrollWidth == clientWidth` verified live — no horizontal scroll (WI-3).
- 1440×900 dashboard: stable "Welcome back", "Longest streak 2 days" measured, tabular-nums present, daily goal placeholder "—", computed font-family on display text = "Bricolage Grotesque … Fallback", and no fonts.googleapis link/style resource in the document (WI-4, WI-7).
- `/about` (1280×800): owl + "About ReviewTayo" H1, why/who/how cards, CSE-only honesty, planned list, non-affiliation text (WI-5).
- `/faq` (1280×800): 21 accordion items, first opens with aria-expanded=true and a visible region, search filters to matching questions, badge + "Other exams" sections present (WI-6).
- `/settings/study` (1280×800): "Custom Target Date" radio reveals the DatePicker trigger with the preserved value; opening shows March 2027 with day 14 focused+selected; ArrowRight + Enter commits Mar 15, 2027, closes the dialog, and enables Save changes (WI-8).

### Test commands and actual results

- `npm run verify` (typecheck → lint → check:architecture → vitest → build): **exit 0** — Vitest **86 files / 608 tests passed**; production build clean.
- `PORT=3457 npm run test:e2e`: **91 passed / 2 skipped / 0 failed** (the 2 skips are the pre-existing deprecated peeking-owl visual describe, unrelated). First full run surfaced 8 failures — all fixed: my new hub spec lacked the completed-onboarding seed (hub locked for fresh contexts; seeded like the onboarding spec), my medium pin assumed 30 questions (the app serves 19 — corrected to assert app behavior), and the SEO spec's /about + /faq H1/title pins predated the intentional rewrites (updated; canonical + FAQPage schema assertions untouched and passing).
- Focused suites during development: practice (49), dashboard+onboarding+settings+ui (123), content+seo (55), date-picker (8).

### Remaining limitations

- None new this round. Pre-existing from earlier rounds: signed-in migration needs real DB credentials; A04 sync retry idempotency open; PWA service-worker console noise (benign).

### Post-completion audit (same round)

A second pass re-verified acceptance criteria against committed code and audited every doc claim. Fixed: DatePicker's promised year-navigation buttons and Shift-modifier keyboard moves (±7d weeks, ±28d, ±365d years) were missing and are restored + test-pinned (9 tests); DashboardView now renders `aria-busy` while the workspace loads (plan promised it); CSP `style-src`/`font-src` no longer allowlist Google Fonts after the self-hosted font migration. Doc corrections: faq-structure test count (5), WI-9 pinned by ExamRunner tests, verdict string "Incorrect — the highlighted answer is correct.". Re-gated after fixes: verify exit 0 (609 tests), e2e 91 passed / 2 skipped / 0 failed.

## Project audit round (prior)

Full audit of the project for bugs, inefficiencies, and scalability risks. Scope, prioritized findings (P0–P2), non-findings, and the verification plan live in `implementation_plan.md` ("Project audit (current task)" section). Every confirmed finding was fixed and test-pinned; nothing is claimed fixed without evidence below.

### Findings fixed

1. **P0-1 — sync fabricated success (correctness/data integrity)** — `POST /api/user/sync` previously returned `success:true` without checking insert results. Rewritten (`src/app/api/user/sync/route.ts`): per-attempt `db.transaction` (attempt + answers atomic), success counted from `.returning({id})`, failed inserts → `success:false` + `warnings`, conflicts → `skipped`, inserts batched 100/row, correctness resolved server-side from the `choices` table (client-claimed correctness never trusted), `mistakeBank` honestly reported `skipped` + warning (no server table), 413 above 5 MB. Tests: `tests/unit/api/user-sync.test.ts` (12 tests incl. legacy workspace_cse shim, LET skip, long-prefix distinct ids).
2. **P0-2 — account deletion not transactional** — the 6 deletes in `DELETE /api/user/account` could partially apply. Now one `db.transaction` (rollback → honest 500 "was not deleted"); transaction + 6 in-tx deletes + rollback asserted by `tests/unit/api/user-account.test.ts` (6 tests). GET export also collects `warnings` on per-table read failure instead of silently omitting data (P2-5).
3. **P1-3 — fat sync payload (privacy/scalability)** — new slim contract `src/lib/storage/sync-payload.ts` + `LocalStorageService.buildSyncPayload()`: attempt summaries + selections + bookmark ids only; question text/choices/explanations never leave the device. `syncGuestDataToCloud()` sends `SyncPayloadV2`; route consumes it. Payload-shape test pins the contract.
4. **P1-4 — attempt-id truncation collisions** — sync truncated ids to 64 chars; full deterministic ids now (distinct long-prefix ids pinned by test).
5. **P1-6 — statically baked exam selection (confirmed live before fixing)** — all four session pages prerendered one fixed question order for every visitor. Added `export const dynamic = "force-dynamic"` to `src/app/(app)/exams/[level]/{quick,medium,full}/page.tsx` and `src/app/(app)/practice/[topicId]/page.tsx`; selector tests add 5-draw variation + no-duplicate-ids.
6. **P2-5 — export data-loss on partial read failure** — covered in finding 2 (warnings array).

### Non-findings (investigated, no defect)

- Schema indexes adequate for the seed-data access patterns; exam engine remains pure (architecture guard PASS); double-submit already guarded (`isSubmittingRef`); timer drift already handled by wall-clock deltas + visibilitychange (pinned by `tests/unit/exam-engine/timer-drift.test.ts`).

### Browser evidence (production build, port 3457, fresh build; server restarted on it)

- The server found running was started **before** the build (PID start 11:46 vs BUILD_ID 12:52) and was alive during it — killed, `.next` removed, clean rebuild, restart.
- `/exams/professional/quick`: default profile Q1 = number-sequence item; fresh incognito session Q1 = Constitution item → selection varies per session (previously identical on both).
- `/practice/top-pro-vocab`: Q1 varies across plain reloads of the same URL in one session ("masinop" item vs "meticulous" item) → per-request selection, not profile-bound.
- Build artifacts: zero prerendered exam/practice session HTML; prerender manifest contains no exam/practice session routes. Note: the build summary still prints `●` SSG for `/practice/[topicId]` — cosmetic only; `force-dynamic` wins at runtime.

### Verification (actual results)

1. `npm run verify`: **exit 0** — typecheck clean, lint clean, architecture guard PASS, Vitest **84 files / 586 tests** (+13), production build clean (87 routes).
2. `PORT=3457 npm run test:e2e` (server killed first; Playwright serves its own build): **81 passed / 2 skipped / 0 failed**.
3. Focused suites during development: user-sync + user-account + storage = 44 passed; exam-engine + practice = 69 passed; `npx tsc --noEmit` clean.

### Remaining risks / blockers (documented, not silently dropped)

- Real signed-in guest→account migration against a live DB needs a dev database with Better Auth credentials — not possible on this machine; covered by 12 unit tests + mocked-session e2e.
- Sync idempotency on client retry (external-audit A04) is still open — the server is now honest about failures, but duplicate retry dedupe remains future work.
- PWA service worker `net::ERR_CONTENT_DECODING_FAILED` console noise persists (pre-existing, benign).

## Onboarding implementation + independent review

Implemented the guided onboarding flow from `docs/onboarding-handoff/ONBOARDING_PLAN.md`, then reviewed it independently: code audit against the plan's acceptance criteria and real-browser journeys (not the implementing agent's walkthrough) on the production build at port 3457. This section records what was verified and the actual results.

### What was built

- **Data contract & storage** — `src/lib/onboarding/{types,onboarding-service,plan-preview,destination}.ts`: versioned device-local state `rt_onboarding_v1` (`not_started | in_progress | completed | dismissed`), sanitize-on-read (enum validation, dailyGoal clamp 1–200, studyDays 0–6, ISO date check), safe parse/parse-failure degradation, storage-failure tolerant writes. Plan preview and first-activity resolution are pure functions over the exam catalog — no activity is promised that the config cannot launch, no exam-specific branching (architecture guard passes).
- **Routing matrix** — `getPostAuthDestination({status, established, returnTo})`: completed/dismissed/established → `returnTo ?? /dashboard`; new authenticated user → `/onboarding`. `sanitizeReturnTo` rejects non-`/` and `//` prefixed targets. Used by `AuthStandaloneForm`, `AuthModal` consumers, and the `/onboarding` redirect guard (`?edit=1` bypasses the guard for edit mode).
- **8-step flow** — `src/features/onboarding/OnboardingFlow.tsx` + `useOnboardingFlow.ts` + `steps/*`: identity (guest/account cards with honest local-only copy + privacy link), exam/level (config-driven, level reset on exam switch), starting-point + optional exam date, rhythm (day chips + session presets), goal (presets + validated custom, honest time estimates), review (live preview with per-row edit links), personalize (appearance, text size with live sample, optional discovery), finish (atomic: preferences applied, workspace created/updated idempotently, status completed, route to the real first activity — real diagnostic route for CSE, honest dashboard fallback otherwise). Focus moves to each step heading; `role="status"` live region announces "Step N of 8"; truthful progressbar; skip on optional steps only.
- **Entry surfaces** — homepage hero splits signed-out CTAs by returning vs brand-new; `SetupPlanCard` (dismissible, established-only) on the dashboard; standalone sign-in/create-account route through the same destination matrix; the existing AuthModal guest-sync migration screen handles guest→account data.

### Gaps found by the review (all fixed, all test-pinned)

1. **Consent before collection** — the flow collected answers before any consent decision (only the incidental global banner blocked it). Added the flow's own privacy gate ("Before we start": Accept all / Essential only / Decline & leave) writing the shared `csereviewer_cookie_consent` record; nothing persists until a choice is made; every advance control re-checks. Suppressed the global banner on `/onboarding` (its fixed overlay swallowed clicks on "Skip for now") and made it honor `cookie-consent-updated` events. Tests: `tests/unit/components/reviewtayo-home.test.tsx`.
2. **Returning-guest hero CTA** — a completed guest saw "Get started" again. Hero now splits on saved onboarding state too → "Continue studying →" + "Update my study plan" (`?edit=1`).
3. **Edit mode was a dead link** — completed users were redirected away and the service froze completed state. Now: completed users can revisit steps, change answers, re-finish into the same single workspace (no duplicates; explicit choices win, skipped answers keep existing workspace values), and `completedAt` is preserved. Dismissed users stay locked. Tests: `tests/unit/onboarding/onboarding-service.test.ts`.
4. **Deletion coverage** — `clearAllGuestData` missed `rt_onboarding*`; account deletion didn't clear device-local data. Both fixed (RA 10173). Test: `tests/unit/storage/notes-service.test.ts`.
5. **Missing step animation** — `animate-onboarding-step` had no CSS. Added a 200 ms slide/fade in `globals.css`, auto-collapsed by the reduced-motion rules (verified live: 1e-05s under reduce).

### Browser journeys (production build, recorded endpoints)

- **New guest, desktop**: homepage "Get started" → gate → "Essential only" → guest → CSE/Professional → skip starting-point → Mon+Wed → 20/day → review → Dark/Large/friend → save → `/exams/professional/quick` with explicit Professional identity and subtitle. Storage verified after save: `status:"completed"`, workspace `cse/professional/20`, prefs theme `dark` / text `large`.
- **New guest, mobile 390×844**: same flow via keyboard (Tab/Space/Enter) — single column, no overflow, focus on each heading; skipped goal kept existing workspace dailyGoal (merge semantics); "Extra large" preview applied live (16→20px).
- **Returning guest**: `/onboarding` revisit redirects to `/dashboard`; hero shows "Continue studying →".
- **Refresh + Back/Forward midway**: reload on step 2 resumed at the saved step with all answers; in-app Back preserves answers without rewinding `maxStepReached`; browser Back/Forward across `/onboarding?edit=1` ↔ `/onboarding` keeps state (SPA history entries).
- **Cancelled sign-in**: homepage modal → Escape closes, records nothing, focus restored to trigger; failed standalone sign-in shows `role="alert"` and stays put with escape hatches. Real signed-in first-login is covered by the mocked-session e2e specs (needs a dev DB to run live).
- **Direct app entry**: fresh user → `/dashboard` renders a functional "Choose your exam" empty state (never a broken forced flow); legacy user (workspace, no onboarding) → dismissible `SetupPlanCard` → dismissal persists (`status:"dismissed"`) across reload.
- **Edit-mode journey**: "Update my study plan" → review step → Edit goal 20→10 → re-finish → onboarding and workspace both 10, single workspace, `completedAt` unchanged.

### Console / stability notes

- Recurring `net::ERR_CONTENT_DECODING_FAILED` entries trace to the PWA service worker on this Windows dev box (pre-existing, unrelated to onboarding; all pages function).
- Rebuilding while `next start` serves corrupts `.next` on Windows — stop the server before `npm run build` (bit this review twice; documented in PROGRESS.md).

### Acceptance criteria — verdicts

| Plan criterion | Verdict | Evidence |
| --- | --- | --- |
| 1. Hero CTA opens onboarding; direct routes can't bypass setup into a broken state | PASS | Hero link verified; `/dashboard` fresh entry renders functional empty state; `/onboarding` guard redirects completed/established users |
| 2. Guest can finish without auth; accurate local-progress copy | PASS | Full guest journey; honest copy on identity/personalize/finish steps; privacy link |
| 3. First-time signed-in enters flow; established resumes normally | PASS | Destination matrix unit-tested exhaustively (17 tests); e2e mocked-session specs; established users go to dashboard + dismissible setup card |
| 4. Cancel/back/refresh preserve answers, no loops | PASS | Browser journeys above; resume-by-storage; sanitize prevents poisoned state loops |
| 5. Exam/level from config; unavailable handled | PASS | `getAvailableExams()` only; empty-catalog fallback copy in `ExamStep` |
| 6. Goal/rhythm/appearance/text size preview + save; skippable | PASS | Live previews verified in browser; skip path verified; storage traced per answer |
| 7. Completed learner edits without replaying onboarding | PASS (after fix) | Edit-mode journey above; service tests |
| 8. Guest→account merge idempotent, attempts preserved | PASS | Reused AuthModal sync screen (counts attempts/bookmarks, explicit "Sync to Cloud Now"/"Skip for Now"); destination matrix prevents loop |
| 9. Mobile/desktop/keyboard/SR/contrast/reduced-motion checked in browser | PASS | Journeys + a11y evidence above; reduced motion verified via `[data-reduce-motion]` |
| 10. verify + test:e2e pass; results recorded here and in PROGRESS.md | PASS | `npm run verify` exit 0 (84 files / 573 tests); e2e 81 passed / 2 skipped |

**Actual verification results**: `npm run verify` → **exit code 0** (typecheck clean; ESLint clean; architecture guard PASS; Vitest 84 files / 573 tests passing; production build clean, 93 routes). `PORT=3457 npm run test:e2e` → **exit code 0** (81 passed, 2 skipped — pre-existing skips, 0 failed).

---

# Earlier rounds (history)

## Update 8 — Dashboard v2: sidebar shell + five new/changed sections

Implemented from `reviewtayo-dashboard-v2.html` (mockup treated as layout/state spec, not markup):

- **Shell**: `src/features/dashboard/AppShell.tsx` — sticky dark-maroon sidebar (brand chrome, both themes), grouped nav (Study: Dashboard/Plan/Practice/Review; Track: History/Achievements; Resources: Notes/Learn), target-exam quick card, daily-goal mini bar, gold due-count badge on Review, Settings pinned at the bottom. Mobile: top brand bar with streak pill, bottom tab bar (Home/Plan/Practice/Review/More), "More" sheet (role=dialog, aria-modal, Escape to close, focus on open, background inert). Every dashboard route renders inside it.
- **New algorithms** (pure, unit-tested): `src/lib/study-plan-generator.ts` (`generateWeeklyPlan`: weakest-subject ranking from real subject readiness, daily-goal distribution, rest days, diagnostic-first fallback for new users; recomputes only when inputs change) and `src/lib/achievement-engine.ts` (badge progress over a stats snapshot; `closestAchievement` banner). Badge list lives in `src/config/achievements.ts` (data, not inline UI).
- **New storage**: `src/lib/storage/notes-service.ts` (pin/search/subject tags, sanitize + cap) wired into backup payload v2, restore, and the reset sweep; v1 backups still import.
- **New/changed pages**: `/dashboard/plan`, `/dashboard/practice` (setup sheet + feature-flagged coming-soon modes from `src/config/practice-modes.ts`), `/dashboard/review` (due/mistakes/bookmarks on the existing Leitner SRS), `/dashboard/achievements`, `/dashboard/notes`, `/dashboard/learn` (reuses guides/articles/FAQ content), `/dashboard/history` (into shell). Settings shell restyled to the brand palette only — fields, persistence, and tests untouched.
- **Single source of truth**: `src/lib/workspace/target-exam.ts` feeds the sidebar card, dashboard hero, and plan; countdown math in `src/lib/study-plan.ts` is Asia/Manila-fixed (`daysUntilManila`, `getManilaTodayString`).
- Tests: 7 new suites (app-shell, new-surfaces, study-plan-generator, achievement-engine, target-exam, practice-modes, notes-service) plus backup-v2 pin. `npm run verify` exit 0: 71 test files, 440 tests, production build.

## Update 7 — old hero panel replaced

User caught the old owl + panel in the /cse hero. `HeroExamLevelSelector` rewritten to the mockup (owl on top with tracked pupils, "Start your review", radio cards, gold CTA; no peeking owl, no countdown pill). Deleted dead code: `PeekingOwl`, `ExamPickerCard`, `HomePageClient` (unused), `peeking-owl.test.tsx`. Unit + e2e assertions updated. Verify exit 0.

## Update 6 — /cse landing redesign (combined mockup A+B+C)

`CSELandingClient.tsx` rebuilt per `reviewtayo-csepage-v2-combined.html`: Command-center hero → Choose-your-battle gradient level cards (tap = site-wide level) → Guided 5-step track → urgency band (single countdown, moon owl) → mode cards mapped to the track → flow guarantees; trust claims, SubtestExplorer, and guides kept below. `HeroExamLevelSelector` gained `showCountdown`/`compareHref` props so /cse hides its duplicate countdown and repoints the compare link. SEO metadata updated (keyword title, OG/Twitter). Owls use `bob tracked` for cursor-following pupils. Verify exit 0; screenshots in `artifacts/cse-live-*.png`.

## Update 2 — Coach rail moved LEFT, owl removed from Exam Hall, paginated map

User feedback after the first implementation: the coach should sit **left of the question** (like the approved mockup image), the **full mock must have zero mascot distraction**, and the Question Map must **paginate** for 300–500 item banks.

Changes:

- **Coach rail on the left (desktop)** — `ExamRunner` grid is now `lg:grid-cols-12` with explicit ordering: coach rail `lg:col-span-3 order-1` (rendered first in DOM), question `lg:col-span-6 order-2`, map aside `lg:col-span-3 order-3` (explicit `order-3` is required — without it the aside sorts ahead of the ordered columns). Coach never renders inside the map aside anymore. Geometry verified by bounding boxes at 1440px: coach x=112, question x=457, map x=1069.
- **No mascot in the Exam Hall** — the decorative owl that perched on the Question Map sidebar was removed entirely (`ReviewTayoOwl` import dropped from `ExamRunner`). Verified: `svg.owl` count is 0 on `/exams/professional/full`.
- **Coach stats line** — `CoachPanel` gained `answeredCount`/`correctCount`/`total` props rendering `Answered X/Y — Correct Z` under the streak chip (matches the mockup's counters); the idle bubble copy no longer embeds these numbers.
- **Paginated Question Map (`MAP_PAGE_SIZE = 50`, exported for tests)** — both the persistent desktop sidebar and the modal drawer render one page of 50 numbers. A `useEffect` keeps the visible page synced to `session.currentIndex` so Next/Prev/jumps always land on the right page; manual paging via Prev/Next pager buttons (rendered only when `totalQuestions > 50`; 170-item full mock → 4 pages). Small banks (≤50) render exactly as before — no pager, no max-height scroll.
- Tests: +3 runner tests (rail-left DOM order + stats counters, zero owls in `full` + no pager on small banks, 120-item bank paginates 1/3→2/3 and jumps correctly). Suite is now 62 files / 364 tests.

## Original change

## What changed

The exam runner now has two presentations of one flow, chosen by `rules.mode` through a pure view-layer helper (no engine branching):

- **Exam Hall** (`medium`, `full`) — Concept A from the approved mockup: paper/blush canvas, brand-palette card and letter keys, Bricolage display heading, gold flag accents, the owl perched quietly on the Question Map. Calm, graded-assessment chrome; answers stay hidden until submit.
- **Owl Coach** (`quick`, `practice`, `bookmarks`, `mistakes`) — Concept C: the same hall chrome plus the owl companion panel (desktop sidebar; compact bar on mobile). In `practice` (instant feedback) the owl reacts per answer — happy/oops mood, speech bubble pointing to the rationale panel, streak counter with Taglish quips, confetti burst on correct answers. In `quick` the coach is present but stays calm: answers are not revealed before submission, so the owl never reacts — it is still a timed assessment.

Files:

- `src/features/practice/examTheme.ts` (new) — `getExamTheme(mode)` mapping.
- `src/features/practice/coach.ts` (new) — `nextStreak`, deterministic `getCoachQuip`.
- `src/components/practice/CoachPanel.tsx` (new) — presentational owl companion, `panel`/`compact` variants.
- `src/app/globals.css` — appended `.exam-hall-bg`, `.exam-coach-bg`, `.exam-card-shadow`, `.timer-warn-pulse`, `.conf-anchor`; no existing rules modified.
- `src/features/practice/TestModeBar.tsx` — optional `theme` prop; re-skinned to brand palette; all texts, ids (`#exam-timer`) and behavior preserved.
- `src/features/practice/ExamRunner.tsx` — theme wiring, coach state (streak/mood/bubble/confetti), CoachPanel insertion (desktop + mobile), re-skinned card/choices/tools/map/modals with every selector text, testid and id preserved.
- `tests/e2e/exam-flow.spec.ts` — only the four hardcoded screenshot paths pointing at another machine (`C:/Users/USER-PC/.gemini/...`) were repointed to `artifacts/`; no assertions changed.
- `implementation_plan.md`, `PROGRESS.md` — updated.

Deliberately untouched: `ResultsView.tsx` (already on brand tokens; every e2e-pinned text preserved), the exam engine, timers, scoring, storage, and all question content.

## Verification (actual results)

1. `npm run verify`: **PASS, exit code 0** — typecheck 0 errors; lint clean; architecture guard PASS (no exam-specific engine branches); Vitest 62 files / 361 tests all passing (was 60/354; +2 files, +7 tests); production build succeeded.
2. New/updated tests:
   - `tests/unit/practice/examTheme.test.ts` — coach modes vs hall modes mapping.
   - `tests/unit/practice/coach.test.ts` — streak increment/reset, deterministic quips.
   - `tests/unit/practice/ExamRunner.test.tsx` — added: coach panel + streak reactions in practice mode; coach chrome present but calm in quick mode; no coach panel in medium mode; instant-feedback/rationale and "Selected" behaviors unchanged.
3. `npx playwright test tests/e2e/exam-flow.spec.ts`: **10 passed / 2 failed**. The 2 failures are pre-existing homepage copy assertions (`/Philippine exam preparation/i`, old hero expectations in `page.tsx`), unrelated to this change — `git status` confirms `src/app/page.tsx` untouched; they fail identically before this change.
4. Browser check (dev server, logged above in this thread):
   - `/exams/professional/quick` — coach chrome (compact owl bar, streak chip), no answer reveal on selection, timer live, cookie-consent gate intact.
   - `/practice/top-pro-vocab` — wrong answer: owl `oops`, rationale panel shown, streak reset; correct answer: owl `happy`, streak "Streak ×1 🔥". (Confetti suppressed only because the check environment has OS reduced-motion on — the guard is intentional.)
   - `/exams/professional/full` — Exam Hall: no coach panels, no owl mascots at all, continuous 3:10:00 timer for 170 items (single-timer constraint intact), paginated map drawer.
5. Accessibility preserved: font size / high contrast / reduce motion toggles, keyboard shortcuts (A–E, F, arrows), haptics, `prefers-reduced-motion` guard on confetti.

## Update 3 (coach UX pass: bubble rationale, single-column header, review-gate split)

- **Header utility bar fixed**: the kbd hint + Flag/Scratchpad/Map/Display/Report row previously sat beside the subtest chips in one cramped flex row — in the coach layout's narrower card the tools wrapped badly and the kbd hint text overlapped the subject chip. The bar is now two stacked rows (chips row, tools row, both `flex-wrap`), and the kbd hint is a bordered inline-flex badge that hides below `md`. Verified at 1270px: all four tool buttons on one row, no horizontal overflow.
- **Owl speaks the full rationale**: the separate "Educational Concept & Rationale" card below the question is removed in coach practice mode. `coachFeedback` now carries the complete explanation in the owl's speech bubble (quip title + explanation body), exactly like the reference mockup. The compact mobile bar shows only the quip (title) to stay scannable. No duplicated rationale text in the DOM.
- **Review Before Submission is now assessment-only**: new `usesReviewConfirmation` flag (`!isCoach || rules.mode === "quick"`). Revealed-answer coach practice skips the confirmation entirely — the final-question CTA becomes "Submit Test" and submits directly; timed assessments (quick, medium, full) keep the modal. All three submit entry points (keyboard Next, drawer/last-question button, map-card Submit) respect the gate; timer-expiry auto-submit bypasses it by design.
- **Question Map moved under the owl** (coach mode): the map card is shared via `mapCard` and renders inside the left rail below the CoachPanel, so the question column stretches to 9 of 12 grid tracks. Exam Hall keeps the map as its own right aside (`lg:col-span-4` against an 8-track question).
- Tests updated: review-modal test pinned to `full` mode; practice instant-feedback test asserts the rationale lives in the bubble and no card renders; new tests: straight-submit from last practice question (navigates to results, no modal) and review gate kept for full mock. Suite: 42 practice tests passing.
- Verified in browser (production build, port 3000): coach bubble shows quip + full explanation after answering ("Oops — okay lang 'yan!" + Filipino rationale), no rationale card; full mock keeps zero mascots, map right at x=944, review modal on Submit; practice last-question CTA "Submit Test" → straight to `/results/`; header single-row at 1270px with 0px overflow.

## Notes / follow-ups

- Coach quips are stored in `coach.ts` (single bank) — easy to hand-tune later without touching components.
- Concept E (results re-skin) was intentionally deferred: ResultsView already uses brand tokens, and its texts are heavily pinned by e2e; a dedicated pass can add the giant-score hero without touching logic.

