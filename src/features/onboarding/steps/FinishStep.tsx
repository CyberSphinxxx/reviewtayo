"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReviewTayoOwl } from "@/components/brand/ReviewTayoOwl";
import type { UseOnboardingFlowResult } from "../useOnboardingFlow";
import { getPlanPreview } from "@/lib/onboarding/plan-preview";
import { usePreferences } from "@/lib/preferences";

/**
 * Step 8 — finish. The "Save & continue" action performs the atomic finish
 * (workspace + preferences + completed status) and then routes to the real
 * first activity resolved from exam config — never a test that cannot launch.
 * The celebration animation runs once and respects reduced motion.
 */
export function FinishStep({ flow }: { flow: UseOnboardingFlowResult }) {
  const router = useRouter();
  const { updateCategory } = usePreferences();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const destinationRef = useRef<{ href: string; fallback: boolean } | null>(null);
  const preview = getPlanPreview(flow.state.answers);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  const handleFinish = () => {
    if (saving) return;
    setSaving(true);
    try {
      const answers = flow.state.answers;

      // Apply appearance/reading choices immediately through the existing
      // preferences store (ThemeProvider reacts to the same event).
      if (answers.appearance || answers.textSize) {
        if (answers.appearance) {
          updateCategory("appearance", { theme: answers.appearance });
        }
        if (answers.textSize) {
          updateCategory("reading", {
            readingTextSize: answers.textSize,
          });
        }
      }

      const outcome = flow.finish();
      destinationRef.current = outcome;
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const goToActivity = () => {
    const href = destinationRef.current?.href ?? "/dashboard";
    router.push(href);
  };

  if (!saved) {
    return (
      <div>
        <div className="flex items-center gap-4">
          <div className="w-16 shrink-0" aria-hidden="true">
            <ReviewTayoOwl size={64} withCap bob />
          </div>
          <p className="text-[15px] font-semibold text-[#1b1216] dark:text-[#f8ecee]">
            Ready to save your plan and start studying?
          </p>
        </div>

        <button
          type="button"
          onClick={handleFinish}
          disabled={saving}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#8a1630] text-white font-bold text-[15px] shadow-[0_10px_24px_-10px_rgba(138,22,48,0.75)] hover:-translate-y-0.5 transition-all disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
        >
          Save &amp; continue
        </button>
        <p className="mt-2 text-center text-[12.5px] text-[#8a7a80] dark:text-[#c99aa6]">
          Saves to this device{flow.state.answers.identityMode === "account" ? " and your account" : ""}.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Celebration — runs once; the owl keeps its existing bob animation */}
      <div className="flex flex-col items-center text-center">
        <div className="w-24" aria-hidden="true">
          <ReviewTayoOwl size={96} withCap bob tracked />
        </div>
        <p className="mt-3 text-[16px] font-extrabold text-[#8a1630] dark:text-[#ff9fb5]">
          Your study plan is ready!
        </p>
        <p className="mt-1 text-[14px] text-[#5a4a50] dark:text-[#d6bcc3]">
          {preview.dailyGoal} questions a day · {preview.daysLabel}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={goToActivity}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#8a1630] text-white font-bold text-[15px] shadow-[0_10px_24px_-10px_rgba(138,22,48,0.75)] hover:-translate-y-0.5 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
        >
          {destinationRef.current?.fallback
            ? "Explore dashboard"
            : "Start my first practice"}
        </button>
        <Link
          href="/dashboard"
          className="block w-full text-center rounded-xl border-2 border-[#f0dfe3] bg-white px-6 py-3 text-[15px] font-bold text-[#1b1216] dark:border-white/15 dark:bg-transparent dark:text-[#f8ecee] hover:border-[#c99aa6] dark:hover:border-white/40 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
        >
          Explore dashboard
        </Link>
      </div>

      <p className="mt-4 text-center text-[12.5px] text-[#8a7a80] dark:text-[#c99aa6]">
        {flow.state.answers.identityMode === "guest"
          ? "Saved on this device — create an account anytime to sync your progress."
          : "You can change every preference later in Settings."}
      </p>
    </div>
  );
}
