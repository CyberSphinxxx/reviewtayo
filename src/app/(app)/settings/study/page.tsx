"use client";

import React, { useState, useEffect } from "react";
import { usePreferences } from "@/lib/preferences";
import { PLAN_TEMPLATES, type PlanTemplateId } from "@/config/study-plan-templates";
import {
  useExamWorkspace,
} from "@/lib/workspace/useExamWorkspace";
import {
  saveTargetExamSummary,
} from "@/lib/workspace/target-exam";
import {
  NEXT_UPCOMING_EXAM_LABEL,
  NEXT_UPCOMING_EXAM_DATE,
} from "@/lib/exam-guide/csc-data";
import { WorkspaceService } from "@/lib/workspace/workspace-service";
import {
  Check,
  AlertCircle,
  Clock,
  Flame,
  Info,
  Save,
  RotateCcw,
} from "lucide-react";

export default function StudyPlanSettingsPage() {
  const { preferences, mounted, updateCategory, resetCategory } = usePreferences();

  // The active workspace is the authoritative exam store; Settings edits it
  // through saveTargetExamSummary (one transactional write) on Save.
  const { currentWorkspace } = useExamWorkspace();

  // Local draft state for grouped Save/Cancel form contract
  const [levelId, setLevelId] = useState("cse-professional");
  const [targetDateType, setTargetDateType] = useState<"verified" | "custom" | "none">("verified");
  const [customDate, setCustomDate] = useState(NEXT_UPCOMING_EXAM_DATE);
  const [planTemplate, setPlanTemplate] = useState<PlanTemplateId>("smart");
  const [dailyGoal, setDailyGoal] = useState(25);
  const [showDailyGoal, setShowDailyGoal] = useState(true);
  const [weekStartsOn, setWeekStartsOn] = useState<"monday" | "sunday">("monday");
  const [showStreak, setShowStreak] = useState(true);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    setLevelId(preferences.study.levelId);
    setTargetDateType(preferences.study.targetDateType);
    setCustomDate(preferences.study.targetDate || NEXT_UPCOMING_EXAM_DATE);
    setPlanTemplate(preferences.study.planTemplate ?? "smart");
    setDailyGoal(preferences.study.dailyGoal);
    setShowDailyGoal(preferences.study.showDailyGoal);
    setWeekStartsOn(preferences.study.weekStartsOn);
    setShowStreak(preferences.study.showStreak);
    setIsDirty(false);
  }, [preferences, mounted]);

  const handleLevelChange = (newLevel: string) => {
    setLevelId(newLevel);
    setIsDirty(true);
  };

  const handleTargetDateTypeChange = (type: "verified" | "custom" | "none") => {
    setTargetDateType(type);
    setIsDirty(true);
  };

  const handleDailyGoalPreset = (preset: number) => {
    setDailyGoal(preset);
    setIsDirty(true);
  };

  const handleDailyGoalCustom = (val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setDailyGoal(num);
      setIsDirty(true);
    }
  };

  const handleSave = () => {
    // Validate target date. The verified option always uses the CSC-sourced
    // canonical constant — never a page-local literal.
    let effectiveDate = "";
    if (targetDateType === "verified") {
      effectiveDate = NEXT_UPCOMING_EXAM_DATE;
    } else if (targetDateType === "custom") {
      if (!customDate) {
        setFeedback({ type: "error", message: "Please select a valid custom target exam date." });
        return;
      }
      effectiveDate = customDate;
    }

    // Clamp daily goal
    const clampedGoal = Math.min(Math.max(dailyGoal, 5), 200);

    // 1) Authoritative write: the active workspace gets the chosen level and
    //    target date, so Dashboard/plan/practice react to this save instantly
    //    via the workspace-changed event.
    // A track-derived name ("CSE-PPT Professional") goes stale when the
    // track changes; clear it in both stores so the display regenerates
    // from the exam's neutral default name instead of resurrecting the
    // old track through the preferences mirror.
    const nameUpdate =
      currentWorkspace?.targetExamName &&
      /professional/i.test(currentWorkspace.targetExamName)
        ? { targetExamName: undefined }
        : {};

    if (currentWorkspace) {
      const track = currentWorkspace.examId === "cse"
        ? levelId === "cse-subprofessional" ? "Subprofessional" : "Professional"
        : undefined;
      saveTargetExamSummary({
        targetDate: effectiveDate || undefined,
        dailyGoal: clampedGoal,
      });
      WorkspaceService.updateWorkspace(currentWorkspace.id, {
        levelId: levelId === "cse-subprofessional" ? "subprofessional" : "professional",
        ...(track ? { trackName: track } : {}),
        // The plan template is a workspace concern too (guide §20) so each
        // exam can keep its own strategy; preferences keep a legacy mirror.
        studyPlanTemplate: planTemplate,
        ...nameUpdate,
      });
    }

    // 2) Preference-style settings (templates, toggles, view prefs) stay in
    //    the preferences store; the study mirror block re-syncs the rest. A
    //    stale track-derived name in preferences would keep resurrecting the
    //    old track through saveTargetExamSummary, so clear it here too.
    const res = updateCategory("study", {
      levelId,
      targetDate: effectiveDate,
      targetDateType,
      planTemplate,
      dailyGoal: clampedGoal,
      showDailyGoal,
      weekStartsOn,
      studyTimeZone: "Asia/Manila",
      showStreak,
      ...nameUpdate,
    });

    if (res.success) {
      setIsDirty(false);
      setFeedback({ type: "success", message: "Study plan preferences saved successfully on this device." });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: "error", message: res.error || "Could not save preferences to local storage." });
    }
  };

  const handleCancel = () => {
    setLevelId(preferences.study.levelId);
    setTargetDateType(preferences.study.targetDateType);
    setCustomDate(preferences.study.targetDate || NEXT_UPCOMING_EXAM_DATE);
    setPlanTemplate(preferences.study.planTemplate ?? "smart");
    setDailyGoal(preferences.study.dailyGoal);
    setShowDailyGoal(preferences.study.showDailyGoal);
    setWeekStartsOn(preferences.study.weekStartsOn);
    setShowStreak(preferences.study.showStreak);
    setIsDirty(false);
    setFeedback(null);
  };

  const handleResetSection = () => {
    if (window.confirm("Reset Study Plan preferences back to default values? Your exam attempt history will not be touched.")) {
      resetCategory("study");
      setFeedback({ type: "success", message: "Study plan reset to default settings." });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  if (!mounted) {
    return <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse" />;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold px-2 py-0.5 hover:opacity-80"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Exam & Level Configuration */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Exam &amp; Level Target</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Select your target Philippine Civil Service Examination level. This tailors diagnostic tests and future practice recommendations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Professional Option */}
          <button
            type="button"
            onClick={() => handleLevelChange("cse-professional")}
            className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
              levelId === "cse-professional"
                ? "border-brand-600 dark:border-brand-400 bg-highlight dark:bg-brand-950 ring-1 ring-brand-600 dark:ring-brand-400 shadow-2xs"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white">Professional Level</span>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                levelId === "cse-professional" ? "border-brand-600 dark:border-brand-400 bg-brand-600 dark:bg-brand-500 text-white" : "border-slate-300 dark:border-slate-700"
              }`}>
                {levelId === "cse-professional" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <p className={`text-xs leading-relaxed transition ${
              levelId === "cse-professional" ? "text-slate-700 dark:text-slate-200 font-medium" : "text-slate-500 dark:text-slate-400"
            }`}>
              170 items &bull; 3h 10m &bull; For 2nd-level government positions. Includes Analytical Ability.
            </p>
          </button>

          {/* Subprofessional Option */}
          <button
            type="button"
            onClick={() => handleLevelChange("cse-subprofessional")}
            className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
              levelId === "cse-subprofessional"
                ? "border-brand-600 dark:border-brand-400 bg-highlight dark:bg-brand-950 ring-1 ring-brand-600 dark:ring-brand-400 shadow-2xs"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white">Subprofessional Level</span>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                levelId === "cse-subprofessional" ? "border-brand-600 dark:border-brand-400 bg-brand-600 dark:bg-brand-500 text-white" : "border-slate-300 dark:border-slate-700"
              }`}>
                {levelId === "cse-subprofessional" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <p className={`text-xs leading-relaxed transition ${
              levelId === "cse-subprofessional" ? "text-slate-700 dark:text-slate-200 font-medium" : "text-slate-500 dark:text-slate-400"
            }`}>
              165 items &bull; 2h 40m &bull; For 1st-level clerical positions. Includes Clerical Ability.
            </p>
          </button>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
          <Info className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
          <span>
            <strong>Consequences of changing exam level:</strong> Adjusts future mock tests and recommended drill subjects. Your existing test history and scores are never altered or relabeled.
          </span>
        </div>
      </section>

      {/* 2. Target Exam Date */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Target Exam Date</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Used to calculate countdown pacing on your dashboard and study calendar.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          {/* Verified Official Schedule */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
            <input
              type="radio"
              name="targetDateType"
              value="verified"
              checked={targetDateType === "verified"}
              onChange={() => handleTargetDateTypeChange("verified")}
              className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
            <div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                {NEXT_UPCOMING_EXAM_LABEL} (Official Nationwide CSE-PPT)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                Verified schedule sourced from Civil Service Commission examination calendar.
              </span>
            </div>
          </label>

          {/* Custom Date */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
            <input
              type="radio"
              name="targetDateType"
              value="custom"
              checked={targetDateType === "custom"}
              onChange={() => handleTargetDateTypeChange("custom")}
              className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
            <div className="flex-1">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                Custom Target Date
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                Set a personal target date for your self-paced review schedule.
              </span>
              {targetDateType === "custom" && (
                <div className="mt-3">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setIsDirty(true);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
            </div>
          </label>

          {/* No Target Date */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
            <input
              type="radio"
              name="targetDateType"
              value="none"
              checked={targetDateType === "none"}
              onChange={() => handleTargetDateTypeChange("none")}
              className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
            <div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                No Target Date Set
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                Study at your own pace without exam date countdowns.
              </span>
            </div>
          </label>
        </div>
      </section>

      {/* 2b. Weekly Plan Template */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Weekly Plan Template</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Controls how &ldquo;This week&rdquo; is generated on your Study plan. Every template adapts to your daily goal and subjects.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1" role="radiogroup" aria-label="Weekly plan template">
          {PLAN_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={planTemplate === t.id}
              onClick={() => {
                setPlanTemplate(t.id);
                setIsDirty(true);
              }}
              className={`p-4 rounded-xl border text-left transition ${
                planTemplate === t.id
                  ? "border-brand-600 dark:border-brand-400 bg-highlight dark:bg-brand-950 ring-1 ring-brand-600 dark:ring-brand-400"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-sm text-slate-900 dark:text-white">{t.name}</span>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    planTemplate === t.id
                      ? "border-brand-600 dark:border-brand-400 bg-brand-600 dark:bg-brand-500 text-white"
                      : "border-slate-300 dark:border-slate-700"
                  }`}
                >
                  {planTemplate === t.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Daily Question Goal */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Daily Question Goal</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Target number of practice questions to complete each day. Daily goal does not restrict test lengths.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {[10, 25, 50].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleDailyGoalPreset(preset)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                dailyGoal === preset
                  ? "bg-brand-700 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {preset} questions / day
            </button>
          ))}

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">or custom:</span>
            <input
              type="number"
              min={5}
              max={200}
              value={dailyGoal}
              onChange={(e) => handleDailyGoalCustom(e.target.value)}
              className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold text-center focus:ring-2 focus:ring-brand-500"
              aria-label="Custom daily question goal (5 to 200)"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
              Show Daily Goal in Dashboard
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              Hiding this indicator does not delete your study activity.
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showDailyGoal}
            aria-label="Toggle daily goal visibility"
            onClick={() => {
              setShowDailyGoal(!showDailyGoal);
              setIsDirty(true);
            }}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
              showDailyGoal ? "bg-brand-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
          </button>
        </div>
      </section>

      {/* 4. Calendar & Timezone Preferences */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Calendar &amp; Timezone</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Calendar view rules and daily reset time boundaries.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label htmlFor="week-start-select" className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Week starts on
            </label>
            <select
              id="week-start-select"
              value={weekStartsOn}
              onChange={(e) => {
                setWeekStartsOn(e.target.value as "monday" | "sunday");
                setIsDirty(true);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-brand-500"
            >
              <option value="monday">Monday (Product standard)</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Study Time Zone
            </span>
            <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Asia/Manila (PHT, UTC+8)</span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Show Study Streak</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              Tracks consecutive days with completed practice sessions. Turning off hides the badge.
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showStreak}
            aria-label="Toggle streak display"
            onClick={() => {
              setShowStreak(!showStreak);
              setIsDirty(true);
            }}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
              showStreak ? "bg-brand-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
          </button>
        </div>
      </section>

      {/* Save / Cancel Bar */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleResetSection}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset study plan defaults</span>
        </button>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isDirty && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 disabled:opacity-50 rounded-xl shadow-md shadow-brand-700/20 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
