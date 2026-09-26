import type { EngineQuestion } from "@/features/exam-engine";
import type {
  ActiveExamSessionDraft,
  AttemptSummary,
  DailyActivityCell,
  GuestBackupPayload,
  StoredAttemptDetails,
  StoredBookmarkItem,
  StoredMistakeItem,
  StudyStreakData,
  SubjectReadinessMetric,
  TargetExamConfig,
} from "./types";
import { WORKSPACE_STORAGE_KEYS, type ExamWorkspace } from "@/lib/workspace/types";
import { getExamSubjects } from "@/config/exams";
import { NotesService, NOTES_STORAGE_KEY } from "./notes-service";
import type { SyncAttemptDetail, SyncPayloadV2 } from "./sync-payload";

// Storage Key Constants
export const STORAGE_KEYS = {
  HISTORY: "cse_guest_attempts_history",
  ATTEMPT_PREFIX: "cse_guest_attempt_",
  MISTAKES: "cse_guest_mistake_bank",
  BOOKMARKS: "cse_guest_bookmarks",
  STREAK: "cse_guest_streak",
  DRAFT_PREFIX: "cse_guest_draft_",
  TARGET_EXAM: "cse_guest_target_exam",
  DAILY_ACTIVITY_PREFIX: "cse_guest_daily_activity_",
  SRS_CLEARED: "cse_guest_srs_last_cleared",
  LEGACY_HISTORY: "attempts_history",
  LEGACY_MISTAKES: "mistake_bank",
  LEGACY_BOOKMARKS: "bookmarked_question_ids",
  LEGACY_ATTEMPT_PREFIX: "attempt_",
} as const;

export const LEITNER_INTERVAL_DAYS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1, // review daily
  2: 3, // review every 3 days
  3: 7, // review weekly
  4: 14, // review every 2 weeks
  5: 30, // mastered (monthly refresh)
};

export function calculateNextReviewDate(box: 1 | 2 | 3 | 4 | 5, fromDate = new Date()): string {
  const days = LEITNER_INTERVAL_DAYS[box];
  const next = new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000);
  return next.toISOString();
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeGetItem<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSetItem(key: string, value: unknown): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[LocalStorageService] Failed to set key "${key}":`, err);
    return false;
  }
}

function safeRemoveItem(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore removal errors
  }
}

export function getTodayString(d = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(d);
  } catch {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }
}

export function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getTodayString(d);
}

const DEFAULT_FALLBACK_SUBJECTS = [
  { id: "sub-pro-verbal", name: "Verbal Ability", slug: "verbal-ability", order: 1 },
  { id: "sub-pro-numerical", name: "Numerical Ability", slug: "numerical-ability", order: 2 },
  { id: "sub-pro-analytical", name: "Analytical Ability", slug: "analytical-ability", order: 3 },
  { id: "sub-pro-geninfo", name: "General Information", slug: "general-information", order: 4 },
  { id: "sub-subpro-clerical", name: "Clerical Operations", slug: "clerical-operations", order: 5 },
];

export class LocalStorageService {
  private static migrated = false;

  public static resetMigrationForTesting(): void {
    this.migrated = false;
  }

  /**
   * Automatically migrates legacy keys created in earlier iterations
   * into the modern, typed cse_guest_* namespace, and provisions the default
   * CSE workspace if existing user data is present.
   */
  public static runMigration(): void {
    if (!isBrowser() || this.migrated) return;

    try {
      // 1. Migrate legacy history
      const legacyHistoryRaw = window.localStorage.getItem(STORAGE_KEYS.LEGACY_HISTORY);
      const modernHistoryRaw = window.localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (legacyHistoryRaw && !modernHistoryRaw) {
        const parsed = JSON.parse(legacyHistoryRaw);
        if (Array.isArray(parsed)) {
          const transformed: AttemptSummary[] = parsed.map((item) => ({
            id: item.id || `migrated-${Date.now()}`,
            title: item.title || "Practice Exam",
            mode: item.mode || "practice",
            percentage: typeof item.percentage === "number" ? item.percentage : 0,
            rawScore: typeof item.percentage === "number" ? Math.round(item.percentage * 0.1) : 0,
            totalQuestions: 10,
            passed: Boolean(item.passed),
            date: item.date || new Date().toISOString(),
          }));
          window.localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(transformed));
        }
      }

      // 2. Migrate legacy mistakes
      const legacyMistakesRaw = window.localStorage.getItem(STORAGE_KEYS.LEGACY_MISTAKES);
      const modernMistakesRaw = window.localStorage.getItem(STORAGE_KEYS.MISTAKES);
      if (legacyMistakesRaw && !modernMistakesRaw) {
        const parsed = JSON.parse(legacyMistakesRaw);
        if (Array.isArray(parsed)) {
          const transformed: StoredMistakeItem[] = parsed.map((q: EngineQuestion) => {
            const correctChoice = q.choices?.find((c) => c.isCorrect);
            return {
              id: q.id,
              question: q,
              attemptId: "legacy-attempt",
              correctChoiceId: correctChoice?.id,
              addedAt: new Date().toISOString(),
              reviewCount: 0,
            };
          });
          window.localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(transformed));
        }
      }

      // 3. Migrate legacy bookmarks
      const legacyBookmarksRaw = window.localStorage.getItem(STORAGE_KEYS.LEGACY_BOOKMARKS);
      const modernBookmarksRaw = window.localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      if (legacyBookmarksRaw && !modernBookmarksRaw) {
        const parsed = JSON.parse(legacyBookmarksRaw);
        if (Array.isArray(parsed)) {
          const transformed: StoredBookmarkItem[] = [];
          for (const item of parsed) {
            if (typeof item === "string") {
              transformed.push({
                id: item,
                question: {
                  id: item,
                  topicId: "legacy",
                  topicName: "General Review",
                  topicSlug: "general",
                  subjectId: "sub-legacy",
                  subjectName: "General Review",
                  subjectSlug: "general",
                  questionText: `Bookmarked Item ${item}`,
                  explanation: "",
                  difficulty: "medium",
                  language: "en",
                  choices: [],
                },
                bookmarkedAt: new Date().toISOString(),
              });
            } else if (item && typeof item === "object" && (item as StoredBookmarkItem).id) {
              transformed.push(item as StoredBookmarkItem);
            }
          }
          window.localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(transformed));
        }
      }

      // 4. Migrate or initialize user workspaces (idempotent)
      const workspacesRaw = window.localStorage.getItem(WORKSPACE_STORAGE_KEYS.WORKSPACES);
      if (!workspacesRaw) {
        const hasHistory = Boolean(window.localStorage.getItem(STORAGE_KEYS.HISTORY));
        const hasMistakes = Boolean(window.localStorage.getItem(STORAGE_KEYS.MISTAKES));
        const hasBookmarks = Boolean(window.localStorage.getItem(STORAGE_KEYS.BOOKMARKS));
        const hasTarget = Boolean(window.localStorage.getItem(STORAGE_KEYS.TARGET_EXAM));
        const hasStreak = Boolean(window.localStorage.getItem(STORAGE_KEYS.STREAK));
        // Preferences alone do NOT justify provisioning: a visitor who only
        // toggled a theme never chose an exam. Only real study history does.
        // Prefs still inform the LEVEL below once provisioning is justified.
        const hasPrefs = Boolean(window.localStorage.getItem("csereviewph_user_preferences_v1"));

        if (hasHistory || hasMistakes || hasBookmarks || hasTarget || hasStreak) {
          let targetDate = "2027-03-14";
          let examName = "March 2027 CSE-PPT";
          let dailyGoal = 25;
          let levelId = "professional";
          let trackName = "Professional";

          if (hasTarget) {
            try {
              const parsedTarget = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.TARGET_EXAM)!);
              if (parsedTarget?.targetDate) targetDate = parsedTarget.targetDate;
              if (parsedTarget?.examName) examName = parsedTarget.examName;
              if (parsedTarget?.dailyGoal) dailyGoal = parsedTarget.dailyGoal;
            } catch {
              // Ignore target parse error
            }
          }

          if (hasPrefs) {
            try {
              const parsedPrefs = JSON.parse(window.localStorage.getItem("csereviewph_user_preferences_v1")!);
              if (parsedPrefs?.study?.levelId === "cse-subprofessional") {
                levelId = "subprofessional";
                trackName = "Subprofessional";
              }
            } catch {
              // Ignore prefs parse error
            }
          }

          const cseWorkspace: ExamWorkspace = {
            id: "workspace_cse",
            examId: "cse",
            levelId,
            trackName,
            targetExamDate: targetDate,
            targetExamName: examName,
            dailyGoal,
            createdAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
          };

          window.localStorage.setItem(WORKSPACE_STORAGE_KEYS.WORKSPACES, JSON.stringify([cseWorkspace]));
          window.localStorage.setItem(WORKSPACE_STORAGE_KEYS.CURRENT_WORKSPACE_ID, "workspace_cse");
        } else {
          // Brand new visitor with no prior data
          window.localStorage.setItem(WORKSPACE_STORAGE_KEYS.WORKSPACES, JSON.stringify([]));
          window.localStorage.removeItem(WORKSPACE_STORAGE_KEYS.CURRENT_WORKSPACE_ID);
        }
      }

      // 5. One-time migration (guide §54): the weekly plan template used to be
      // a GLOBAL preference; it belongs to the exam workspace. Move it once,
      // then remove the global value so it can never leak across exams.
      try {
        const prefsRaw = window.localStorage.getItem("csereviewph_user_preferences_v1");
        if (prefsRaw) {
          const prefs = JSON.parse(prefsRaw);
          const template = prefs?.study?.planTemplate;
          if (typeof template === "string" && template) {
            const workspaces = JSON.parse(
              window.localStorage.getItem(WORKSPACE_STORAGE_KEYS.WORKSPACES) || "[]"
            ) as ExamWorkspace[];
            const currentId = window.localStorage.getItem(WORKSPACE_STORAGE_KEYS.CURRENT_WORKSPACE_ID);
            const target = workspaces.find((w) => w.id === currentId) || workspaces[0];
            if (target && !target.studyPlanTemplate) {
              const migrated = workspaces.map((w) =>
                w.id === target.id ? { ...w, studyPlanTemplate: template } : w
              );
              window.localStorage.setItem(WORKSPACE_STORAGE_KEYS.WORKSPACES, JSON.stringify(migrated));
            }
            delete prefs.study.planTemplate;
            window.localStorage.setItem("csereviewph_user_preferences_v1", JSON.stringify(prefs));
          }
        }
      } catch {
        // Non-fatal template migration failure
      }

      this.migrated = true;
    } catch (e) {
      console.warn("[LocalStorageService] Migration skipped or failed:", e);
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Multi-Workspace Storage Keys & Resolution                                  */
  /* -------------------------------------------------------------------------- */

  public static resolveWorkspaceId(workspaceId?: string): string {
    if (workspaceId) return workspaceId;
    // Resolution must be stable within a call chain: runMigration() provisions
    // the workspace for users with legacy data, and some methods resolve keys
    // before any other call has triggered migration. It is idempotent.
    this.runMigration();
    const currentId = safeGetItem<string | null>(WORKSPACE_STORAGE_KEYS.CURRENT_WORKSPACE_ID, null);
    if (currentId) return currentId;
    const workspaces = safeGetItem<ExamWorkspace[]>(WORKSPACE_STORAGE_KEYS.WORKSPACES, []);
    // No CSE fabrication (guide §26): a visitor who has not chosen an exam
    // gets a neutral bucket — their first attempts must not silently become
    // CSE progress. Real workspaces are created only by explicit choice.
    return workspaces[0]?.id ?? "workspace_unassigned";
  }

  public static getWorkspaceStorageKey(
    category: "history" | "mistakes" | "bookmarks" | "target_exam" | "attempt_prefix" | "draft_prefix",
    workspaceId?: string
  ): string {
    const wsId = this.resolveWorkspaceId(workspaceId);
    if (wsId === "workspace_cse") {
      switch (category) {
        case "history":
          return STORAGE_KEYS.HISTORY;
        case "mistakes":
          return STORAGE_KEYS.MISTAKES;
        case "bookmarks":
          return STORAGE_KEYS.BOOKMARKS;
        case "target_exam":
          return STORAGE_KEYS.TARGET_EXAM;
        case "attempt_prefix":
          return STORAGE_KEYS.ATTEMPT_PREFIX;
        case "draft_prefix":
          return STORAGE_KEYS.DRAFT_PREFIX;
      }
    }
    switch (category) {
      case "history":
        return `rt_ws_${wsId}_history`;
      case "mistakes":
        return `rt_ws_${wsId}_mistakes`;
      case "bookmarks":
        return `rt_ws_${wsId}_bookmarks`;
      case "target_exam":
        return `rt_ws_${wsId}_target_exam`;
      case "attempt_prefix":
        return `rt_ws_${wsId}_attempt_`;
      case "draft_prefix":
        return `rt_ws_${wsId}_draft_`;
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Active Exam Session Drafts (Auto-Save & Resumption)                        */
  /* -------------------------------------------------------------------------- */

  public static getDraftKey(levelSlug: string, mode: string, topicId?: string, workspaceId?: string): string {
    const prefix = this.getWorkspaceStorageKey("draft_prefix", workspaceId);
    return `${prefix}${levelSlug}_${mode}${topicId ? `_${topicId}` : ""}`;
  }

  public static saveActiveDraft(draft: ActiveExamSessionDraft, workspaceId?: string): boolean {
    const key = this.getDraftKey(
      draft.levelSlug,
      draft.mode,
      draft.questions[0]?.topicId && draft.mode === "practice" ? draft.questions[0].topicId : undefined,
      workspaceId
    );
    return safeSetItem(key, {
      ...draft,
      lastSavedAt: new Date().toISOString(),
    });
  }

  public static getActiveDraft(
    levelSlug: string,
    mode: string,
    topicId?: string,
    workspaceId?: string
  ): ActiveExamSessionDraft | null {
    const key = this.getDraftKey(levelSlug, mode, topicId, workspaceId);
    return safeGetItem<ActiveExamSessionDraft | null>(key, null);
  }

  public static clearActiveDraft(levelSlug: string, mode: string, topicId?: string, workspaceId?: string): void {
    const key = this.getDraftKey(levelSlug, mode, topicId, workspaceId);
    safeRemoveItem(key);
  }

  /* -------------------------------------------------------------------------- */
  /* Completed Attempts & History                                               */
  /* -------------------------------------------------------------------------- */

  public static getAttemptHistory(workspaceId?: string): AttemptSummary[] {
    this.runMigration();
    const key = this.getWorkspaceStorageKey("history", workspaceId);
    return safeGetItem<AttemptSummary[]>(key, []);
  }

  public static getAttemptDetails(attemptId: string, workspaceId?: string): StoredAttemptDetails | null {
    this.runMigration();
    const prefix = this.getWorkspaceStorageKey("attempt_prefix", workspaceId);
    const modern = safeGetItem<StoredAttemptDetails | null>(`${prefix}${attemptId}`, null);
    if (modern) return modern;

    // Check legacy key format for CSE
    const wsId = this.resolveWorkspaceId(workspaceId);
    if (wsId === "workspace_cse") {
      return safeGetItem<StoredAttemptDetails | null>(
        `${STORAGE_KEYS.LEGACY_ATTEMPT_PREFIX}${attemptId}`,
        null
      );
    }
    return null;
  }

  public static recordCompletedAttempt(attempt: StoredAttemptDetails, workspaceId?: string): void {
    this.runMigration();

    // 1. Save detailed attempt record
    const prefix = this.getWorkspaceStorageKey("attempt_prefix", workspaceId);
    safeSetItem(`${prefix}${attempt.id}`, attempt);

    // 2. Append to history summaries
    const historyKey = this.getWorkspaceStorageKey("history", workspaceId);
    const history = this.getAttemptHistory(workspaceId);
    const summary: AttemptSummary = {
      id: attempt.id,
      title: attempt.title,
      examLevelId: attempt.examLevelId,
      mode: attempt.mode,
      percentage: attempt.scoreResult.percentageScore,
      rawScore: attempt.scoreResult.rawScore,
      totalQuestions: attempt.scoreResult.totalQuestions,
      passed: attempt.scoreResult.isPassed,
      date: attempt.completedAt,
    };

    // Prepend to show most recent first
    const updatedHistory = [summary, ...history.filter((h) => h.id !== attempt.id)];
    safeSetItem(historyKey, updatedHistory);

    // Evict detailed attempt records beyond the 20 most recent to prevent localStorage quota exhaustion
    const MAX_DETAILED_ATTEMPTS = 20;
    if (updatedHistory.length > MAX_DETAILED_ATTEMPTS) {
      const toEvict = updatedHistory.slice(MAX_DETAILED_ATTEMPTS);
      for (const item of toEvict) {
        safeRemoveItem(`${prefix}${item.id}`);
        if (this.resolveWorkspaceId(workspaceId) === "workspace_cse") {
          safeRemoveItem(`${STORAGE_KEYS.LEGACY_ATTEMPT_PREFIX}${item.id}`);
        }
      }
    }

    // 3. Update Mistake Bank with incorrect questions for this workspace
    const mistakesKey = this.getWorkspaceStorageKey("mistakes", workspaceId);
    const currentMistakes = this.getMistakeBank(workspaceId);
    const mistakeMap = new Map<string, StoredMistakeItem>(currentMistakes.map((m) => [m.id, m]));

    const answersMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

    for (const q of attempt.questions) {
      const ans = answersMap.get(q.id);
      const correctChoice = q.choices.find((c) => c.isCorrect);
      const isCorrect = ans?.selectedChoiceId && ans.selectedChoiceId === correctChoice?.id;

      if (!isCorrect) {
        const existing = mistakeMap.get(q.id);
        if (existing) {
          // Demote to Box 1, reset streak, due immediately
          mistakeMap.set(q.id, {
            ...existing,
            attemptId: attempt.id,
            selectedChoiceId: ans?.selectedChoiceId,
            reviewCount: existing.reviewCount + 1,
            box: 1,
            consecutiveCorrect: 0,
            lastReviewedAt: attempt.completedAt,
            nextReviewDue: calculateNextReviewDate(1, new Date(attempt.completedAt)),
          });
        } else {
          mistakeMap.set(q.id, {
            id: q.id,
            question: q,
            attemptId: attempt.id,
            selectedChoiceId: ans?.selectedChoiceId,
            correctChoiceId: correctChoice?.id,
            addedAt: attempt.completedAt,
            reviewCount: 1,
            box: 1,
            consecutiveCorrect: 0,
            lastReviewedAt: attempt.completedAt,
            nextReviewDue: new Date(attempt.completedAt).toISOString(), // immediately due
          });
        }
      } else if (attempt.mode === "mistakes") {
        // Correct answer during a mistake review drill advances Leitner box
        const existing = mistakeMap.get(q.id);
        if (existing) {
          const currentBox = existing.box || 1;
          const nextBox = Math.min(5, currentBox + 1) as 1 | 2 | 3 | 4 | 5;
          const consecutive = (existing.consecutiveCorrect || 0) + 1;
          mistakeMap.set(q.id, {
            ...existing,
            box: nextBox,
            consecutiveCorrect: consecutive,
            reviewCount: existing.reviewCount + 1,
            lastReviewedAt: attempt.completedAt,
            nextReviewDue: calculateNextReviewDate(nextBox, new Date(attempt.completedAt)),
          });
        }
      }
    }

    safeSetItem(mistakesKey, Array.from(mistakeMap.values()));

    // 4. Update Study Streak & Daily Questions Count (Platform-wide global streak)
    this.addDailyQuestionsAnswered(attempt.answers.length);
    this.recordDailyActivity();

    // 5. If every mistake-bank item is now scheduled in the future, remember
    //    today as the most recent "clean slate" date (Clean-slate badge).
    this.markSrsDueCleared(workspaceId);

    // 6. Clean up the active draft for the exam session that just completed.
    // The attempt carries its explicit examLevelId (guide §22); legacy records
    // without one get no speculative draft deletion — the generic draft-clear
    // paths in the runner already handle normal exits.
    if (attempt.examLevelId) {
      this.clearActiveDraft(attempt.examLevelId, attempt.mode, undefined, workspaceId);
    }
  }

  public static deleteAttempt(attemptId: string, workspaceId?: string): void {
    const historyKey = this.getWorkspaceStorageKey("history", workspaceId);
    const prefix = this.getWorkspaceStorageKey("attempt_prefix", workspaceId);
    const history = this.getAttemptHistory(workspaceId);
    const updated = history.filter((h) => h.id !== attemptId);
    safeSetItem(historyKey, updated);
    safeRemoveItem(`${prefix}${attemptId}`);
    if (this.resolveWorkspaceId(workspaceId) === "workspace_cse") {
      safeRemoveItem(`${STORAGE_KEYS.LEGACY_ATTEMPT_PREFIX}${attemptId}`);
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Mistake Bank                                                               */
  /* -------------------------------------------------------------------------- */

  public static getMistakeBank(workspaceId?: string): StoredMistakeItem[] {
    this.runMigration();
    const key = this.getWorkspaceStorageKey("mistakes", workspaceId);
    return safeGetItem<StoredMistakeItem[]>(key, []);
  }

  public static removeMistake(questionId: string, workspaceId?: string): void {
    const key = this.getWorkspaceStorageKey("mistakes", workspaceId);
    const current = this.getMistakeBank(workspaceId);
    const filtered = current.filter((m) => m.id !== questionId);
    safeSetItem(key, filtered);
  }

  public static clearMistakeBank(workspaceId?: string): void {
    const key = this.getWorkspaceStorageKey("mistakes", workspaceId);
    safeSetItem(key, []);
    if (this.resolveWorkspaceId(workspaceId) === "workspace_cse") {
      safeRemoveItem(STORAGE_KEYS.LEGACY_MISTAKES);
    }
  }

  /**
   * Returns mistake items that are currently due for spaced repetition review
   * (items in Box 1-4 whose nextReviewDue is now or in the past).
   */
  public static getDueMistakes(workspaceId?: string): StoredMistakeItem[] {
    const all = this.getMistakeBank(workspaceId);
    const now = Date.now();
    return all.filter((m) => {
      const box = m.box || 1;
      if (box >= 5) return false; // Box 5 is mastered
      if (!m.nextReviewDue) return true; // Legacy items without date are due immediately
      return new Date(m.nextReviewDue).getTime() <= now;
    });
  }

  /**
   * Updates an item's Leitner box after a flashcard or drill response.
   */
  public static updateMistakeSRS(
    questionId: string,
    isCorrect: boolean,
    workspaceId?: string
  ): StoredMistakeItem | null {
    const key = this.getWorkspaceStorageKey("mistakes", workspaceId);
    const all = this.getMistakeBank(workspaceId);
    const idx = all.findIndex((m) => m.id === questionId);
    if (idx === -1) return null;

    const item = all[idx];
    const now = new Date();
    let updatedItem: StoredMistakeItem;

    if (isCorrect) {
      const currentBox = item.box || 1;
      const nextBox = Math.min(5, currentBox + 1) as 1 | 2 | 3 | 4 | 5;
      const consecutive = (item.consecutiveCorrect || 0) + 1;
      updatedItem = {
        ...item,
        box: nextBox,
        consecutiveCorrect: consecutive,
        reviewCount: item.reviewCount + 1,
        lastReviewedAt: now.toISOString(),
        nextReviewDue: calculateNextReviewDate(nextBox, now),
      };
    } else {
      updatedItem = {
        ...item,
        box: 1,
        consecutiveCorrect: 0,
        reviewCount: item.reviewCount + 1,
        lastReviewedAt: now.toISOString(),
        nextReviewDue: calculateNextReviewDate(1, now),
      };
    }

    all[idx] = updatedItem;
    safeSetItem(key, all);
    return updatedItem;
  }

  /**
   * Directly marks a mistake item as Mastered (Leitner Box 5).
   */
  public static markMistakeMastered(questionId: string, workspaceId?: string): void {
    const key = this.getWorkspaceStorageKey("mistakes", workspaceId);
    const all = this.getMistakeBank(workspaceId);
    const idx = all.findIndex((m) => m.id === questionId);
    if (idx === -1) return;

    all[idx] = {
      ...all[idx],
      box: 5,
      consecutiveCorrect: (all[idx].consecutiveCorrect || 0) + 1,
      lastReviewedAt: new Date().toISOString(),
      nextReviewDue: calculateNextReviewDate(5, new Date()),
    };
    safeSetItem(key, all);
  }

  /**
   * Retrieves summary counts by Leitner box for visual progress indicators.
   */
  public static getMistakeStats(workspaceId?: string): {
    total: number;
    dueCount: number;
    masteredCount: number;
    byBox: Record<1 | 2 | 3 | 4 | 5, number>;
  } {
    const all = this.getMistakeBank(workspaceId);
    const now = Date.now();
    const byBox: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let dueCount = 0;
    let masteredCount = 0;

    for (const m of all) {
      const box = (m.box || 1) as 1 | 2 | 3 | 4 | 5;
      byBox[box] = (byBox[box] || 0) + 1;
      if (box === 5) {
        masteredCount++;
      } else if (!m.nextReviewDue || new Date(m.nextReviewDue).getTime() <= now) {
        dueCount++;
      }
    }

    return {
      total: all.length,
      dueCount,
      masteredCount,
      byBox,
    };
  }

  /* -------------------------------------------------------------------------- */
  /* Bookmarks                                                                  */
  /* -------------------------------------------------------------------------- */

  public static getBookmarks(workspaceId?: string): StoredBookmarkItem[] {
    this.runMigration();
    const key = this.getWorkspaceStorageKey("bookmarks", workspaceId);
    return safeGetItem<StoredBookmarkItem[]>(key, []);
  }

  public static isBookmarked(questionId: string, workspaceId?: string): boolean {
    const bookmarks = this.getBookmarks(workspaceId);
    return bookmarks.some((b) => b.id === questionId);
  }

  public static toggleBookmark(question: EngineQuestion, notes?: string, workspaceId?: string): boolean {
    const key = this.getWorkspaceStorageKey("bookmarks", workspaceId);
    const bookmarks = this.getBookmarks(workspaceId);
    const existsIndex = bookmarks.findIndex((b) => b.id === question.id);

    if (existsIndex >= 0) {
      // Remove
      bookmarks.splice(existsIndex, 1);
      safeSetItem(key, bookmarks);
      return false;
    } else {
      // Add
      bookmarks.unshift({
        id: question.id,
        question,
        bookmarkedAt: new Date().toISOString(),
        notes,
      });
      safeSetItem(key, bookmarks);
      return true;
    }
  }

  public static removeBookmark(questionId: string, workspaceId?: string): void {
    const key = this.getWorkspaceStorageKey("bookmarks", workspaceId);
    const bookmarks = this.getBookmarks(workspaceId);
    const filtered = bookmarks.filter((b) => b.id !== questionId);
    safeSetItem(key, filtered);
  }

  /* -------------------------------------------------------------------------- */
  /* Study Streak & Activity Tracking (Platform-wide)                           */
  /* -------------------------------------------------------------------------- */

  public static getStudyStreak(): StudyStreakData {
    const raw = safeGetItem<StudyStreakData>(STORAGE_KEYS.STREAK, {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: "",
      activeDates: [],
      checkInDates: [],
    });

    const today = getTodayString();
    const yesterday = getYesterdayString();

    // If last active date is today or yesterday, streak is retained.
    // If older, streak has expired back to 0 (while preserving longestStreak).
    let activeStreak = raw.currentStreak;
    if (raw.lastActiveDate && raw.lastActiveDate !== today && raw.lastActiveDate !== yesterday) {
      activeStreak = 0;
    }

    return {
      ...raw,
      currentStreak: activeStreak,
      checkInDates: raw.checkInDates || [],
    };
  }

  public static recordDailyCheckIn(): void {
    const current = this.getStudyStreak();
    const today = getTodayString();
    const checkIns = current.checkInDates || [];
    if (!checkIns.includes(today)) {
      const updated: StudyStreakData = {
        ...current,
        checkInDates: [...checkIns, today],
      };
      safeSetItem(STORAGE_KEYS.STREAK, updated);
    }
  }

  public static formatDayStreak(days: number): string {
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  /**
   * Generates continuous daily cells for the activity grid across the last N weeks
   * up to today, mapped in Asia/Manila date keys.
   */
  public static getActivityGridData(weeks = 12, workspaceId?: string): DailyActivityCell[] {
    const today = getTodayString();
    const streak = this.getStudyStreak();
    const history = this.getAttemptHistory(workspaceId);
    const checkIns = new Set(streak.checkInDates || []);
    const activeDates = new Set(streak.activeDates || []);

    const cells: DailyActivityCell[] = [];
    const totalDays = weeks * 7;

    const now = new Date();
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = getTodayString(d);
      const questionCount = this.getDailyQuestionsAnswered(dateStr);
      const hasCheckIn = checkIns.has(dateStr) || activeDates.has(dateStr);
      const sessionsCount = history.filter((h) => h.date && h.date.startsWith(dateStr)).length;

      let activityLevel: 0 | 1 | 2 | 3 = 0;
      if (questionCount >= 26) {
        activityLevel = 3;
      } else if (questionCount >= 11) {
        activityLevel = 2;
      } else if (questionCount >= 1) {
        activityLevel = 1;
      }

      const formattedDate = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      cells.push({
        date: dateStr,
        formattedDate,
        dayOfWeek: d.getDay(),
        questionCount,
        hasCheckIn,
        sessionsCount,
        activityLevel,
        isToday: dateStr === today,
        isFuture: dateStr > today,
      });
    }

    return cells;
  }

  public static recordDailyActivity(): StudyStreakData {
    const current = this.getStudyStreak();
    const today = getTodayString();

    if (current.lastActiveDate === today) {
      return current;
    }

    // Cheap guard: a day already marked as active never breaks an existing
    // streak when a second workspace re-records the same day.
    if ((current.activeDates || []).includes(today)) {
      return current;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(yesterday.getDate()).padStart(2, "0")}`;

    let newStreak = 1;
    if (current.lastActiveDate === yesterdayStr) {
      newStreak = current.currentStreak + 1;
    }

    const updated: StudyStreakData = {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, current.longestStreak),
      lastActiveDate: today,
      activeDates: Array.from(new Set([...current.activeDates, today])),
      checkInDates: Array.from(new Set([...(current.checkInDates || []), today])),
    };

    safeSetItem(STORAGE_KEYS.STREAK, updated);
    return updated;
  }

  public static getDailyQuestionsAnswered(date = getTodayString()): number {
    return safeGetItem<number>(`${STORAGE_KEYS.DAILY_ACTIVITY_PREFIX}${date}`, 0);
  }

  public static addDailyQuestionsAnswered(count: number, date = getTodayString()): number {
    const current = this.getDailyQuestionsAnswered(date);
    const updated = current + count;
    safeSetItem(`${STORAGE_KEYS.DAILY_ACTIVITY_PREFIX}${date}`, updated);
    return updated;
  }

  /**
   * Most recent YYYY-MM-DD (device timezone) on which the mistake bank had
   * zero items due right after a completed session, or null when never.
   */
  public static getSrsLastClearedDate(): string | null {
    return safeGetItem<string | null>(STORAGE_KEYS.SRS_CLEARED, null);
  }

  /**
   * Records today as a clean-slate day, but only when the mistake bank has
   * items and none are due anymore, so the marker always means "had reviews,
   * cleared them all" and never fires for someone with an empty bank.
   */
  public static markSrsDueCleared(workspaceId?: string): void {
    if (
      this.getMistakeBank(workspaceId).length > 0 &&
      this.getDueMistakes(workspaceId).length === 0
    ) {
      safeSetItem(STORAGE_KEYS.SRS_CLEARED, getTodayString());
    }
  }

  /** True when the most recent clean-slate date is today. */
  public static isSrsClearedToday(): boolean {
    const last = this.getSrsLastClearedDate();
    return last !== null && last === getTodayString();
  }

  public static getTargetExamConfig(workspaceId?: string): TargetExamConfig {
    this.runMigration();
    const wsId = this.resolveWorkspaceId(workspaceId);
    const key = this.getWorkspaceStorageKey("target_exam", wsId);
    const workspaces = safeGetItem<ExamWorkspace[]>(WORKSPACE_STORAGE_KEYS.WORKSPACES, []);
    const workspace = workspaces.find((w) => w.id === wsId);

    const defaultDate = workspace?.targetExamDate || "";
    const defaultName = workspace?.targetExamName || (workspace?.examId === "cse" ? "March 2027 CSE-PPT" : `${workspace?.trackName || "Target"} Exam`);
    const defaultGoal = workspace?.dailyGoal || 25;

    return safeGetItem<TargetExamConfig>(key, {
      targetDate: defaultDate,
      examName: defaultName,
      dailyGoal: defaultGoal,
    });
  }

  public static saveTargetExamConfig(config: TargetExamConfig, workspaceId?: string): boolean {
    const wsId = this.resolveWorkspaceId(workspaceId);
    const key = this.getWorkspaceStorageKey("target_exam", wsId);
    const saved = safeSetItem(key, config);

    // Sync to workspace metadata
    const workspaces = safeGetItem<ExamWorkspace[]>(WORKSPACE_STORAGE_KEYS.WORKSPACES, []);
    const idx = workspaces.findIndex((w) => w.id === wsId);
    if (idx >= 0) {
      workspaces[idx] = {
        ...workspaces[idx],
        targetExamDate: config.targetDate,
        targetExamName: config.examName,
        dailyGoal: config.dailyGoal,
        lastAccessedAt: new Date().toISOString(),
      };
      safeSetItem(WORKSPACE_STORAGE_KEYS.WORKSPACES, workspaces);
    }

    return saved;
  }

  /* -------------------------------------------------------------------------- */
  /* Dynamic Diagnostic Metrics (Dynamic Subject Readiness)                     */
  /* -------------------------------------------------------------------------- */

  public static getSubjectReadiness(workspaceId?: string): SubjectReadinessMetric[] {
    const wsId = this.resolveWorkspaceId(workspaceId);
    const workspaces = safeGetItem<ExamWorkspace[]>(WORKSPACE_STORAGE_KEYS.WORKSPACES, []);
    const workspace = workspaces.find((w) => w.id === wsId);
    const examId = workspace?.examId || "cse";
    const levelId = workspace?.levelId;

    const subjectsConfig = getExamSubjects(examId, levelId);
    const fallbackList = subjectsConfig.length > 0 ? subjectsConfig : DEFAULT_FALLBACK_SUBJECTS;

    const history = this.getAttemptHistory(wsId);

    const subjectsMap = new Map<
      string,
      {
        subjectId: string;
        subjectName: string;
        subjectSlug: string;
        total: number;
        correct: number;
      }
    >();

    for (const sub of fallbackList) {
      if (!subjectsMap.has(sub.slug)) {
        subjectsMap.set(sub.slug, {
          subjectId: sub.id,
          subjectName: sub.name,
          subjectSlug: sub.slug,
          total: 0,
          correct: 0,
        });
      }
    }

    // Inspect recent attempts for this workspace
    for (const summary of history.slice(0, 15)) {
      const details = this.getAttemptDetails(summary.id, wsId);
      if (!details?.scoreResult?.subjectBreakdown) continue;

      for (const score of details.scoreResult.subjectBreakdown) {
        const entry = Array.from(subjectsMap.values()).find(
          (s) => s.subjectId === score.subjectId || s.subjectName === score.subjectName
        );
        if (entry) {
          entry.total += score.total;
          entry.correct += score.correct;
        } else {
          subjectsMap.set(score.subjectId, {
            subjectId: score.subjectId,
            subjectName: score.subjectName,
            subjectSlug: score.subjectId,
            total: score.total,
            correct: score.correct,
          });
        }
      }
    }

    return Array.from(subjectsMap.values()).map((val) => {
      const accuracy = val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0;
      return {
        subjectId: val.subjectId,
        subjectName: val.subjectName,
        subjectSlug: val.subjectSlug,
        questionsAnswered: val.total,
        correctCount: val.correct,
        accuracyPercentage: accuracy,
      };
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Backup, Export, Restore, & Privacy Reset (RA 10173)                        */
  /* -------------------------------------------------------------------------- */

  public static exportAllGuestData(): GuestBackupPayload {
    this.runMigration();
    const history = this.getAttemptHistory();
    const attempts: Record<string, StoredAttemptDetails> = {};

    for (const h of history) {
      const detail = this.getAttemptDetails(h.id);
      if (detail) {
        attempts[h.id] = detail;
      }
    }

    const workspaces = safeGetItem<ExamWorkspace[]>(WORKSPACE_STORAGE_KEYS.WORKSPACES, []);
    const currentWorkspaceId = safeGetItem<string | null>(WORKSPACE_STORAGE_KEYS.CURRENT_WORKSPACE_ID, null);

    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      history,
      attempts,
      mistakeBank: this.getMistakeBank(),
      bookmarks: this.getBookmarks(),
      streak: this.getStudyStreak(),
      targetExam: this.getTargetExamConfig(),
      workspaces,
      currentWorkspaceId,
      notes: NotesService.exportForBackup(),
    };
  }

  public static exportAllDataAsJson(): string {
    return JSON.stringify(this.exportAllGuestData(), null, 2);
  }

  /**
   * Builds the slim guest→account sync payload. Unlike the full backup
   * (exportAllGuestData, which must round-trip for import), the sync payload
   * carries only what the server actually stores: attempt summaries, answer
   * selections, and bookmark ids. Question text, choices, and explanations
   * never leave the device (RA 10173 data minimization), and the server
   * resolves correctness from its own choices table.
   */
  public static buildSyncPayload(): SyncPayloadV2 {
    this.runMigration();
    const history = this.getAttemptHistory();
    const attempts: Record<string, SyncAttemptDetail> = {};

    for (const h of history) {
      const detail = this.getAttemptDetails(h.id);
      if (!detail) continue;
      attempts[h.id] = {
        examLevelId: h.examLevelId ?? detail.examLevelId,
        subjectIds: detail.questions?.map((q) => q.subjectId).filter(Boolean),
        answers: (detail.answers ?? []).map((a) => ({
          questionId: a.questionId,
          selectedChoiceId: a.selectedChoiceId ?? null,
          timeSpentSeconds: a.timeSpentSeconds ?? 0,
        })),
      };
    }

    return {
      history,
      attempts,
      bookmarks: this.getBookmarks().map((b) => ({
        id: b.id,
        bookmarkedAt: b.bookmarkedAt,
      })),
      mistakeBankCount: this.getMistakeBank().length,
    };
  }

  public static async syncGuestDataToCloud(): Promise<{
    success: boolean;
    message?: string;
    synced?: { attempts: number; bookmarks: number; mistakes: number };
    error?: string;
  }> {
    try {
      const payload = this.buildSyncPayload();
      const res = await fetch("/api/user/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || `Sync failed with status ${res.status}`,
        };
      }

      return {
        success: true,
        message: data.message,
        synced: data.synced,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error during sync",
      };
    }
  }

  public static importDataFromJson(jsonString: string): { success: boolean; error?: string } {
    try {
      if (typeof jsonString !== "string" || jsonString.length > 2 * 1024 * 1024) {
        return { success: false, error: "Backup file is invalid or exceeds 2MB limit." };
      }
      const parsed = JSON.parse(jsonString) as Partial<GuestBackupPayload>;
      if (!parsed || (parsed.version !== 1 && parsed.version !== 2) || !Array.isArray(parsed.history)) {
        return { success: false, error: "Invalid backup format or unsupported version." };
      }

      // 1. Workspaces
      if (Array.isArray(parsed.workspaces) && parsed.workspaces.length > 0) {
        safeSetItem(WORKSPACE_STORAGE_KEYS.WORKSPACES, parsed.workspaces);
        if (parsed.currentWorkspaceId) {
          safeSetItem(WORKSPACE_STORAGE_KEYS.CURRENT_WORKSPACE_ID, parsed.currentWorkspaceId);
        } else {
          safeSetItem(WORKSPACE_STORAGE_KEYS.CURRENT_WORKSPACE_ID, parsed.workspaces[0].id);
        }
      } else {
        // Synthesize CSE workspace for Version 1 legacy backups
        const cseWorkspace: ExamWorkspace = {
          id: "workspace_cse",
          examId: "cse",
          levelId: "professional",
          trackName: "Professional",
          targetExamDate: parsed.targetExam?.targetDate || "2027-03-14",
          targetExamName: parsed.targetExam?.examName || "March 2027 CSE-PPT",
          dailyGoal: parsed.targetExam?.dailyGoal || 25,
          createdAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
        };
        safeSetItem(WORKSPACE_STORAGE_KEYS.WORKSPACES, [cseWorkspace]);
        safeSetItem(WORKSPACE_STORAGE_KEYS.CURRENT_WORKSPACE_ID, "workspace_cse");
      }

      // 2. Save imported records
      safeSetItem(STORAGE_KEYS.HISTORY, parsed.history);

      if (parsed.attempts && typeof parsed.attempts === "object" && !Array.isArray(parsed.attempts)) {
        for (const [id, detail] of Object.entries(parsed.attempts)) {
          if (
            !id ||
            id === "__proto__" ||
            id === "prototype" ||
            id === "constructor" ||
            !/^[a-zA-Z0-9_-]{1,64}$/.test(id)
          ) {
            continue;
          }
          if (detail && typeof detail === "object") {
            safeSetItem(`${STORAGE_KEYS.ATTEMPT_PREFIX}${id}`, detail);
          }
        }
      }

      if (Array.isArray(parsed.mistakeBank)) {
        safeSetItem(STORAGE_KEYS.MISTAKES, parsed.mistakeBank);
      }

      if (Array.isArray(parsed.bookmarks)) {
        safeSetItem(STORAGE_KEYS.BOOKMARKS, parsed.bookmarks);
      }

      if (parsed.streak) {
        safeSetItem(STORAGE_KEYS.STREAK, parsed.streak);
      }

      if (parsed.targetExam) {
        safeSetItem(STORAGE_KEYS.TARGET_EXAM, parsed.targetExam);
      }

      // Version 2 payloads carry notes; v1 backups import without them.
      if (parsed.version === 2 && parsed.notes !== undefined) {
        NotesService.importFromBackup(parsed.notes);
      }

      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Failed to parse backup JSON.",
      };
    }
  }

  public static clearAllGuestData(): void {
    if (!isBrowser()) return;
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (
          k &&
          (k.startsWith("cse_guest_") ||
            k.startsWith("attempt_") ||
            k.startsWith("rt_workspaces") ||
            k.startsWith("rt_current_workspace") ||
          k.startsWith("rt_ws_") ||
          k.startsWith("rt_onboarding") ||
          k === NOTES_STORAGE_KEY ||
          k === "attempts_history" ||
          k === "mistake_bank" ||
          k === "bookmarked_question_ids" ||
          k === "csereviewph_user_preferences_v1")
        ) {
          toRemove.push(k);
        }
      }
      for (const k of toRemove) {
        window.localStorage.removeItem(k);
      }
    } catch {
      // Ignore errors
    }
  }
}
