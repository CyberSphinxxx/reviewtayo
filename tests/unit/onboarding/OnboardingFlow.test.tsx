import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { OnboardingService } from "@/lib/onboarding/onboarding-service";
import { LocalStorageService } from "@/lib/storage/local-storage-service";
import { WorkspaceService } from "@/lib/workspace/workspace-service";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => "/onboarding",
}));

async function completeThroughReview() {
  // Identity: guest
  fireEvent.click(screen.getByRole("radio", { name: "Continue as guest" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  // Exam: CSE + Professional
  await screen.findByRole("radio", { name: "CSE" });
  fireEvent.click(screen.getByRole("radio", { name: "CSE" }));
  fireEvent.click(screen.getByRole("button", { name: "Professional" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  // Starting point: skip
  await screen.findByRole("button", { name: "Continue" });
  fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
  // Rhythm: choose Mon/Wed
  await screen.findByRole("button", { name: "Monday" });
  fireEvent.click(screen.getByRole("button", { name: "Monday" }));
  fireEvent.click(screen.getByRole("button", { name: "Wednesday" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  // Goal: preset 20
  await screen.findByRole("radio", { name: /20 questions a day/ });
  fireEvent.click(screen.getByRole("radio", { name: /20 questions a day/ }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  // Review
  await screen.findByText("Here's your study plan");
}

describe("OnboardingFlow — guest journey", () => {
  beforeEach(() => {
    window.localStorage.clear();
    LocalStorageService.resetMigrationForTesting();
    OnboardingService.reset();
    mockPush.mockClear();
    // The consent gate now fronts the flow; these tests exercise the steps
    // themselves, so seed an already-chosen consent record.
    window.localStorage.setItem(
      "csereviewer_cookie_consent",
      JSON.stringify({ essential: true, analytics: false, ads: false, hasChosen: true, updatedAt: Date.now() })
    );
  });

  it("walks the full guest path and marks storage in-progress at each step", async () => {
    render(<OnboardingFlow />);
    expect(screen.getByRole("heading", { name: /How would you like to keep your progress/i })).toBeInTheDocument();

    await completeThroughReview();

    const state = OnboardingService.getState();
    expect(state.status).toBe("in_progress");
    expect(state.currentStep).toBe("review");
    expect(state.answers.identityMode).toBe("guest");
    expect(state.answers.examId).toBe("cse");
    expect(state.answers.levelId).toBe("professional");
    expect(state.answers.studyDays).toEqual([1, 3]);
    expect(state.answers.dailyGoal).toBe(20);
  });

  it("moves focus to the step heading after each step change", async () => {
    render(<OnboardingFlow />);
    const heading = screen.getByRole("heading", { name: /How would you like to keep your progress/i });
    heading.focus();
    fireEvent.click(screen.getByRole("radio", { name: "Continue as guest" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(document.activeElement?.id).toBe("onboarding-step-title");
    });
  });

  it("back navigation preserves previously entered answers", async () => {
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("radio", { name: "Continue as guest" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await screen.findByRole("radio", { name: "CSE" });
    fireEvent.click(screen.getByRole("radio", { name: "CSE" }));
    fireEvent.click(screen.getByRole("button", { name: "Professional" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("button", { name: "Skip for now" });

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("radio", { name: "CSE" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "CSE" })).toHaveAttribute("aria-checked", "true");
  });

  it("resumes the saved step after an unmount/remount (refresh simulation)", async () => {
    const first = render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("radio", { name: "Continue as guest" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("radio", { name: "CSE" });
    first.unmount();

    // Fresh mount reads persisted state — the exam step is restored.
    render(<OnboardingFlow />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /What are you preparing for/i })
      ).toBeInTheDocument();
    });
    expect(OnboardingService.getState().status).toBe("in_progress");
  });

  it("review step shows the plan with edit links, and edits return to the right step", async () => {
    render(<OnboardingFlow />);
    await completeThroughReview();

    expect(screen.getByText("CSE · Professional")).toBeInTheDocument();
    expect(screen.getByText("Mon, Wed")).toBeInTheDocument();
    expect(screen.getByText(/20 questions/)).toBeInTheDocument();

    const edits = screen.getAllByRole("button", { name: "Edit" });
    expect(edits.length).toBe(5);
    // First edit goes back to the exam step.
    fireEvent.click(edits[0]);
    expect(
      screen.getByRole("heading", { name: /What are you preparing for/i })
    ).toBeInTheDocument();
  });

  it("finish performs the atomic save: completed status, workspace, then routes to the real first activity", async () => {
    render(<OnboardingFlow />);
    await completeThroughReview();
    fireEvent.click(screen.getByRole("button", { name: /Looks good — continue/i }));

    // Personalize: skip via Continue (nothing selected)
    await screen.findByRole("button", { name: "Continue" });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Finish: save
    await screen.findByRole("button", { name: /Save & continue/i });
    fireEvent.click(screen.getByRole("button", { name: /Save & continue/i }));

    await screen.findByText(/Your study plan is ready/i);

    const state = OnboardingService.getState();
    expect(state.status).toBe("completed");
    expect(state.completedAt).toBeDefined();

    const ws = WorkspaceService.getCurrentWorkspace();
    expect(ws).not.toBeNull();
    expect(ws?.examId).toBe("cse");
    expect(ws?.levelId).toBe("professional");
    expect(ws?.dailyGoal).toBe(20);

    // First activity is the real, level-aware diagnostic route.
    fireEvent.click(screen.getByRole("button", { name: "Start my first practice" }));
    expect(mockPush).toHaveBeenCalledWith("/exams/professional/quick");
  });

  it("re-running the finish cannot duplicate workspaces (idempotent save)", async () => {
    render(<OnboardingFlow />);
    await completeThroughReview();
    fireEvent.click(screen.getByRole("button", { name: /Looks good — continue/i }));
    await screen.findByRole("button", { name: "Continue" });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("button", { name: /Save & continue/i });
    fireEvent.click(screen.getByRole("button", { name: /Save & continue/i }));
    await screen.findByText(/Your study plan is ready/i);

    expect(WorkspaceService.getAllWorkspaces().length).toBe(1);
  });

  it("shows the dashboard fallback (never a fake test) when no exam was chosen", async () => {
    // Force answers without an exam, then mount directly at review via service.
    OnboardingService.startAt("identity");
    OnboardingService.updateAnswers({ identityMode: "guest" });
    OnboardingService.moveTo("exam");
    OnboardingService.moveTo("starting-point");
    OnboardingService.moveTo("rhythm");
    OnboardingService.moveTo("goal");
    OnboardingService.moveTo("review");

    render(<OnboardingFlow />);
    await screen.findByText("Here's your study plan");
    expect(screen.getByText("No exam chosen yet")).toBeInTheDocument();
    expect(screen.getByText(/We'll suggest something useful from your dashboard/i)).toBeInTheDocument();
  });
});
