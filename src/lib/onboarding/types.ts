/**
 * Onboarding data contract (docs/onboarding-handoff/ONBOARDING_PLAN.md).
 *
 * State is device-local and versioned (`rt_onboarding_v1` namespace) — see
 * implementation_plan.md "Data model" for why this is localStorage rather than
 * a server table: the platform is deliberately localStorage-first, the only
 * cloud-synced study data is attempt history, and adding server-side profile
 * fields would extend the RA 10173 privacy-notice scope for no functional gain.
 */

export type OnboardingStatus =
  | "not_started" // never opened (or storage cleared)
  | "in_progress" // at least one step visited; resumable
  | "completed" // finished atomically; never auto-replayed
  | "dismissed"; // established user declined "Set up your study plan"

export type OnboardingStepId =
  | "identity"
  | "exam"
  | "starting-point"
  | "rhythm"
  | "goal"
  | "review"
  | "personalize"
  | "finish";

/** Ordered steps; `finish` is reached only via the review action. */
export const ONBOARDING_STEP_ORDER: OnboardingStepId[] = [
  "identity",
  "exam",
  "starting-point",
  "rhythm",
  "goal",
  "review",
  "personalize",
  "finish",
];

/** Prep stages for the starting-point step (tunes the recommended first activity). */
export type PrepStage = "just-starting" | "reviewing" | "ready-for-tests";

/** Optional discovery/referral source — enum-only, device-local, skippable. */
export type DiscoverySource =
  | "search"
  | "social"
  | "friend"
  | "school"
  | "other"
  | "prefer-not-to-say";

export interface OnboardingAnswers {
  /** Identity step result; recorded but auth itself lives in the existing flow. */
  identityMode?: "account" | "guest";
  /** Stable IDs from the exam catalog — never display labels. */
  examId?: string;
  levelId?: string;
  prepStage?: PrepStage;
  /** Optional target exam date, YYYY-MM-DD, validated on save. */
  targetDate?: string;
  /** Study days per week, 1–7; undefined = "my schedule changes". */
  studyDays?: number[];
  /** Preferred session length preset in minutes. */
  sessionMinutes?: 15 | 30 | 45;
  /** Daily question goal, 1–200 (default 10 applied at save when unset). */
  dailyGoal?: number;
  appearance?: "system" | "light" | "dark";
  textSize?: "standard" | "large" | "extra-large";
  discoverySource?: DiscoverySource;
}

export interface OnboardingState {
  /** Schema version for future migrations. */
  version: 1;
  status: OnboardingStatus;
  /** Last visited step — the resume point. */
  currentStep: OnboardingStepId;
  /** Highest step reached; keeps the progress indicator truthful. */
  maxStepReached: OnboardingStepId;
  answers: OnboardingAnswers;
  updatedAt: string;
  completedAt?: string;
}

/** Where "Start my first practice" should lead, resolved from real config. */
export interface FirstActivity {
  label: string;
  href: string;
  /** True when the exam's config could not produce a real activity. */
  fallback: boolean;
}
