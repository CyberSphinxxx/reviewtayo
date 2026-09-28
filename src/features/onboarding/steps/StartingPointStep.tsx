"use client";

import React from "react";
import { ChoiceCard, ContinueButton } from "./ChoiceCard";
import { DatePicker } from "@/components/ui/DatePicker";
import type { UseOnboardingFlowResult } from "../useOnboardingFlow";
import type { PrepStage } from "@/lib/onboarding/types";

const STAGE_OPTIONS: { id: PrepStage; title: string; description: string }[] = [
  {
    id: "just-starting",
    title: "Just starting",
    description: "New to the coverage — build foundations first.",
  },
  {
    id: "reviewing",
    title: "Reviewing topics",
    description: "Studied some already — sharpening weak areas.",
  },
  {
    id: "ready-for-tests",
    title: "Ready for practice tests",
    description: "Coverage is familiar — measure with full runs.",
  },
];

/**
 * Step 3 — starting point (optional, skippable). Tunes the recommended first
 * activity without claiming diagnostic accuracy. The optional exam date feeds
 * the plan preview and the workspace countdown.
 */
export function StartingPointStep({ flow }: { flow: UseOnboardingFlowResult }) {
  const answers = flow.state.answers;

  return (
    <div>
      <div className="space-y-3" role="radiogroup" aria-label="Your starting point">
        {STAGE_OPTIONS.map((opt) => (
          <ChoiceCard
            key={opt.id}
            name={opt.id}
            selected={answers.prepStage === opt.id}
            onSelect={() => flow.patchAnswers({ prepStage: opt.id })}
            title={opt.title}
            description={opt.description}
          />
        ))}
      </div>

      <div className="mt-5">
        <label
          htmlFor="onboarding-target-date"
          className="block text-[13px] font-bold text-[#1b1216] dark:text-[#f8ecee] mb-1.5"
        >
          Exam date <span className="font-normal text-[#8a7a80] dark:text-[#c99aa6]">(optional)</span>
        </label>
        {/* Styled calendar picker — same YYYY-MM-DD storage contract as the
            previous native input, min = today so past dates stay disabled. */}
        <div id="onboarding-target-date">
          <DatePicker
            ariaLabel="Exam date"
            value={answers.targetDate ?? ""}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(iso) => flow.patchAnswers({ targetDate: iso || undefined })}
            placeholder="Pick your exam date"
          />
        </div>
        <p className="mt-1.5 text-[12.5px] text-[#8a7a80] dark:text-[#c99aa6]">
          Skip this if you&apos;re not sure — your plan works without a date.
        </p>
      </div>

      <ContinueButton label="Continue" onClick={flow.next} />
    </div>
  );
}
