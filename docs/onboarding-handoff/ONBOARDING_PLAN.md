# ReviewTayo onboarding product and interaction plan

## Goal and scope

Turn “Get started” into a guided first session that gives each learner a useful study plan and an immediate next action. First-time signed-in users should see onboarding. Guests may complete it without an account, with an honest explanation of local-only progress. Returning users should resume their activity instead of seeing onboarding again. The engine remains exam-agnostic so future Philippine exams can be added through configuration and content.

This is a product specification for implementation, not a claim about the current codebase. The implementation agent must audit the actual routes, schema, design system, and product-plan constraints first.

## Journey map

```text
Homepage “Get started”
  → Save-progress choice
      → Sign in/create account → return to saved onboarding step
      → Continue as guest → local onboarding state
  → Exam and level
  → Study context and schedule
  → Question goal and plan preview
  → Reading/appearance preferences
  → Optional referral question
  → Review and finish
  → Recommended first activity

Returning signed-in user → dashboard/last activity
Returning guest on same device → resume draft or guest home
Guest later signs in → review/merge local and account progress → destination
```

## Entry and identity

**Homepage:** primary CTA “Get started” in hero and repeated at a natural lower-page point. Secondary links can still expose exam information. CTA works without prior exam selection. A returning signed-in learner sees “Continue studying” where session state is known, without layout shift that hides the original entry point.

**Save progress choice:** two equally usable cards: “Save my progress” (sign in/create account) and “Continue as guest.” Say exactly what each does. Account: progress syncs across devices where supported. Guest: progress remains on this device and can be lost when local data is cleared. Show a short privacy link. If authentication is cancelled or fails, return to this step with previous answers intact; no trap or forced sign-in.

**Automatic first-login rule:** after authentication, route a user with no completed onboarding to the flow; resume the saved step if in progress. A completed user goes to the intended destination. Legacy users who already have attempts/progress should be treated as established and offered a dismissible “Set up your study plan” entry rather than forced through a first-run flow. Confirm this rule against existing data and product docs during audit.

## Proposed steps

The shell displays a concise step title, one sentence of purpose, a progress indicator, back control, and Continue. Most steps should be single choice or short controls. Avoid a long survey feeling. The target is a 2–3 minute path, with optional questions skippable.

| Step | Prompt and controls | Required? | Result |
| --- | --- | --- | --- |
| 1. Identity | “How would you like to keep your progress?” Account / guest cards | Choice required | Establishes persistence mode; auth returns here or advances safely |
| 2. Exam | “What are you preparing for?” Config-driven exam cards, then level/track if the selected exam has one; “I’m exploring” if the platform can support it | Exam required to create a plan; exploring may defer plan | Stores exam/level IDs; shows only available/ready options |
| 3. Starting point | “Where are you in your prep?” Just starting / reviewing topics / ready for practice tests; optional exam date if known | Optional | Tunes recommended first activity without claiming diagnostic accuracy |
| 4. Weekly rhythm | “Which days can you usually study?” Day chips plus “My schedule changes”; optional minutes per session with realistic presets | Optional, sensible default | Builds a flexible weekly schedule; no notifications implied |
| 5. Daily goal | “What feels doable most days?” 5 / 10 / 20 / custom questions, with an estimated time range based on measured or conservative assumptions | Optional, default 10 | Creates editable daily question goal; never blocks access |
| 6. Plan preview | Live preview of study days, question goal, and suggested first activity; inline edit links | Review required | Lets learner understand and correct the proposed plan |
| 7. Reading comfort | Appearance: system/light/dark; text size: standard/large/extra large, live sample card | Optional | Applies immediately, persists to account or device; avoid overriding OS preferences unexpectedly |
| 8. Discovery | “How did you hear about ReviewTayo?” Search, social media, friend/classmate, school/review center, other, prefer not to say | Optional and skippable | Store only if privacy notice covers the purpose; no free-text by default |
| 9. Finish | Mascot celebrates, summary and “Start my first practice” primary CTA; secondary “Explore dashboard” | Required completion action | Saves atomically and routes to configured exam activity |

**Potential refinement after audit:** fold steps 7 and 8 into a “Make it yours” screen if mobile usability tests show the flow is too long. Do not remove guest choice, exam selection, review, or editable goals. Keep the data model able to support later new exams without schema rewrites.

## Interaction and visual direction

Use the actual mascot art and brand palette found in the repo. The mascot can react subtly to selection and completion; it should never obscure the prompt or be the only way information is conveyed. Use a consistent card grid, one active choice, clear selected state beyond color, and an animated preview that responds to schedule/goal changes. Step transitions can slide/fade over roughly 150–250 ms; avoid motion that delays input. The completion animation runs once and can be skipped. Respect reduced-motion settings for both CSS and JavaScript animation. Do not add a new animation dependency unless the existing stack cannot achieve these interactions.

Keep the progress indicator truthful when branches skip steps. Preserve form state when going backward, refreshing, signing in, and using browser history. Enter submits only when appropriate; keyboard users can reach every control and focus moves to the new step heading after navigation. Error messages should name the affected field and offer a retry without clearing prior answers.

## Data, privacy, and migration

Recommended durable fields: onboarding version/status/completed timestamp; exam ID and level ID; prep stage; optional target date; study days/session duration; daily question target; appearance and text size. Prefer existing user preference/profile structures and generated Drizzle migrations. Server-side validation should constrain allowed enums, date range, question goal, and configured exam IDs. Avoid storing inferred ability, ranking, or sensitive demographics.

Guest state should be versioned local storage with safe parsing and graceful storage failure. Explain its limitations before users choose guest mode. On sign-in, offer an explicit merge/review when account and guest preferences both exist. Keep attempt history and answers intact, deduplicate with stable IDs/idempotency keys, and clear local guest data only after confirmed successful migration. Document what happens if the user signs into a different existing account. Do not add marketing tracking or analytics events before consent; account/data deletion must cover any new profile fields.

## Recommendation behavior

Generate a simple plan from configuration and chosen preferences. Starting point may choose a topic practice, short mixed set, or diagnostic-like activity only if existing product behavior supports it. Do not imply a scientifically validated assessment. The first action must lead to a real, available activity; if there is no published content for a selected exam, show a useful fallback and do not promise a test that cannot launch. Full Test timing and scoring stay in the shared exam engine and remain unchanged.

## Acceptance criteria

1. Hero CTA opens onboarding, and direct routes cannot bypass required first-run setup into a broken state.
2. Guest can finish without auth and sees an accurate local-progress explanation.
3. First-time signed-in user enters or resumes onboarding; established user resumes normal app use.
4. Sign-in/cancellation/back/refresh preserves answers and returns to the intended step without loops.
5. Exam and level choices come from config, with unavailable choices handled clearly.
6. Daily goal, weekly rhythm, appearance, and text size preview and save correctly; optional questions can be skipped.
7. A completed learner can edit preferences later without replaying onboarding.
8. Guest-to-account merge is idempotent and preserves attempts/answers.
9. Mobile, desktop, keyboard, screen-reader announcements, contrast, and reduced-motion behavior are checked in browser.
10. `npm run verify` and `npm run test:e2e` pass; the agent records actual results in `walkthrough.md` and `PROGRESS.md`.

## Explicit non-goals for this implementation

No reminders or notification permissions, paid plan upsell, scraped questions, new analytics without consent, exam-specific engine branches, or per-section Full Test timers. Those need separate product work and should not lengthen the first session.
