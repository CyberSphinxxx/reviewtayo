"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ReviewTayoOwl } from "@/components/brand/ReviewTayoOwl";
import {
  getStoredConsent,
  saveStoredConsent,
  type CookieConsentState,
} from "@/components/privacy/CookieConsentBanner";
import { useOnboardingFlow } from "./useOnboardingFlow";
import { IdentityStep } from "./steps/IdentityStep";
import { ExamStep } from "./steps/ExamStep";
import { StartingPointStep } from "./steps/StartingPointStep";
import { RhythmStep } from "./steps/RhythmStep";
import { GoalStep } from "./steps/GoalStep";
import { PlanPreviewStep } from "./steps/PlanPreviewStep";
import { MakeItYoursStep } from "./steps/MakeItYoursStep";
import { FinishStep } from "./steps/FinishStep";
import type { OnboardingStepId } from "@/lib/onboarding/types";

const STEP_META: Record<OnboardingStepId, { title: string; purpose: string }> = {
  identity: {
    title: "How would you like to keep your progress?",
    purpose: "Choose how your study data is saved. You can change this later.",
  },
  exam: {
    title: "What are you preparing for?",
    purpose: "Pick an exam to build your study plan around.",
  },
  "starting-point": {
    title: "Where are you in your prep?",
    purpose: "This tunes your first activity — there are no wrong answers.",
  },
  rhythm: {
    title: "Which days can you usually study?",
    purpose: "We'll shape your weekly plan around your real schedule.",
  },
  goal: {
    title: "What feels doable most days?",
    purpose: "Your daily question goal. You can change it anytime.",
  },
  review: {
    title: "Here's your study plan",
    purpose: "Review and adjust anything before we start.",
  },
  personalize: {
    title: "Make it yours",
    purpose: "Appearance and reading comfort — everything here is optional.",
  },
  finish: {
    title: "You're all set!",
    purpose: "Your plan is ready. Here's where to begin.",
  },
};

export function OnboardingFlow() {
  const router = useRouter();
  // RA 10173 (AGENTS §7): the flow collects answers only after the learner
  // has made a consent choice — the same csereviewer_cookie_consent record
  // the global banner writes. Re-checked on every advance, so wiping consent
  // mid-flow re-gates instead of silently proceeding.
  const [gate, setGate] = useState<"unchecked" | "shown" | "passed">("unchecked");

  useEffect(() => {
    setGate(getStoredConsent()?.hasChosen ? "passed" : "shown");
  }, []);

  // Nothing is recorded while the privacy choice is pending (active=false
  // keeps status not_started until the gate passes).
  const flow = useOnboardingFlow({ active: gate === "passed" });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const gateHeadingRef = useRef<HTMLHeadingElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const stepId = flow.state.currentStep;
  const meta = STEP_META[stepId];

  const ensureConsent = useCallback((): boolean => {
    if (getStoredConsent()?.hasChosen) return true;
    setGate("shown");
    return false;
  }, []);

  // Steps advance through this wrapper so no control can bypass the gate.
  const gatedFlow = useMemo(
    () => ({
      ...flow,
      next: () => {
        if (ensureConsent()) flow.next();
      },
      skip: () => {
        if (ensureConsent()) flow.skip();
      },
      back: () => {
        if (ensureConsent()) flow.back();
      },
      goTo: (step: Parameters<typeof flow.goTo>[0]) => {
        if (ensureConsent()) flow.goTo(step);
      },
    }),
    [flow, ensureConsent]
  );

  const acceptConsent = (analytics: boolean) => {
    const consent: CookieConsentState = {
      essential: true,
      analytics,
      ads: analytics,
      hasChosen: true,
      updatedAt: Date.now(),
    };
    saveStoredConsent(consent);
    setGate("passed");
  };

  // Focus moves to the new step heading after navigation (handoff a11y rule);
  // the consent gate takes focus while it is up.
  useEffect(() => {
    if (gate === "shown") {
      gateHeadingRef.current?.focus();
      if (liveRef.current) {
        liveRef.current.textContent = "Privacy choice needed before starting.";
      }
      return;
    }
    if (gate !== "passed") return;
    headingRef.current?.focus();
    if (liveRef.current) {
      liveRef.current.textContent = `Step ${flow.stepIndex + 1} of ${flow.stepCount}: ${meta.title}`;
    }
  }, [stepId, flow.stepIndex, flow.stepCount, meta.title, gate]);

  const showBack = flow.stepIndex > 0 && stepId !== "finish";
  const showSkip = useMemo(
    () => ["starting-point", "rhythm", "goal", "personalize"].includes(stepId),
    [stepId]
  );

  return (
    <div className="min-h-dvh bg-[#fdf8f6] dark:bg-[#1a0c11] flex flex-col">
      <a
        href="#onboarding-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-[#8a1630] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* Compact header with mascot and progress */}
      <header className="px-4 sm:px-6 pt-5 pb-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-logo text-[19px] text-[#8a1630] dark:text-white rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
            aria-label="ReviewTayo home"
          >
            <ReviewTayoOwl size={26} withCap aria-hidden="true" />
            <span>reviewtayo</span>
          </Link>
          <p
            className="text-[13px] font-bold text-[#8a7a80] dark:text-[#c99aa6]"
            aria-hidden="true"
          >
            {gate === "passed" ? `Step ${Math.min(flow.stepIndex + 1, flow.stepCount)} of ${flow.stepCount}` : ""}
          </p>
        </div>

        {/* Truthful progress rail: filled up to the furthest step reached.
            Hidden while the consent gate is up — there is no step to count. */}
        {gate === "passed" && (
        <div
          className="mx-auto max-w-2xl mt-3 flex gap-1.5"
          role="progressbar"
          aria-label="Onboarding progress"
          aria-valuemin={1}
          aria-valuemax={flow.stepCount}
          aria-valuenow={Math.min(flow.stepIndex + 1, flow.stepCount)}
        >
          {Array.from({ length: flow.stepCount }, (_, i) => {
            const stepOrder = i;
            const isDone = i < flow.stepIndex || (stepOrder === flow.stepIndex && stepId === "finish");
            const isCurrent = i === flow.stepIndex;
            return (
              <span
                key={i}
                aria-hidden="true"
                className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                  isDone || isCurrent ? "bg-[#8a1630]" : "bg-[#f0dfe3] dark:bg-white/10"
                }`}
              />
            );
          })}
        </div>
        )}
      </header>

      <p ref={liveRef} className="sr-only" role="status" aria-live="polite" />

      <main
        id="onboarding-content"
        className="flex-1 px-4 sm:px-6 pb-8"
      >
        <div className="mx-auto max-w-2xl w-full">
          {showBack && (
            <button
              type="button"
              onClick={gatedFlow.back}
              className="mb-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[14px] font-bold text-[#8a7a80] hover:text-[#8a1630] dark:text-[#c99aa6] dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              Back
            </button>
          )}

          {gate === "shown" ? (
            <section
              aria-labelledby="onboarding-consent-title"
              className="animate-onboarding-step rounded-3xl bg-white dark:bg-[#2b1620] shadow-[0_24px_60px_-40px_rgba(90,15,35,0.45)] ring-1 ring-[#f3e6e9] dark:ring-white/10 p-6 sm:p-8"
            >
              <h1
                id="onboarding-consent-title"
                tabIndex={-1}
                ref={gateHeadingRef}
                className="font-display text-2xl sm:text-[28px] font-extrabold tracking-[-0.03em] text-[#1b1216] dark:text-[#f8ecee] outline-none"
              >
                Before we start
              </h1>
              <p className="mt-1.5 text-[15px] text-[#5a4a50] dark:text-[#d6bcc3]">
                One quick privacy choice — then we&apos;ll set up your study plan.
              </p>
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => acceptConsent(true)}
                  className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#8a1630] text-white font-bold text-[15px] shadow-[0_10px_24px_-10px_rgba(138,22,48,0.75)] hover:-translate-y-0.5 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
                >
                  Accept all
                </button>
                <button
                  type="button"
                  onClick={() => acceptConsent(false)}
                  className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-[#f0dfe3] bg-white text-[15px] font-bold text-[#1b1216] dark:border-white/15 dark:bg-transparent dark:text-[#f8ecee] hover:border-[#c99aa6] dark:hover:border-white/40 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
                >
                  Essential only
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="mx-auto flex rounded-lg px-3 py-2 text-[13px] font-semibold text-[#8a7a80] hover:text-[#8a1630] dark:text-[#c99aa6] dark:hover:text-white underline-offset-2 hover:underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
                >
                  Decline &amp; leave
                </button>
              </div>
              <p className="mt-3 text-[12.5px] text-[#8a7a80] dark:text-[#c99aa6]">
                Guest study data always stays on this device. Read our{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-[#8a1630] dark:text-[#ff9fb5] underline-offset-2 hover:underline rounded"
                >
                  privacy notice
                </Link>
                .
              </p>
            </section>
          ) : (
          <section
            key={stepId}
            aria-labelledby="onboarding-step-title"
            className="animate-onboarding-step rounded-3xl bg-white dark:bg-[#2b1620] shadow-[0_24px_60px_-40px_rgba(90,15,35,0.45)] ring-1 ring-[#f3e6e9] dark:ring-white/10 p-6 sm:p-8"
          >
            <h1
              id="onboarding-step-title"
              tabIndex={-1}
              ref={headingRef}
              className="font-display text-2xl sm:text-[28px] font-extrabold tracking-[-0.03em] text-[#1b1216] dark:text-[#f8ecee] outline-none"
            >
              {meta.title}
            </h1>
            <p className="mt-1.5 text-[15px] text-[#5a4a50] dark:text-[#d6bcc3]">{meta.purpose}</p>

            <div className="mt-6">
              {stepId === "identity" && <IdentityStep flow={gatedFlow} />}
              {stepId === "exam" && <ExamStep flow={gatedFlow} />}
              {stepId === "starting-point" && <StartingPointStep flow={gatedFlow} />}
              {stepId === "rhythm" && <RhythmStep flow={gatedFlow} />}
              {stepId === "goal" && <GoalStep flow={gatedFlow} />}
              {stepId === "review" && <PlanPreviewStep flow={gatedFlow} />}
              {stepId === "personalize" && <MakeItYoursStep flow={gatedFlow} />}
              {stepId === "finish" && <FinishStep flow={gatedFlow} />}
            </div>
          </section>
          )}

          {showSkip && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={gatedFlow.skip}
                className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-[#8a7a80] hover:text-[#8a1630] dark:text-[#c99aa6] dark:hover:text-white underline-offset-2 hover:underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
