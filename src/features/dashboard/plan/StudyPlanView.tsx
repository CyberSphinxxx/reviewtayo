"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Lightbulb, Sparkles } from "lucide-react";
import {
  LocalStorageService,
  type SubjectReadinessMetric,
} from "@/lib/storage";
import { useExamWorkspace } from "@/lib/workspace/useExamWorkspace";
import { usePreferences } from "@/lib/preferences";
import { PLAN_TEMPLATES, type PlanTemplateId } from "@/config/study-plan-templates";
import { getExamMockSpecsForLevel, getExamRoutesForLevel } from "@/config/exams";
import {
  addDaysIso,
  daysUntilManila,
  formatManilaDate,
  getManilaTodayString,
  parseManilaDate,
} from "@/lib/study-plan";
import { WorkspaceService } from "@/lib/workspace/workspace-service";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  generateWeeklyPlan,
  weeklyPlanSignature,
  type WeeklyPlan,
} from "@/lib/study-plan-generator";
import { questSummaryLine } from "@/lib/daily-quests";
import { useDailyQuests } from "@/features/dashboard/useDailyQuests";

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CARD =
  "rounded-3xl bg-white dark:bg-[#2b1620] shadow-[0_0_0_1.5px_rgba(138,22,48,0.12),0_18px_36px_-26px_rgba(90,15,35,0.4)] dark:shadow-[0_0_0_1.5px_rgba(255,255,255,0.1)] p-5";

interface Milestone {
  title: string;
  detail: string;
  done: boolean;
}

function buildMilestones(examDate: string | undefined, historyCount: number, avgAccuracy: number | null, target: number): Milestone[] {
  const list: Milestone[] = [];
  const today = getManilaTodayString();

  // Milestone 1: baseline diagnostic
  list.push({
    title: "Take your first diagnostic",
    detail: historyCount > 0 ? `Done. ${historyCount} ${historyCount === 1 ? "session" : "sessions"} recorded.` : "Start with a 10-question check.",
    done: historyCount > 0,
  });

  if (!examDate) {
    list.push({
      title: "Set your exam date",
      detail: "Milestones schedule themselves once your date is set.",
      done: false,
    });
    return list;
  }

  const daysLeft = daysUntilManila(examDate);
  if (daysLeft === null) return list;

  const examIso = examDate;
  const back = (weeks: number) => {
    const raw = addDaysIso(examIso, -weeks * 7);
    if (!raw || raw < today) return today;
    return raw;
  };

  // Milestone 2: first full mock, about 4 weeks out
  const firstMockBy = back(4);
  list.push({
    title: "Finish your first full mock",
    detail: daysLeft > 28 ? `Aim for by ${formatManilaDate(firstMockBy, false)}.` : "Due date passed; take one as soon as you can.",
    done: false,
  });

  // Milestone 3: every measured subject at/above half target
  list.push({
    title: `Every subject above ${Math.round(target / 2)}%`,
    detail: avgAccuracy !== null ? `You are averaging ${avgAccuracy}% overall.` : "Take a diagnostic to start measuring.",
    done: avgAccuracy !== null && avgAccuracy >= Math.round(target / 2),
  });

  // Milestone 4: every subject at target, 2 weeks out
  const atTargetBy = back(2);
  list.push({
    title: `Every subject at your ${target}% target`,
    detail: `Aim for by ${formatManilaDate(atTargetBy, false)}.`,
    done: false,
  });

  // Milestone 5: final rest
  list.push({
    title: "Rest and light review",
    detail: `The last 3 days before ${formatManilaDate(examIso)}.`,
    done: false,
  });

  return list;
}

export function StudyPlanView() {
  const { currentWorkspace, isLoaded } = useExamWorkspace();
  const { preferences, updateCategory } = usePreferences();

  const [subjects, setSubjects] = useState<SubjectReadinessMetric[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [todayItems, setTodayItems] = useState(0);
  const [calMonth, setCalMonth] = useState<{ y: number; m: number } | null>(null);
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set());
  const [checkinDates, setCheckinDates] = useState<Set<string>>(new Set());
  const [studyStartDraft, setStudyStartDraft] = useState<string>("");
  const [studyStartError, setStudyStartError] = useState<string | null>(null);
  // Factual diff surfaced as "Plan adjusted" feedback after a regeneration.
  const prevSigRef = useRef<string>("");
  const [adjustedNote, setAdjustedNote] = useState<string | null>(null);

  // The workspace is the authoritative store: no fabricated date fallback.
  // An unset date is a real state and gets its own empty-state copy below.
  const examDate = currentWorkspace?.targetExamDate || "";
  const dailyGoal = currentWorkspace?.dailyGoal || preferences.study.dailyGoal || 25;
  const quests = useDailyQuests();
  // Workspace-scoped plan template (guide §20); falls back to the global
  // preference for workspaces created before the field existed.
  const template = currentWorkspace?.studyPlanTemplate ?? preferences.study.planTemplate ?? "smart";

  // Level-aware routes and specs derived from the ACTIVE level.
  const levelRoutes = useMemo(
    () =>
      getExamRoutesForLevel(currentWorkspace?.examId || "cse", currentWorkspace?.levelId),
    [currentWorkspace?.examId, currentWorkspace?.levelId]
  );
  const mockSpecs = useMemo(
    () =>
      getExamMockSpecsForLevel(currentWorkspace?.examId || "cse", currentWorkspace?.levelId),
    [currentWorkspace?.examId, currentWorkspace?.levelId]
  );
  const target = mockSpecs?.passingScorePercentage || 80;

  useEffect(() => {
    if (!isLoaded) return;
    const wsId = currentWorkspace?.id;
    setSubjects(LocalStorageService.getSubjectReadiness(wsId));
    setHistoryCount(LocalStorageService.getAttemptHistory(wsId).length);
    setDueCount(LocalStorageService.getDueMistakes(wsId).length);
    setTodayItems(LocalStorageService.getDailyQuestionsAnswered());
    const streak = LocalStorageService.getStudyStreak();
    setActiveDates(new Set(streak.activeDates || []));
    setCheckinDates(new Set(streak.checkInDates || []));
  }, [currentWorkspace?.id, isLoaded]);

  const today = getManilaTodayString();

  // Study period start: the workspace is the authoritative store; default to
  // Manila-today when never set. Pure read in render, persisted on commit.
  const studyStartDate = currentWorkspace?.studyStartDate || today;

  // Plan memoized on its input signature: recomputes only when real inputs change
  const planSubjects = useMemo(
    () =>
      subjects.map((s) => ({
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        accuracy: s.accuracyPercentage,
        questionsAnswered: s.questionsAnswered,
      })),
    [subjects]
  );
  const sig = weeklyPlanSignature({
    today,
    examDate,
    studyStartDate,
    dailyGoal,
    subjects: planSubjects,
    dueReviewCount: dueCount,
    template,
    practiceHref: levelRoutes.practiceUrl || "",
    quickDrillHref: levelRoutes.quickDrillUrl || "",
    mediumHref: levelRoutes.quickDrillUrl?.replace("/quick", "/medium") || "",
    fullMockHref: levelRoutes.fullMockUrl || "",
  });

  const plan: WeeklyPlan = useMemo(
    () =>
      generateWeeklyPlan({
        today,
        examDate,
        studyStartDate,
        dailyGoal,
        subjects: planSubjects,
        dueReviewCount: dueCount,
        template,
        practiceHref: levelRoutes.practiceUrl || "/practice",
        quickDrillHref: levelRoutes.quickDrillUrl,
        mediumHref: levelRoutes.quickDrillUrl?.replace("/quick", "/medium"),
        fullMockHref: levelRoutes.fullMockUrl,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sig]
  );

  // "Plan adjusted" feedback: when the plan regenerates for a reason other
  // than the page load itself, state the factual change derived from the new
  // plan. Never speculative — only what the generated plan actually shows.
  useEffect(() => {
    if (!prevSigRef.current) {
      prevSigRef.current = sig;
      return;
    }
    if (sig === prevSigRef.current) return;
    prevSigRef.current = sig;
    const parts: string[] = [];
    if (plan.facts.some((f) => f.kind === "reviews")) parts.push("spaced review moved to the front of the week");
    if (plan.isColdStart) {
      parts.push("no measured subjects yet — baseline week generated");
    } else {
      const firstDrill = plan.days.find((d) => d.state === "today" && d.href);
      if (firstDrill) parts.push(`today now targets “${firstDrill.focus}”`);
    }
    if (parts.length > 0) {
      setAdjustedNote(`Plan adjusted: ${parts.join(" · ")}.`);
      const t = window.setTimeout(() => setAdjustedNote(null), 6000);
      return () => window.clearTimeout(t);
    }
    setAdjustedNote(null);
  }, [sig, plan]);

  // One source of truth for day status: real recorded activity per date.
  const dayActivity = useMemo(() => {
    const map = new Map<string, { active: boolean; checkedIn: boolean }>();
    for (const iso of activeDates) map.set(iso, { active: true, checkedIn: checkinDates.has(iso) });
    return map;
  }, [activeDates, checkinDates]);

  const setTemplate = (id: PlanTemplateId) => {
    if (id !== template) {
      // The template belongs to the active workspace so two exams can keep
      // different strategies (guide §20). The preferences copy is still
      // written as a legacy fallback for workspaces without the field.
      if (currentWorkspace) {
        WorkspaceService.updateWorkspace(currentWorkspace.id, { studyPlanTemplate: id });
      }
      updateCategory("study", { planTemplate: id });
    }
  };

  // Study period commit with start ≤ exam validation.
  const commitStudyStart = () => {
    const next = studyStartDraft;
    setStudyStartDraft("");
    if (!next) return;
    const parsed = parseManilaDate(next);
    if (!parsed) {
      setStudyStartError("Enter a valid date.");
      return;
    }
    if (examDate && next > examDate) {
      setStudyStartError("Study start must be on or before the exam date.");
      return;
    }
    setStudyStartError(null);
    if (next !== studyStartDate && currentWorkspace) {
      WorkspaceService.setStudyStartDate(next, currentWorkspace.id);
    }
  };

  // Calendar opens on today's month — never auto-jumps to the exam month.
  // Once the visitor navigates manually, the view stops following the exam
  // date; the Today button brings them back.
  useEffect(() => {
    const now = parseManilaDate(today);
    if (!now) return;
    setCalMonth((prev) => {
      if (prev) return prev;
      return { y: now.getUTCFullYear(), m: now.getUTCMonth() };
    });
  }, [today]);

  const goToday = () => {
    const now = parseManilaDate(today);
    if (!now) return;
    setCalMonth({ y: now.getUTCFullYear(), m: now.getUTCMonth() });
  };

  const daysLeft = daysUntilManila(examDate);
  const milestones = useMemo(
    () => buildMilestones(examDate, historyCount, null, target),
    [examDate, historyCount, target]
  );

  const shiftMonth = (delta: number) => {
    if (!calMonth) return;
    const key = calMonth.y * 12 + calMonth.m + delta;
    setCalMonth({ y: Math.floor(key / 12), m: ((key % 12) + 12) % 12 });
  };

  const renderCalendar = () => {
    if (!calMonth) return null;
    const first = new Date(Date.UTC(calMonth.y, calMonth.m, 1));
    const pad = first.getUTCDay();
    const dim = new Date(Date.UTC(calMonth.y, calMonth.m + 1, 0)).getUTCDate();
    const cells: React.ReactNode[] = [];

    for (let i = 0; i < pad; i++) {
      cells.push(<span key={`pad-${i}`} />);
    }
    for (let d = 1; d <= dim; d++) {
      const iso = `${calMonth.y}-${String(calMonth.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isExam = iso === examDate;
      const isToday = iso === today;
      const studied = activeDates.has(iso);
      const checkedIn = checkinDates.has(iso);
      const past = iso < today;
      cells.push(
        <span
          key={d}
          title={isExam ? "Exam day" : studied ? "Studied" : undefined}
          className={`relative h-10 grid place-items-center rounded-xl text-[13px] font-semibold ${
            isExam
              ? "bg-[#8a1630] text-white font-extrabold"
              : isToday
              ? "shadow-[inset_0_0_0_2px_#8a1630] font-extrabold text-[#1b1216] dark:text-[#f8ecee]"
              : past
              ? "opacity-40 text-[#1b1216] dark:text-[#f8ecee]"
              : "text-[#1b1216] dark:text-[#f8ecee]"
          }`}
        >
          {d}
          {studied && !isExam && (
            <i className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#34c98a]" aria-hidden="true" />
          )}
          {!studied && checkedIn && !isExam && (
            <i className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#e58a9a]" aria-hidden="true" />
          )}
        </span>
      );
    }

    const minKey = (() => {
      const now = parseManilaDate(today)!;
      return now.getUTCFullYear() * 12 + now.getUTCMonth();
    })();
    const curKey = calMonth.y * 12 + calMonth.m;

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-xl font-extrabold text-[#1b1216] dark:text-[#f8ecee]">
            {MONTHS[calMonth.m]} {calMonth.y}
          </h3>
          <div className="flex gap-1.5">
            {curKey !== minKey && (
              <button
                type="button"
                onClick={goToday}
                aria-label="Back to today's month"
                className="px-3 h-9 rounded-full bg-[#fbeff0] dark:bg-[#351a22] text-[#8a1630] dark:text-[#fad1da] text-[12px] font-extrabold"
              >
                Today
              </button>
            )}
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={curKey <= minKey}
              aria-label="Previous month"
              className="w-9 h-9 grid place-items-center rounded-full bg-[#f4ecee] dark:bg-[#3a1f29] disabled:opacity-35 text-[#1b1216] dark:text-[#f8ecee]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="w-9 h-9 grid place-items-center rounded-full bg-[#f4ecee] dark:bg-[#3a1f29] text-[#1b1216] dark:text-[#f8ecee]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {DAY_HEADERS.map((d) => (
            <span key={d} className="text-[11px] font-bold text-[#8a7a80] dark:text-[#a89ba1] py-1">
              {d}
            </span>
          ))}
          {cells}
        </div>
        <div className="flex flex-wrap gap-4 text-[12px] font-semibold text-[#8a7a80] dark:text-[#a89ba1] mt-3">
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-full bg-[#8a1630]" /> Exam day
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-full bg-[#34c98a]" /> Studied
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-full bg-[#e58a9a]" /> Check-in
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-sm shadow-[inset_0_0_0_2px_#8a1630]" /> Today
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-page-enter space-y-5">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#1b1216] dark:text-[#f5eff1]">
          Study plan
        </h1>
        <p className="text-[#5a4a50] dark:text-[#a89ba1] text-sm mt-1">
          A path from today to exam day.
          {daysLeft !== null && ` ${daysLeft} ${daysLeft === 1 ? "day" : "days"} to go.`}
        </p>
      </div>

      {/* This week */}
      <section className={CARD} aria-label="This week">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
          <h2 className="font-display text-xl font-extrabold text-[#1b1216] dark:text-[#f8ecee]">
            This week
          </h2>
          <span className="text-[13px] font-semibold text-[#8a7a80] dark:text-[#a89ba1]">
            {dailyGoal} items a day · today {todayItems}/{dailyGoal}
          </span>
        </div>

        {/* Study period: persisted start date, editable, start ≤ exam date */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 rounded-2xl bg-[#fdf8f6] dark:bg-white/[0.04] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(138,22,48,0.10)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]">
          <span className="text-[13px] font-bold text-[#1b1216] dark:text-[#f8ecee]">Study period</span>
          <span className="text-[12.5px] font-semibold text-[#8a7a80] dark:text-[#a89ba1]">
            {formatManilaDate(studyStartDate, false)}
            {examDate ? ` → ${formatManilaDate(examDate, false)}` : " → no exam date set"}
          </span>
          <div className="ml-auto">
            <span className="sr-only" id="study-start-label">Change study start date</span>
            <DatePicker
              aria-label="Study start date"
              aria-labelledby="study-start-label"
              value={studyStartDraft || studyStartDate}
              max={examDate || undefined}
              onChange={(iso) => {
                // Preserve the draft-then-commit contract: picking a date
                // stages it; the same validation rules apply before persist.
                setStudyStartDraft(iso);
                setStudyStartError(null);
                // Commit immediately (the old control committed on blur;
                // committing on explicit selection is more predictable and
                // loses nothing — the value is fully validated either way).
                const next = iso;
                setStudyStartDraft("");
                const parsed = parseManilaDate(next);
                if (!parsed) {
                  setStudyStartError("Enter a valid date.");
                  return;
                }
                if (examDate && next > examDate) {
                  setStudyStartError("Study start must be on or before the exam date.");
                  return;
                }
                setStudyStartError(null);
                if (next !== studyStartDate && currentWorkspace) {
                  WorkspaceService.setStudyStartDate(next, currentWorkspace.id);
                }
              }}
              className="[&_button]:w-auto"
            />
          </div>
          {studyStartError && (
            <p role="alert" className="w-full flex items-center gap-1.5 text-[12.5px] font-bold text-[#d1344b] dark:text-[#ff9fb5]">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              {studyStartError}
            </p>
          )}
        </div>

        {/* Factual regeneration feedback (auto-dismisses; only real changes) */}
        {adjustedNote && (
          <p
            role="status"
            className="mb-3 rounded-2xl bg-[#fbeff0] dark:bg-[#351a22] px-4 py-2.5 text-[13px] font-bold text-[#8a1630] dark:text-[#fad1da]"
          >
            {adjustedNote}
          </p>
        )}

        {/* Template picker: writes preferences.study.planTemplate; Settings mirrors it */}
        <div className="flex flex-wrap items-center gap-2 mb-4" role="radiogroup" aria-label="Weekly plan template">
          {PLAN_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={template === t.id}
              title={t.description}
              onClick={() => setTemplate(t.id)}
              className={`px-3.5 py-2 rounded-full text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b] ${
                template === t.id
                  ? "bg-[#8a1630] text-white"
                  : "bg-[#f4ecee] dark:bg-[#3a1f29] text-[#1b1216] dark:text-[#f8ecee] hover:bg-[#fbeff0] dark:hover:bg-[#45222e]"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Why this plan: per-strategy explanation built from real inputs */}
        <div className="mb-4 rounded-2xl bg-[#fdf8f6] dark:bg-white/[0.04] p-4 shadow-[inset_0_0_0_1px_rgba(138,22,48,0.10)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]">
          <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-[#8a1630] dark:text-[#ff9fb5]">
            <Lightbulb className="w-4 h-4 shrink-0" aria-hidden="true" />
            Why this plan: {plan.explanation.headline}
          </h3>
          <p className="text-[13px] font-semibold leading-relaxed text-[#5a4a50] dark:text-[#c9b3b9] mt-1.5">
            {plan.explanation.why}
          </p>
          {plan.facts.length > 0 && (
            <ul className="mt-2.5 grid gap-1">
              {plan.facts.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[12.5px] font-semibold text-[#8a7a80] dark:text-[#a89ba1]">
                  <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#34c98a]" aria-hidden="true" />
                  {f.text}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {plan.days.map((day) => {
            const isToday = day.state === "today";
            const isPast = day.state === "past";
            // Past-day status comes strictly from recorded activity for that
            // date; the plan itself never claims a past day was completed.
            const wasActive = isPast && (dayActivity.get(day.iso)?.active ?? false);
            const wasMissed = isPast && !wasActive;
            return (
              <div
                key={day.iso}
                className={`rounded-2xl p-4 min-h-[170px] flex flex-col gap-2 ${
                  isToday
                    ? "bg-[#8a1630] text-white shadow-[0_18px_32px_-22px_rgba(138,22,48,0.9)]"
                    : isPast
                    ? "bg-[#fbeff0] dark:bg-[#351a22]"
                    : "bg-white dark:bg-[#2b1620] shadow-[0_0_0_1.5px_rgba(138,22,48,0.12)] dark:shadow-[0_0_0_1.5px_rgba(255,255,255,0.1)]"
                }`}
              >
                <small
                  className={`text-[12px] font-bold ${isToday ? "text-[#f3cbd3]" : "text-[#8a7a80] dark:text-[#a89ba1]"}`}
                >
                  {DAY_HEADERS[day.dayOfWeek]} · {formatManilaDate(day.iso, false).split(" ")[0]} {day.iso.slice(8)}
                </small>
                <span className={`font-display text-2xl font-extrabold tracking-[-0.03em] ${isToday ? "text-white" : "text-[#1b1216] dark:text-[#f8ecee]"}`}>
                  {Number(day.iso.slice(8))}
                </span>
                <h3 className={`text-[14px] font-bold leading-snug ${isToday ? "text-white" : wasMissed ? "text-[#8a7a80] dark:text-[#a89ba1]" : "text-[#1b1216] dark:text-[#f8ecee]"}`}>
                  {wasActive ? "Studied" : day.focus}
                </h3>
                <div className="mt-auto flex flex-col gap-2 items-start">
                  {isPast ? (
                    wasActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e4f7ec] text-[#0a6b35] px-2.5 py-1 text-[11.5px] font-extrabold">
                        <Check className="w-3 h-3" /> Done
                      </span>
                    ) : null
                  ) : isToday ? (
                    <>
                      <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-extrabold bg-white/20 text-white`}>
                        {todayItems} / {day.targetItems} items
                      </span>
                      {/* Quests share one engine with the Dashboard, so this
                          line can never contradict the quest card there. */}
                      {quests.length > 0 && (
                        <span className="text-[11.5px] font-bold text-[#f3cbd3]">
                          {questSummaryLine(quests, todayItems, dailyGoal)}
                        </span>
                      )}
                      {day.href && (
                        <Link
                          href={day.href}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#f6b93b] text-[#2a0a12] px-3.5 py-2 text-[13px] font-extrabold hover:-translate-y-0.5 transition-transform"
                        >
                          Start
                        </Link>
                      )}
                    </>
                  ) : (
                    <span className="rounded-full bg-[#fbeff0] dark:bg-[#351a22] text-[#8a1630] dark:text-[#fad1da] px-2.5 py-1 text-[11.5px] font-extrabold">
                      {day.targetItems} items
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[12.5px] font-semibold text-[#8a7a80] dark:text-[#a89ba1] mt-3 pt-3 border-t border-[#f3e6e9] dark:border-white/10">
          {plan.rationale}
        </p>
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-4 items-start">
        {/* Month calendar */}
        <section className={CARD} aria-label="Month calendar">
          {renderCalendar()}
        </section>

        {/* Milestones */}
        <section className={CARD} aria-label="Milestones">
          <h2 className="font-display text-xl font-extrabold text-[#1b1216] dark:text-[#f8ecee] mb-4">
            Milestones
          </h2>
          <div className="grid">
            {milestones.map((m, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr] gap-3.5 relative pb-4 last:pb-0">
                {i < milestones.length - 1 && (
                  <span
                    className="absolute left-[13px] top-8 bottom-0 w-0.5 bg-[#f3e6e9] dark:bg-white/10"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${
                    m.done
                      ? "bg-[#34c98a] text-white"
                      : "bg-[#f4ecee] dark:bg-[#3a1f29] shadow-[inset_0_0_0_2px_rgba(138,22,48,0.14)]"
                  }`}
                >
                  {m.done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </span>
                <div className="min-w-0">
                  <b className="block text-[14px] font-bold leading-snug text-[#1b1216] dark:text-[#f8ecee]">
                    {m.title}
                  </b>
                  <small className="block text-[12.5px] font-semibold text-[#8a7a80] dark:text-[#a89ba1] mt-0.5">
                    {m.detail}
                  </small>
                </div>
              </div>
            ))}
          </div>
          <p className="flex items-start gap-2 text-[12px] font-semibold text-[#8a7a80] dark:text-[#a89ba1] mt-4 pt-3 border-t border-[#f3e6e9] dark:border-white/10">
            <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#f6b93b]" />
            Milestones are suggestions from your exam date and history. They sharpen as you practice more.
          </p>
        </section>
      </div>
    </div>
  );
}
