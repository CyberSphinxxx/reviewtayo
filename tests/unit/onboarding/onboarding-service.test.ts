import { describe, it, expect, beforeEach } from "vitest";
import { OnboardingService } from "@/lib/onboarding/onboarding-service";
import { LocalStorageService, STORAGE_KEYS } from "@/lib/storage/local-storage-service";

describe("OnboardingService — versioned local state", () => {
  beforeEach(() => {
    window.localStorage.clear();
    LocalStorageService.resetMigrationForTesting();
    OnboardingService.reset();
  });

  it("starts from a fresh not_started state", () => {
    const state = OnboardingService.getState();
    expect(state.status).toBe("not_started");
    expect(state.currentStep).toBe("identity");
    expect(state.maxStepReached).toBe("identity");
    expect(state.answers).toEqual({});
    expect(state.version).toBe(1);
  });

  it("persists state across reads (versioned key rt_onboarding_v1)", () => {
    OnboardingService.startAt("identity");
    OnboardingService.updateAnswers({ examId: "cse", levelId: "professional" });
    OnboardingService.moveTo("exam");

    const raw = window.localStorage.getItem("rt_onboarding_v1");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).version).toBe(1);

    const state = OnboardingService.getState();
    expect(state.status).toBe("in_progress");
    expect(state.currentStep).toBe("exam");
    expect(state.answers.examId).toBe("cse");
  });

  it("startAt is idempotent once completed or dismissed", () => {
    OnboardingService.complete();
    expect(OnboardingService.startAt("identity").status).toBe("completed");
    OnboardingService.reset();
    OnboardingService.dismiss();
    expect(OnboardingService.startAt("identity").status).toBe("dismissed");
  });

  it("moveTo only advances maxStepReached forward (truthful progress)", () => {
    OnboardingService.startAt("identity");
    OnboardingService.moveTo("exam");
    OnboardingService.moveTo("rhythm");
    let state = OnboardingService.getState();
    expect(state.maxStepReached).toBe("rhythm");

    // Going back must not rewind the max pointer.
    OnboardingService.moveTo("exam");
    state = OnboardingService.getState();
    expect(state.currentStep).toBe("exam");
    expect(state.maxStepReached).toBe("rhythm");
  });

  it("updateAnswers sanitizes invalid values instead of persisting them", () => {
    OnboardingService.startAt("identity");
    OnboardingService.updateAnswers({
      dailyGoal: 99999 as number,
      targetDate: "not-a-date",
      appearance: "neon" as never,
      studyDays: [0, 9, 3] as number[],
      discoverySource: "billboard" as never,
    });
    const answers = OnboardingService.getAnswers();
    expect(answers.dailyGoal).toBe(200); // clamped
    expect(answers.targetDate).toBeUndefined();
    expect(answers.appearance).toBeUndefined();
    expect(answers.studyDays).toEqual([0, 3]); // invalid entries dropped
    expect(answers.discoverySource).toBeUndefined();
  });

  it("complete() stamps completedAt and survives a reload-shaped re-parse", () => {
    OnboardingService.startAt("identity");
    OnboardingService.updateAnswers({ examId: "cse" });
    const done = OnboardingService.complete();
    expect(done.status).toBe("completed");
    expect(done.completedAt).toBeDefined();

    // Simulate a fresh page load: new read from raw storage.
    const reread = OnboardingService.getState();
    expect(reread.status).toBe("completed");
    expect(reread.completedAt).toBe(done.completedAt);
  });

  it("corrupted storage degrades to a fresh state instead of throwing", () => {
    window.localStorage.setItem("rt_onboarding_v1", "{not json");
    expect(OnboardingService.getState().status).toBe("not_started");
    window.localStorage.setItem(
      "rt_onboarding_v1",
      JSON.stringify({ version: 99, status: "weird" })
    );
    expect(OnboardingService.getState().status).toBe("not_started");
  });

  describe("edit-mode rule (a completed learner can adjust the plan without replaying)", () => {
    function seedCompleted() {
      OnboardingService.startAt("identity");
      OnboardingService.updateAnswers({ identityMode: "guest", examId: "cse", dailyGoal: 20 });
      OnboardingService.complete();
    }

    it("a completed user can still change answers and move between steps (edit mode)", () => {
      seedCompleted();
      expect(OnboardingService.updateAnswers({ dailyGoal: 10 }).answers.dailyGoal).toBe(10);
      expect(OnboardingService.moveTo("goal").currentStep).toBe("goal");
      expect(OnboardingService.getState().status).toBe("completed");
    });

    it("a dismissed user stays locked out of edits and navigation", () => {
      OnboardingService.startAt("identity");
      OnboardingService.dismiss();
      expect(OnboardingService.updateAnswers({ dailyGoal: 10 }).answers.dailyGoal).toBeUndefined();
      expect(OnboardingService.moveTo("goal").currentStep).toBe("identity");
    });

    it("completing again keeps a single completedAt (idempotent re-finish)", () => {
      seedCompleted();
      const first = OnboardingService.getState().completedAt;
      OnboardingService.moveTo("goal");
      const second = OnboardingService.complete().completedAt;
      expect(second).toBe(first);
    });
  });

  describe("established-user rule (legacy users are never forced through onboarding)", () => {
    it("is false for a brand-new visitor", () => {
      expect(OnboardingService.isEstablishedUser()).toBe(false);
    });

    it("is true when attempt history exists (legacy guest)", () => {
      window.localStorage.setItem(
        STORAGE_KEYS.HISTORY,
        JSON.stringify([
          {
            id: "att-legacy",
            title: "Legacy attempt",
            mode: "quick",
            percentage: 50,
            rawScore: 5,
            totalQuestions: 10,
            passed: false,
            date: new Date().toISOString(),
          },
        ])
      );
      expect(OnboardingService.isEstablishedUser()).toBe(true);
    });

    it("is true when a workspace exists", () => {
      // Seed a workspace directly the way the storage migration does.
      window.localStorage.setItem(
        "rt_workspaces_v1",
        JSON.stringify([
          {
            id: "workspace_cse",
            examId: "cse",
            levelId: "professional",
            createdAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
          },
        ])
      );
      expect(OnboardingService.isEstablishedUser()).toBe(true);
    });
  });
});
