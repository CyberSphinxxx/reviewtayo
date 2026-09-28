"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CalendarDays,
} from "lucide-react";
import {
  LocalStorageService,
  type AttemptSummary,
  type SubjectReadinessMetric,
  type DailyActivityCell,
  type StoredMistakeItem,
} from "@/lib/storage";
import { usePreferences } from "@/lib/preferences";
import { useExamWorkspace } from "@/lib/workspace/useExamWorkspace";
import { getExamMockSpecsForLevel, getExamRoutesForLevel } from "@/config/exams";
import { getNextBestStepRecommendation } from "./recommendation-engine";
import { DashboardOnboardingView } from "./DashboardOnboardingView";
import { ReviewTayoOwl } from "@/components/brand/ReviewTayoOwl";
import { daysUntilManila, formatManilaDate, getManilaTodayString } from "@/lib/study-plan";
import { generateWeeklyPlan, weeklyPlanSignature } from "@/lib/study-plan-generator";
import { useDailyQuests } from "./useDailyQuests";
import { questSummaryLine } from "@/lib/daily-quests";

const TARGET_ACCURACY = 80;

const TILE =
  "rounded-3xl bg-white dark:bg-[#2b1620] shadow-[0_0_0_1.5px_rgba(138,22,48,0.12),0_18px_36px_-26px_rgba(90,15,35,0.4)] dark:shadow-[0_0_0_1.5px_rgba(255,255,255,0.1)] p-5";
const LABEL = "block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#8a7a80] dark:text-[#a89ba1]";
const LINK = "text-[13px] font-extrabold text-[#8a1630] dark:text-[#de5572] hover:underline inline-flex items-center gap-1";

function sectionHeader(title: string, href: string, linkLabel: string, intro?: string) {
  return (
    <div className="flex items-center justify-between gap-3 mb-1">
      <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-[#1b1216] dark:text-[#f8ecee]">
        {title}
      </h2>
      <Link href={href} className={LINK}>
        {linkLabel}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
    // `intro` renders directly below via the caller so the header keeps one
    // row height without negative-margin hacks.
  );
}

/** Small intro line that sits directly under a section header. */
function sectionIntro(text: string) {
  return (
    <p className="text-xs font-semibold text-[#8a7a80] dark:text-[#a89ba1] mb-3">{text}</p>
  );
}

/**
 * Hero owl wrapper: eases a small translate + tilt toward the pointer (6–12px,
 * up to 7 degrees) so the mascot leans toward the learner instead of sitting
 * statically inside the countdown block. rAF-throttled, neutral on leave,
 * fine-pointer only, and inert under prefers-reduced-motion — same guards the
 * owl's own pupil tracking uses.
 */
function TiltOwl() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    if (!window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches) return;

    let rafId: number | null = null;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const apply = () => {
      rafId = null;
      // Ease 12% of the remaining gap per frame: settles quickly, never snaps.
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      el.style.transform = `translate(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px) rotate(${(
        currentX * 0.55
      ).toFixed(2)}deg)`;
      if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
        rafId = requestAnimationFrame(apply);
      }
    };

    const schedule = () => {
      if (rafId === null) rafId = requestAnimationFrame(apply);
    };

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 320);
      targetX = Math.max(-1, Math.min(1, dx / 320)) * k * 12;
      targetY = Math.max(-1, Math.min(1, dy / 320)) * k * 7;
      schedule();
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      schedule();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="will-change-transform">
      <ReviewTayoOwl size={96} withCap bob />
    </div>
  );
}

export function DashboardView() {
  const { preferences } = usePreferences();
  const { currentWorkspace, currentExamConfig, isLoaded } = useExamWorkspace();

  const [history, setHistory] = useState<AttemptSummary[]>([]);
  const [dueMistakeItems, setDueMistakeItems] = useState<StoredMistakeItem[]>([]);
  const [allMistakeItems, setAllMistakeItems] = useState<StoredMistakeItem[]>([]);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [subjects, setSubjects] = useState<SubjectReadinessMetric[]>([]);
  const [dailyAnswered, setDailyAnswered] = useState(0);
  const [weekCells, setWeekCells] = useState<DailyActivityCell[]>([]);
  const [heatmapCells, setHeatmapCells] = useState<DailyActivityCell[]>([]);

  const wsId = currentWorkspace?.id;

  useEffect(() => {
    if (!isLoaded) return;
    const load = () => {
      setHistory(LocalStorageService.getAttemptHistory(wsId));
      setAllMistakeItems(LocalStorageService.getMistakeBank(wsId));
      setDueMistakeItems(LocalStorageService.getDueMistakes(wsId));
      setBookmarkCount(LocalStorageService.getBookmarks(wsId).length);
      setStreakDays(LocalStorageService.getStudyStreak().currentStreak);
      setLongestStreak(LocalStorageService.getStudyStreak().longestStreak);
      setSubjects(LocalStorageService.getSubjectReadiness(wsId));
      setDailyAnswered(LocalStorageService.getDailyQuestionsAnswered());
      setWeekCells(LocalStorageService.getActivityGridData(1));
      setHeatmapCells(LocalStorageService.getActivityGridData(12));
    };
    load();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("cse_guest_") || e.key.startsWith("rt_ws_") || e.key.startsWith("attempt_")) {
        load();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [wsId, isLoaded]);

  // The workspace is the authoritative store: no fabricated exam name, date,
  // or track here. An unset date is a real state and renders its own copy.
  const examDate = currentWorkspace?.targetExamDate || "";
  const examName = currentWorkspace?.targetExamName;
  const dailyGoal = currentWorkspace?.dailyGoal || preferences.study.dailyGoal || 25;

  const daysLeft = useMemo(() => (examDate ? daysUntilManila(examDate) : null), [examDate]);
  const dueMistakes = dueMistakeItems.length;

  // Level-aware runner routes: derives from the ACTIVE level, never the
  // catalog's professional default.
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

  // Recommended next step (existing rule engine, memoized on real inputs)
  const recommendation = useMemo(() => {
    const measured = subjects.filter((s) => s.questionsAnswered > 0);
    return getNextBestStepRecommendation(
      history,
      dueMistakeItems,
      allMistakeItems,
      measured.map((s) => ({ name: s.subjectName, accuracy: s.accuracyPercentage })),
      {
        examShortName: currentExamConfig?.shortName || "Civil Service",
        trackName: currentWorkspace?.trackName || "Standard",
        quickDrillHref: levelRoutes.quickDrillUrl,
        fullMockHref: levelRoutes.fullMockUrl,
        practiceHref: levelRoutes.practiceUrl,
        fullMockItems: mockSpecs?.itemCount,
        fullMockMinutes: mockSpecs?.timeLimitMinutes,
        passingTarget: mockSpecs?.passingScorePercentage || TARGET_ACCURACY,
      }
    );
  }, [history, dueMistakeItems, allMistakeItems, subjects, currentExamConfig, currentWorkspace, levelRoutes, mockSpecs]);

  // Aggregate stats, computed from real data only
  const totalTests = history.length;
  const avgAccuracy = totalTests > 0
    ? Number((history.reduce((a, h) => a + h.percentage, 0) / totalTests).toFixed(1))
    : null;
  const itemsAnswered = history.reduce((a, h) => a + (h.totalQuestions || 10), 0);
  const measuredSubjects = subjects.filter((s) => s.questionsAnswered > 0);
  const weakest = measuredSubjects.length
    ? measuredSubjects.reduce((m, s) => (s.accuracyPercentage < m.accuracyPercentage ? s : m))
    : null;

  // Weekly plan (this week glance) memoized on its signature
  const today = getManilaTodayString();
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
  const planSig = weeklyPlanSignature({
    today,
    examDate,
    dailyGoal,
    subjects: planSubjects,
    dueReviewCount: dueMistakes,
  });
  const weeklyPlan = useMemo(
    () =>
      generateWeeklyPlan({
        today,
        examDate,
        dailyGoal,
        subjects: planSubjects,
        dueReviewCount: dueMistakes,
        practiceHref: levelRoutes.practiceUrl || "/practice",
        quickDrillHref: levelRoutes.quickDrillUrl,
        mediumHref: levelRoutes.quickDrillUrl?.replace("/quick", "/medium"),
        fullMockHref: levelRoutes.fullMockUrl,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planSig]
  );
  const todayPlan = weeklyPlan.days.find((d) => d.state === "today");
  const quests = useDailyQuests();

  if (isLoaded && !currentWorkspace) {
    return <DashboardOnboardingView />;
  }

  const goalPct = dailyGoal > 0 ? Math.min(1, dailyAnswered / dailyGoal) : 0;
  const ringCirc = 2 * Math.PI * 34;
  // SSR-stable greeting: no mounted flip, so the first paint matches hydration
  // (part of the flicker fix — the old text swapped a beat after load).
  const greeting = "Welcome back";

  return (
    <div className="animate-page-enter space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-[#fbeff0] dark:bg-[#351a22] text-[#8a1630] dark:text-[#fad1da] text-xs font-extrabold">
            {currentExamConfig?.shortName || "CSE"} · {currentWorkspace?.trackName || "Professional"}
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#1b1216] dark:text-[#f5eff1] mt-2">
            {greeting}
          </h1>
          <p className="text-[#5a4a50] dark:text-[#a89ba1] text-sm mt-1">
            Here is what to do today.
          </p>
        </div>
      </div>

      {/* Countdown hero */}
      <section
        aria-label="Exam countdown"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2c0b14] to-[#1c060c] text-white p-6 sm:p-8"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-6 relative">
          <b className="font-display font-extrabold tracking-[-0.06em] leading-[0.85] text-[clamp(84px,12vw,150px)]">
            {daysLeft ?? "—"}
            {daysLeft !== null && (
              <span className="sr-only"> days until exam day</span>
            )}
          </b>
          <div className="min-w-0">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.02em]">
              {daysLeft !== null
                ? `days until ${examName ?? "your exam"}`
                : daysLeft === null && !examDate
                ? "no exam date set"
                : "exam day has passed"}
            </h2>
            <p className="text-[#ecc9d0] text-sm mt-1">
              {daysLeft !== null
                ? formatManilaDate(examDate)
                : !examDate
                ? "Set one in Settings → Study plan to pace your review."
                : `Scheduled for ${formatManilaDate(examDate)}. Update the date when your new schedule is released.`}
            </p>
            {daysLeft !== null && daysLeft > 0 && (
              <p className="text-[#ecc9d0] text-[13px] mt-3 max-w-[46ch]">
                At {dailyGoal} items a day, you would answer about{" "}
                {(daysLeft * dailyGoal).toLocaleString("en-US")} items by exam day.
              </p>
            )}
            <div className="flex flex-wrap gap-2.5 mt-4">
              {todayPlan?.href && (
                <Link
                  href={todayPlan.href}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f6b93b] text-[#2a0a12] text-sm font-extrabold shadow-[0_10px_24px_-12px_rgba(246,185,59,0.8)] hover:-translate-y-0.5 transition-transform"
                >
                  Start today: {todayPlan.focus}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <Link
                href="/dashboard/plan"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.4)] hover:bg-white/10 transition-colors"
              >
                <CalendarDays className="w-4 h-4" />
                See your study plan
              </Link>
            </div>
          </div>
          {/* Owl occupies the hero's far-right slot on ≥sm; hidden on phones to keep the hero compact */}
          <div className="hidden sm:block shrink-0 self-center md:self-auto">
            <TiltOwl />
          </div>
        </div>
      </section>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className={`${TILE} min-h-[150px] flex flex-col justify-between`}>
          <span className={LABEL}>Practice accuracy</span>
          <div>
            <b className="block font-display text-4xl font-extrabold tracking-[-0.04em] text-[#8a1630] dark:text-[#de5572] tabular-nums">
              {avgAccuracy !== null ? `${avgAccuracy}%` : "—"}
            </b>
            <div className="h-2 rounded-full bg-[#f4e7e9] dark:bg-white/10 mt-2 overflow-hidden">
              {avgAccuracy !== null && avgAccuracy >= 1 && (
                <i
                  className="block h-full rounded-full bg-[#8a1630] dark:bg-[#de5572] transition-[width] duration-700"
                  style={{ width: `${avgAccuracy}%` }}
                />
              )}
            </div>
            <small className="block text-xs font-semibold text-[#8a7a80] dark:text-[#a89ba1] mt-1.5">
              {avgAccuracy !== null ? `Target ${TARGET_ACCURACY}%` : "Take a diagnostic first"}
            </small>
          </div>
        </div>

        <div className="rounded-3xl bg-[#f6b93b] text-[#2a0a12] p-5 min-h-[150px] flex flex-col justify-between">
          <span className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#6b4300]">
            Study streak
          </span>
          <div>
            <b className="block font-display text-3xl font-extrabold tracking-[-0.03em]">
              {streakDays} {streakDays === 1 ? "day" : "days"}
            </b>
            <div className="flex gap-1.5 mt-2" aria-hidden="true">
              {weekCells.map((c) => (
                <i
                  key={c.date}
                  title={c.formattedDate}
                  className={`w-4 h-4 rounded-full ${
                    c.questionCount > 0 || c.hasCheckIn ? "bg-[#2a0a12]" : "bg-black/15"
                  } ${c.isToday ? "ring-2 ring-[#2a0a12] ring-offset-2 ring-offset-[#f6b93b]" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={`${TILE} min-h-[150px] flex flex-col justify-between`}>
          <span className={LABEL}>Daily goal</span>
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 84 84" className="w-[84px] flex-none" aria-hidden="true">
              <circle cx="42" cy="42" r="34" fill="none" stroke="#f3dfe3" strokeWidth="9" className="dark:opacity-20" />
              <circle
                cx="42"
                cy="42"
                r="34"
                fill="none"
                stroke={goalPct >= 1 ? "#12a150" : "#8a1630"}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${(goalPct * ringCirc).toFixed(1)} ${ringCirc.toFixed(1)}`}
                transform="rotate(-90 42 42)"
                className="transition-all duration-700"
              />
            </svg>
            <div>
              <b className="block font-display text-2xl font-extrabold text-[#8a1630] dark:text-[#de5572] tabular-nums">
                {dailyAnswered}/{dailyGoal}
              </b>
              <small className="text-xs font-semibold text-[#8a7a80] dark:text-[#a89ba1]">
                {goalPct >= 1 ? "Goal met!" : `${Math.max(0, dailyGoal - dailyAnswered)} to go`}
              </small>
            </div>
          </div>
        </div>

        <div className={`${TILE} min-h-[150px] flex flex-col justify-between`}>
          <span className={LABEL}>Items answered</span>
          <div>
            <b className="block font-display text-4xl font-extrabold tracking-[-0.04em] tabular-nums">
              {itemsAnswered}
            </b>
            <small className="block text-xs font-semibold text-[#8a7a80] dark:text-[#a89ba1] mt-1">
              across {totalTests} {totalTests === 1 ? "test" : "tests"}
            </small>
          </div>
        </div>
      </div>

      {/* Daily quests (shared engine with the Study plan's today card) */}
      {quests.length > 0 && (
        <section className={TILE} aria-label="Daily quests">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-[#1b1216] dark:text-[#f8ecee]">
              Today&apos;s quests
            </h2>
            <span className="text-[12.5px] font-bold text-[#8a7a80] dark:text-[#a89ba1] tabular-nums">
              {questSummaryLine(quests, dailyAnswered, dailyGoal)}
            </span>
          </div>
          <ul className="grid gap-2.5">
            {quests.map((q) => (
              <li key={q.id}>
                <Link
                  href={q.href}
                  className={`group flex items-center gap-3.5 rounded-2xl p-3.5 transition-shadow ${
                    q.done
                      ? "bg-[#e4f7ec] dark:bg-[#133a22]/60 shadow-[inset_0_0_0_1px_rgba(18,161,80,0.35)]"
                      : "bg-[#fdf8f6] dark:bg-white/[0.04] shadow-[inset_0_0_0_1px_rgba(138,22,48,0.10)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)] hover:shadow-[inset_0_0_0_1.5px_rgba(138,22,48,0.4)] dark:hover:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.28)]"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`w-6 h-6 shrink-0 rounded-full grid place-items-center ${
                      q.done ? "bg-[#12a150] text-white" : "bg-[#f4e7e9] dark:bg-white/10"
                    }`}
                  >
                    {q.done ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <i className="w-2 h-2 rounded-full bg-[#8a1630] dark:bg-[#de5572]" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block text-[14.5px] font-bold leading-snug text-[#1b1216] dark:text-[#f8ecee]">
                      {q.title}
                    </b>
                    <small className="block text-[12.5px] font-semibold text-[#8a7a80] dark:text-[#a89ba1] mt-0.5">
                      {q.detail}
                    </small>
                  </span>
                  <span className="shrink-0 text-[12.5px] font-extrabold tabular-nums text-[#8a1630] dark:text-[#de5572]">
                    {q.kind === "score" && q.done ? "Done" : `${Math.min(q.progress, q.target)}/${q.target}`}
                  </span>
                </Link>
              </li>
            ))
            }
          </ul>
        </section>
      )}

      {/* Middle: subjects + action rail */}
      <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 items-start">
        {/* Subject progress */}
        <section className={TILE} aria-label="Subject progress">
          {sectionHeader("Your subject progress", currentExamConfig?.routes?.practiceUrl || "/practice", "All topics")}
          {sectionIntro(`Accuracy from your sessions. Target ${TARGET_ACCURACY}%.`)}
          {subjects.length === 0 ? (
            <p className="text-sm font-semibold text-[#8a7a80] dark:text-[#a89ba1] py-4">
              No subjects configured yet.
            </p>
          ) : (
            subjects.map((s) => {
              const isWeakest = weakest?.subjectId === s.subjectId && s.questionsAnswered > 0;
              return (
                <div
                  key={s.subjectId}
                  className="grid grid-cols-[minmax(0,1fr)_44px] sm:grid-cols-[150px_minmax(0,1fr)_44px] gap-x-3 gap-y-1 items-center py-2"
                >
                  <span className="text-[13px] font-bold truncate">{s.subjectName}</span>
                  <div className="relative h-3 rounded-full bg-[#f4e7e9] dark:bg-white/10 col-span-2 sm:col-span-1">
                    <i
                      className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
                      style={{
                        width: `${s.accuracyPercentage}%`,
                        backgroundColor: isWeakest ? "#f6b93b" : "#8a1630",
                      }}
                    />
                    <u
                      className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-[#1b1216] dark:bg-white opacity-35"
                      style={{ left: `${TARGET_ACCURACY}%` }}
                      title={`Target ${TARGET_ACCURACY}%`}
                    />
                  </div>
                  <b className="text-xs font-extrabold tabular-nums text-right">
                    {s.questionsAnswered > 0 ? `${s.accuracyPercentage}%` : "—"}
                  </b>
                </div>
              );
            })
          )}
          <div className="flex gap-4 text-[12px] font-semibold text-[#8a7a80] dark:text-[#a89ba1] mt-2">
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block w-2.5 h-2.5 rounded-sm bg-[#f6b93b]" /> Weakest
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block w-0.5 h-2.5 bg-[#1b1216] dark:bg-white opacity-40" /> Target {TARGET_ACCURACY}%
            </span>
          </div>
        </section>

        {/* Action rail: recommended next + due reviews */}
        <div className="grid gap-4">
          <section className={TILE} aria-label="Recommended next">
            <span className="inline-block px-2.5 py-1 rounded-full bg-[#fdeec6] text-[#6b4300] text-[11px] font-extrabold">
              Recommended next · {recommendation.tag}
            </span>
            <h3 className="font-display text-2xl font-extrabold tracking-[-0.02em] mt-2.5 text-[#1b1216] dark:text-[#f8ecee]">
              {recommendation.title}
            </h3>
            <p className="text-[13px] font-semibold text-[#5a4a50] dark:text-[#c9b3b9] mt-1">
              {recommendation.description}
            </p>
            <Link
              href={recommendation.actionHref}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8a1630] text-white text-sm font-extrabold shadow-[0_10px_24px_-10px_rgba(138,22,48,0.75)] hover:-translate-y-0.5 transition-transform"
            >
              {recommendation.actionLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </section>

          <section className={TILE} aria-label="Due reviews">
            <span className="inline-block px-2.5 py-1 rounded-full bg-[#fbeff0] dark:bg-[#351a22] text-[#8a1630] dark:text-[#fad1da] text-[11px] font-extrabold">
              For today
            </span>
            <h3 className="font-display text-2xl font-extrabold tracking-[-0.02em] mt-2.5 text-[#1b1216] dark:text-[#f8ecee]">
              {dueMistakes} {dueMistakes === 1 ? "question" : "questions"} to review
            </h3>
            <p className="text-[13px] font-semibold text-[#5a4a50] dark:text-[#c9b3b9] mt-1">
              Spaced review brings back what you missed just before you forget it. {bookmarkCount}{" "}
              {bookmarkCount === 1 ? "bookmark" : "bookmarks"} saved.
            </p>
            <Link
              href="/dashboard/review"
              className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8a1630] text-white text-sm font-extrabold shadow-[0_10px_24px_-10px_rgba(138,22,48,0.75)] hover:-translate-y-0.5 transition-transform"
            >
              Review {dueMistakes} {dueMistakes === 1 ? "question" : "questions"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </section>
        </div>
      </div>

      {/* Bottom: consistency + recent sessions */}
      <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-4 items-start">
        <section className={TILE} aria-label="Consistency">
          {sectionHeader("Consistency", "/dashboard/history", "Details")}
          {sectionIntro(
            `${weekCells.filter((c) => c.questionCount > 0 || c.hasCheckIn).length} active ${
              weekCells.filter((c) => c.questionCount > 0 || c.hasCheckIn).length === 1 ? "day" : "days"
            } this week · Longest streak ${longestStreak} ${longestStreak === 1 ? "day" : "days"}`
          )}
          <div
            className="grid grid-flow-col grid-rows-7 gap-[5px] overflow-x-auto pb-1"
            role="img"
            aria-label="Study activity, last 12 weeks"
          >
            {heatmapCells.map((c) => {
              const future = c.isFuture;
              const cls =
                c.activityLevel === 3
                  ? "bg-[#34c98a]"
                  : c.activityLevel === 2
                  ? "bg-[#34c98a]/70"
                  : c.activityLevel === 1
                  ? "bg-[#34c98a]/40"
                  : c.hasCheckIn
                  ? "bg-[#fde3e6] dark:bg-[#4a1a27]"
                  : "bg-[#f4e7e9] dark:bg-white/10";
              return (
                <i
                  key={c.date}
                  title={`${c.formattedDate}: ${
                    c.questionCount > 0
                      ? `${c.questionCount} questions`
                      : c.hasCheckIn
                      ? "check-in only"
                      : "no activity"
                  }`}
                  className={`w-3.5 h-3.5 rounded-[4px] ${cls} ${
                    c.isToday ? "ring-2 ring-[#1b1216] dark:ring-white" : ""
                  } ${future ? "opacity-35" : ""}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 text-[12px] font-semibold text-[#8a7a80] dark:text-[#a89ba1] mt-3">
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block w-3 h-3 rounded-sm bg-[#f4e7e9] dark:bg-white/10" /> No activity
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block w-3 h-3 rounded-sm bg-[#fde3e6] dark:bg-[#4a1a27]" /> Check-in only
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block w-3 h-3 rounded-sm bg-[#34c98a]" /> Answered questions
            </span>
          </div>
          <p className="text-[12px] text-[#8a7a80] dark:text-[#a89ba1] mt-3 pt-3 border-t border-[#f3e6e9] dark:border-white/10">
            Answer at least 1 question a day to keep your streak. Opening the dashboard logs a check-in only.
          </p>
        </section>

        <section className={TILE} aria-label="Recent sessions">
          {sectionHeader("Recent sessions", "/dashboard/history", "View full history")}
          {history.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm font-semibold text-[#8a7a80] dark:text-[#a89ba1]">
                No sessions yet.
              </p>
              <Link
                href={levelRoutes.quickDrillUrl || "/practice"}
                className={`${LINK} mt-2`}
              >
                Take your first 10-question diagnostic
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            history.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl bg-[#fbeff0] dark:bg-[#351a22] px-3.5 py-3 mt-2"
              >
                <div className="flex-1 min-w-0">
                  <b className="block text-[13px] leading-snug truncate text-[#1b1216] dark:text-[#f8ecee]">
                    {item.title}
                  </b>
                  <small className="text-[12px] font-semibold text-[#8a7a80] dark:text-[#a89ba1]">
                    {new Date(item.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · <span className="capitalize">{item.mode}</span>
                  </small>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                    item.percentage >= TARGET_ACCURACY
                      ? "bg-[#e4f7ec] text-[#0a6b35]"
                      : "bg-[#fde3e6] text-[#9d1a33]"
                  }`}
                >
                  {item.percentage}% · {item.percentage >= TARGET_ACCURACY ? "On target" : "Needs review"}
                </span>
                <Link
                  href={`/results/${item.id}`}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold text-[#8a1630] dark:text-[#de5572] bg-white dark:bg-white/10 hover:bg-[#f8edef] dark:hover:bg-white/20 transition-colors"
                >
                  Review
                </Link>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
