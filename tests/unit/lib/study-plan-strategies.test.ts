import { describe, expect, it } from "vitest";
import {
  generateWeeklyPlan,
  weeklyPlanSignature,
  type PlanSubjectInput,
} from "@/lib/study-plan-generator";
import { PLAN_TEMPLATES } from "@/config/study-plan-templates";

const base = {
  today: "2026-09-21", // a Monday
  examDate: "2027-03-14",
  dailyGoal: 25,
  dueReviewCount: 0,
};

const subjects: PlanSubjectInput[] = [
  { subjectId: "verbal", subjectName: "Verbal Ability", accuracy: 72, questionsAnswered: 40 },
  { subjectId: "numerical", subjectName: "Numerical Ability", accuracy: 41, questionsAnswered: 40 },
  { subjectId: "analytical", subjectName: "Analytical Ability", accuracy: 58, questionsAnswered: 30 },
  { subjectId: "geninfo", subjectName: "General Information", accuracy: 0, questionsAnswered: 0 },
];

function activeFocuses(template: Parameters<typeof generateWeeklyPlan>[0]["template"]) {
  const plan = generateWeeklyPlan({ ...base, subjects, template });
  return plan.days.filter((d) => d.state !== "past").map((d) => d.focus);
}

describe("strategy divergence (P3)", () => {
  it("each template produces a genuinely different week", () => {
    const weeks = new Map<string, string[]>();
    for (const t of PLAN_TEMPLATES) {
      weeks.set(t.id, activeFocuses(t.id));
    }
    const unique = new Set(Array.from(weeks.values()).map((f) => f.join("|")));
    expect(unique.size).toBe(PLAN_TEMPLATES.length);
  });

  it("smart and weak-focus both lead with the weakest measured subject, balanced does not", () => {
    const smart = activeFocuses("smart");
    const weak = activeFocuses("weak-focus");
    const balanced = activeFocuses("balanced");

    expect(smart[0]).toBe("Numerical Ability drill");
    expect(weak[0]).toBe("Numerical Ability drill");
    expect(balanced[0]).not.toBe("Numerical Ability drill");
  });

  it("cram leads with timed assessments away from the exam", () => {
    const cram = activeFocuses("cram");
    expect(cram[0]).toBe("Timed assessment");
    expect(cram.filter((f) => f === "Timed assessment").length).toBeGreaterThan(1);
  });

  it("every explanation names a headline and real why text", () => {
    for (const t of PLAN_TEMPLATES) {
      const plan = generateWeeklyPlan({ ...base, subjects, template: t.id });
      expect(plan.explanation.headline.length).toBeGreaterThan(0);
      expect(plan.explanation.why.length).toBeGreaterThan(40);
      expect(plan.rationale.length).toBeGreaterThan(0);
    }
  });

  it("smart explanation cites the weakest subject and its accuracy", () => {
    const plan = generateWeeklyPlan({ ...base, subjects });
    expect(plan.explanation.why).toContain("Numerical Ability");
    expect(plan.explanation.why).toContain("41%");
    expect(plan.facts.some((f) => f.kind === "subjects")).toBe(true);
  });
});

describe("weak-focus with zero history (P3)", () => {
  const unmeasured = subjects.map((s) => ({ ...s, questionsAnswered: 0, accuracy: 0 }));

  it("says 'not enough data' explicitly and never invents a weakest subject", () => {
    const plan = generateWeeklyPlan({
      ...base,
      subjects: unmeasured,
      template: "weak-focus",
    });
    expect(plan.isColdStart).toBe(true);
    expect(plan.rationale).toMatch(/needs at least one measured subject/i);
    expect(plan.explanation.headline).toMatch(/not enough data/i);
    // Never invents a weakest subject: no day drills an unmeasured subject by name.
    const subjectNames = subjects.map((s) => s.subjectName);
    expect(
      plan.days.every((d) => !subjectNames.some((n) => d.focus.startsWith(n)))
    ).toBe(true);
  });

  it("other templates still fall back to the baseline week with no data", () => {
    for (const t of PLAN_TEMPLATES.filter((x) => x.id !== "weak-focus")) {
      const plan = generateWeeklyPlan({ ...base, subjects: unmeasured, template: t.id });
      expect(plan.isColdStart).toBe(true);
      expect(plan.rationale).toMatch(/baseline/i);
    }
  });
});

describe("due reviews in every strategy (P3)", () => {
  it("balanced schedules spaced review first when items are due", () => {
    const plan = generateWeeklyPlan({ ...base, subjects, template: "balanced", dueReviewCount: 9 });
    const active = plan.days.filter((d) => d.state !== "past");
    expect(active[0].focus).toBe("Spaced review");
    expect(active[0].targetItems).toBe(9);
    expect(active[0].href).toBe("/dashboard/mistakes");
    expect(active[1].focus).not.toBe("Spaced review");
    expect(plan.facts.some((f) => f.kind === "reviews")).toBe(true);
  });

  it("cram schedules spaced review first when items are due, then resumes assessments", () => {
    const plan = generateWeeklyPlan({ ...base, subjects, template: "cram", dueReviewCount: 6 });
    const active = plan.days.filter((d) => d.state !== "past");
    expect(active[0].focus).toBe("Spaced review");
    expect(active.slice(1).some((d) => d.focus === "Timed assessment")).toBe(true);
  });

  it("balanced rotation is unchanged when nothing is due", () => {
    const plan = generateWeeklyPlan({ ...base, subjects, template: "balanced", dueReviewCount: 0 });
    const active = plan.days.filter((d) => d.state !== "past");
    expect(active[0].focus).not.toBe("Spaced review");
  });
});

describe("study start date as a generator input (P3)", () => {
  it("is accepted and part of the memoization signature", () => {
    const withStart = { ...base, studyStartDate: "2026-09-01", subjects };
    const a = weeklyPlanSignature(withStart);
    const b = weeklyPlanSignature({ ...base, subjects });
    expect(a).not.toBe(b);

    const plan = generateWeeklyPlan(withStart);
    expect(plan.days).toHaveLength(7);
    expect(plan.weekStart).toBe("2026-09-20");
  });

  it("regenerating with a moved start date keeps the same shape of plan", () => {
    const before = generateWeeklyPlan({ ...base, studyStartDate: "2026-08-01", subjects });
    const after = generateWeeklyPlan({ ...base, studyStartDate: "2026-09-01", subjects });
    expect(before.days.map((d) => d.focus)).toEqual(after.days.map((d) => d.focus));
  });
});
