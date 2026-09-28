# Implementation Plan — ReviewTayo QA & Product Update (9 work items)

> Prior plans (onboarding, project audit) are archived; the audit plan's findings and
> non-findings remain summarized in `ARCHIVES/implementation_plan.md` and `PROGRESS.md`.
> Nothing from the failed prior turn survived on disk — this run started from a clean tree.

## Interpretation (restated)

Nine QA findings are treated as leads. For each, find the real cause in the current code,
fix it without regressing existing behavior, pin it with behavior tests, and verify in the
browser. The exam engine stays generic (no exam branching); no external question content;
no new personal-data collection.

## Root-cause findings (evidence from code read this session)

1. **Quick Drill 404** — `PracticeHubView.resolveHref()` (src/features/dashboard/practice/PracticeHubView.tsx)
   builds the target URL from `mode.href` verbatim. The practice-mode catalog
   (src/config/practice-modes.ts) stores *templates* like `/exams/{level}/quick`, and
   `resolvePracticeModeHref()` exists for substitution but is **never called by the hub**.
   Result: "Start Quick Drill" navigates to a literal `{level}` segment → 404. Same bug in
   `openSetup()`'s direct push for non-sheet modes (`full`, `diagnostic`). The runner pages
   themselves are healthy (`/exams/[level]/quick` matches SEED_LEVELS slugs).
2. **Practice button behavior** — In `ExamRunner`, practice mode reveals the answer the
   moment a choice is *selected* (`applyCoachReaction` on choice click), the primary button
   always says "Next", there is no selection requirement, no lock-in step, and no explicit
   "Correct/Incorrect" text (color-only styling on choice cards + owl quip).
3. **Quick exam vertical fit** — Runner main padding (`p-4 sm:p-6 lg:p-8 pb-24`), card
   padding (`p-5 sm:p-7 md:p-8`), generous margins (`mt-8` bottom nav, `mt-6` choices) and
   the large coach owl (190px stage) push the action row below ~800px desktop viewports;
   no scroll/focus management after Next, so position after navigation is unpredictable.
4. **Dashboard scanability** — Structure is sound (hero → KPIs → quests → subjects/actions
   → consistency/recent) but has inconsistent KPI typography, negative-margin hacks
   (`mt-[-6px]`), and a greeting that flips SSR→client ("Your study command center" →
   "Welcome back") because it is derived from `mounted`.
5. **About page** — Accurate but stiff/mission-brochure tone; still framed solely as a CSE
   site. Stale "CSE Reviewer" branding persists in AuthForm/AuthStandaloneForm ("New to CSE
   Reviewer?") and exam-guide strings ("CSE Reviewer PH" in csc-domain.ts,
   SchoolAssignmentSection, ResultsSection).
6. **FAQ** — Page is CSE-only ("Civil Service Exam Frequently Asked Questions"); no general
   ReviewTayo questions; the "Verified per official CSC advisories" badge renders on every
   answer; structure is not exam-extensible. `FAQItem` already has an optional `examIds`
   field — the data model is ready.
7. **Exam-target flicker** — Multiple real causes, no timeouts involved:
   - AppShell's sidebar "Target exam" card renders the no-exam branch until a
     post-mount effect fills `target` → visible content swap top-left on load.
   - AppShell mobile streak chip calls `LocalStorageService.getStudyStreak()` during
     render (SSR default vs client value → hydration mismatch + swap).
   - DashboardView greeting flips on `mounted` (SSR text ≠ client text).
   - Fonts load via CSS `@import` from Google → FOUT width shift on `font-display`
     headings (exam name in TestModeBar, target card).
8. **Study date control** — The StudyPlanView "Study period" start date (plus the
   onboarding exam-date field and the Settings study custom date) use native
   `<input type="date">`, whose dropdown is unstyleable and inconsistent. No shadcn
   primitives/radix are installed, so a small custom accessible picker following the
   repo's existing dialog/popover patterns is required (no new UI library).
9. **Streak copy** — `CoachPanel.streakLabel(0)` returns "Streak — simulan natin!" while
   the footer already shows "Answered 0/N - Correct 0" — redundant. Empty state should
   simply hide the chip.

## Changes per work item

### 1. Quick Drill 404
- `PracticeHubView`: resolve level slug from the active workspace via a new pure helper
  `resolveRunnerLevelSlug(levelId)` in `src/config/practice-modes.ts` (handles
  `professional`/`subprofessional`, `cse-*`, legacy `track-*`; default `professional`);
  use `getPracticeModeHref(mode, slug)` in `resolveHref` and `openSetup`.
- New in-app invalid-level state `src/features/practice/ExamLevelUnavailable.tsx`
  (server-safe): rendered by quick/medium/full pages for unknown level slugs instead of
  bare `notFound()` — useful links, no unexplained 404.
- Tests: unit — hub push URLs for quick study/exam modes, medium/diagnostic/full direct
  pushes, slug mapping table. E2E — the exact reported path (dashboard practice → Quick
  drill → Exam mode → Start → runner loads), study-mode path, medium/full paths, invalid
  level URL.

### 2. Practice vs exam buttons (ExamRunner)
- Practice mode: selection no longer reveals; new `committed` per-question state.
  - Primary button: "Answer" (disabled until a choice is selected, with an accessible
    hint), → commit → reveal → becomes "Next" (last question: "Submit Test" after commit).
  - Commit: locks choices (non-interactive), fires coach reaction/confetti once, shows a
    `role="status"` feedback line: "Correct." / "Incorrect" + the explanation (clear text
    + green/red styling), owl bubble shows the quip title.
  - Answer is never counted twice: selection after commit is ignored; scoring reads
    answers once at submit.
- Exam modes (quick/medium/full): unchanged Next flow, answers hidden until the end,
  review modal, single continuous full-test timer, scoring/drafts untouched.
- Tests: updated practice-mode unit tests to drive Answer→Next; new tests: selection
  requirement, lock-in (no re-selection, no double count), explicit verdict text, exam
  mode keeps answers hidden. E2E: practice session Answer→feedback→Next flow.

### 3. Quick exam viewport fit
- Tighten runner spacing: main padding, card padding, utility bar, progress, question and
  choice margins/paddings (text sizes and touch targets preserved), bottom nav margins.
- Compact CoachPanel owl stage/bubble/footer paddings and map card padding.
- Predictable post-Next behavior: after index change (Next/Prev/map jump), scroll the
  question heading to just under the sticky bar (skipped when already fully visible;
  `behavior: "auto"` under prefers-reduced-motion) and move focus to the heading
  (`tabIndex={-1}`, `preventScroll`).
- Browser audit at 1280×800, 1440×900, 390×844, 375×667; long question/choice fixtures
  via the bank content; zoom 150%.

### 4. Dashboard
- Stable greeting (no mounted flip); consistent KPI number typography; replace negative
  margin hacks with proper section header spacing (`sectionHeader` gains an `intro`);
  tidy consistency legend; `aria-busy` while workspace loads.
- Preserve all data, actions, and pinned test strings.

### 5. About + branding
- Rewrite `/about` as an approachable ReviewTayo introduction: why it was made, who it
  helps, how to study with it (real flows), what is live today (CSE Pro/Subpro and the
  actual feature list), and that the platform is built to add other Philippine exams over
  time — planned exams clearly not live, no dates promised.
- Replace stale "CSE Reviewer" copy with "ReviewTayo" (AuthForm, AuthStandaloneForm,
  exam-guide strings). Keep canonical `/about`; title stays unique and brand-suffix-free.

### 6. FAQ
- Extend `FAQItem` categories with general ones (site, getting started, practice vs exam
  modes, progress & results, accounts & privacy, help & feedback); add ~9 general entries
  verified against implemented behavior (no invented prices/policies/dates).
- Rebuild `/faq` page: General section first, then Exam-specific (per-exam groups derived
  from `examIds`, CSE first; only exams with real FAQs render — upcoming exams listed as
  in-progress without fabricated Q&A). CSC "verified" badge only on CSE exam answers.
- Accessible accordion: `aria-controls`/`aria-labelledby`, region semantics; search across
  both groups; layout metadata stays unique/brand-free; FAQ JSON-LD covers rendered data.

### 7. Flicker
- AppShell: fixed-height skeleton for the target card until first client render; streak
  chip and daily-goal values move into effect-driven state (no render-time localStorage
  reads); DashboardView greeting made SSR-stable.
- Fonts: replace the Google Fonts CSS `@import` with `next/font/google`
  (Bricolage Grotesque + Figtree, `display: swap`, CSS variables) so `font-display`
  headings don't shift width after load; fallback plan if the build environment cannot
  fetch fonts: revert to @import and rely on the state fixes (documented honestly).
- Verify cold load + reload, signed-out; check console for hydration warnings.

### 8. Date picker
- New `src/components/ui/DatePicker.tsx` (client): styled trigger, popover grid, ISO
  string value (timezone-safe: `getManilaTodayString` + UTC math like StudyPlanView),
  `min`/`max` disabled dates, month + year navigation buttons, full keyboard support
  (arrows, Shift+arrows weeks, PageUp/PageDown months, Shift+PageUp/PageDown years,
  Home/End/Escape), focus management (focus selected day on open,
  return focus to trigger on close), ≥40px touch targets, Tailwind brand tokens.
- Replace the native inputs in StudyPlanView (study period), onboarding StartingPointStep
  (exam date), and Settings→Study (custom target date). MyExamsDialog/ExamCalendarCard
  (legacy dialog-embedded editors) left as-is and documented.
- Tests: new `tests/unit/ui/date-picker.test.tsx` (render, selection, min/max, keyboard,
  focus return, month/year nav); adjust affected onboarding/settings tests.

### 9. Streak copy
- `CoachPanel`: hide the streak chip when streak is 0 (panel + compact); keep the
  "Answered X/Y - Correct Z" line so the empty state reads naturally. Update unit tests.

## Risks
- ExamRunner is heavily test-pinned (unit + e2e): practice-gate changes must update tests
  to assert the new real behavior without weakening exam-mode coverage.
- `next/font` requires network at build time; verified early, with documented fallback.
- Popover inside existing dialogs (onboarding step, settings form) must not clip:
  popover is absolutely positioned within a relative wrapper with `z` elevation.
- No exam-engine branching introduced; architecture guard must stay green.

## Verification Plan
- Focused unit runs after each coherent change; then full gates:
  - `npm run verify` must exit 0 (typecheck, lint, architecture, unit/integration, build).
  - `npm run test:e2e` (exam-taking/navigation/timer/scoring/practice-hub changes).
- Browser (production build): the exact reported Quick Drill path; practice Answer/Next
  gate incl. keyboard; quick exam fit at 1280×800 / 1440×900 / 390×844 / 375×667 + zoom;
  dashboard states (fresh guest, populated, no-exam gate); About; FAQ (search, accordion,
  keyboard); flicker checks on cold load/reload (console clean); date picker keyboard +
  min/max + storage write; streak empty/active states.
- `PROGRESS.md` updated after each completed unit; factual `walkthrough.md` at the end
  with the AGENTS.md Definition of Done checklist and real exit codes.

### Outcome (actuals, end of session)
- `npm run verify` exit 0 (Vitest 86 files / 608 tests); `PORT=3457 npm run test:e2e`
  91 passed / 2 pre-existing skips / 0 failed. Browser checks executed as planned on the
  production build at 1280×800 / 1440×900 / 390×844 (flows and evidence in
  `walkthrough.md`, QA & product update round); 375×667 covered by the SEO spec's mobile
  pass in e2e. Deviations found during verification are recorded there too (e2e seed for
  the practice hub, medium pin 30→19, SEO pins updated for the rewritten /about + /faq,
  vestigial font preconnects removed after head inspection).
