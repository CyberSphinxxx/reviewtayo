"use client";

import React from "react";
import { ContinueButton } from "./ChoiceCard";
import type { UseOnboardingFlowResult } from "../useOnboardingFlow";

const THEMES: { id: "system" | "light" | "dark"; label: string }[] = [
  { id: "system", label: "Match my device" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

const TEXT_SIZES: { id: "standard" | "large" | "extra-large"; label: string; px: string }[] = [
  { id: "standard", label: "Standard", px: "16px" },
  { id: "large", label: "Large", px: "18px" },
  { id: "extra-large", label: "Extra large", px: "20px" },
];

const DISCOVERY_OPTIONS: { id: string; label: string }[] = [
  { id: "search", label: "Search engine" },
  { id: "social", label: "Social media" },
  { id: "friend", label: "Friend or classmate" },
  { id: "school", label: "School / review center" },
  { id: "other", label: "Somewhere else" },
  { id: "prefer-not-to-say", label: "Prefer not to say" },
];

const SAMPLE_ANSWER = "Plentiful — “scarce” means hard to find.";

/**
 * Step 7 — "Make it yours" (folded appearance + reading comfort + discovery,
 * per the plan's permitted refinement for flow length). Everything here is
 * optional and skippable; choices apply immediately via the preferences store.
 */
export function MakeItYoursStep({ flow }: { flow: UseOnboardingFlowResult }) {
  const answers = flow.state.answers;

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-[13px] font-bold text-[#1b1216] dark:text-[#f8ecee] mb-2">
          Appearance
        </legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Appearance theme">
          {THEMES.map((theme) => {
            const active = answers.appearance === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                aria-pressed={active}
                onClick={() => flow.patchAnswers({ appearance: theme.id })}
                className={`rounded-xl border-2 px-4 py-2 text-[14px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a] ${
                  active
                    ? "border-[#8a1630] bg-[#fbeff0] text-[#8a1630] dark:bg-brand-950 dark:text-[#ff9fb5]"
                    : "border-[#f0dfe3] bg-white text-[#1b1216] dark:border-white/15 dark:bg-transparent dark:text-[#f8ecee] hover:border-[#c99aa6] dark:hover:border-white/40"
                }`}
              >
                {theme.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[13px] font-bold text-[#1b1216] dark:text-[#f8ecee] mb-2">
          Text size
        </legend>
        <div
          className="rounded-2xl border border-[#f3e6e9] dark:border-white/10 bg-white dark:bg-transparent p-4 mb-2"
          aria-hidden="true"
        >
          <p
            className="font-semibold text-[#1b1216] dark:text-[#f8ecee] leading-snug transition-all"
            style={{ fontSize: TEXT_SIZES.find((t) => t.id === (answers.textSize ?? "standard"))?.px }}
          >
            {SAMPLE_ANSWER}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Reading text size">
          {TEXT_SIZES.map((size) => {
            const active = (answers.textSize ?? "standard") === size.id;
            return (
              <button
                key={size.id}
                type="button"
                aria-pressed={active}
                onClick={() => flow.patchAnswers({ textSize: size.id })}
                className={`rounded-xl border-2 px-4 py-2 text-[14px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a] ${
                  active
                    ? "border-[#8a1630] bg-[#fbeff0] text-[#8a1630] dark:bg-brand-950 dark:text-[#ff9fb5]"
                    : "border-[#f0dfe3] bg-white text-[#1b1216] dark:border-white/15 dark:bg-transparent dark:text-[#f8ecee] hover:border-[#c99aa6] dark:hover:border-white/40"
                }`}
              >
                {size.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[13px] font-bold text-[#1b1216] dark:text-[#f8ecee] mb-2">
          How did you hear about ReviewTayo?{" "}
          <span className="font-normal text-[#8a7a80] dark:text-[#c99aa6]">(optional)</span>
        </legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Discovery source">
          {DISCOVERY_OPTIONS.map((option) => {
            const active = answers.discoverySource === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  flow.patchAnswers({
                    discoverySource: active ? undefined : (option.id as never),
                  })
                }
                className={`rounded-xl border-2 px-3.5 py-2 text-[13px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a] ${
                  active
                    ? "border-[#8a1630] bg-[#fbeff0] text-[#8a1630] dark:bg-brand-950 dark:text-[#ff9fb5]"
                    : "border-[#f0dfe3] bg-white text-[#1b1216] dark:border-white/15 dark:bg-transparent dark:text-[#f8ecee] hover:border-[#c99aa6] dark:hover:border-white/40"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12.5px] text-[#8a7a80] dark:text-[#c99aa6]">
          Stored only on this device, never used for ads.
        </p>
      </fieldset>

      <ContinueButton label="Continue" onClick={flow.next} />
    </div>
  );
}
