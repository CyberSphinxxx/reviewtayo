# ReviewTayo — Exam Scalability & Architecture Audit

**Date:** 2026-09-26 · **Scope:** Full-repository audit of the exam system (product/UX + technical/data architecture) · **Method:** static trace of actual implementation (imports, state stores, routes, persistence, quiz generation, progress calculation, tests). No code was changed during this audit.

---

# 1. Executive Summary

**Verdict: Mostly scalable — with one structural exception and a cluster of CSE literals outside the engine.**

ReviewTayo is in considerably better shape than a typical "one exam grown organically" codebase:

- The **exam engine is genuinely generic** (`src/features/exam-engine/`): question selection, scoring, timer, and session state machine consume an `ExamRuleConfig` and never branch on an exam identity. This is enforced in CI by `scripts/check-architecture.mjs`.
- A **workspace model already exists** (`src/lib/workspace/`): a workspace is a per-exam record holding examId, levelId, target date, daily goal, and study start date, with one active workspace. History, mistake bank, and bookmarks are stored **per workspace**, and the dashboard/plan/practice surfaces read them workspace-scoped. This is already an "enrollment" model, not a single global exam flag.
- Multi-exam **UI plumbing exists and is tested** (exam switcher, My Exams dialog, per-workspace storage isolation, `dashboard-multiexam.test.tsx`, `exam-switch-safety.test.ts`).
- The relational schema (`exams → exam_levels → subjects → topics → questions`, plus `exam_rules` per level+mode) is exam-generic on paper.

The structural exception: **the question pipeline is CSE-only in practice.** `src/features/practice/practice-service.ts` draws from the hardcoded `SEED_*` arrays in `src/db/seed-data.ts` (CSE levels/subjects/topics/questions/rules). The runner routes `/exams/[level]/quick|medium|full` have no exam segment and `generateStaticParams` enumerates CSE levels only. The database schema is never actually read by the practice flow — the live question bank is a client-side TypeScript bundle. A second exam cannot get questions without touching engine-adjacent code.

Around the engine, CSE-specific literals leak into generic infrastructure: workspace default date `"2027-03-14"`, preferences validation restricted to `["cse-professional","cse-subprofessional"]`, string-sniffing of human titles (`title.includes("subprof")`) to derive exam level in `ExamRunner` and in the cloud-sync API, a hardcoded `/exams/professional/${mode}` retake link on the results page, and ~29 hardcoded `/exams/professional/*` links across content and chrome. Exam state also lives in **four localStorage stores plus the URL plus a server table** (documented in §4), with write-through mirrors that the codebase already fights to keep consistent (see the "resurrect a stale countdown" comments in `target-exam.ts` / `preferences-service.ts`).

**Bottom line:** the app can host many exams at the *product* layer today (workspaces, isolation, catalog). It cannot yet host a second exam at the *content/pipeline* layer without refactoring the question source, runner routes, and a handful of title-sniffing/URL hardcodes. The architecture direction already chosen (workspace = enrollment, config-driven engine) is the right one; the remaining work is to finish routing the content layer through the same configuration discipline.

---

# 2. Current Exam Architecture

## 2.1 How the system actually works now

```text
┌──────────────────────────── CLIENT (all interactive exam state) ────────────────────────────┐
│                                                                                             │
│  localStorage "rt_workspaces_v1"          localStorage "rt_current_workspace_id_v1"          │
│  └─ ExamWorkspace[]  ◄── CANONICAL        └─ activeWorkspaceId                               │
│     { id, examId, levelId, trackName,                                                        │
│       targetExamDate, targetExamName,     WorkspaceService (src/lib/workspace/)              │
│       dailyGoal, studyStartDate }         useExamWorkspace() hook (change events + storage)  │
│                    │                                                                         │
│                    ├── mirrored into ──► localStorage "cse_guest_target_exam" /              │
│                    │                     "rt_ws_{id}_target_exam"  (TargetExamConfig)        │
│                    │                                                                         │
│                    ├── mirrored into ──► localStorage "csereviewph_user_preferences_v1"      │
│                    │                     study.{examId, levelId, targetDate, targetExamName, │
│                    │                     dailyGoal, planTemplate (global), ...}              │
│                    │                                                                         │
│                    └── per-workspace data ──► localStorage                                   │
│                        "rt_ws_{id}_history" | "_mistakes" | "_bookmarks" |                   │
│                        "rt_ws_{id}_attempt_*" | "rt_ws_{id}_draft_*"                         │
│                        (workspace_cse uses legacy "cse_guest_*" keys)                        │
│                                                                                              │
│  Global (not per exam): "cse_guest_streak" (streak + activeDates + checkIns),                 │
│  "cse_guest_daily_activity_{date}", "cse_guest_notes", cookie consent                        │
│                                                                                              │
│  Public-page hint only: "rt_level_{examSlug}" (useExamLevel — never the app state)            │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
                    │ reads                                     │ one-way push (button)
                    ▼                                           ▼
        EXAM_CATALOG (src/config/exams.ts)          POST /api/user/sync → PostgreSQL
        6 exams, only CSE "available"               test_attempts + user_answers + bookmarks
        levels[], subjects[], routes[],             (examLevelId inferred from the attempt
        mockSpecs, defaultTargetDate                 TITLE STRING; hardcodes CSE level IDs)
                    │
                    ▼
        Question pipeline: SEED_* arrays (src/db/seed-data.ts) — CSE ONLY —
        prepareExamSession(level, mode) → selectQuestionsForExam() → ExamRunner
        (the Drizzle schema exams/exam_levels/subjects/topics/questions is generic
         but is never queried by the practice flow; it only stores auth/contact/
         reports and receives sync writes)
```

## 2.2 What the exam system consists of

| Piece | Location | Generic? |
|---|---|---|
| Exam catalog (6 exams, metadata, levels, subjects, capabilities, routes, mock specs) | `src/config/exams.ts` | Yes — data-driven |
| Public directory of 69 PH exams (search, groups, goals) | `src/config/exam-directory.ts` | Yes |
| Workspace store (per-exam record + active pointer) | `src/lib/workspace/*` | Mostly (2 CSE literals) |
| Exam engine (selection, scoring, timer, state machine) | `src/features/exam-engine/` | **Yes, fully** (CI-enforced) |
| Question source | `src/db/seed-data.ts` (client bundle) | **No — CSE only** |
| Session builder | `src/features/practice/practice-service.ts` | Reads CSE seed data; per-mode defaults hardcoded |
| Runner routes | `src/app/(app)/exams/[level]/{quick,medium,full}` | Level-only; CSE levels enumerated statically |
| Dashboard shell + gate | `src/features/dashboard/AppShell.tsx` | Generic; 1 CSE label branch |
| Dashboard / plan / quests / achievements | `src/features/dashboard/*` | Generic, workspace-scoped reads |
| Exam switcher UI | `HeaderExamSwitcher.tsx` (currently unmounted), `ExamSubNav.tsx`, `MyExamsDialog.tsx` | Generic |
| Cloud sync | `src/app/api/user/sync/route.ts` | **No — CSE title sniffing, CSE FK IDs** |

---

# 3. Current User Exam Lifecycle

## State A — New visitor
- Lands on `/` (marketing home). **Not forced to choose an exam.** Header shows a plain "Choose an exam" pill linking to `/reviewers` (the 69-exam directory, only CSE live).
- They can take a diagnostic directly from the hero/chooser: `/exams/professional/quick` works **without any workspace** (guest-first design).
- Entering `/dashboard` with no workspace shows the AppShell gate: `DashboardOnboardingView` ("Choose one exam to build your workspace"). All other sidebar/tab items are **visually locked** (links redirect to `/dashboard`); `/settings` remains accessible.
- If the guest completes a test before choosing anything, `LocalStorageService.resolveWorkspaceId()` falls back to `"workspace_cse"`, so the attempt is written under the CSE key; the next migration run then *provisions a CSE workspace* from that history. The choice is therefore implicitly made for them by their first session.

## State B — User chooses CSE
- Choosing happens in `DashboardOnboardingView` ("Start preparing") → `WorkspaceService.createWorkspace({ examId, levelId })`.
- What is saved: an `ExamWorkspace` record (examId, levelId, trackName, target date/name, daily goal, studyStartDate) in `rt_workspaces_v1`, and `rt_current_workspace_id_v1` is set. CSE gets the fixed id `"workspace_cse"`.
- Semantics: this is **selected + active + enrolled simultaneously** — there is one concept, not three. It is persisted in localStorage, tied to the *browser*, not the account (accounts get a one-way push of attempts/bookmarks only). There is no separate "unlock."
- Source of truth: the workspace list *is* the choice record ("Empty list = nothing chosen" — documented in `target-exam.ts`). But three mirrors exist (target-exam key, preferences, workspace metadata) and are written through `saveTargetExamSummary()` / the preferences save-hook.

## State C — Track (Professional / Subprofessional)
- Represented as `levelId: "professional" | "subprofessional"` + `trackName` on the workspace, and separately as `preferences.study.levelId` with **CSE-prefixed ids** (`"cse-professional" | "cse-subprofessional"`, the only values `sanitizePreferences` accepts).
- The public pages also keep a *preview hint* `rt_level_cse` (never the app state — `useExamLevel`).
- What the code treats it as: a **level/variant of the exam** (`ExamLevel` in the catalog; `exam_levels` table in the schema). That modeling is correct. The id-format mismatch (`professional` vs `cse-professional`) between workspace and preferences is duplicated-state friction (see §4, F-03).
- Critically: **one workspace per examId, not per exam+level.** `createWorkspace` reuses the existing workspace for the same examId and just overwrites `levelId`. So track changes mutate the single CSE workspace — and its progress history is shared across tracks (see §27).

## State D — Returning user
- The active workspace id (`rt_current_workspace_id_v1`, fallback: most-recently-accessed workspace) determines what `/dashboard` opens into. Signed-in users see "Go to my dashboard" on the home hero. There is no exam chooser on the happy path — you land directly in the last exam's workspace.

## State E — User wants another exam
- Adding a second exam is already possible **as data/UI**: `MyExamsDialog` ("Add another examination" → `/reviewers`), `createWorkspace({ examId: "let" })` works, and `dashboard-multiexam.test.tsx` proves CSE and LET dashboards render isolated subjects/metrics and switch cleanly.
- What breaks for a *live* second exam: `/exams/{level}/...` has no exam segment; only CSE levels exist in `SEED_LEVELS`; the catalog flags non-CSE exams `coming-soon` and the onboarding/directory render them as non-interactive. So **CSE Professional + LET today = LET workspace with a dashboard, empty history, and no practice content** — not a crash, but not usable review either.

---

# 4. State Architecture (sources of truth)

Mapped stores:

| # | Store | Contents | Role today |
|---|---|---|---|
| 1 | `rt_workspaces_v1` + `rt_current_workspace_id_v1` (localStorage) | Workspaces; active pointer | **Intended canonical** ("The workspace list IS the choice record") |
| 2 | `cse_guest_target_exam` / `rt_ws_{id}_target_exam` (localStorage) | targetDate, examName, dailyGoal | Mirror of #1, written by `saveTargetExamConfig` (also mirrors back into #1) |
| 3 | `csereviewph_user_preferences_v1` (localStorage) | study.examId, study.levelId (CSE-only ids), study.targetDate/Name, planTemplate, display prefs | Partial mirror of #1 + global prefs. **examId here is stale** (nothing updates it away from "cse") |
| 4 | `rt_level_{examSlug}` (localStorage) | Public-page level preview | Explicitly *not* app state |
| 5 | URL | `/exams/{level}/{mode}` implies level; `/cse` implies exam | Presentation, not state |
| 6 | PostgreSQL (`test_attempts.exam_level_id`, `bookmarks`, …) | Cloud copies after manual sync | Write-only sink; no read-back, no reconciliation |
| 7 | React hooks | `useExamWorkspace` (list + active), `useExamLevel` (preview) | Derived from #1 / #4 |

**Verdict:** there *is* a designated single source of truth (#1) with deliberate write-through helpers (`saveTargetExamSummary`, the preferences save-hook), and regression tests pin this (`exam-state-regression.test.tsx`). But the system still carries three redundant copies of target date/name/goal, two competing level-id formats, and a stale `preferences.study.examId`. The mirror logic contains comments documenting past resurrection bugs; each mirror is another place a future bug can reintroduce drift.

**Fragmentation findings:**

- **F-01** — Target date/name/goal exist in stores #1, #2, #3 simultaneously. Intentional (migration/legacy), but every consumer must pick a precedence order (`getTargetExamSummary`: prefs date if 10 chars, else stored, else workspace).
- **F-02** — `planTemplate` (study plan strategy) is a **global** preference while everything else plan-related is per-workspace (see §10).
- **F-03** — Level id format mismatch: workspace `"subprofessional"` vs preferences `"cse-subprofessional"`; conversion is done ad hoc in `settings/study/page.tsx` and `getExamRoutesForLevel` (`levelId.startsWith("cse-")` strip).
- **F-04** — Preferences `sanitizePreferences` hard-validates level ids to the two CSE values; a future LET level id stored there would silently be reset to `cse-professional`.

---

# 5. Hardcoded CSE Dependencies

Severity: 🔴 blocks multi-exam · 🟠 wrong under multi-exam · 🟡 cosmetic/debt. "Expected content" items (exam copy, FAQ text, CSC data) are excluded — CSE content is allowed to be CSE-specific.

| Location | Dependency | Severity | Why it matters | Recommended direction |
|---|---|---|---|---|
| `src/db/seed-data.ts` (`SEED_EXAM/LEVELS/SUBJECTS/TOPICS/RULES/QUESTIONS`) | Entire question bank is one CSE-only client bundle | 🔴 | A second exam has nowhere to put questions without colliding with CSE arrays | Make the pipeline consume per-exam question sources (DB via server route, or generated per-exam seed bundles) keyed by examId+levelId |
| `src/features/practice/practice-service.ts` | Reads `SEED_*` directly; mode defaults (10/30/170 items, 10/30/190 min, 80%) hardcoded | 🔴 | Session building cannot serve other exams; `SEED_LEVELS[0]` fallback silently yields CSE | Resolve exam+level → rules from a registry/DB; mode defaults from `exam_rules`/catalog |
| `src/app/(app)/exams/[level]/{quick,medium,full}/page.tsx` | Route segment is level-only; `generateStaticParams` = CSE levels; `full` hardcodes `isPro ? 170 : 165`, `190 : 160` | 🔴 | Two exams with a `professional` level would collide on the same URL | `/exams/[exam]/[level]/[mode]` (or keep [level] but guarantee globally-unique level slugs and resolve exam from level) |
| `src/features/practice/ExamRunner.tsx:71` | `levelSlug = title.toLowerCase().includes("subprof") ? "subprofessional" : "professional"` — **derives exam level by sniffing the human-readable title**; also used for draft keys and `clearActiveDraft` on submit | 🔴 | Any exam/level whose title doesn't contain "subprof" is silently treated as CSE Professional; wrong draft isolation | Pass examId/levelId as props from the route; derive keys from them |
| `src/app/api/user/sync/route.ts:92` | `isSubpro = h.title?.includes("subprofessional")` → forces `examLevelId` to `"cse-professional"/"cse-subprofessional"` FKs | 🔴 | Non-CSE attempts cannot be synced (FK failure or misattributed to CSE); title-sniffing is data corruption risk | Sync payload carries examId/levelId (or question topic → level resolution server-side) |
| `src/features/results/ResultsView.tsx:346` | Retake link hardcodes `/exams/professional/${mode}` | 🟠 | A Subprofessional user's "Retake" re-enters the Professional pool; any other exam would too | Derive runner route from the attempt's exam/level (level-aware routes helper) |
| `src/lib/workspace/workspace-service.ts:132,138` | `"workspace_cse"` special id; default target date fallback `"2027-03-14"`; `examId === "cse" → "professional"` default | 🟠 | CSE literals inside the generic enrollment service | Use `exam.defaultTargetDate` only; generate ids uniformly |
| `src/lib/preferences/preferences-service.ts:84,270-274` | `validLevelIds = ["cse-professional","cse-subprofessional"]`; fallback name builds `"CSE-PPT Professional/Subprofessional"` for **any** exam; `DEFAULT_STUDY_PREFERENCES.levelId = "cse-professional"`; `targetDate: NEXT_UPCOMING_EXAM_DATE` (CSE constant) | 🟠 | Preferences layer cannot represent other exams; mirror can stamp a CSE-PPT name onto a LET workspace | Validate levelId against the active exam's catalog levels; defaults derived from active workspace |
| `src/lib/workspace/target-exam.ts` | `getExamConfig(...)?.shortName \|\| "My exam"` is fine, but the write path is entangled with the CSE-named legacy key | 🟡 | Naming misleads ("cse_guest_*" keys hold all exams' data) | Rename keys in a future storage version (with migration) |
| `src/lib/storage/local-storage-service.ts:220-221,882,1090-1091` | Migration/backup defaults `"2027-03-14"`, `"March 2027 CSE-PPT"`, `examId === "cse"` branch | 🟠 | Legacy import path fabricates CSE defaults for any exam | Default from catalog entry of the workspace's examId |
| `src/lib/storage/local-storage-service.ts:285` | `resolveWorkspaceId()` returns `"workspace_cse"` when nothing chosen | 🟠 | Writes a fabricated CSE workspace id (see §27 guest issue) | Return `null` and make callers handle "no workspace" (or auto-create from the exam actually being taken) |
| `src/features/dashboard/AppShell.tsx:269` | Sidebar target card: `examId === "cse" ? "CSE-PPT" : examId.toUpperCase()` | 🟡 | Display branch, not logic; generic shortName exists in catalog | Use `getExamConfig(examId).shortName` |
| `src/features/dashboard/ExamCalendarCard.tsx:418+` | CSE-only date presets with `examId === "cse"` branch; defaults `2027-03-14` | 🟠 | Presets should come from exam session data | Source presets from `EXAM_SESSIONS`/catalog `examDate` |
| `src/components/layout/ExamSubNav.tsx:107,120` | `overviewHref = "/cse"`; `mockHref` fallback `/exams/professional/full`; `shortName \|\| "CSE"`; level coercion `levelId === "subprofessional" ? ... : "professional"` (binary) | 🟠 | Sub-nav can never represent a second exam; level selection collapses everything else to Professional | Derive overview/info hrefs from `examConfig.routes`; drop the binary coercion |
| `src/app/(app)/practice/page.tsx:19,63` | `<ExamSubNav examId="cse" />`; maps workspace level → `"level-subpro"`/`"level-pro"` (incl. legacy `"track-subpro"` ids); subject list from CSE `SEED_LEVELS` only | 🟠 | Practice directory is CSE structurally, even though it has a coming-soon branch fed by the catalog | Unify subject/topic listing on the catalog; pass workspace examId |
| `src/config/practice-modes.ts` | `ExamRunnerLevel = "professional" \| "subprofessional"` type; hrefs templated `/exams/{level}/...` | 🟠 | Type bakes in CSE's two levels | Generalize to `string` (validated against catalog) |
| `src/config/exams.ts:497-510` | `getExamRoutesForLevel` strips `"cse-"` prefix; route templates use `replace("/professional/", …)` | 🟡 | String surgery compensating for the two id formats (F-03) | Fix id format at the source; keep helper generic |
| `~29 call sites` (Footer, LandingFooter, FAQ, About, not-found, history, mistakes, bookmarks, AchievementsView fallback, recommendation-engine fallback, ExamChooserRail, TryQuestionSection, …) | Hardcoded `/exams/professional/*` links | 🟠 | All CTAs route to CSE Professional regardless of active exam | Central runner-route helper (exists: `getExamRoutesForLevel`) used everywhere; content links acceptable as *content* |
| `src/features/dashboard/recommendation-engine.ts:44-48` | Fallback hrefs `/exams/professional/*`, `mockItems \|\| 170`, `mockMinutes \|\| 190` | 🟡 | CSE numbers as universal defaults | Require context (callers already pass it) |
| `src/lib/exam-guide/csc-data.ts` (`NEXT_UPCOMING_EXAM_DATE`) imported by `preferences-service` & `settings/study` | Verified-date feature assumes the user's exam is CSE | 🟠 | "Official nationwide CSE-PPT" verified-date option shown regardless of active exam | Per-exam verified session list (schema already has `EXAM_SESSIONS`) |
| `src/app/(public)/guides/[slug]`, `exam-guide/*`, `csc-data.ts` | CSE exam guide + directories | ✅ expected content | CSE content, correctly CSE-specific | n/a |
| `ResultsView` print header, CSC 80.00% copy, disclaimers | CSE-specific output | 🟡 | Would print CSE branding for other exams' results | Take name/threshold from attempt's exam config |

---

# 6. Exam-Specific vs Global Data

Based on actual storage keys and read paths (✓ = where it currently lives; ideal in parens when different):

| Data | Global | Exam (workspace) | Track (level) |
|---|:---:|:---:|:---:|
| Daily study streak (`cse_guest_streak`) | ✓ (✓ correct) | | |
| Daily questions answered (`cse_guest_daily_activity_*`) | ✓ (✓ correct) | | |
| Notes (`cse_guest_notes`) | ✓ (✓ correct) | | |
| UI/appearance/reading/privacy preferences | ✓ (✓ correct) | | |
| Daily goal (questions/day) | | ✓ (`workspace.dailyGoal`) | |
| Target exam date + name | | ✓ (×3 mirrors — see §4) | |
| Study start date | | ✓ (`workspace.studyStartDate`) | |
| Quiz / attempt history | | ✓ (`rt_ws_{id}_history`) | ✗ **shared across tracks** (should be filterable by level) |
| Mistake bank + Leitner SRS state | | ✓ (`rt_ws_{id}_mistakes`) | ✗ shared across tracks |
| Bookmarks | | ✓ (`rt_ws_{id}_bookmarks`) | ✗ shared across tracks |
| Active session drafts | | ✓ (`rt_ws_{id}_draft_{level}_{mode}`) | ✓ (level in key) |
| Subject readiness / weak areas | | ✓ (computed from ws history; subjects from catalog for ws examId+levelId) | partly (subject list is level-filtered; accuracy pool is not) |
| Weekly plan template (`planTemplate`) | ✓ **(should be per-exam/workspace)** | | |
| Week starts on / timezone / showStreak | ✓ (✓ correct) | | |
| Achievements snapshot | mixed | tests/subjects from ws | |
| `preferences.study.examId` / `levelId` | (duplicates #1 — stale) | | |
| Cloud-synced attempts (`test_attempts`) | | per attempt | `exam_level_id` per attempt (CSE ids only today) |

**Analytics-contamination check:** the feared failure ("weak areas = all incorrect answers, unfiltered") does **not** occur. `getSubjectReadiness`, mistakes, history, and quests are all read with the active `wsId`; the multi-exam test proves CSE's 90% does not appear on LET's dashboard. The contamination that *does* exist is subtler: **CSE Professional and CSE Subprofessional share one workspace**, so accuracy, weak areas, and the mistake bank blend both tracks' subjects (a Subprofessional-only learner sees "Analytical Ability — not measured"; a switcher sees mixed history).

---

# 7. Routing Audit

Current routes:

```text
/                          marketing home (exam chooser rail)
/reviewers                 69-exam directory (search/groups/goals)
/cse                       CSE landing (hardcoded exam route)
/cse/exam-guide[/section]  CSE official-info guide
/guides, /guides/{cse|let|cle|napolcom|nursing|bfp}   per-exam guide hubs (static)
/practice                  topic directory (CSE seed levels; ExamSubNav examId="cse")
/practice/[topicId]        topic drill runner
/exams/[level]/quick|medium|full     runner (level ∈ {professional, subprofessional})
/dashboard, /dashboard/{plan,practice,review,history,achievements,notes,learn,mistakes,bookmarks}
/results/[attemptId]
/settings/*
```

Observations:

- The **app workspace is exam-agnostic** (`/dashboard/*`, `/practice`, `/results/*`) with exam state supplied by the workspace store — this is the model the prompt describes as alternative B, and it is fine.
- The **runner routes are level-only** (`/exams/[level]/...`). This works only while exactly one exam is live. `generateStaticParams` enumerates CSE levels; `/exams/not-real` correctly 404s via `notFound()`.
- The **public exam page is exam-specific** (`/cse`) — expected for SEO, and the directory already carries `route` per directory exam.
- Guides already use per-exam static hubs (`/guides/let` etc.) — a good precedent for exam-scoped public routes.
- Sitemap and SEO are CSE-centric but data-driven where it counts (`GUIDE_HUBS`).

**Recommended future direction (not implemented now):** move runners to `/exams/[exam]/[level]/[mode]` (or resolve the exam from a globally-unique level slug and keep short URLs). Workspace routes can stay exam-agnostic as long as the active workspace supplies context, but every runner link must be generated from the active workspace (the `getExamRoutesForLevel` helper is the right seam — it just needs to stop special-casing `"cse-"`).

---

# 8. Database Audit

Actual persistence (Drizzle/PostgreSQL — note: **not Firebase**; the interactive product is localStorage-first with an optional one-way cloud push):

| Table | Contents | Exam-readiness |
|---|---|---|
| `users`, `sessions`, `accounts`, `verifications` (Better Auth) | identity | neutral |
| `exams`, `exam_levels`, `exam_rules` (per level+mode: itemCount, timeLimit, passingScore, subjectDistribution jsonb, flags) | exam config | **generic** — nothing populates beyond CSE seed |
| `subjects` (→ examLevel), `topics` (→ subject), `questions` (→ topic; language, difficulty, status lifecycle, relevantDate/expirationDate), `choices` | content | **generic**; per-exam supported by design |
| `test_attempts` (userId nullable, guestSessionId, examLevelId FK **NOT NULL**, mode, scores) | attempts | generic FK, but sync writes only CSE level ids (title sniffing) |
| `user_answers`, `bookmarks`, `user_progress` (per topic), `question_reports` | activity | generic; `user_progress` unused by the client flow |
| `contact` (90-day retention) | ops | neutral |

Key findings:

- **The generic schema is decorative for the practice flow.** No server route serves questions; `practice-service` reads the client-side seed bundle. The DB's exam tables are only written by `npm run db:seed` (CSE) and read by integration tests.
- **No user→exam relationship exists server-side.** There is no enrollment/profile-exam record; the sync API receives only attempts/bookmarks (+counts mistakes but never writes them). "Which exam is this user taking?" is unanswerable server-side today.
- **Stale/duplicated state risk on sync:** `onConflictDoNothing` push only; no pull, no device reconciliation. Two browsers with different active exams both push into the same flat attempt list; the account has no notion of workspaces.
- **Migration difficulty is low** precisely because little user data is server-side; the real migration surface is localStorage versioning (`rt_workspaces_v1` etc.).
- **Security rules/queries:** all user-scoped queries are indexed (`idx_test_attempts_user_id` etc.); sync route authenticates via Better Auth session. Multi-exam query scalability is fine at this scale (attempts indexed by user and level).

**Eventual shape (only when cloud becomes authoritative):** mirror the workspace concept — `users/{id}/examEnrollments/{examId+levelId}` (or a `user_exam_workspaces` table) holding targetDate/dailyGoal/studyStartDate/activeExamId, with attempts already carrying `examLevelId`. The current client-first architecture does **not** require this schema change to add the second exam.

---

# 9. Question Bank Audit

How a question knows where it belongs (`EngineQuestion` / `seed-data.ts`):

- `topicId/topicName/topicSlug`, `subjectId/subjectName/subjectSlug` — **denormalized strings on every question object**.
- Belonging to an exam/level is *derived*: question → topic → subject → `subject.examLevelId` → level. `prepareExamSession` builds the eligible pool by filtering topics whose subject belongs to the requested level. Subject-distribution quotas (`exam_rules.subjectDistribution`) then stratify selection. Difficulty and language (`en`/`fil`) are explicit fields. There is **no examId, no examVersion/syllabusYear, and no question-type field** on questions; there is also no shared-subject concept (CSE Professional and Subprofessional duplicate Verbal/Numerical/GenInfo subjects with distinct ids `sub-pro-*` / `sub-subpro-*` — content, if ever shared, would be duplicated too).

Can it support LET/NLE without `if (exam === "CSE")` scattered around? The **selection/scoring engine can** (it only sees subject ids and quotas). The **pipeline cannot yet**, because:

1. The pool source is the single `SEED_QUESTIONS` array; a second exam needs either namespaced seed bundles selected by examId, or a move to DB-backed retrieval (schema already supports it).
2. Topic ids are globally unique strings today (`top-pro-*`, `top-subpro-*`) — collisions across exams must be prevented by convention only.
3. Denormalized subject/topic names are persisted into localStorage attempts/mistakes/bookmarks — a subject rename or exam-version change leaves stale names in old records (acceptable, but worth knowing).
4. Anti-pattern check: the repo contains **no `if (exam === "let")` branching in engine code** (CI-checked). The two real violations of the spirit of that rule are the **title-sniffing** in `ExamRunner`/`sync` (deriving exam identity from display text) and the binary level coercion in `ExamSubNav` — both flagged in §5.

---

# 10. Study Plan Audit

Dependency trace for the weekly plan (`generateWeeklyPlan` — pure, generic, well-tested):

| Input | Source | Scope today |
|---|---|---|
| Exam target date | `workspace.targetExamDate` | per exam ✓ |
| Daily goal | `workspace.dailyGoal` | per exam ✓ |
| Study start date | `workspace.studyStartDate` | per exam ✓ |
| Subjects + accuracies | `getSubjectReadiness(wsId)` (catalog subjects for ws examId+levelId; accuracy from ws history) | per exam ✓ |
| Due SRS count | `getDueMistakes(wsId)` | per exam ✓ |
| Runner routes | `getExamRoutesForLevel(ws.examId, ws.levelId)` | per exam ✓ |
| **Plan template** | `preferences.study.planTemplate` | **GLOBAL — one template for all exams** |

So: a user with CSE (March 2027) and LET (September 2027) **does** get independent target dates, countdowns, subject lists, and per-exam regenerated plans — the plan is stateless and recomputed from the active workspace. The misplacements are:

- `planTemplate` should logically live on the workspace (a cram template for LET doesn't have to be the template for CSE).
- Milestones ("first full mock by …") derive from the exam date — fine per exam, but they're computed on the fly and not persisted, which is acceptable.
- `studyStartDate` is per workspace already (nice), but the plan window is only "currently informational" per the generator's own comment.

Nothing else in the plan is exam-specific; no fixes needed beyond relocating `planTemplate` (Phase 1/2 item).

---

# 11. Dashboard Audit

Classification of dashboard-era components:

| Component | Class | Notes |
|---|---|---|
| `AppShell` nav/tab bar, gate, lock behavior | GLOBAL (exam-gated) | One CSE label branch (`examId === "cse" ? "CSE-PPT" : …`) in the target card |
| `DashboardView` hero countdown, KPI tiles, quests, heatmap, recent sessions | EXAM-AWARE | Reads workspace date/name/goal; history/mistakes/bookmarks ws-scoped; streak global by design |
| `DashboardOnboardingView` | CONFIG-DRIVEN already | Renders `getAvailableExams()`/`getAllExams()`; level radios from catalog; upcoming list |
| `StudyPlanView` + `study-plan-generator` | EXAM-AWARE, engine generic | Template global (see §10) |
| `PracticeHubView` + `practice-modes.ts` | CONFIG-DRIVEN | Modes as data; `{level}` href templating |
| `useDailyQuests` / `daily-quests.ts` | EXAM-AWARE (pure engine) | Empty without workspace — correct gating |
| `AchievementsView` + `achievement-engine` | EXAM-AWARE | ws-scoped stats; one hardcoded runner fallback link |
| `SubjectProgressList`, `RecentSessionsList`, `PracticeActivityGrid`, `DashboardBento` | REUSABLE | Display-only; `RecentSessionsList` has a hardcoded professional quick link |
| `ExamCalendarCard` | SHOULD BE CONFIG-DRIVEN | CSE-only date presets, `2027-03-14` literals |
| Fixed scoring rules | SHOULD BE CONFIG-DRIVEN | `TARGET_ACCURACY = 80` and multiple `80` literals in dashboard/results; real value should come from `mockSpecs.passingScorePercentage`/`exam_rules` (helper exists, callers partially use it) |

No CSE graphics/descriptions live in dashboard components; the mascot and copy are exam-neutral. The gate ("no exam chosen" as a first-class state) is exactly right.

---

# 12. Exam Selection UX

**How it works today:** one verb, effectively **"Choose exam"** (onboarding card: "Choose one exam to build your workspace" → "Start preparing"). Choosing creates + activates a workspace in one step. Management ("My Exam Workspaces": switch / edit track+date / remove) exists in `MyExamsDialog`, reachable from the sub-nav pill. Terminology across the UI is already consistent: "workspace," "Start preparing," "Switch to this exam," "Choose an exam." The word "unlock" appears only in the sidebar lock tooltips ("Choose an exam to unlock") — as a gating metaphor before an exam exists, **not** as content monetization.

**Recommendation:** keep this shape.

- **Terminology: "My Exams" + "Start reviewing/preparing."** Avoid "enroll" (bureaucratic), avoid "unlock" (implies payment/restriction that doesn't exist — per §16 there is no entitlement system, and introducing the word now would set wrong expectations).
- **Lifecycle:** Browse (`/reviewers`) → Start reviewing on an exam (optionally pick track) → workspace created & activated → dashboard. This is Option 3 of the prompt (enrollment created automatically at "start"), which is what the code already does — keep it. It has zero onboarding friction, preserves guest-first usage, and the workspace record doubles as the enrollment.
- **Do not** require an explicit "Add to My Exams" step before anything is usable (Option 2's friction), and **do not** gate content behind per-exam locks (§16).
- The one UX gap: the **public header has no exam switcher** — `HeaderExamSwitcher` exists but is not mounted; switching lives in `ExamSubNav` (only on `/cse`, `/practice`, exam-guide pages) and in the dashboard's sidebar. With two live exams, switching must be reachable from the dashboard shell too.

---

# 13. Multi-Exam Support

Recommended behavior (all of which the workspace model already supports or nearly supports):

- **My Exams:** the workspace list, surfaced in one place (dialog exists; consider a first-class `/dashboard/exams` or header switcher). One workspace per exam (keep as-is; see §14 for the track caveat).
- **Active exam:** exactly one `currentWorkspaceId`, defaulting to most-recently-accessed. Every surface derives from it. Already true.
- **Switch exam:** `setCurrentWorkspace` + navigate to `/dashboard`. Already true; per-workspace data (history, mistakes, bookmarks, target, drafts) follows automatically; global data (streak, notes, daily counts, prefs) intentionally shared. Verified by `exam-switch-safety.test.ts`.
- **Completed exam:** no explicit concept today. Recommendation: a lightweight workspace status (`active | completed | archived`) — "completed" driven by the user (or a mock passing the full mock), which hides the countdown and changes the dashboard CTA to results/recap, **without deleting anything**.
- **Archived exam:** same status field; archived workspaces drop out of the switcher (visible under "My Exams → archived") while history remains queryable. Removal today is destructive-ish (see §27) and should become "archive" with an explicit "delete this exam's data" as the destructive option.
- **Per-exam data separation:** target date, daily goal, study plan inputs, history, weak areas — all already per workspace. `planTemplate` should join them (§10). Streak: global (decision in §20).

---

# 14. Recommended Domain Model

Adapted to what ReviewTayo actually has (the workspace *is* the enrollment — don't create a second concept):

```text
ExamDefinition (src/config/exams.ts EXAM_CATALOG  ← already exists)
├── metadata: id, slug, names, agency, category, availability, accent, href
├── levels[]            ← ExamLevel (track/variant: professional, elementary…)
│     ├── itemCount, durationMinutes            (runner specs)
│     └── subjects[] (levelIds filter)          ← ExamSubjectConfig
│           └── topics[]                        (question-bank grouping)
├── mockSpecs / per-mode rules          ← ExamMockSpecs, exam_rules table
├── capabilities (quick/medium/full/topic) + routes (info/practice/runner hrefs)
├── session calendar (examDate, defaults) ← EXAM_SESSIONS for verified dates
└── [future] access tier: free | premium      (§17)

UserExamWorkspace  (localStorage rt_workspaces_v1  ← exists; = enrollment)
├── id, examId, levelId, trackName
├── status: active | completed | archived        ← NEW (§13/§20)
├── targetExamDate, targetExamName, dailyGoal, studyStartDate
└── [move here] planTemplate

Per-workspace data (already keyed rt_ws_{id}_*)
├── attempt history + details
├── mistake bank (Leitner)
└── bookmarks, session drafts

Global user data (already global)
└── streak, daily activity, notes, display/privacy preferences
```

The only *structural* change versus today is the `status` field, relocating `planTemplate`, and (recommended) carrying `levelId` on each attempt summary so track-scoped analytics can be sliced without splitting workspaces (§27 "Track changed").

---

# 15. Recommended Future Architecture

```text
Exam Catalog (public surfaces: /, /reviewers, /guides/{exam})
        │  read-only, data-driven (already true)
        ▼
Exam Definition Registry  (EXAM_CATALOG + exam_rules / seed or DB content, keyed examId+levelId)
        │  single resolver: getExamRuntime(examId, levelId)
        │  → subjects, runner routes, mock specs, verified dates, capabilities
        ▼
Active Exam Context  (WorkspaceService + useExamWorkspace  ← keep; promote to the ONLY exam state)
        │  kill mirrors: preferences.study.examId/levelId/target* become derived reads
        ▼
Generic ReviewTayo Workspace  (/dashboard/*, practice hub, results, quests, achievements)
        │  consumes Active Exam Context only; zero exam literals (CSE defaults removed)
        ▼
Exam-Specific Configuration + Content  (per-exam question bundles / DB topics;
        runner routes /exams/[exam]/[level]/[mode]; per-exam guide hubs; session calendar)
```

This is deliberately *not* new state management: `useExamWorkspace` already behaves like the `ActiveExamContext` the prompt asks about (context-style hook, change events, storage sync). The work is **subtraction** (mirrors, literals, sniffing) plus **one seam** (the registry resolver), not new frameworks.

---

# 16. Migration Risks (existing CSE users/data)

What exists today that future changes must not break:

1. **Legacy localStorage namespaces.** Real users have data under `cse_guest_*`, `attempts_history`, `mistake_bank`, `bookmarked_question_ids`, `attempt_*`. The migration path (`runMigration`) provisions `workspace_cse` from real history and preserves ids. Any storage-version change must keep this idempotent migration and the `workspace_cse` stable id (it's load-bearing in `getWorkspaceStorageKey`).
2. **The "no exam chosen → first attempt fabricates CSE workspace" behavior.** Changing `resolveWorkspaceId` (§5) must decide what happens to the existing population that already has history under `workspace_cse` — answer: keep provisioning from history exactly as today; only change behavior for *new* visitors.
3. **Preferences mirror semantics.** Consumers currently rely on prefs for targetDate/dailyGoal precedence (`getTargetExamSummary`). Removing mirrors before rerouting readers would silently regress Settings↔Dashboard sync. Order: make readers workspace-only first, then stop writing mirrors, keeping `planTemplate` etc.
4. **v1/v2 backup JSON compatibility.** `importDataFromJson` synthesizes a CSE workspace for v1 backups. New exports should stay importable and old exports should keep importing (already handled; don't break the synthesizer).
5. **Sync API assumptions.** Existing cloud rows are all `cse-*` level ids with attempt ids derived from `att_{userId}_{h.id}`. Changing id derivation or examLevel mapping must remain conflict-idempotent (`onConflictDoNothing` keys).
6. **Track-switch progress sharing.** Today Professional↔Subprofessional history is shared; if per-track separation is introduced later, it must be *additive* (levelId on attempts + filters), not a data split, or existing users' dashboards appear empty.
7. **The `80%` target everywhere.** If passing thresholds become per-exam config, dashboards/results must read the config, or CSE users will see a changed number for no reason.

---

# 17. Free / Premium Future Compatibility (analysis only)

Current state: nothing is paid; the catalog has `availability` and the directory has `live` flags — availability is *build status*, not *entitlement*. The workspace model keeps access control naturally separate from exam identity: an entitlement check would attach to `ExamDefinition` / practice modes / question packs, and the UI already renders non-available exams as non-interactive cards (the same slot can render "Premium").

- Compatible already: `capabilities` per exam, `enabled` per practice mode, per-exam question bundles — each is a config flag away from tiered access without touching the engine.
- Anti-pattern to avoid (and not present today): `if (examId === "let") premium = true` in components. Prefer an `Entitlement → Resource` lookup at the registry boundary (e.g. `exam.accessTier`, `mode.requiredTier`) so the workspace/engine never learns about money.
- Verdict: no architectural blocker; nothing to build now. Do **not** introduce the word "unlock" for free exams (§12).

---

# 18. Implementation Roadmap

> **Status update (post-Phase 0 execution):** Items 1, 2, 5 (partial), 6 (partial), and 7 of
> Phase 0 are now implemented: explicit `examLevelId`/`trackId` props on `ExamRunner` with
> subject-based fallback resolution (`src/lib/exam-context.ts`) replacing all title-sniffing;
> identity propagated to `AttemptSummary`/`StoredAttemptDetails` and honored by the sync API
> (with a marked legacy shim, remove in Phase 1); config-driven full-mock specs in the runner
> page; catalog-derived retake routes (`getExamRunnerRouteForMode`); catalog-derived level
> validation in preferences; `planTemplate` moved onto the workspace (one-time migration);
> guest CSE fallback removed (`workspace_unassigned`); generic-surface `/exams/professional/*`
> links replaced with neutral or catalog-derived routes. Remaining Phase 0: items 3 and 4
> (workspace-removal key cleanup, backup completeness) — not yet done.

## Phase 0 — Critical bug fixes (before any refactor)
1. **Kill title-sniffing.** `ExamRunner` must receive `examId`/`levelId` as props (routes know them); `clearActiveDraft` on submit uses the same values. Sync API: carry exam/level in the payload instead of `title.includes("subprof")`.
2. **Results retake link** must use the attempt's level (`getExamRoutesForLevel`), not hardcoded `/exams/professional/${mode}`.
3. **Workspace removal honesty:** `MyExamsDialog` says history "will be deleted" but `removeWorkspace` leaves `rt_ws_{id}_*` keys orphaned. Either delete the workspace's keys (with confirm) or change the copy; add nothing else.
4. **Backup/sync completeness:** `exportAllGuestData`/`syncGuestDataToCloud` only cover the *active* workspace. Either iterate all workspaces (per-ws sections in the payload) or document the limitation in the export UI.
5. **Remove CSE literals from generic services:** `"2027-03-14"` fallback in `workspace-service` (use `exam.defaultTargetDate`), `"March 2027 CSE-PPT"` defaults in `local-storage-service`, `"CSE-PPT …"` fallback name in the preferences mirror.
6. **Level-id format unification (F-03):** stop generating `cse-*` prefs ids; accept-and-map legacy values, then delete the `startsWith("cse-")` hack in `getExamRoutesForLevel`.
7. Record `levelId` on `AttemptSummary`/`StoredAttemptDetails` (additive) so Phase 2 can slice tracks.

## Phase 1 — Normalize exam state (one authoritative context)
- Declare `WorkspaceService`/`useExamWorkspace` the single exam context. Convert `preferences.study.examId/levelId/targetDate/targetExamName/dailyGoal` to derived reads (keep `planTemplate`, display prefs global). Keep `saveTargetExamSummary` as the only write path. Keep the `rt_level_{slug}` public-preview hook exactly as scoped today.
- Mount the exam switcher in the dashboard shell (sidebar/header) — it currently exists only in `ExamSubNav`.

## Phase 2 — Introduce the scalable exam domain
- Add `ExamRuntimeResolver` (`getExamRuntime(examId, levelId)`) as the single seam for subjects, runner routes, mock specs, verified dates (absorbing `getExamRoutesForLevel`/`getExamMockSpecsForLevel`).
- Generalize `practice-service` to `prepareExamSession({ examId, levelId, mode, … })` reading from a per-exam content source; per-mode defaults move into `exam_rules`/catalog.
- Add `status: active|completed|archived` to workspaces (§13); workspace-removal becomes archive-with-delete.
- Per-track analytics: filter by attempt `levelId` (no data split).
- Move `planTemplate` onto the workspace (migrate the global value once).

## Phase 3 — Configuration-driven UI
- Replace remaining literals: `AppShell` target-card branch, `ExamCalendarCard` presets (use `EXAM_SESSIONS`), `TARGET_ACCURACY`/`80` literals (use `mockSpecs.passingScorePercentage`), `ExamSubNav` binary level coercion + hardcoded `/cse` overview, `practice/page.tsx` legacy `"track-*"` mapping.
- Centralize runner-link generation so the ~29 hardcoded `/exams/professional/*` links collapse to the resolver (content links may stay as content).

## Phase 4 — Multi-exam support (only if/when justified by a real second exam)
- Runner routes `/exams/[exam]/[level]/[mode]` with `generateStaticParams` from the registry; keep level-only URLs redirecting for bookmarks.
- My Exams as a first-class surface (upgrade dialog or `/dashboard/exams`); switcher in the public header.
- Completed/archived UX (recap dashboard state).

## Phase 5 — Add the second exam (the validation test)
- Use LET end-to-end: content authored per `skills/content-authoring/SKILL.md`, seed/DB ingestion, `capabilities` flipped, runner routes generated, dashboard/plan/quests verified against the multi-exam tests, sync payload carrying LET level ids. Anything that still needs a source edit beyond config+content is a regression against Phase 2.

---

# 19. Second-Exam Test

> **If we added LET tomorrow, what exactly would we currently need to change?**

Count: **~12 code locations plus content**, several inside generic infrastructure:

1. `src/db/seed-data.ts` — add `SEED_LEVELS/ SUBJECTS/ TOPICS/ RULES/ QUESTIONS` for LET (and ensure id namespaces don't collide with CSE's).
2. `src/features/practice/practice-service.ts` — resolve the exam from the level slug; today `SEED_LEVELS` is a flat CSE-only list and `level` alone is ambiguous.
3. `src/app/(app)/exams/[level]/{quick,medium,full}/page.tsx` — three route files need an exam dimension (`generateStaticParams`, lookup, titles); full's item/time hardcodes need LET values.
4. `src/config/exams.ts` — flip LET `availability`/`capabilities`; add `routes.practiceUrl/quickDrillUrl/fullMockUrl` (and verify `getExamRoutesForLevel` handles `let` + `elementary`/`secondary` — the `/professional/` replace hack must be reworked).
5. `src/features/practice/ExamRunner.tsx` — the `includes("subprof")` level detection misclassifies LET titles → must be fixed regardless (Phase 0).
6. `src/app/api/user/sync/route.ts` — LET attempts can't map to `exam_levels` FKs (title sniffing again) → must be fixed regardless.
7. `src/app/(app)/practice/page.tsx` — CSE `SEED_LEVELS` directory + `<ExamSubNav examId="cse" />`; needs exam-aware subject listing and nav.
8. `src/components/layout/ExamSubNav.tsx` — hardcoded `overviewHref="/cse"`, binary level coercion (`subprofessional ? … : professional`) would force LET into "Professional" labels.
9. `src/lib/preferences/preferences-service.ts` — `validLevelIds` whitelist rejects `let-*` level ids; verified-date constant is CSE.
10. Settings (`settings/study/page.tsx`) — hardwired Professional/Subprofessional radio cards and `examId === "cse"` track logic.
11. Content: LET guides/articles/FAQs (`src/lib/content/*`), guide hub exists; sitemap picks hubs up automatically.
12. Tests: `exam-state-regression`, `dashboard-multiexam` already exercise LET-as-data; runner-level and sync tests must be extended.

Estimate of coupling: **moderate-to-high** — the dashboard, workspaces, catalog, and directory would already work; the entire *content pipeline and runner routing* plus *four generic files with CSE literals* would not. That matches the executive summary: product layer ready, content layer not.

> **Under the recommended architecture, what would we need to change?**

1. **Author + register content:** LET questions/subjects/topics into the exam-keyed content source (DB or seed bundle), and `exam_rules` per LET level/mode.
2. **Catalog entry:** flip `availability`/`capabilities`, add session dates. (Data only.)
3. **Publish.** Nothing else — the resolver supplies subjects/routes/specs to the dashboard, practice hub, quests, achievements, plan, and runner; the workspace store, gate, switcher, isolation, and sync already handle `examId: "let"` (proven by existing tests); Phase 0–3 work removes every item from the list above.

The delta between the two lists is the measurable cost of the current coupling; closing it is the point of Phases 0–3.

---

# 20. Architecture Decision Summary

| Decision | Answer | Why |
|---|---|---|
| Use one `activeExamId` (currentWorkspaceId) | **YES** | Already exists; one active workspace keeps every surface consistent with zero per-page plumbing |
| Allow multiple exams per account | **YES** | Workspace list already supports it and tests prove isolation; keep "one at a time" as the default UX, not a restriction |
| Require exam selection before dashboard | **YES (already true)** | The gate is first-class and low-friction (one card, no signup); guests can still take diagnostics without choosing |
| Create enrollment when "Start reviewing" is clicked | **YES (already true)** | `createWorkspace` at "Start preparing" — no separate add step; workspace *is* the enrollment |
| Use "Unlock exam" terminology | **NO** | Nothing is locked or paid; the word implies restriction that doesn't exist (§16/§17). Use "My Exams / Start reviewing" |
| Target date stored per exam | **YES (already true)** | Lives on the workspace; single-workspace countdown derives from it |
| Progress stored per exam | **YES (already true)** | History/mistakes/bookmarks keyed `rt_ws_{id}_*`; keep streak global |
| Study plan stored per exam | **PARTIAL → YES** | Plan inputs are per workspace; `planTemplate` must move from global prefs to the workspace |
| Streak global or per exam | **GLOBAL** | Correct as implemented (habit metric, exam-independent); per-exam streaks would fragment motivation with no user value |
| Routes contain exam slug | **YES for runner routes** (`/exams/[exam]/[level]/[mode]`) | Level-only URLs cannot disambiguate two exams; workspace routes (`/dashboard/*`) stay exam-agnostic |
| Exam UI configuration-driven | **YES (target state)** | Catalog + resolver already power onboarding, directory, guides, practice hub; Phases 2–3 finish dashboard/settings/nav |
| One workspace per exam vs per exam+track | **One per exam (status quo), with levelId on attempts** | Tracks share one study campaign (goal/date) for most users; per-track slicing via attempt levelId avoids splitting existing users' history |
| Cloud sync becomes authoritative | **NOT NOW** | localStorage-first is a deliberate product property (RA 10173 privacy posture, offline use); mirror the workspace server-side only if cross-device sync becomes a requirement |

---

## Final answers

**Can ReviewTayo evolve from a CSE-focused reviewer into a scalable platform supporting many Philippine examinations without each new exam becoming its own hardcoded mini-website?**
Yes — conditionally. The product architecture (workspaces as enrollments, one active exam, config-driven catalog, zero-branching engine, per-exam data isolation) is already the right architecture and is tested. The one hard blocker is the content pipeline (CSE-only client bundle + level-only runner routes), and the main tax is a bounded set of CSE literals and title-sniffing in generic code, enumerated in §5 and §19. After Phases 0–3, adding an exam is content + config.

**What architecture and user lifecycle will allow future exams with the least duplication and maintenance cost?**
Keep and finish what's there: workspace = enrollment (created on "Start reviewing"), one active exam, per-workspace progress, global habit metrics; a single exam-runtime resolver feeding generic surfaces; runner routes carrying the exam slug; entitlement-free free access with tiering as a future config field. The full lifecycle recommendation is in §12/§13/§14, the phased path in §18.
