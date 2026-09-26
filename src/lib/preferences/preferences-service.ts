import type {
  UserPreferences,
  StudyPreferences,
  AppearancePreferences,
  ReadingPreferences,
  DashboardPreferences,
  PrivacyPreferences,
  PreferenceCategory,
} from "./types";
import { LocalStorageService } from "@/lib/storage/local-storage-service";
import { WorkspaceService } from "@/lib/workspace/workspace-service";
import { EXAM_CATALOG, getExamConfig } from "@/config/exams";
import { getStoredConsent, saveStoredConsent } from "@/components/privacy/CookieConsentBanner";

import { NEXT_UPCOMING_EXAM_DATE } from "@/lib/exam-guide/csc-data";
import { isPlanTemplateId } from "@/config/study-plan-templates";

export const PREFERENCES_STORAGE_KEY = "csereviewph_user_preferences_v1";
export const PREFERENCES_CHANGED_EVENT = "csereviewph-preferences-changed";

export const DEFAULT_STUDY_PREFERENCES: Readonly<StudyPreferences> = {
  examId: "cse",
  levelId: "cse-professional",
  targetDate: NEXT_UPCOMING_EXAM_DATE,
  targetDateType: "verified",
  planTemplate: "smart",
  dailyGoal: 25,
  showDailyGoal: true,
  weekStartsOn: "monday",
  studyTimeZone: "Asia/Manila",
  showStreak: true,
};

export const DEFAULT_APPEARANCE_PREFERENCES: Readonly<AppearancePreferences> = {
  theme: "light",
  reduceMotion: "device",
};

export const DEFAULT_READING_PREFERENCES: Readonly<ReadingPreferences> = {
  readingTextSize: "standard",
  lineSpacing: "standard",
  readingWidth: "standard",
};

export const DEFAULT_DASHBOARD_PREFERENCES: Readonly<DashboardPreferences> = {
  spacing: "comfortable",
  showExamCalendar: true,
  showActivityCalendar: true,
  showStreakSummary: true,
  showSubjectProgress: true,
  showRecentSessions: true,
};

export const DEFAULT_PRIVACY_PREFERENCES: Readonly<PrivacyPreferences> = {
  analyticsConsent: false,
  adsConsent: false,
  localCheckInTracking: true,
};

export function getDefaultPreferences(): UserPreferences {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    study: { ...DEFAULT_STUDY_PREFERENCES },
    appearance: { ...DEFAULT_APPEARANCE_PREFERENCES },
    reading: { ...DEFAULT_READING_PREFERENCES },
    dashboard: { ...DEFAULT_DASHBOARD_PREFERENCES },
    privacy: { ...DEFAULT_PRIVACY_PREFERENCES },
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || isNaN(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
}

function sanitizePreferences(raw: unknown): UserPreferences {
  const defaults = getDefaultPreferences();
  if (!raw || typeof raw !== "object") return defaults;

  const data = raw as Partial<UserPreferences>;

  // Study
  const rawStudy: Partial<StudyPreferences> = (data.study && typeof data.study === "object") ? data.study : {};
  // Level ids are validated against the catalog ({examId}-{levelId}), not a
  // hardcoded CSE whitelist — any registered exam's levels are representable.
  const validLevelIds = EXAM_CATALOG.flatMap((exam) =>
    exam.levels.map((lvl) => `${exam.id}-${lvl.id}`)
  );
  const levelId = validLevelIds.includes(rawStudy.levelId as string)
    ? (rawStudy.levelId as string)
    : defaults.study.levelId;

  const validTargetDateTypes = ["verified", "custom", "none"];
  const targetDateType = validTargetDateTypes.includes(rawStudy.targetDateType as string)
    ? (rawStudy.targetDateType as "verified" | "custom" | "none")
    : defaults.study.targetDateType;

  const study: StudyPreferences = {
    examId: typeof rawStudy.examId === "string" && rawStudy.examId ? rawStudy.examId : "cse",
    levelId,
    targetDate: typeof rawStudy.targetDate === "string" ? rawStudy.targetDate : defaults.study.targetDate,
    targetExamName: typeof rawStudy.targetExamName === "string" ? rawStudy.targetExamName : defaults.study.targetExamName,
    targetDateType,
    planTemplate: isPlanTemplateId(rawStudy.planTemplate) ? rawStudy.planTemplate : defaults.study.planTemplate,
    dailyGoal: clampNumber(rawStudy.dailyGoal, 5, 200, defaults.study.dailyGoal),
    showDailyGoal: typeof rawStudy.showDailyGoal === "boolean" ? rawStudy.showDailyGoal : defaults.study.showDailyGoal,
    weekStartsOn: rawStudy.weekStartsOn === "sunday" ? "sunday" : "monday",
    studyTimeZone: typeof rawStudy.studyTimeZone === "string" && rawStudy.studyTimeZone ? rawStudy.studyTimeZone : defaults.study.studyTimeZone,
    showStreak: typeof rawStudy.showStreak === "boolean" ? rawStudy.showStreak : defaults.study.showStreak,
  };

  // Appearance
  const rawApp: Partial<AppearancePreferences> = (data.appearance && typeof data.appearance === "object") ? data.appearance : {};
  const validThemes = ["system", "light", "dark"];
  const theme = validThemes.includes(rawApp.theme as string)
    ? (rawApp.theme as "system" | "light" | "dark")
    : defaults.appearance.theme;
  const reduceMotion = rawApp.reduceMotion === "reduce" ? "reduce" : "device";

  const appearance: AppearancePreferences = {
    theme,
    reduceMotion,
  };

  // Reading
  const rawRead: Partial<ReadingPreferences> = (data.reading && typeof data.reading === "object") ? data.reading : {};
  const validSizes = ["standard", "large", "extra-large"];
  const readingTextSize = validSizes.includes(rawRead.readingTextSize as string)
    ? (rawRead.readingTextSize as "standard" | "large" | "extra-large")
    : defaults.reading.readingTextSize;

  const lineSpacing = rawRead.lineSpacing === "spacious" ? "spacious" : "standard";
  const readingWidth = rawRead.readingWidth === "narrow" ? "narrow" : "standard";

  const reading: ReadingPreferences = {
    readingTextSize,
    lineSpacing,
    readingWidth,
  };

  // Dashboard
  const rawDash: Partial<DashboardPreferences> = (data.dashboard && typeof data.dashboard === "object") ? data.dashboard : {};
  const spacing = rawDash.spacing === "compact" ? "compact" : "comfortable";
  const dashboard: DashboardPreferences = {
    spacing,
    showExamCalendar: typeof rawDash.showExamCalendar === "boolean" ? rawDash.showExamCalendar : true,
    showActivityCalendar: typeof rawDash.showActivityCalendar === "boolean" ? rawDash.showActivityCalendar : true,
    showStreakSummary: typeof rawDash.showStreakSummary === "boolean" ? rawDash.showStreakSummary : true,
    showSubjectProgress: typeof rawDash.showSubjectProgress === "boolean" ? rawDash.showSubjectProgress : true,
    showRecentSessions: typeof rawDash.showRecentSessions === "boolean" ? rawDash.showRecentSessions : true,
  };

  // Privacy
  const rawPriv: Partial<PrivacyPreferences> = (data.privacy && typeof data.privacy === "object") ? data.privacy : {};
  const privacy: PrivacyPreferences = {
    analyticsConsent: Boolean(rawPriv.analyticsConsent),
    adsConsent: Boolean(rawPriv.adsConsent),
    localCheckInTracking: typeof rawPriv.localCheckInTracking === "boolean" ? rawPriv.localCheckInTracking : true,
  };

  return {
    version: 1,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
    study,
    appearance,
    reading,
    dashboard,
    privacy,
  };
}

export class PreferencesService {
  private static cachedPreferences: UserPreferences | null = null;

  public static isClient(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  }

  /**
   * Retrieves stored preferences. Pure read: never writes, never dispatches
   * events, so it is safe to call during render. Returns factory defaults when
   * nothing is stored yet; call ensureSeeded() from an effect to inherit
   * legacy values and persist.
   */
  public static getPreferences(): UserPreferences {
    if (!this.isClient()) {
      return getDefaultPreferences();
    }

    try {
      const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const sanitized = sanitizePreferences(parsed);
        this.cachedPreferences = sanitized;
        return sanitized;
      }
    } catch {
      // JSON parse error or localStorage read failure
    }

    return getDefaultPreferences();
  }

  /**
   * One-time seeding: if no stored preferences exist yet, inherit legacy
   * values (target exam config, cookie consent) and persist them. Writes to
   * localStorage and dispatches PREFERENCES_CHANGED_EVENT, so it MUST only be
   * called from an effect or event handler — never during render.
   */
  public static ensureSeeded(): void {
    if (!this.isClient()) return;
    if (window.localStorage.getItem(PREFERENCES_STORAGE_KEY)) return;

    const initial = getDefaultPreferences();
    try {
      // Inherit legacy target exam config so an existing learner's setup survives.
      const targetConfig = LocalStorageService.getTargetExamConfig();
      if (targetConfig) {
        if (targetConfig.targetDate) initial.study.targetDate = targetConfig.targetDate;
        if (targetConfig.dailyGoal) {
          initial.study.dailyGoal = clampNumber(targetConfig.dailyGoal, 5, 200, 25);
        }
      }

      // Inherit legacy cookie consent
      const consent = getStoredConsent();
      if (consent && consent.hasChosen) {
        initial.privacy.analyticsConsent = consent.analytics;
        initial.privacy.adsConsent = consent.ads;
      }
    } catch {
      // Ignore legacy read issues
    }

    this.savePreferences(initial);
  }

  /**
   * Saves updated preferences with error handling and returns explicit status.
   */
  public static savePreferences(
    updates: Partial<UserPreferences> | ((prev: UserPreferences) => UserPreferences)
  ): { success: boolean; error?: string; preferences: UserPreferences } {
    if (!this.isClient()) {
      return {
        success: false,
        error: "Cannot persist preferences outside of a browser environment.",
        preferences: getDefaultPreferences(),
      };
    }

    try {
      const current = this.cachedPreferences || this.getPreferences();
      const nextRaw = typeof updates === "function" ? updates(current) : { ...current, ...updates };
      const next = sanitizePreferences({
        ...nextRaw,
        updatedAt: new Date().toISOString(),
      });

      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(next));
      this.cachedPreferences = next;

      // Synchronize with the authoritative workspace store so both stores
      // agree after any preferences save. Only mirrors when an exam is
      // actually chosen — never fabricates a target for a fresh visitor. The
      // active workspace's real exam name wins over synthesized labels.
      try {
        const hasChosenExam =
          WorkspaceService.getAllWorkspaces().length > 0;
        if (hasChosenExam) {
          const active = WorkspaceService.getCurrentWorkspace();
          // Derive the fallback label from the exam's catalog definition
          // instead of assuming CSE professional/subprofessional.
          const mirrorExam = getExamConfig(next.study.examId);
          const mirrorLevelId = next.study.levelId.startsWith(`${mirrorExam?.id}-`)
            ? next.study.levelId.slice(`${mirrorExam?.id}-`.length)
            : next.study.levelId;
          const mirrorLevel = mirrorExam?.levels.find((l) => l.id === mirrorLevelId);
          const fallbackName =
            (active?.examId === "cse" && active?.trackName
              ? `CSE-PPT ${active.trackName}`
              : undefined) ||
            (mirrorExam && mirrorLevel
              ? `${mirrorExam.shortName} ${mirrorLevel.shortName}`
              : undefined) ||
            "Upcoming Exam";
          LocalStorageService.saveTargetExamConfig({
            // Never resurrect or re-clear a date behind the user's back: when
            // preferences carry no date but the active workspace does, keep
            // the workspace's date. Empty string = "no date set", a real state.
            targetDate: next.study.targetDate || active?.targetExamDate || "",
            examName: next.study.targetExamName || fallbackName,
            dailyGoal: next.study.dailyGoal,
          });
        }

        const currentConsent = getStoredConsent();
        saveStoredConsent({
          essential: true,
          analytics: next.privacy.analyticsConsent,
          ads: next.privacy.adsConsent,
          hasChosen: Boolean(currentConsent?.hasChosen || next.privacy.analyticsConsent || next.privacy.adsConsent),
          updatedAt: Date.now(),
        });
      } catch {
        // Non-fatal legacy sync failure
      }

      // Notify reactive listeners
      window.dispatchEvent(
        new CustomEvent(PREFERENCES_CHANGED_EVENT, { detail: next })
      );

      return { success: true, preferences: next };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "LocalStorage quota exceeded or write disabled.";
      return {
        success: false,
        error: errorMessage,
        preferences: this.cachedPreferences || getDefaultPreferences(),
      };
    }
  }

  /**
   * Resets a specific category back to its default values.
   */
  public static resetCategory(
    category: PreferenceCategory
  ): { success: boolean; error?: string; preferences: UserPreferences } {
    const defaults = getDefaultPreferences();
    return this.savePreferences((prev) => ({
      ...prev,
      [category]: defaults[category],
    }));
  }

  /**
   * Resets all preferences back to factory defaults.
   */
  public static resetAllPreferences(): {
    success: boolean;
    error?: string;
    preferences: UserPreferences;
  } {
    const defaults = getDefaultPreferences();
    return this.savePreferences(defaults);
  }
}
