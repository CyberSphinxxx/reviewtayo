"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, X } from "lucide-react";
import { OnboardingService } from "@/lib/onboarding/onboarding-service";
import { useExamWorkspace } from "@/lib/workspace/useExamWorkspace";

/**
 * Dismissible "Set up your study plan" card for established users (existing
 * history/workspaces) who never completed the guided onboarding. The legacy
 * rule: established users are never forced through first-run onboarding —
 * the card is the only prompt, and dismissing it never nags again.
 */
export function SetupPlanCard() {
  const { currentWorkspace } = useExamWorkspace();
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const status = OnboardingService.getState().status;
    const eligible =
      (status === "not_started" || status === "in_progress") &&
      OnboardingService.isEstablishedUser();
    setVisible(eligible);
    setChecked(true);
  }, [currentWorkspace?.id]);

  if (!checked || !visible) return null;

  const dismiss = () => {
    OnboardingService.dismiss();
    setVisible(false);
  };

  return (
    <section
      aria-label="Set up your study plan"
      className="mb-6 rounded-2xl bg-white dark:bg-[#2b1620] ring-1 ring-[#f3e6e9] dark:ring-white/10 p-5 flex items-start gap-4 shadow-[0_18px_36px_-26px_rgba(90,15,35,0.4)] print:hidden"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fbeff0] text-[#8a1630] dark:bg-brand-950 dark:text-[#ff9fb5]">
        <CalendarDays className="w-5 h-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[16px] font-extrabold text-[#1b1216] dark:text-[#f8ecee]">
          Set up your study plan
        </h2>
        <p className="mt-0.5 text-[13.5px] text-[#5a4a50] dark:text-[#d6bcc3]">
          A short guided setup tailors your daily goal, schedule, and first activity.
          Takes about two minutes — totally optional.
        </p>
        <Link
          href="/onboarding?edit=1"
          className="mt-2 inline-flex items-center rounded-lg bg-[#8a1630] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#a81b3b] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
        >
          Set up my plan
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss study plan setup"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#8a7a80] hover:bg-[#fbeff0] hover:text-[#8a1630] dark:hover:bg-white/10 dark:hover:text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </section>
  );
}
