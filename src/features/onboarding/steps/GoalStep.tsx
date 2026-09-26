"use client";

import React, { useState } from "react";
import { ContinueButton } from "./ChoiceCard";
import type { UseOnboardingFlowResult } from "../useOnboardingFlow";
import { DEFAULT_DAILY_GOAL } from "@/lib/onboarding/plan-preview";

const GOAL_PRESETS = [5, 10, 20];

/**
 * Step 5 — daily question goal (optional, skippable; default 10 applied at
 * save). Shows an honest time estimate and never blocks access to study.
 */
export function GoalStep({ flow }: { flow: UseOnboardingFlowResult }) {
  const answers = flow.state.answers;
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const currentGoal = answers.dailyGoal;

  const estimate = (goal: number) => {
    const minutes = Math.max(5, Math.round((goal * 0.5) / 5) * 5);
    return `≈ ${minutes} min/day`;
  };

  const applyCustom = () => {
    const parsed = Number(customValue);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 200 || !Number.isInteger(parsed)) {
      setError("Enter a whole number between 1 and 200.");
      return;
    }
    setError(null);
    flow.patchAnswers({ dailyGoal: parsed });
    flow.next();
  };

  return (
    <div>
      <div className="space-y-3" role="radiogroup" aria-label="Daily question goal">
        {GOAL_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            role="radio"
            aria-checked={customMode === false && currentGoal === preset}
            onClick={() => {
              setCustomMode(false);
              setError(null);
              flow.patchAnswers({ dailyGoal: preset });
            }}
            className={`w-full text-left p-4 rounded-2xl border-2 transition flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a] ${
              customMode === false && currentGoal === preset
                ? "border-[#8a1630] bg-[#fbeff0] dark:bg-brand-950 shadow-sm"
                : "border-[#f0dfe3] bg-white dark:border-white/15 dark:bg-transparent hover:border-[#c99aa6] dark:hover:border-white/40"
            }`}
          >
            <span className="text-[15px] font-bold text-[#1b1216] dark:text-[#f8ecee]">
              {preset} questions a day
            </span>
            <span className="text-[13px] font-semibold text-[#8a7a80] dark:text-[#c99aa6]">
              {estimate(preset)}
            </span>
          </button>
        ))}

        <div
          className={`rounded-2xl border-2 p-4 transition ${
            customMode
              ? "border-[#8a1630] bg-[#fbeff0] dark:bg-brand-950"
              : "border-[#f0dfe3] bg-white dark:border-white/15 dark:bg-transparent"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              role="radio"
              aria-checked={customMode}
              onClick={() => {
                setCustomMode(true);
                flow.patchAnswers({ dailyGoal: undefined });
              }}
              className="text-left text-[15px] font-bold text-[#1b1216] dark:text-[#f8ecee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a] rounded"
            >
              A custom goal
            </button>
            {customMode && (
              <div>
                <label htmlFor="onboarding-custom-goal" className="sr-only">
                  Custom daily goal, 1 to 200 questions
                </label>
                <input
                  id="onboarding-custom-goal"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={200}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "onboarding-custom-goal-error" : undefined}
                  className="w-24 rounded-xl border-2 border-[#f0dfe3] bg-white px-3 py-2 text-[14px] font-bold text-[#1b1216] dark:border-white/15 dark:bg-transparent dark:text-[#f8ecee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
                />
              </div>
            )}
          </div>
          {customMode && (
            <p className="mt-2 text-[12.5px] text-[#8a7a80] dark:text-[#c99aa6]">
              Between 1 and 200 questions per day.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p
          id="onboarding-custom-goal-error"
          role="alert"
          className="mt-3 text-[13px] font-semibold text-[#d1344b]"
        >
          {error}
        </p>
      )}

      <p className="mt-3 text-[12.5px] text-[#8a7a80] dark:text-[#c99aa6]">
        Skipping keeps the default of {DEFAULT_DAILY_GOAL} questions. Your goal is editable
        later in Settings — and never blocks you from studying.
      </p>

      {customMode ? (
        <ContinueButton label="Continue" onClick={applyCustom} />
      ) : (
        <ContinueButton label="Continue" onClick={flow.next} />
      )}
    </div>
  );
}
