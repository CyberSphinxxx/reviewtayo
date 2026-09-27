import { describe, it, expect } from "vitest";
import {
  getPlanPreview,
  resolveFirstActivity,
  DEFAULT_DAILY_GOAL,
} from "@/lib/onboarding/plan-preview";

describe("resolveFirstActivity — config-driven, honest fallbacks", () => {
  it("resolves the level-aware quick drill for an available exam", () => {
    const activity = resolveFirstActivity("cse", "professional");
    expect(activity).not.toBeNull();
    expect(activity?.href).toBe("/exams/professional/quick");
    expect(activity?.fallback).toBe(false);
  });

  it("resolves the subprofessional drill for the subprofessional level", () => {
    const activity = resolveFirstActivity("cse", "subprofessional");
    expect(activity?.href).toBe("/exams/subprofessional/quick");
  });

  it("returns null for an unknown exam id (no fabricated activity)", () => {
    expect(resolveFirstActivity("not-real")).toBeNull();
    expect(resolveFirstActivity(undefined)).toBeNull();
  });

  it("returns null for a coming-soon exam (stale answers must not promise a launchable test)", () => {
    // LET exists in the catalog as coming-soon; the exam step never offers it,
    // so reaching resolveFirstActivity with it means the answers are stale.
    // The caller renders its own honest fallback instead.
    expect(resolveFirstActivity("let", "elementary")).toBeNull();
  });
});

describe("getPlanPreview — schedule, goal, and estimates", () => {
  it("applies the default goal when the learner skips the goal step", () => {
    const preview = getPlanPreview({ examId: "cse", levelId: "professional" });
    expect(preview.dailyGoal).toBe(DEFAULT_DAILY_GOAL);
    expect(DEFAULT_DAILY_GOAL).toBe(10);
  });

  it("labels chosen study days and counts them", () => {
    const preview = getPlanPreview({ studyDays: [1, 3, 5] });
    expect(preview.daysLabel).toBe("Mon, Wed, Fri");
    expect(preview.daysPerWeek).toBe(3);
  });

  it("uses an honest flexible label when no days are chosen", () => {
    const preview = getPlanPreview({});
    expect(preview.daysLabel).toBe("Flexible schedule");
    expect(preview.daysPerWeek).toBe(0);
  });

  it("produces a conservative, human time estimate", () => {
    const preview = getPlanPreview({ dailyGoal: 20 });
    expect(preview.estimateMinutes).toMatch(/^about \d+ min\/day$/);
    const n = Number(preview.estimateMinutes.replace(/\D/g, ""));
    expect(n).toBeGreaterThanOrEqual(5);
    expect(n).toBeLessThanOrEqual(15); // 20 questions ≈ 10 min at 30s each
  });

  it("carries the target date through when provided", () => {
    const preview = getPlanPreview({ targetDate: "2027-03-14" });
    expect(preview.targetDate).toBe("2027-03-14");
  });

  it("resolves the first activity from the same answers", () => {
    const preview = getPlanPreview({ examId: "cse", levelId: "professional" });
    expect(preview.firstActivity?.href).toBe("/exams/professional/quick");
  });
});
