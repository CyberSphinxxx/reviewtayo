# Implementation loop

Run every stage in order. After each stage: inspect the diff, add/update behavior tests, run the narrow relevant tests, correct failures, update `PROGRESS.md`, and only then advance. At the final stage run the full required gates. If a failure persists for three repair attempts, record its exact cause in `PROGRESS.md` and continue independent work as instructed by `AGENTS.md`; never claim completion with a failing `npm run verify`.

## 0. Audit and plan

1. Read repository instructions and relevant product-plan sections, especially the homepage, authentication, exam configuration, privacy, accessibility, analytics, and build order.
2. Trace all current entry routes: hero CTA, exam chooser, sign-in/sign-up redirects, guest practice, dashboard, settings, and exam start. Capture current screenshots at mobile and desktop widths.
3. Identify existing auth/session API, user profile/preferences storage, local guest data, exam catalog, design tokens, mascot assets, motion utilities, tests, and database migration conventions.
4. Check whether a signed-in user can already have study progress without onboarding. Define a safe legacy-user rule. Mark any difference from this handoff in `implementation_plan.md`.
5. Write the root `implementation_plan.md` with an explicit Verification Plan and privacy/data migration notes. Keep the phase scope within the project's build order.

**Exit:** a file-level implementation plan and route/state map based on code, with explicit acceptance criteria.

## 1. Data and routing contract

1. Implement a versioned onboarding state. Distinguish `not_started`, `in_progress`, `completed`, and `dismissed` if dismissal is supported. Store completion atomically with the setup choices.
2. Use the existing exam configuration/catalog for exam and level choices. Persist stable IDs, not display labels. Validate server-side; a removed exam/level should reopen the relevant step gracefully.
3. Keep optional demographic/marketing fields out of the account schema unless necessary. Store referral source only with a clear purpose and privacy notice. Do not load analytics before consent.
4. Guest state may live locally, namespaced and versioned. Explain on-screen that guest progress is kept on this device and may be lost if browser storage is cleared. Never imply cloud backup for a guest.
5. Implement guest-to-account reconciliation with an idempotent transaction or endpoint. Merge preferences deliberately, preserve answer history by stable IDs, and avoid duplicate attempts. Test repeated calls and partial failures.
6. Protect routes from redirect loops: new authenticated user → onboarding; completed user → destination/dashboard; in-progress user → saved step; guest → guest setup/selected activity. Preserve a safe `returnTo` destination.

**Exit:** data contract, migration, validators, routing tests, and a safe way for legacy users to continue.

## 2. UI foundation

1. Replace the hero's primary “Choose an exam” action with “Get started”; preserve search/SEO content and provide an accessible path to browse exams if it remains useful.
2. Build a single onboarding shell with progress, back, skip where valid, save/continue, keyboard focus, mobile sizing, and a persistent escape/resume affordance.
3. Reuse existing ReviewTayo typography, colors, cards, buttons, mascot, and illustration language. Motion should clarify state changes: card selection, step transition, goal preview, and completion celebration. Keep motion short, cancellable, and disabled/reduced under `prefers-reduced-motion`.
4. Use semantic form controls, visible labels, clear validation, focus management, announcement of step changes, adequate contrast, and a touch target size consistent with existing UI.

**Exit:** shell works on narrow/mobile and desktop viewports, with reduced-motion and keyboard checks.

## 3. Steps and branching

Implement the sequence and copy in `ONBOARDING_PLAN.md`. Keep required steps short and optional steps skippable. A user should be able to reach their first useful activity without answering marketing or appearance questions. Do not gate study access on optional answers.

**Exit:** one complete guest path and one signed-in path, including back/refresh/resume and editability from settings.

## 4. Integrations and edge cases

Wire onboarding into sign-in/sign-up callbacks, the homepage, app entry, settings, and exam entry. Test direct URL entry, stale sessions, OAuth/email callback return, auth cancellation, multiple tabs, storage-disabled guest behavior, deleted exam config, existing accounts, and a user who signs in after guest practice. If migration cannot be safely automatic, present a clear review step that preserves both sets of data.

**Exit:** no lost progress, duplicate attempts, dead ends, or redirect loops in supported flows.

## 5. Verification and handoff

1. Run typecheck, lint, architecture check, focused tests, then `npm run verify`; fix until exit code 0.
2. Run `npm run test:e2e` for navigation/exam entry changes.
3. In a real browser, test a first-time guest, first-time account, returning account, guest-to-account merge, mobile layout, keyboard controls, and reduced motion. Record URLs, screenshots or observations, and actual outcomes.
4. Update `PROGRESS.md` and root `walkthrough.md` with changed files, choices, evidence, limits, and the full Definition of Done checklist from `AGENTS.md`.

**Exit:** all gates pass and the walkthrough truthfully states the result. A failed gate means work remains incomplete.

