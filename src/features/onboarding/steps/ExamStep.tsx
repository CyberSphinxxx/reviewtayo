"use client";

import React from "react";
import { ChoiceCard, ContinueButton } from "./ChoiceCard";
import type { UseOnboardingFlowResult } from "../useOnboardingFlow";
import { getAvailableExams, getExamConfig } from "@/config/exams";

/**
 * Step 2 — exam and level, entirely from the exam catalog (stable IDs only).
 * Unavailable/coming-soon exams are not offered; if the catalog somehow has
 * no available exams the step says so instead of promising a plan.
 */
export function ExamStep({ flow }: { flow: UseOnboardingFlowResult }) {
  const availableExams = getAvailableExams();
  const answers = flow.state.answers;
  const selectedExam = answers.examId ? getExamConfig(answers.examId) : undefined;
  const levels = selectedExam?.levels ?? [];

  const chooseExam = (examId: string) => {
    const exam = getExamConfig(examId);
    // Reset the level when switching exams: the old level belongs to another exam.
    const defaultLevel = exam?.levels[0]?.id;
    flow.patchAnswers({ examId, levelId: defaultLevel });
  };

  if (availableExams.length === 0) {
    return (
      <div>
        <p className="rounded-2xl bg-[#fbeff0] dark:bg-brand-950 p-4 text-[14px] text-[#5a4a50] dark:text-[#d6bcc3]">
          No exams are open for enrollment right now. You can still look around —
          we&apos;ll open enrollment as soon as the first reviewer is live.
        </p>
        <ContinueButton label="Continue" onClick={flow.next} />
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3" role="radiogroup" aria-label="Available exams">
        {availableExams.map((exam) => (
          <ChoiceCard
            key={exam.id}
            name={exam.shortName}
            selected={answers.examId === exam.id}
            onSelect={() => chooseExam(exam.id)}
            title={exam.shortName}
            description={exam.description}
          />
        ))}
      </div>

      {levels.length > 1 && (
        <fieldset className="mt-5">
          <legend className="text-[13px] font-bold text-[#1b1216] dark:text-[#f8ecee] mb-2">
            Which track?
          </legend>
          <div className="flex flex-wrap gap-2">
            {levels.map((level) => {
              const active = answers.levelId === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => flow.patchAnswers({ levelId: level.id })}
                  className={`rounded-xl border-2 px-4 py-2 text-[14px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86152d] dark:focus-visible:outline-[#ffd27a] ${
                    active
                      ? "border-[#8a1630] bg-[#fbeff0] text-[#8a1630] dark:bg-brand-950 dark:text-[#ff9fb5]"
                      : "border-[#f0dfe3] bg-white text-[#1b1216] dark:border-white/15 dark:bg-transparent dark:text-[#f8ecee] hover:border-[#c99aa6] dark:hover:border-white/40"
                  }`}
                >
                  {level.shortName}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <ContinueButton
        label="Continue"
        onClick={flow.next}
        disabled={!answers.examId || !answers.levelId}
      />
    </div>
  );
}
