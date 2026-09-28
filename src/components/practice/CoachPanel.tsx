"use client";

import React from "react";
import { ReviewTayoOwl, type OwlMood } from "@/components/brand/ReviewTayoOwl";

export interface CoachPanelProps {
  /** Owl reaction for the most recent answer. */
  mood?: OwlMood;
  /** Bold headline inside the speech bubble ("Correct!" / "Not quite." / greeting). */
  bubbleTitle: string;
  /** Explanation or encouragement text under the title. */
  bubbleBody: string;
  /** Current consecutive-correct count. 0 renders the neutral invite. */
  streak: number;
  /** true when the last answer was correct (drives the streak chip heat). */
  lastCorrect?: boolean;
  /** "panel" is the desktop sidebar card; "compact" is the mobile bar. */
  variant?: "panel" | "compact";
  /** Answered-so-far counter shown in the footer band. */
  answeredCount?: number;
  /** Correct-so-far counter (only increments in modes that reveal answers). */
  correctCount?: number;
  /** Total items, for the "Answered 3/10" line. */
  total?: number;
}

function streakLabel(streak: number, lastCorrect?: boolean): string {
  if (streak <= 0) return "Streak — simulan natin!";
  const heat = streak >= 2 || lastCorrect ? " 🔥" : "";
  return `Streak ×${streak}${heat}`;
}

/**
 * Mood-driven skin for the halo + speech bubble. The tints mirror the choice
 * feedback palette (emerald = correct, rose = missed, blush = neutral) so the
 * owl's mood reads at a glance without leaving the brand world.
 */
function moodSkin(mood: OwlMood) {
  switch (mood) {
    case "happy":
      return {
        halo: "bg-[radial-gradient(circle_at_center,rgba(18,161,80,0.16),transparent_66%)]",
        box: "bg-[#eff9f2] border-[#cfeedd]",
        tail: "bg-[#eff9f2] border-[#cfeedd]",
        title: "text-emerald-800",
      };
    case "oops":
      return {
        halo: "bg-[radial-gradient(circle_at_center,rgba(209,52,75,0.13),transparent_66%)]",
        box: "bg-[#fdf1f3] border-[#f6d7dc]",
        tail: "bg-[#fdf1f3] border-[#f6d7dc]",
        title: "text-brand-700",
      };
    default:
      return {
        halo: "bg-[radial-gradient(circle_at_center,rgba(138,22,48,0.09),transparent_66%)]",
        box: "bg-[#fdf5f6] border-[#f3d9df]",
        tail: "bg-[#fdf5f6] border-[#f3d9df]",
        title: "text-brand-700",
      };
  }
}

/**
 * The Owl Coach companion. Purely presentational: the exam runner owns all
 * state (mood, bubble copy, streak) and decides when the owl reacts.
 */
export function CoachPanel({
  mood = "idle",
  bubbleTitle,
  bubbleBody,
  streak,
  lastCorrect,
  variant = "panel",
  answeredCount = 0,
  correctCount = 0,
  total,
}: CoachPanelProps) {
  const hot = streak >= 2 || (streak > 0 && lastCorrect === true);
  const skin = moodSkin(mood);

  if (variant === "compact") {
    return (
      <div
        data-testid="coach-panel-compact"
        className="flex items-center gap-3 rounded-2xl bg-white/80 border border-brand-100 px-4 py-3 shadow-[0_10px_24px_-16px_rgba(90,15,35,0.45)]"
      >
        <ReviewTayoOwl
          size={46}
          withCap
          mood={mood}
          alt=""
          aria-hidden="true"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-brand-700 leading-tight">{bubbleTitle}</p>
        </div>
        {streak > 0 && (
          <span
            className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
              hot ? "bg-gold-400 text-[#2a0a12]" : "bg-[#fbeff0] text-brand-700"
            }`}
          >
            {streakLabel(streak, lastCorrect)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="coach-panel"
      className="relative overflow-hidden rounded-3xl bg-white/80 border border-brand-100 shadow-[0_26px_50px_-30px_rgba(90,15,35,0.4)] text-center"
    >
      {/* ── Owl stage ─────────────────────────────────────────────── */}
      <div className="relative px-5 pt-4 pb-3">
        {/* Decorative dashed rings, echoing the landing hero */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 h-60 w-60 rounded-full border-[1.5px] border-dashed border-brand-300/40"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -right-20 h-52 w-52 rounded-full border-[1.5px] border-dashed border-brand-200/50"
        />
        {/* Mood halo: the stage lights up with the owl's reaction */}        <div
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 top-[54%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500 ${skin.halo}`}
        />
        <div className="relative mx-auto w-[132px] max-w-full animate-owl-bob">
          <ReviewTayoOwl size="100%" withCap mood={mood} alt="ReviewTayo coach owl" />
        </div>
      </div>

      {/* ── Speech bubble ─────────────────────────────────────────── */}      <div className="relative mx-3.5 mb-4">
        <div
          className={`relative rounded-2xl border p-3.5 text-left transition-colors duration-300 ${skin.box}`}
        >
          <span
            aria-hidden="true"
            className={`absolute -top-[9px] left-1/2 ml-[-8px] h-4 w-4 rotate-45 border-l-[1.5px] border-t-[1.5px] ${skin.tail}`}
          />          <p className={`text-[14px] font-bold leading-snug ${skin.title}`}>{bubbleTitle}</p>
          {bubbleBody ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#5a4a50]">{bubbleBody}</p>
          ) : null}
        </div>
      </div>

      {/* ── Footer band: streak + session stats ───────────────────── */}
      {/* No streak yet: the chip is redundant with the Answered/Correct
          line below, so the band shows only that line (WI-9). */}
      <div className="border-t border-[#f6e9ec] bg-[#fdf5f6]/70 px-5 py-3">
        {streak > 0 && (
          <span
            data-testid="coach-streak"
            className={`inline-flex items-center rounded-full px-4 py-2 text-[13px] font-extrabold transition-colors ${
              hot
                ? "bg-gold-400 text-[#2a0a12] shadow-[0_8px_20px_-8px_rgba(246,185,59,0.8)]"
                : "bg-white text-[#6d5d63] shadow-[inset_0_0_0_1.5px_#f3d9df]"
            }`}
          >
            {streakLabel(streak, lastCorrect)}
          </span>
        )}
        {typeof total === "number" && (
          <p
            data-testid="coach-progress"
            className="mt-2 text-[11.5px] font-semibold tracking-wide text-[#8a7a80] tabular-nums"
          >
            Answered {answeredCount}/{total} - Correct {correctCount}
          </p>
        )}
      </div>
    </div>
  );
}
