import { getExamConfig, getExamRoutesForLevel } from "@/config/exams";
import type { OnboardingAnswers } from "./types";
import type { FirstActivity } from "./types";

/**
 * Pure plan-preview resolution for the onboarding review step and finish
 * routing. Everything derives from the exam catalog — no exam-specific
 * branching, and no activity is promised that the config cannot launch.
 */

export interface PlanPreview {
  /** Days label, e.g. "Mon, Wed, Fri" or "Flexible". */
  daysLabel: string;
  daysPerWeek: number;
  /** Daily question goal — the default (10) is applied here when unset. */
  dailyGoal: number;
  /** Conservative per-session estimate in minutes (never a hard promise). */
  estimateMinutes: string;
  targetDate?: string;
  /** Where "Start my first practice" leads. */
  firstActivity: FirstActivity | null;
}

/** Default daily goal applied when the learner skips the goal step. */
export const DEFAULT_DAILY_GOAL = 10;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Resolves the first activity from the exam's real capabilities. Returns
 * null when the exam has no config (removed/unavailable) — callers show a
 * useful fallback instead of promising a test that cannot launch.
 */
export function resolveFirstActivity(
  examId?: string,
  levelId?: string
): FirstActivity | null {
  if (!examId) return null;
  const exam = getExamConfig(examId);
  if (!exam || exam.availability !== "available") return null;

  const routes = getExamRoutesForLevel(examId, levelId);
  if (exam.capabilities?.hasQuickDrill && routes.quickDrillUrl) {
    const label = exam.diagnostic?.label
      ? `10-question diagnostic · ${exam.diagnostic.label}`
      : "Take your first diagnostic";
    return { label, href: routes.quickDrillUrl, fallback: false };
  }
  return { label: "Explore your dashboard", href: "/dashboard", fallback: true };
}

export function getPlanPreview(answers: OnboardingAnswers): PlanPreview {
  const days = answers.studyDays ?? [];
  const daysLabel =
    days.length > 0
      ? days.map((d) => DAY_NAMES[d]).join(", ")
      : "Flexible schedule";
  const dailyGoal = answers.dailyGoal ?? DEFAULT_DAILY_GOAL;

  // Conservative pace for estimate purposes (~30s per question at the start
  // of prep) rounded to the nearest five minutes. Presentation-only.
  const rawMinutes = dailyGoal * 0.5;
  const minutes = Math.max(5, Math.round(rawMinutes / 5) * 5);
  const estimateMinutes = `about ${minutes} min/day`;

  return {
    daysLabel,
    daysPerWeek: days.length,
    dailyGoal,
    estimateMinutes,
    targetDate: answers.targetDate,
    firstActivity: resolveFirstActivity(answers.examId, answers.levelId),
  };
}
