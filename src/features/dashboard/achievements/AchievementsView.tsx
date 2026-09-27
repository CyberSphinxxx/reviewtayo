"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Check,
  Flame,
  ListChecks,
  Repeat,
  StickyNote,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import { LocalStorageService } from "@/lib/storage";
import { NotesService } from "@/lib/storage/notes-service";
import { useExamWorkspace } from "@/lib/workspace/useExamWorkspace";
import { usePreferences } from "@/lib/preferences";
import {
  closestAchievement,
  computeAchievements,
  type UserStatsSnapshot,
} from "@/lib/achievement-engine";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  check: Check,
  zap: Zap,
  flame: Flame,
  notes: StickyNote,
  target: Target,
  award: Award,
  timer: Timer,
  repeat: Repeat,
};

function BadgeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Trophy;
  return <Icon className={className} />;
}

const CARD =
  "rounded-3xl bg-white dark:bg-[#2b1620] shadow-[0_0_0_1.5px_rgba(138,22,48,0.12),0_18px_36px_-26px_rgba(90,15,35,0.4)] dark:shadow-[0_0_0_1.5px_rgba(255,255,255,0.1)] p-5";

export function AchievementsView() {
  const { currentWorkspace, currentExamConfig } = useExamWorkspace();
  const { preferences } = usePreferences();
  const [snapshot, setSnapshot] = useState<UserStatsSnapshot | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const wsId = currentWorkspace?.id;

    const history = LocalStorageService.getAttemptHistory(wsId);
    const streak = LocalStorageService.getStudyStreak();
    const readiness = LocalStorageService.getSubjectReadiness(wsId);
    const measured = readiness.filter((s) => s.questionsAnswered > 0);
    const dailyAnswered = LocalStorageService.getDailyQuestionsAnswered();
    const goal = currentWorkspace?.dailyGoal || preferences.study.dailyGoal || 25;

    setSnapshot({
      testsCompleted: history.length,
      itemsAnswered: history.reduce((a, h) => a + (h.totalQuestions || 10), 0),
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      notesCount: NotesService.count(),
      bestSubjectAccuracy: measured.length
        ? Math.max(...measured.map((s) => s.accuracyPercentage))
        : null,
      dailyGoalMetToday: goal > 0 && dailyAnswered >= goal,
      fullMocksCompleted: history.filter((h) => h.mode === "full").length,
      // True when a spaced-review session finished today with zero items left
      // due (persisted marker), not merely "nothing happens to be due now".
      dueClearedToday: LocalStorageService.isSrsClearedToday(),
    });
  }, [currentWorkspace?.id, currentWorkspace?.dailyGoal, preferences.study.dailyGoal]);

  const progress = useMemo(
    () => (snapshot ? computeAchievements(snapshot) : []),
    [snapshot]
  );
  const closest = useMemo(() => closestAchievement(progress), [progress]);
  const earnedCount = progress.filter((p) => p.earned).length;

  return (
    <div className="animate-page-enter space-y-5">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#1b1216] dark:text-[#f5eff1]">
          Achievements
        </h1>
        <p className="text-[#5a4a50] dark:text-[#a89ba1] text-sm mt-1">
          Small wins that keep you going.
        </p>
      </div>

      {!snapshot ? (
        <div className={`${CARD} h-64 animate-pulse`} aria-hidden="true" />
      ) : (
        <>
          {/* Closest to earning */}
          {closest && (
            <section
              aria-label="Closest to earning"
              className="rounded-3xl bg-[#f6b93b] text-[#2a0a12] p-5 sm:p-6"
            >
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#6b4300]">
                Closest to earning
              </span>
              <b className="block font-display text-2xl font-extrabold tracking-[-0.02em] mt-1">
                {closest.def.title}
              </b>
              <span className="block text-[13.5px] font-bold mt-0.5">
                {closest.def.description} · {closest.value} / {closest.goal}
              </span>
              <div className="h-2.5 rounded-full bg-black/15 max-w-[260px] mt-3 overflow-hidden">
                <i
                  className="block h-full rounded-full bg-[#2a0a12] transition-[width] duration-700"
                  style={{ width: `${Math.round(closest.progress * 100)}%` }}
                />
              </div>
            </section>
          )}

          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="font-display text-xl font-extrabold text-[#1b1216] dark:text-[#f8ecee]">
              {earnedCount} of {progress.length} earned
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {progress.map((p) => (
              <div
                key={p.def.id}
                className={`rounded-[22px] p-4 flex flex-col gap-2 min-h-[160px] ${
                  p.earned
                    ? "bg-white dark:bg-[#2b1620] shadow-[0_0_0_1.5px_rgba(138,22,48,0.12)]"
                    : "bg-white/60 dark:bg-[#2b1620]/60 shadow-[inset_0_0_0_1.5px_rgba(138,22,48,0.1)]"
                }`}
              >
                <span
                  className={`w-[52px] h-[52px] rounded-2xl grid place-items-center ${
                    p.earned
                      ? "bg-[#f6b93b] text-[#2a0a12]"
                      : "bg-[#f4ecee] dark:bg-[#3a1f29] text-[#8a7a80] dark:text-[#a89ba1]"
                  }`}
                >
                  <BadgeIcon name={p.def.icon} className="w-6 h-6" />
                </span>
                <h3 className="font-display text-[17px] font-extrabold text-[#1b1216] dark:text-[#f8ecee] mt-1">
                  {p.def.title}
                </h3>
                <p className="text-[13px] font-semibold text-[#8a7a80] dark:text-[#a89ba1] leading-snug">
                  {p.def.description}
                </p>
                <div className="mt-auto pt-2">
                  {p.earned ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e4f7ec] text-[#0a6b35] px-2.5 py-1 text-[11.5px] font-extrabold">
                      <Check className="w-3 h-3" /> Earned
                    </span>
                  ) : (
                    <>
                      <div className="h-2 rounded-full bg-[#f4e7e9] dark:bg-white/10 overflow-hidden">
                        <i
                          className="block h-full rounded-full bg-[#8a1630] transition-[width] duration-700"
                          style={{ width: `${Math.round(p.progress * 100)}%` }}
                        />
                      </div>
                      <small className="block text-[11.5px] font-bold text-[#8a7a80] dark:text-[#a89ba1] mt-1 tabular-nums">
                        {p.value} / {p.goal}
                      </small>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Empty-history nudge */}
          {snapshot.testsCompleted === 0 && (
            <div className={`${CARD} flex flex-wrap items-center gap-4`}>
              <span className="w-12 h-12 rounded-2xl bg-[#f4ecee] dark:bg-[#3a1f29] grid place-items-center text-[#8a1630] dark:text-[#de5572]">
                <ListChecks className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-[200px]">
                <h3 className="font-display text-lg font-extrabold text-[#1b1216] dark:text-[#f8ecee]">
                  Everything starts with one test
                </h3>
                <p className="text-[13px] font-semibold text-[#8a7a80] dark:text-[#a89ba1]">
                  Badges track real activity, so the first ones land quickly.
                </p>
              </div>
              <Link
                href={currentExamConfig?.routes?.quickDrillUrl || "/practice"}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8a1630] text-white text-sm font-extrabold"
              >
                Take the diagnostic
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
