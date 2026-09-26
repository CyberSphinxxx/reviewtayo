import { describe, it, expect, vi, afterEach } from "vitest";
import {
  selectQuestionsForExam,
  type EngineQuestion,
  type ExamRuleConfig,
} from "@/features/exam-engine";

function createMockQuestion(id: string, subjectId: string, difficulty: "easy" | "medium" | "hard" = "medium"): EngineQuestion {
  return {
    id,
    topicId: `topic-${subjectId}`,
    topicName: `Topic of ${subjectId}`,
    topicSlug: `topic-${subjectId}`,
    subjectId,
    subjectName: `Subject ${subjectId}`,
    subjectSlug: `subject-${subjectId}`,
    questionText: `Question ${id}?`,
    explanation: `Explanation for ${id}`,
    difficulty,
    language: "en",
    choices: [
      { id: `${id}-c1`, choiceLabel: "A", text: "Choice A", isCorrect: true, order: 0 },
      { id: `${id}-c2`, choiceLabel: "B", text: "Choice B", isCorrect: false, order: 1 },
      { id: `${id}-c3`, choiceLabel: "C", text: "Choice C", isCorrect: false, order: 2 },
      { id: `${id}-c4`, choiceLabel: "D", text: "Choice D", isCorrect: false, order: 3 },
    ],
  };
}

describe("Generic Exam Engine — Question Selection", () => {
  const pool: EngineQuestion[] = [
    createMockQuestion("q1", "sub-1"),
    createMockQuestion("q2", "sub-1"),
    createMockQuestion("q3", "sub-1"),
    createMockQuestion("q4", "sub-2"),
    createMockQuestion("q5", "sub-2"),
    createMockQuestion("q6", "sub-2"),
    createMockQuestion("q7", "sub-3"),
    createMockQuestion("q8", "sub-3"),
    createMockQuestion("q9", "sub-3"),
  ];

  it("selects exact requested itemCount", () => {
    const rule: ExamRuleConfig = {
      mode: "quick",
      itemCount: 5,
      timeLimitMinutes: 10,
      passingScorePercentage: 80,
      allowsFlagging: true,
      hasContinuousTimer: true,
    };

    const selected = selectQuestionsForExam(pool, rule);
    expect(selected.length).toBe(5);
  });

  it("varies selection across draws (per-request selection, review P1-6)", () => {
    const rule: ExamRuleConfig = {
      mode: "quick",
      itemCount: 5,
      timeLimitMinutes: 10,
      passingScorePercentage: 80,
      allowsFlagging: true,
      hasContinuousTimer: true,
    };

    // A real PRNG: consecutive draws from a 9-item pool into 5 slots virtually
    // never land on the identical ordered selection (P(all 5 identical) < 1e-8).
    // Seeded Math would make this deterministic — this test pins that the
    // selection is genuinely re-drawn per call (the bug generateStaticParams caused).
    const draws = new Set(
      Array.from({ length: 5 }, () => selectQuestionsForExam(pool, rule).map((q) => q.id).join(","))
    );
    expect(draws.size).toBeGreaterThan(1);
  });

  it("never repeats a question within one selection (no filler duplicates)", () => {
    const rule: ExamRuleConfig = {
      mode: "full",
      itemCount: 9,
      timeLimitMinutes: 190,
      passingScorePercentage: 80,
      allowsFlagging: true,
      hasContinuousTimer: true,
    };

    const selected = selectQuestionsForExam(pool, rule);
    const ids = selected.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("respects subject distribution quotas when provided", () => {
    const rule: ExamRuleConfig = {
      mode: "medium",
      itemCount: 6,
      timeLimitMinutes: 20,
      passingScorePercentage: 80,
      subjectDistribution: {
        "sub-1": 2,
        "sub-2": 2,
        "sub-3": 2,
      },
      allowsFlagging: true,
      hasContinuousTimer: true,
    };

    const selected = selectQuestionsForExam(pool, rule);
    expect(selected.length).toBe(6);

    const sub1 = selected.filter((q) => q.subjectId === "sub-1");
    const sub2 = selected.filter((q) => q.subjectId === "sub-2");
    const sub3 = selected.filter((q) => q.subjectId === "sub-3");

    expect(sub1.length).toBe(2);
    expect(sub2.length).toBe(2);
    expect(sub3.length).toBe(2);
  });

  it("biases selection away from recently seen questions in exposure history", () => {
    // If user has recently seen q1, q2, q4, q5, q7, q8
    const exposureHistory = new Set(["q1", "q2", "q4", "q5", "q7", "q8"]);
    // Unseen are q3, q6, q9 (3 questions)

    const rule: ExamRuleConfig = {
      mode: "quick",
      itemCount: 3,
      timeLimitMinutes: 5,
      passingScorePercentage: 80,
      allowsFlagging: true,
      hasContinuousTimer: true,
    };

    const selected = selectQuestionsForExam(pool, rule, exposureHistory);
    expect(selected.length).toBe(3);

    // All 3 selected should be from the unseen set (q3, q6, q9)
    const selectedIds = new Set(selected.map((q) => q.id));
    expect(selectedIds.has("q3")).toBe(true);
    expect(selectedIds.has("q6")).toBe(true);
    expect(selectedIds.has("q9")).toBe(true);
  });

  it("properly labels choices A, B, C, D on selected questions", () => {
    const rule: ExamRuleConfig = {
      mode: "quick",
      itemCount: 2,
      timeLimitMinutes: 5,
      passingScorePercentage: 80,
      allowsFlagging: true,
      hasContinuousTimer: true,
    };

    const selected = selectQuestionsForExam(pool, rule);
    for (const q of selected) {
      expect(q.choices.length).toBe(4);
      expect(q.choices.map((c) => c.choiceLabel)).toEqual(["A", "B", "C", "D"]);
    }
  });

  it("preserves choice order when lockChoiceOrder is true", () => {
    const lockedQuestion: EngineQuestion = {
      ...createMockQuestion("q-locked", "sub-1"),
      lockChoiceOrder: true,
      choices: [
        { id: "c1", choiceLabel: "A", text: "Statement I only", isCorrect: false, order: 0 },
        { id: "c2", choiceLabel: "B", text: "Statement II only", isCorrect: false, order: 1 },
        { id: "c3", choiceLabel: "C", text: "Both I and II", isCorrect: true, order: 2 },
        { id: "c4", choiceLabel: "D", text: "Neither I nor II", isCorrect: false, order: 3 },
      ],
    };

    const rule: ExamRuleConfig = {
      mode: "quick",
      itemCount: 1,
      timeLimitMinutes: 5,
      passingScorePercentage: 80,
      allowsFlagging: true,
      hasContinuousTimer: true,
    };

    // Run multiple selections to guarantee no random shuffle reorders it
    for (let i = 0; i < 10; i++) {
      const [selected] = selectQuestionsForExam([lockedQuestion], rule);
      expect(selected.choices.map((c) => c.text)).toEqual([
        "Statement I only",
        "Statement II only",
        "Both I and II",
        "Neither I nor II",
      ]);
      expect(selected.choices.map((c) => c.choiceLabel)).toEqual(["A", "B", "C", "D"]);
    }
  });
});

