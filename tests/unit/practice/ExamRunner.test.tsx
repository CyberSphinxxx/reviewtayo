import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExamRunner } from "@/features/practice/ExamRunner";
import type { EngineQuestion, ExamRuleConfig } from "@/features/exam-engine";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockQuestions: EngineQuestion[] = [
  {
    id: "q1",
    topicId: "top-1",
    topicName: "Grammar",
    topicSlug: "grammar",
    subjectId: "sub-1",
    subjectName: "Verbal Ability",
    subjectSlug: "verbal-ability",
    questionText: "Sample Question 1 text",
    explanation: "Educational explanation for question 1",
    difficulty: "medium",
    language: "en",
    choices: [
      { id: "c1", choiceLabel: "A", text: "Alpha Choice", isCorrect: true, order: 0 },
      { id: "c2", choiceLabel: "B", text: "Beta Choice", isCorrect: false, order: 1 },
    ],
  },
  {
    id: "q2",
    topicId: "top-2",
    topicName: "Percentages",
    topicSlug: "percentages",
    subjectId: "sub-2",
    subjectName: "Numerical Ability",
    subjectSlug: "numerical-ability",
    questionText: "Sample Question 2 text",
    explanation: "Educational explanation for question 2",
    difficulty: "easy",
    language: "en",
    choices: [
      { id: "c3", choiceLabel: "A", text: "Gamma Choice", isCorrect: false, order: 0 },
      { id: "c4", choiceLabel: "B", text: "Delta Choice", isCorrect: true, order: 1 },
    ],
  },
];

const mockRules: ExamRuleConfig = {
  mode: "quick",
  itemCount: 2,
  timeLimitMinutes: 10,
  passingScorePercentage: 80,
  allowsFlagging: true,
  hasContinuousTimer: true,
};

describe("ExamRunner Component", () => {
  it("renders exam header, timer, and current question", () => {
    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mockRules}
        title="Diagnostic Quick Test"
      />
    );

    expect(screen.getByText("Diagnostic Quick Test")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Sample Question 1 text")).toBeInTheDocument();
    expect(screen.getByText("Alpha Choice")).toBeInTheDocument();
    expect(screen.getByText("Beta Choice")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
  });

  it("selects choices and updates progress hierarchy", () => {
    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mockRules}
        title="Diagnostic Quick Test"
      />
    );

    expect(screen.getByText(/0 answered/i)).toBeInTheDocument();
    expect(screen.getByText(/2 remaining/i)).toBeInTheDocument();

    const choiceBtn = screen.getByText("Alpha Choice");
    fireEvent.click(choiceBtn);

    expect(screen.getByText(/1 answered/i)).toBeInTheDocument();
    expect(screen.getByText(/1 remaining/i)).toBeInTheDocument();
    expect(screen.getByText("Selected")).toBeInTheDocument();
  });

  it("toggles flag state on current question", () => {
    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mockRules}
        title="Diagnostic Quick Test"
      />
    );

    const flagBtn = screen.getByRole("button", { name: /flag/i });
    expect(flagBtn).toHaveTextContent("Flag");

    fireEvent.click(flagBtn);
    expect(flagBtn).toHaveTextContent("Flagged");

    fireEvent.click(flagBtn);
    expect(flagBtn).toHaveTextContent("Flag");
  });

  it("navigates between questions with Next and Previous buttons", () => {
    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mockRules}
        title="Diagnostic Quick Test"
      />
    );

    const nextBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Sample Question 2 text")).toBeInTheDocument();

    const prevBtn = screen.getByRole("button", { name: /previous/i });
    fireEvent.click(prevBtn);

    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
  });

  it("opens review modal before submission for timed assessments", () => {
    const fullRules: ExamRuleConfig = { ...mockRules, mode: "full" };

    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={fullRules}
        title="Full Mock Exam"
      />
    );

    const submitBtn = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText("Review Before Submission")).toBeInTheDocument();
    expect(screen.getByText("Return to Questions")).toBeInTheDocument();
    expect(screen.getByText("Submit Test")).toBeInTheDocument();
  });

  it("renders Save & Exit and handles confirmation modal for unanswered test", () => {
    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mockRules}
        title="Diagnostic Quick Test"
      />
    );

    const exitBtn = screen.getByRole("button", { name: /save and exit/i });
    fireEvent.click(exitBtn);

    expect(screen.getByText("Leave this test?")).toBeInTheDocument();
    expect(screen.getByText("You have not answered any questions yet.")).toBeInTheDocument();
    expect(screen.getByText("Keep Practicing")).toBeInTheDocument();
    expect(screen.getByText("Leave Test")).toBeInTheDocument();

    // Click Keep Practicing to dismiss
    fireEvent.click(screen.getByText("Keep Practicing"));
    expect(screen.queryByText("Leave this test?")).not.toBeInTheDocument();
  });

  it("renders Save & Exit and saves progress for answered test", () => {
    mockPush.mockClear();
    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mockRules}
        title="Diagnostic Quick Test"
      />
    );

    // Answer Q1
    fireEvent.click(screen.getByText("Alpha Choice"));

    // Click Save & Exit
    const exitBtn = screen.getByRole("button", { name: /save and exit/i });
    fireEvent.click(exitBtn);

    expect(screen.getByText("Leave this test?")).toBeInTheDocument();
    expect(
      screen.getByText("Your progress is saved and you can resume this test later.")
    ).toBeInTheDocument();

    // Click Save & Leave
    fireEvent.click(screen.getByText("Save & Leave"));
    expect(mockPush).toHaveBeenCalledWith("/practice");
  });

  it("opens and toggles controls in Display menu", () => {
    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mockRules}
        title="Diagnostic Quick Test"
      />
    );

    const displayBtn = screen.getByRole("button", { name: /display accessibility settings/i });
    fireEvent.click(displayBtn);

    expect(screen.getByText("Font Size")).toBeInTheDocument();
    expect(screen.getByText("High Contrast")).toBeInTheDocument();
    expect(screen.getByText("Reduce Motion")).toBeInTheDocument();

    // Select Large Font
    const largeBtn = screen.getByRole("button", { name: "Large" });
    fireEvent.click(largeBtn);
    expect(largeBtn).toHaveClass("bg-white text-slate-900");

    // Toggle High Contrast
    const contrastSwitch = screen.getByRole("switch", { name: /toggle high contrast/i });
    fireEvent.click(contrastSwitch);
    expect(contrastSwitch).toHaveAttribute("aria-checked", "true");

    // Toggle Reduce Motion
    const motionSwitch = screen.getByRole("switch", { name: /toggle reduce motion/i });
    fireEvent.click(motionSwitch);
    expect(motionSwitch).toHaveAttribute("aria-checked", "true");
  });

  it("detects existing active draft, shows resume banner, and resumes session on click", async () => {
    const { LocalStorageService } = await import("@/lib/storage");
    LocalStorageService.saveActiveDraft({
      id: "draft-pro-quick",
      levelSlug: "professional",
      mode: "quick",
      title: "Diagnostic Quick Test",
      rules: mockRules,
      questions: mockQuestions,
      answers: {
        q1: { questionId: "q1", selectedChoiceId: "c1", isFlagged: true, timeSpentSeconds: 12 },
      },
      flaggedQuestionIds: ["q1"],
      currentQuestionIndex: 0,
      remainingSeconds: 450,
      startedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
    });

    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mockRules}
        title="Diagnostic Quick Test"
        trackId="professional"
      />
    );

    expect(screen.getByText(/Unfinished Session Found/i)).toBeInTheDocument();
    expect(screen.getByText(/1 answered/i)).toBeInTheDocument();

    const resumeBtn = screen.getByRole("button", { name: /Resume Session/i });
    fireEvent.click(resumeBtn);

    // Banner should dismiss and flagged status should be restored
    expect(screen.queryByText(/Unfinished Session Found/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /flag/i })).toHaveTextContent("Flagged");
  });

  it("discards existing draft when Discard & Start Fresh is clicked", async () => {
    const { LocalStorageService } = await import("@/lib/storage");
    LocalStorageService.saveActiveDraft({
      id: "draft-pro-quick",
      levelSlug: "professional",
      mode: "quick",
      title: "Diagnostic Quick Test",
      rules: mockRules,
      questions: mockQuestions,
      answers: {
        q1: { questionId: "q1", selectedChoiceId: "c1", isFlagged: false, timeSpentSeconds: 5 },
      },
      flaggedQuestionIds: [],
      currentQuestionIndex: 0,
      remainingSeconds: 500,
      startedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
    });

    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mockRules}
        title="Diagnostic Quick Test"
        trackId="professional"
      />
    );

    const discardBtn = screen.getByRole("button", { name: /Discard & Start Fresh/i });
    fireEvent.click(discardBtn);

    expect(screen.queryByText(/Unfinished Session Found/i)).not.toBeInTheDocument();
    expect(LocalStorageService.getActiveDraft("professional", "quick")).toBeNull();
  });

  it("selects choice and flags question via keyboard shortcuts", () => {
    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mockRules}
        title="Diagnostic Quick Test"
      />
    );

    // Press 'A' key to select choice A (Alpha Choice)
    fireEvent.keyDown(window, { key: "a" });
    expect(screen.getByText("Alpha Choice").closest("div")).toHaveClass("border-brand-700");

    // Press 'F' key to toggle flag
    fireEvent.keyDown(window, { key: "f" });
    expect(screen.getByRole("button", { name: /flag/i })).toHaveTextContent("Flagged");

    // Press 'ArrowRight' to move to next question
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("Sample Question 2 text")).toBeInTheDocument();
  });

  it("supports striking through and eliminating distractors", () => {
    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mockRules}
        title="Diagnostic Quick Test"
      />
    );

    // Eliminate Option B
    const eliminateBtn = screen.getByRole("button", { name: /Cross-out Option B/i });
    fireEvent.click(eliminateBtn);

    // Beta choice should now have line-through text and restore button
    expect(screen.getByText("Beta Choice")).toHaveClass("line-through");
    expect(screen.getByRole("button", { name: /Restore Option B/i })).toBeInTheDocument();

    // Clicking the eliminated button does not select it
    fireEvent.click(screen.getByText("Beta Choice"));
    expect(screen.getByText("Beta Choice").closest("div")).not.toHaveClass("border-brand-700");
  });

  it("requires committing the answer before revealing feedback in practice mode", () => {
    const practiceRules: ExamRuleConfig = {
      ...mockRules,
      mode: "practice",
    };

    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={practiceRules}
        title="Topic Practice"
      />
    );

    // Before selecting: the primary action is Answer and disabled, with an
    // accessible hint that a choice is needed.
    const answerBtn = screen.getByRole("button", { name: "Answer" });
    expect(answerBtn).toBeDisabled();
    expect(screen.getByText(/Select an answer to continue/i)).toBeInTheDocument();

    // Selection alone reveals nothing.
    fireEvent.click(screen.getByText("Alpha Choice"));
    expect(screen.queryByText("Educational explanation for question 1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("practice-verdict")).not.toBeInTheDocument();

    // Committing locks the choice in, reveals the verdict + rationale, and
    // swaps the primary action to Next.
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    expect(screen.getByTestId("practice-verdict")).toHaveTextContent(/Correct/);
    expect(screen.getByText("Educational explanation for question 1")).toBeInTheDocument();
    expect(screen.queryByText(/Educational Concept & Rationale/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Answer" })).not.toBeInTheDocument();

    // The committed choice is locked: clicking it again cannot change it.
    fireEvent.click(screen.getByText("Beta Choice"));
    expect(screen.getByTestId("practice-verdict")).toHaveTextContent(/Correct/);
  });

  it("shows the incorrect verdict with accessible text and the correct answer revealed", () => {
    const practiceRules: ExamRuleConfig = { ...mockRules, mode: "practice" };

    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={practiceRules}
        title="Topic Practice"
      />
    );

    // q1: A is correct, B is wrong — commit the wrong answer.
    fireEvent.click(screen.getByText("Beta Choice"));
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));

    const verdict = screen.getByTestId("practice-verdict");
    expect(verdict).toHaveTextContent(/Incorrect/);
    expect(verdict).toHaveAttribute("role", "status");
  });

  it("opens and interacts with the virtual arithmetic scratchpad", () => {
    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mockRules}
        title="Numerical Drill"
      />
    );

    // Click scratchpad button
    fireEvent.click(screen.getByRole("button", { name: /scratchpad/i }));

    // Verify scratchpad modal is visible
    expect(screen.getByText(/Scratchpad & Arithmetic Canvas/i)).toBeInTheDocument();

    // Switch to type notes
    fireEvent.click(screen.getByRole("button", { name: /type notes/i }));
    const textarea = screen.getByPlaceholderText(/type calculations or thoughts here/i);
    fireEvent.change(textarea, { target: { value: "170 * 0.8 = 136" } });
    expect(textarea).toHaveValue("170 * 0.8 = 136");

    // Close scratchpad
    fireEvent.click(screen.getByRole("button", { name: /keep working/i }));
    expect(screen.queryByText(/Scratchpad & Arithmetic Canvas/i)).not.toBeInTheDocument();
  });

  it("shows the owl coach panel with streak reactions after committed answers", () => {
    const practiceRules: ExamRuleConfig = { ...mockRules, mode: "practice" };

    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={practiceRules}
        title="Topic Practice"
      />
    );

    // Coach panel is present; the empty streak chip is hidden (redundant copy)
    expect(screen.getByTestId("coach-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("coach-streak")).not.toBeInTheDocument();

    // Selection alone does not fire the owl.
    fireEvent.click(screen.getByText("Alpha Choice"));
    expect(screen.queryByTestId("coach-streak")).not.toBeInTheDocument();

    // Committing the correct answer (A): owl goes happy, streak starts
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    expect(screen.getByTestId("coach-streak")).toHaveTextContent("Streak \u00D71");

    // Next question, then commit a wrong answer (A is wrong on q2): streak resets
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByText("Gamma Choice"));
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    expect(screen.queryByTestId("coach-streak")).not.toBeInTheDocument();

    // The owl bubble carries the explanation instead of a separate card
    expect(screen.getByText("Educational explanation for question 2")).toBeInTheDocument();
  });  it("shows coach chrome in quick mode but does not reveal answers before submit", () => {
    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mockRules}
        title="Diagnostic Quick Test"
      />
    );

    // Quick 10-item practice runs the coach chrome
    expect(screen.getByTestId("coach-panel")).toBeInTheDocument();

    // But quick mode is still timed and assessment-like: no instant rationale,
    // and the owl never reacts because answers are hidden until submission.
    fireEvent.click(screen.getByText("Alpha Choice"));
    expect(screen.queryByText(/Educational Concept & Rationale/i)).not.toBeInTheDocument();
    // No streak chip while there is no streak (the neutral copy was redundant).
    expect(screen.queryByTestId("coach-streak")).not.toBeInTheDocument();
    expect(screen.getByText("Selected")).toBeInTheDocument();
  });

  it("places the owl coach rail left of the question with per-answer stats", () => {
    const practiceRules: ExamRuleConfig = { ...mockRules, mode: "practice" };

    const { container } = render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={practiceRules}
        title="Topic Practice"
      />
    );

    // The coach rail precedes the question heading in DOM order (left column).
    const panel = screen.getByTestId("coach-panel");
    const heading = screen.getByText("Question 1 of 2");
    expect(
      heading.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_PRECEDING
    ).toBeTruthy();

    // Stats line counts answers and corrects as the player commits them.
    expect(screen.getByTestId("coach-progress")).toHaveTextContent("Answered 0/2 - Correct 0");
    fireEvent.click(screen.getByText("Alpha Choice"));
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    expect(screen.getByTestId("coach-progress")).toHaveTextContent("Answered 1/2 - Correct 1");

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByText("Gamma Choice"));
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    expect(screen.getByTestId("coach-progress")).toHaveTextContent("Answered 2/2 - Correct 1");

    // The legacy placement (inside the right-hand map aside) is gone.
    expect(container.querySelectorAll("aside [data-testid='coach-panel']")).toHaveLength(0);
  });

  it("renders the exam hall with zero owl mascots for distraction-free mocks", () => {
    const fullRules: ExamRuleConfig = { ...mockRules, mode: "full" };

    const { container } = render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={fullRules}
        title="Full Mock Exam"
      />
    );

    // No coach panel and no owl SVG anywhere in the runner.
    expect(screen.queryByTestId("coach-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("coach-panel-compact")).not.toBeInTheDocument();
    expect(container.querySelector("svg.owl")).toBeNull();

    // Small banks stay on a single map page (no pager rendered).
    expect(screen.queryByTestId("map-pagination")).not.toBeInTheDocument();
  });

  it("paginates the question map in pages of 50 for large banks", () => {
    const manyQuestions: EngineQuestion[] = Array.from({ length: 120 }, (_, i) => ({
      id: `q${i + 1}`,
      topicId: "top-1",
      topicName: "Grammar",
      topicSlug: "grammar",
      subjectId: "sub-1",
      subjectName: "Verbal Ability",
      subjectSlug: "verbal-ability",
      questionText: `Sample text for question ${i + 1}`,
      explanation: `Explanation ${i + 1}`,
      difficulty: "easy",
      language: "en",
      choices: [
        { id: `q${i + 1}-a`, choiceLabel: "A", text: `Choice A of ${i + 1}`, isCorrect: true, order: 0 },
        { id: `q${i + 1}-b`, choiceLabel: "B", text: `Choice B of ${i + 1}`, isCorrect: false, order: 1 },
      ],
    }));

    render(
      <ExamRunner
        initialQuestions={manyQuestions}
        rules={mockRules}
        title="Diagnostic Quick Test"
      />
    );

    // Open the map drawer: 120 items -> 3 pages, page 1 shows 1-50.
    fireEvent.click(screen.getByRole("button", { name: /palette/i }));
    expect(screen.getAllByText("1 / 3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("50").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("51")).toHaveLength(0);

    // Pager advances to page 2: 51-100 only.
    fireEvent.click(screen.getAllByRole("button", { name: /next map page/i })[0]);
    expect(screen.getAllByText("2 / 3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("51").length).toBeGreaterThan(0);
    expect(screen.getAllByText("100").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("50")).toHaveLength(0);
    expect(screen.queryAllByText("101")).toHaveLength(0);

    // Jumping to a mapped question closes the drawer and lands on it.
    fireEvent.click(screen.getAllByRole("button", { name: "51" })[0]);
    expect(screen.getByText("Question 51 of 120")).toBeInTheDocument();
  });

  it("keeps the exam hall chrome without a coach panel in medium mode", () => {
    const mediumRules: ExamRuleConfig = { ...mockRules, mode: "medium" };

    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mediumRules}
        title="Medium Assessment"
      />
    );

    // No coach panel in graded assessment modes
    expect(screen.queryByTestId("coach-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("coach-panel-compact")).not.toBeInTheDocument();

    // Instant feedback stays off; exam-day rules apply
    fireEvent.click(screen.getByText("Alpha Choice"));
    expect(screen.queryByText(/Educational Concept & Rationale/i)).not.toBeInTheDocument();
    expect(screen.getByText("Selected")).toBeInTheDocument();
  });

  it("lets revealed-answer practice submit straight from the last question", async () => {
    const practiceRules: ExamRuleConfig = { ...mockRules, mode: "practice" };

    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={practiceRules}
        title="Topic Practice"
      />
    );

    // Answer both questions, navigating with Next after each commit
    fireEvent.click(screen.getByText("Alpha Choice"));
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByText("Delta Choice"));

    // On the final question, committing swaps Answer → Submit Test, which
    // skips the review modal entirely
    expect(screen.getByRole("button", { name: "Answer" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    fireEvent.click(screen.getByRole("button", { name: /submit test/i }));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/results/"))
    );
    expect(screen.queryByText("Review Before Submission")).not.toBeInTheDocument();
  });

  it("records explicit exam identity on submitted attempts (guide §22 — no title sniffing)", async () => {
    const { LocalStorageService } = await import("@/lib/storage");
    const practiceRules: ExamRuleConfig = { ...mockRules, mode: "practice" };

    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={practiceRules}
        title="Topic Practice"
        trackId="subprofessional"
      />
    );

    fireEvent.click(screen.getByText("Alpha Choice"));
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByText("Delta Choice"));
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    fireEvent.click(screen.getByRole("button", { name: /submit test/i }));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/results/"))
    );

    const history = LocalStorageService.getAttemptHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].examLevelId).toBe("subprofessional");
  });

  it("counts a committed practice answer exactly once in the recorded score", async () => {
    const { LocalStorageService } = await import("@/lib/storage");
    const practiceRules: ExamRuleConfig = { ...mockRules, mode: "practice" };

    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={practiceRules}
        title="Topic Practice"
        trackId="professional"
      />
    );

    // Commit q1 (A is correct), then re-click the same choice — the answer
    // must not be double-counted.
    fireEvent.click(screen.getByText("Alpha Choice"));
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    fireEvent.click(screen.getByText("Alpha Choice"));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByText("Delta Choice"));
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    fireEvent.click(screen.getByRole("button", { name: /submit test/i }));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/results/"))
    );

    const history = LocalStorageService.getAttemptHistory();
    expect(history.length).toBeGreaterThan(0);
    // 2 questions committed correct once each: raw score 2, not 3 or 4.
    expect(history[0].percentage).toBe(100);
  });

  it("keeps exam-mode navigation intact: no Answer gate, selection reveals nothing", () => {
    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={mockRules}
        title="Diagnostic Quick Test"
      />
    );

    // Timed assessments keep the plain Next flow.
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Answer" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Alpha Choice"));
    expect(screen.getByText("Selected")).toBeInTheDocument();
    expect(screen.queryByTestId("practice-verdict")).not.toBeInTheDocument();
    expect(screen.queryByText("Educational explanation for question 1")).not.toBeInTheDocument();
  });

  it("keeps the review confirmation for the full mock exam", () => {
    const fullRules: ExamRuleConfig = { ...mockRules, mode: "full" };

    render(
      <ExamRunner
        initialQuestions={mockQuestions}
        rules={fullRules}
        title="Full Mock Exam"
      />
    );

    // Navigate to the last question, then the CTA reads "Review & Submit"
    // and opens the confirmation modal
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /review & submit/i }));
    expect(screen.getByText("Review Before Submission")).toBeInTheDocument();
    expect(screen.getByText("Submit Test")).toBeInTheDocument();
  });
});
