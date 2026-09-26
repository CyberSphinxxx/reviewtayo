"use client";

import React from "react";
import { ContinueButton } from "./ChoiceCard";
import type { UseOnboardingFlowResult } from "../useOnboardingFlow";
import type { OnboardingAnswers } from "@/lib/onboarding/types";

const DAY_CHIPS: { id: number; short: string; long: string }[] = [
  { id: 1, short: "M", long: "Monday" },
  { id: 2, short: "T", long: "Tuesday" },
  { id: 3, short: "W", long: "Wednesday" },
  { id: 4, short: "T", long: "Thursday" },
  { id: 5, short: "F", long: "Friday" },
  { id: 6, short: "S", long: "Saturday" },
  { id: 0, short: "S", long: "Sunday" },
];

const SESSION_PRESETS: { minutes: 15 | 30 | 45; label: string }[] = [
  { minutes: 15, label: "Short sessions" },
  { minutes: 30, label: "Half-hour sessions" },
  { minutes: 45, label: "Longer sessions" },
];

/**
 * Step 4 — weekly rhythm (optional, skippable). Day chips toggle; leaving
 * every chip off means "my schedule changes", which the plan preview labels
 * honestly as a flexible schedule.
 */
export function RhythmStep({ flow }: { flow: UseOnboardingFlowResult }) {
  const days = flow.state.answers.studyDays ?? [];
  const sessionMinutes = flow.state.answers.sessionMinutes;

  const toggleDay = (day: number) => {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
    const patch: Partial<OnboardingAnswers> = { studyDays: next };
    flow.patchAnswers(patch);
  };

  return (
    <div>
      <fieldset>
        <legend className="text-[13px] font-bold text-[#1b1216] dark:text-[#f8ecee] mb-2">
          Study days
        </legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Days of the week">
          {DAY_CHIPS.map((chip) => {
            const active = days.includes(chip.id);
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={active}
                aria-label={chip.long}
                onClick={() => toggleDay(chip.id)}
                className={`h-11 w-11 rounded-full border-2 text-[14px] font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a] ${
                  active
                    ? "border-[#8a1630] bg-[#8a1630] text-white"
                    : "border-[#f0dfe3] bg-white text-[#1b1216] dark:border-white/15 dark:bg-transparent dark:text-[#f8ecee] hover:border-[#c99aa6] dark:hover:border-white/40"
                }`}
              >
                {chip.short}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12.5px] text-[#8a7a80] dark:text-[#c99aa6]">
          {days.length === 0
            ? "No days selected — we'll treat your schedule as flexible."
            : `${days.length} day${days.length > 1 ? "s" : ""} per week.`}
        </p>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-[13px] font-bold text-[#1b1216] dark:text-[#f8ecee] mb-2">
          Typical session length <span className="font-normal text-[#8a7a80] dark:text-[#c99aa6]">(optional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {SESSION_PRESETS.map((preset) => {
            const active = sessionMinutes === preset.minutes;
            return (
              <button
                key={preset.minutes}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  flow.patchAnswers({
                    sessionMinutes: active ? undefined : preset.minutes,
                  })
                }
                className={`rounded-xl border-2 px-4 py-2 text-[14px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a] ${
                  active
                    ? "border-[#8a1630] bg-[#fbeff0] text-[#8a1630] dark:bg-brand-950 dark:text-[#ff9fb5]"
                    : "border-[#f0dfe3] bg-white text-[#1b1216] dark:border-white/15 dark:bg-transparent dark:text-[#f8ecee] hover:border-[#c99aa6] dark:hover:border-white/40"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <ContinueButton label="Continue" onClick={flow.next} />
    </div>
  );
}
