"use client";

import React, { useState } from "react";
import { Clock, LogOut } from "lucide-react";
import { formatTimeRemaining } from "@/features/exam-engine";
import type { ExamTheme } from "@/features/practice/examTheme";

interface TestModeBarProps {
  examName?: string;
  levelName?: string;
  currentIndex: number;
  totalQuestions: number;
  remainingSeconds: number;
  isWarning?: boolean;
  hasAnswers?: boolean;
  onExit: () => void;
  /** Presentation chrome: exam-hall (default) or exam-coach. */
  theme?: ExamTheme;
}

export function TestModeBar({
  examName = "Civil Service Exam (CSE)",
  levelName = "Professional",
  currentIndex,
  totalQuestions,
  remainingSeconds,
  isWarning = false,
  hasAnswers = false,
  onExit,
  theme = "exam-hall",
}: TestModeBarProps) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const isCoach = theme === "exam-coach";

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    onExit();
  };

  return (
    <>
      <header
        role="banner"
        aria-label="Exam in progress"
        className="sticky top-0 z-40 w-full border-b border-brand-100 bg-white/85 px-3 sm:px-6 lg:px-8 py-2.5 shadow-2xs backdrop-blur-md transition-colors"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 min-h-11">
          {/* Left: Exit Action with Dialog */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-200 bg-white hover:bg-[#faf3f4] text-[#3a2c32] text-xs sm:text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 shadow-2xs group"
              aria-label="Save and Exit exam"
            >
              <LogOut className="w-3.5 h-3.5 text-[#6d5d63] group-hover:text-rose-600 transition-colors" />
              <span>Exit</span>
            </button>
          </div>

          {/* Center: Exam Name + Level & Question Progress */}
          <div className="flex flex-col items-center justify-center text-center min-w-0 px-1 sm:px-2">
            <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-bold text-[#1b1216] truncate">
              <span className="font-display truncate">{examName}</span>
              {levelName && (
                <>
                  <span className="text-[#d8c7cd] font-normal">&bull;</span>
                  <span className="text-brand-700 font-semibold truncate">{levelName}</span>
                </>
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-[#6d5d63] font-medium tracking-wide">
              Item {currentIndex + 1} of {totalQuestions}
            </div>
          </div>

          {/* Right: Continuous Countdown Timer (Always Visible) */}
          <div className="flex items-center shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-mono font-bold tracking-wider shadow-2xs transition-colors ${
                isWarning
                  ? "bg-[#fdecef] border-[#d1344b]/40 text-[#d1344b] timer-warn-pulse"
                  : isCoach
                  ? "bg-[#fbeff0] border-brand-200 text-brand-700"
                  : "bg-white border-brand-200 text-[#1b1216]"
              }`}
              aria-live="polite"
              aria-atomic="true"
            >
              <Clock
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                  isWarning ? "text-[#d1344b]" : "text-brand-600"
                }`}
              />
              <span id="exam-timer">{formatTimeRemaining(remainingSeconds)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-dialog-title"
          className="fixed inset-0 z-50 bg-[#2a0a12]/55 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-brand-100">
            <h3 id="exit-dialog-title" className="text-lg font-bold text-[#1b1216] mb-2">
              Leave this test?
            </h3>
            <p className="text-sm text-[#5a4a50] mb-6 leading-relaxed">
              {hasAnswers
                ? "Your progress is saved and you can resume this test later."
                : "You have not answered any questions yet."}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-brand-200 font-semibold text-sm text-[#3a2c32] hover:bg-[#faf3f4] transition"
              >
                Keep Practicing
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm shadow-sm transition"
              >
                {hasAnswers ? "Save & Leave" : "Leave Test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
