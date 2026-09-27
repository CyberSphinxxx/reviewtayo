"use client";

import { useCallback, useEffect, useState } from "react";
import { OnboardingService } from "@/lib/onboarding/onboarding-service";
import { resolveFirstActivity } from "@/lib/onboarding/plan-preview";
import { getPostAuthDestinationFromState, sanitizeReturnTo } from "@/lib/onboarding/destination";
import { WorkspaceService } from "@/lib/workspace/workspace-service";
import {
  ONBOARDING_STEP_ORDER,
  type OnboardingAnswers,
  type OnboardingState,
  type OnboardingStepId,
} from "@/lib/onboarding/types";

export interface UseOnboardingFlowResult {
  state: OnboardingState;
  stepIndex: number;
  maxIndex: number;
  stepCount: number;
  goTo: (step: OnboardingStepId) => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  patchAnswers: (patch: Partial<OnboardingAnswers>) => void;
  finish: () => FirstActivityOutcome;
}

export interface FirstActivityOutcome {
  href: string;
  fallback: boolean;
}

const FIRST_INDEX = 0;
const LAST_INDEX = ONBOARDING_STEP_ORDER.length - 1;

/**
 * Flow state machine for the onboarding shell. All persistence goes through
 * OnboardingService (versioned, safe-parse, storage-failure tolerant); this
 * hook only orchestrates steps and the atomic finish.
 *
 * `active` gates the initial start-at marker: while the consent choice is
 * pending the flow must not record anything (RA 10173 — no data before the
 * privacy choice), so status stays not_started until the gate passes.
 */
export function useOnboardingFlow(options?: { active?: boolean }): UseOnboardingFlowResult {
  const active = options?.active ?? true;
  const [state, setState] = useState<OnboardingState>(() => OnboardingService.getState());

  // Mark the flow as in-progress on first mount so a refresh mid-flow can
  // resume. Completed/dismissed states are left untouched (idempotent).
  // A completed user in edit mode (?edit=1) lands on the review step — the
  // plan hub with per-row edit links — instead of replaying from identity.
  useEffect(() => {
    if (!active) return;
    const current = OnboardingService.getState();
    if (current.status === "not_started") {
      setState(OnboardingService.startAt(current.currentStep));
    } else if (current.status === "completed") {
      setState({ ...current, currentStep: "review" });
    }
  }, [active]);

  const stepIndex = ONBOARDING_STEP_ORDER.indexOf(state.currentStep);
  const maxIndex = ONBOARDING_STEP_ORDER.indexOf(state.maxStepReached);

  const persist = useCallback((next: OnboardingState) => setState(next), []);

  const goTo = useCallback(
    (step: OnboardingStepId) => {
      persist(OnboardingService.moveTo(step));
    },
    [persist]
  );

  const next = useCallback(() => {
    if (stepIndex >= LAST_INDEX) return;
    persist(OnboardingService.moveTo(ONBOARDING_STEP_ORDER[stepIndex + 1]));
  }, [persist, stepIndex]);

  const back = useCallback(() => {
    if (stepIndex <= FIRST_INDEX) return;
    persist(OnboardingService.moveTo(ONBOARDING_STEP_ORDER[stepIndex - 1]));
  }, [persist, stepIndex]);

  /** Skip advances without answering; the progress indicator stays truthful. */
  const skip = useCallback(() => {
    if (stepIndex >= LAST_INDEX) return;
    persist(OnboardingService.moveTo(ONBOARDING_STEP_ORDER[stepIndex + 1]));
  }, [persist, stepIndex]);

  const patchAnswers = useCallback(
    (patch: Partial<OnboardingAnswers>) => {
      setState(OnboardingService.updateAnswers(patch));
    },
    []
  );

  /**
   * Atomic finish: workspace (exam enrollment), study prefs mirror, and
   * completed status. Each write is idempotent, so a retry or a re-entry via
   * edit mode cannot duplicate workspaces or double-apply preferences.
   */
  const finish = useCallback((): FirstActivityOutcome => {
    const current = OnboardingService.getState();
    const a = current.answers;

    // Explicit learner choices win on (re)finish; answers left empty keep
    // the existing workspace values because createWorkspace merges with
    // `?? existing` when it updates in place (no duplication, no clobber
    // of fields the learner did not set in the flow).
    if (a.examId) {
      const workspace = WorkspaceService.createWorkspace({
        examId: a.examId,
        levelId: a.levelId,
        targetExamDate: a.targetDate,
        dailyGoal: a.dailyGoal,
      });
      void workspace;
    }

    OnboardingService.complete();

    const activity = resolveFirstActivity(a.examId, a.levelId);
    return { href: activity?.href ?? "/dashboard", fallback: activity?.fallback ?? true };
  }, []);

  return {
    state,
    stepIndex,
    maxIndex,
    stepCount: ONBOARDING_STEP_ORDER.length,
    goTo,
    next,
    back,
    skip,
    patchAnswers,
    finish,
  };
}

/** Resolves where "Get started"/post-auth should send this visitor. */
export function useOnboardingEntryDestination(): string | null {
  const dest = getPostAuthDestinationFromState();
  return dest;
}

export { sanitizeReturnTo };
