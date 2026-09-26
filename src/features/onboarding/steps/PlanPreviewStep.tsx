"use client";

import React from "react";
import { ContinueButton } from "./ChoiceCard";
import type { UseOnboardingFlowResult } from "../useOnboardingFlow";
import { getPlanPreview } from "@/lib/onboarding/plan-preview";
import { getExamConfig } from "@/config/exams";

/**
 * Step 6 — plan preview (review required). Live summary of everything chosen
 * so far with inline edit links back to the relevant step. Falls back to a
 * useful activity suggestion when the saved exam can no longer launch one.
 */
export function PlanPreviewStep({ flow }: { flow: UseOnboardingFlowResult }) {
  const preview = getPlanPreview(flow.state.answers);
  const exam = flow.state.answers.examId ? getExamConfig(flow.state.answers.examId) : undefined;
  const level = exam?.levels.find((l) => l.id === flow.state.answers.levelId);
  const examLabel = exam ? `${exam.shortName}${level ? ` · ${level.shortName}` : ""}` : "No exam chosen yet";

  const editLink = (step: Parameters<UseOnboardingFlowResult["goTo"]>[0]) => (
    <button
      type="button"
      onClick={() => flow.goTo(step)}
      className="rounded font-semibold text-[#8a1630] dark:text-[#ff9fb5] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a]"
    >
      Edit
    </button>
  );

  const rows: { label: string; value: React.ReactNode; editStep: Parameters<UseOnboardingFlowResult["goTo"]>[0] | null }[] = [
    {
      label: "Exam",
      value: examLabel,
      editStep: "exam",
    },
    {
      label: "Schedule",
      value: preview.daysLabel,
      editStep: "rhythm",
    },
    {
      label: "Daily goal",
      value: `${preview.dailyGoal} questions · ${preview.estimateMinutes}`,
      editStep: "goal",
    },
    {
      label: "Starting point",
      value:
        flow.state.answers.prepStage === "just-starting"
          ? "Just starting"
          : flow.state.answers.prepStage === "reviewing"
          ? "Reviewing topics"
          : flow.state.answers.prepStage === "ready-for-tests"
          ? "Ready for practice tests"
          : "Not set",
      editStep: "starting-point",
    },
    {
      label: "Target date",
      value: preview.targetDate ?? "Not set",
      editStep: "starting-point",
    },
  ];

  return (
    <div>
      <dl className="divide-y divide-[#f3e6e9] dark:divide-white/10 rounded-2xl border border-[#f3e6e9] dark:border-white/10 overflow-hidden">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-3 bg-white dark:bg-transparent">
            <dt className="text-[13px] font-bold text-[#8a7a80] dark:text-[#c99aa6] shrink-0 pt-0.5">
              {row.label}
            </dt>
            <dd className="flex-1 text-right text-[14px] font-semibold text-[#1b1216] dark:text-[#f8ecee]">
              {row.value}
            </dd>
            {row.editStep && <span className="shrink-0">{editLink(row.editStep)}</span>}
          </div>
        ))}
      </dl>

      <div className="mt-4 rounded-2xl bg-[#fbeff0] dark:bg-brand-950 p-4">
        <p className="text-[13px] font-bold text-[#1b1216] dark:text-[#f8ecee]">First activity</p>
        <p className="mt-0.5 text-[13px] text-[#5a4a50] dark:text-[#d6bcc3]">
          {preview.firstActivity
            ? preview.firstActivity.label
            : "We'll suggest something useful from your dashboard."}
        </p>
      </div>

      <p className="mt-3 text-[12.5px] text-[#8a7a80] dark:text-[#c99aa6]">
        Nothing here is locked in — every preference stays editable in Settings after you finish.
      </p>

      <ContinueButton label="Looks good — continue" onClick={flow.next} />
    </div>
  );
}
