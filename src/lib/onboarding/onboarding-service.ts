import type {
  DiscoverySource,
  OnboardingAnswers,
  OnboardingState,
  OnboardingStatus,
  OnboardingStepId,
} from "./types";
import { ONBOARDING_STEP_ORDER } from "./types";
import { LocalStorageService } from "@/lib/storage/local-storage-service";
import { WorkspaceService } from "@/lib/workspace/workspace-service";

/**
 * Versioned, device-local onboarding state store (`rt_onboarding_v1`).
 * Safe parsing, sanitize-on-read, graceful storage failure — same conventions
 * as the other storage services in this codebase.
 */

const ONBOARDING_KEY = "rt_onboarding_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

const STEP_IDS = new Set<string>(ONBOARDING_STEP_ORDER);

const PREP_STAGES = new Set(["just-starting", "reviewing", "ready-for-tests"]);
const DISCOVERY_SOURCES = new Set([
  "search",
  "social",
  "friend",
  "school",
  "other",
  "prefer-not-to-say",
]);

const VALID_DAYS = [0, 1, 2, 3, 4, 5, 6];
const SESSION_MINUTES = [15, 30, 45];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeAnswers(raw: unknown): OnboardingAnswers {
  const out: OnboardingAnswers = {};
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;

  if (r.identityMode === "account" || r.identityMode === "guest") {
    out.identityMode = r.identityMode;
  }
  if (typeof r.examId === "string" && r.examId) out.examId = r.examId;
  if (typeof r.levelId === "string" && r.levelId) out.levelId = r.levelId;
  if (typeof r.prepStage === "string" && PREP_STAGES.has(r.prepStage)) {
    out.prepStage = r.prepStage as OnboardingAnswers["prepStage"];
  }
  if (typeof r.targetDate === "string" && DATE_RE.test(r.targetDate)) {
    out.targetDate = r.targetDate;
  }
  if (Array.isArray(r.studyDays)) {
    const days = r.studyDays
      .map((d) => (typeof d === "number" && VALID_DAYS.includes(d) ? d : -1))
      .filter((d) => d >= 0);
    if (days.length > 0) out.studyDays = Array.from(new Set(days)).sort();
  }
  if (typeof r.sessionMinutes === "number" && SESSION_MINUTES.includes(r.sessionMinutes)) {
    out.sessionMinutes = r.sessionMinutes as OnboardingAnswers["sessionMinutes"];
  }
  if (typeof r.dailyGoal === "number" && Number.isFinite(r.dailyGoal)) {
    const clamped = Math.min(200, Math.max(1, Math.round(r.dailyGoal)));
    out.dailyGoal = clamped;
  }
  if (
    r.appearance === "system" ||
    r.appearance === "light" ||
    r.appearance === "dark"
  ) {
    out.appearance = r.appearance;
  }
  if (
    r.textSize === "standard" ||
    r.textSize === "large" ||
    r.textSize === "extra-large"
  ) {
    out.textSize = r.textSize;
  }
  if (typeof r.discoverySource === "string" && DISCOVERY_SOURCES.has(r.discoverySource)) {
    out.discoverySource = r.discoverySource as DiscoverySource;
  }
  return out;
}

function sanitizeState(raw: unknown): OnboardingState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) return null;

  const status = r.status as OnboardingStatus;
  if (
    status !== "not_started" &&
    status !== "in_progress" &&
    status !== "completed" &&
    status !== "dismissed"
  ) {
    return null;
  }

  const currentStep = r.currentStep as OnboardingStepId;
  const maxStepReached = r.maxStepReached as OnboardingStepId;
  if (!STEP_IDS.has(currentStep) || !STEP_IDS.has(maxStepReached)) return null;

  const state: OnboardingState = {
    version: 1,
    status,
    currentStep,
    maxStepReached,
    answers: sanitizeAnswers(r.answers),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
  };
  if (typeof r.completedAt === "string") state.completedAt = r.completedAt;
  return state;
}

function readState(): OnboardingState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY);
    if (!raw) return null;
    return sanitizeState(JSON.parse(raw));
  } catch {
    // Corrupted or unreadable storage degrades to a fresh state — never throws.
    return null;
  }
}

function writeState(state: OnboardingState): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
  } catch {
    // Storage disabled/full: onboarding still works in-session; persistence
    // simply degrades. Callers must not treat this as fatal.
  }
}

function freshState(): OnboardingState {
  return {
    version: 1,
    status: "not_started",
    currentStep: "identity",
    maxStepReached: "identity",
    answers: {},
    updatedAt: new Date().toISOString(),
  };
}

export const OnboardingService = {
  /** Current state, or a fresh not_started state. Never throws. */
  getState(): OnboardingState {
    return readState() ?? freshState();
  },

  getStatus(): OnboardingStatus {
    return this.getState().status;
  },

  getAnswers(): OnboardingAnswers {
    return this.getState().answers;
  },

  /**
   * An "established" user already has real study history or workspaces. These
   * users are never forced through first-run onboarding (legacy rule); the
   * dashboard offers a dismissible setup card instead.
   */
  isEstablishedUser(): boolean {
    if (!isBrowser()) return false;
    const hasHistory = LocalStorageService.getAttemptHistory().length > 0;
    const hasWorkspaces = WorkspaceService.getAllWorkspaces().length > 0;
    return hasHistory || hasWorkspaces;
  },

  /** Marks the flow as started (idempotent) and moves the resume pointer. */
  startAt(step: OnboardingStepId): OnboardingState {
    const state = this.getState();
    if (state.status === "completed" || state.status === "dismissed") return state;
    const next: OnboardingState = {
      ...state,
      status: "in_progress",
      currentStep: step,
      maxStepReached: step,
      updatedAt: new Date().toISOString(),
    };
    writeState(next);
    return next;
  },

  /**
   * Advances the resume pointer (forward or back) while in progress.
   * Completed users may also navigate when they explicitly re-enter the
   * flow in edit mode (?edit=1) to adjust their plan without replaying it.
   */
  moveTo(step: OnboardingStepId): OnboardingState {
    const state = this.getState();
    if (state.status !== "in_progress" && state.status !== "completed") return state;
    const order = ONBOARDING_STEP_ORDER;
    const prevMax = order.indexOf(state.maxStepReached);
    const nextMax = order.indexOf(step);
    const next: OnboardingState = {
      ...state,
      currentStep: step,
      maxStepReached: nextMax > prevMax ? step : state.maxStepReached,
      updatedAt: new Date().toISOString(),
    };
    writeState(next);
    return next;
  },

  /**
   * Merges a partial answer patch (sanitized) into the stored answers.
   * Blocked only after an explicit dismissal; completed users may still
   * update answers through the edit-mode flow without replaying onboarding.
   */
  updateAnswers(patch: Partial<OnboardingAnswers>): OnboardingState {
    const state = this.getState();
    if (state.status === "dismissed") return state;
    const next: OnboardingState = {
      ...state,
      answers: sanitizeAnswers({ ...state.answers, ...patch }),
      updatedAt: new Date().toISOString(),
    };
    writeState(next);
    return next;
  },

  /**
   * Marks the whole flow complete, atomically recording when. The first
   * completedAt is preserved — finishing an edit-mode pass must not look
   * like a brand-new completion.
   */
  complete(): OnboardingState {
    const state = this.getState();
    const next: OnboardingState = {
      ...state,
      status: "completed",
      completedAt: state.completedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeState(next);
    return next;
  },

  /** Established users can decline the setup card; never auto-replays. */
  dismiss(): OnboardingState {
    const state = this.getState();
    const next: OnboardingState = {
      ...state,
      status: "dismissed",
      updatedAt: new Date().toISOString(),
    };
    writeState(next);
    return next;
  },

  /** Full local reset (used by settings data-privacy reset and tests). */
  reset(): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(ONBOARDING_KEY);
    } catch {
      // Ignore storage failures on reset.
    }
  },
};
