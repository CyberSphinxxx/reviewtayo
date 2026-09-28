"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Clock,
  Crosshair,
  FileText,
  Gauge,
  Layers,
  LetterText,
  ListChecks,
  Repeat,
  SlidersHorizontal,
  SquareStack,
  Target,
  Timer,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import {
  PRACTICE_MODES,
  PRACTICE_MODE_GROUPS,
  getPracticeMode,
  getPracticeModeHrefForLevel,
  type PracticeModeDef,
} from "@/config/practice-modes";
import { LocalStorageService, type SubjectReadinessMetric } from "@/lib/storage";
import { useExamWorkspace } from "@/lib/workspace/useExamWorkspace";

const CARD =
  "rounded-3xl bg-white dark:bg-[#2b1620] shadow-[0_0_0_1.5px_rgba(138,22,48,0.12),0_18px_36px_-26px_rgba(90,15,35,0.4)] dark:shadow-[0_0_0_1.5px_rgba(255,255,255,0.1)] p-5";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  zap: Zap,
  "list-checks": ListChecks,
  target: Target,
  gauge: Gauge,
  repeat: Repeat,
  layers: Layers,
  bookmark: Bookmark,
  "book-open": BookOpen,
  crosshair: Crosshair,
  "sliders-horizontal": SlidersHorizontal,
  "square-stack": SquareStack,
  "letter-text": LetterText,
  "file-text": FileText,
  timer: Timer,
  trophy: Trophy,
};

function ModeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? BookOpen;
  return <Icon className={className} />;
}

interface SetupState {
  mode: PracticeModeDef;
  subject: string;
  feedback: "study" | "exam";
  timer: boolean;
}

/** Modes whose rules already accept a subject/feedback/timer setup. */
const SETUP_ENABLED = new Set(["quick", "medium", "diagnostic", "srs", "mistakes", "bookmarks", "topics"]);

/**
 * Marks every direct child of <body> except the dialog itself inert so
 * pointer and keyboard focus cannot reach the page behind the sheet. Returns
 * a cleanup that restores each element's previous inert state.
 *
 * The sheet and backdrop are rendered through createPortal(document.body):
 * the hub root uses .animate-page-enter, whose forwards-fill transform makes
 * Chromium treat it as the containing block for fixed descendants — insetting
 * the sheet against the content column instead of the viewport and leaving
 * the dark page background exposed left of a column-wide backdrop. Portaling
 * past that wrapper fixes both at once.
 */
function lockBackground(dialog: HTMLElement): () => void {
  const touched: { el: HTMLElement; prev: boolean }[] = [];
  for (const child of Array.from(document.body.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child === dialog || child.contains(dialog)) continue;
    if (child.tagName === "SCRIPT" || child.tagName === "STYLE" || child.tagName === "LINK") continue;
    touched.push({ el: child, prev: child.inert });
    child.inert = true;
  }
  return () => {
    for (const { el, prev } of touched) el.inert = prev;
  };
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Focusable elements inside the dialog (skip aria-hidden subtrees). */
function dialogFocusables(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getAttribute("aria-hidden") !== "true" && el.closest("[aria-hidden='true']") === null
  );
}

export function PracticeHubView() {
  const router = useRouter();
  const { currentWorkspace, isLoaded } = useExamWorkspace();
  const [filter, setFilter] = useState<string>("all");
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [subjects, setSubjects] = useState<SubjectReadinessMetric[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [weakest, setWeakest] = useState<SubjectReadinessMetric | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    const wsId = currentWorkspace?.id;
    const readiness = LocalStorageService.getSubjectReadiness(wsId);
    setSubjects(readiness);
    setDueCount(LocalStorageService.getDueMistakes(wsId).length);
    const measured = readiness.filter((s) => s.questionsAnswered > 0);
    setWeakest(
      measured.length ? measured.reduce((m, s) => (s.accuracyPercentage < m.accuracyPercentage ? s : m)) : null
    );
  }, [currentWorkspace?.id, isLoaded]);

  const subjectNames = useMemo(
    () => Array.from(new Set(subjects.map((s) => s.subjectName))),
    [subjects]
  );

  // Setup sheet a11y: Escape closes, Tab is trapped inside the dialog, the
  // page behind is inert, and focus returns to the card that opened it.
  useEffect(() => {
    if (!setup) return;
    const dialog = sheetRef.current;

    // Remember where focus came from so closing the sheet puts it back.
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const unlock = dialog ? lockBackground(dialog) : () => {};

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSetup(null);
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const focusable = dialogFocusables(dialog);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !dialog.contains(active as Node)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active as Node)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      window.clearTimeout(t);
      unlock();
      restoreFocusRef.current?.focus?.();
      restoreFocusRef.current = null;
    };
  }, [setup]);

  const resolveHref = useCallback(
    (mode: PracticeModeDef, state: { subject: string; feedback: "study" | "exam"; timer: boolean }): string => {
      // The catalog href is a {level} template; substitute the ACTIVE level's
      // slug before appending params. Embedding the raw template 404s on
      // /exams/{level}/quick (the reported Quick Drill bug).
      const base = getPracticeModeHrefForLevel(mode, currentWorkspace?.levelId);
      const params = new URLSearchParams();
      if (state.subject && state.subject !== "All subjects") params.set("subject", state.subject);
      if (state.feedback === "exam") params.set("feedback", "exam");
      if (!state.timer) params.set("timer", "off");
      const qs = params.toString();
      return qs ? `${base}?${qs}` : base;
    },
    [currentWorkspace?.levelId]
  );

  const openSetup = (mode: PracticeModeDef) => {
    if (!mode.enabled) return;
    if (!SETUP_ENABLED.has(mode.id)) {
      // Direct-launch modes (full mock, diagnostic) also carry {level}
      // templates in their href — resolve them the same way.
      router.push(getPracticeModeHrefForLevel(mode, currentWorkspace?.levelId));
      return;
    }
    setSetup({ mode, subject: "All subjects", feedback: "study", timer: true });
  };

  const comingSoon = PRACTICE_MODES.filter((m) => !m.enabled);

  const grouped = PRACTICE_MODE_GROUPS.filter(
    (g) => filter === "all" || filter === g.id
  );

  const modeCard = (mode: PracticeModeDef) => {
    const isSoon = !mode.enabled;
    const facts = mode.id === "srs" && dueCount > 0 ? [`${dueCount} due today`] : mode.facts;
    return isSoon ? (
      <div
        key={mode.id}
        aria-disabled="true"
        className="rounded-[22px] p-4.5 p-4 min-h-[150px] flex flex-col gap-2 bg-transparent shadow-[inset_0_0_0_2px_rgba(138,22,48,0.14)] dark:shadow-[inset_0_0_0_2px_rgba(255,255,255,0.14)] opacity-80"
      >
        <div className="flex items-start justify-between">
          <span className="w-11 h-11 rounded-2xl grid place-items-center bg-[#f4ecee] dark:bg-[#3a1f29] text-[#8a7a80] dark:text-[#a89ba1]">
            <ModeIcon name={mode.icon} className="w-[22px] h-[22px]" />
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f4ecee] dark:bg-[#3a1f29] text-[#8a7a80] dark:text-[#a89ba1] px-2.5 py-1 text-[11px] font-extrabold">
            <Clock className="w-3 h-3" /> Coming soon
          </span>
        </div>
        <h4 className="font-display text-[17px] font-extrabold text-[#1b1216] dark:text-[#f8ecee] mt-1">
          {mode.name}
        </h4>
        <p className="text-[13px] font-semibold text-[#8a7a80] dark:text-[#a89ba1]">{mode.description}</p>
      </div>
    ) : (
      <button
        key={mode.id}
        type="button"
        onClick={() => openSetup(mode)}
        className="rounded-[22px] p-4 min-h-[150px] flex flex-col gap-2 text-left bg-white dark:bg-[#2b1620] shadow-[0_0_0_1.5px_rgba(138,22,48,0.12)] dark:shadow-[0_0_0_1.5px_rgba(255,255,255,0.12)] transition-transform hover:-translate-y-1 hover:shadow-[0_0_0_2px_#8a1630,0_20px_30px_-24px_rgba(90,15,35,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
      >
        <div className="flex items-start justify-between">
          <span className="w-11 h-11 rounded-2xl grid place-items-center bg-[#8a1630] text-white">
            <ModeIcon name={mode.icon} className="w-[22px] h-[22px]" />
          </span>
        </div>
        <h4 className="font-display text-[17px] font-extrabold text-[#1b1216] dark:text-[#f8ecee] mt-1">
          {mode.name}
        </h4>
        <p className="text-[13px] font-semibold text-[#8a7a80] dark:text-[#a89ba1]">{mode.description}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {facts.map((f) => (
            <span
              key={f}
              className="rounded-full bg-[#fbeff0] dark:bg-[#351a22] text-[#8a1630] dark:text-[#fad1da] px-2 py-0.5 text-[11px] font-extrabold"
            >
              {f}
            </span>
          ))}
        </div>
      </button>
    );
  };

  return (
    <div className="animate-page-enter space-y-5">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#1b1216] dark:text-[#f5eff1]">
          Practice
        </h1>
        <p className="text-[#5a4a50] dark:text-[#a89ba1] text-sm mt-1">
          Choose how you want to practice today.
        </p>
      </div>

      {/* Two recommended actions */}
      <div className="grid sm:grid-cols-2 gap-3.5">
        <button
          type="button"
          onClick={() => {
            const srs = getPracticeMode("srs");
            if (srs) openSetup(srs);
          }}
          className="flex items-center gap-4 rounded-3xl bg-[#8a1630] text-white p-5 text-left transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
        >
          <span className="w-13 h-13 w-[52px] h-[52px] shrink-0 rounded-2xl bg-white/20 grid place-items-center">
            <Repeat className="w-6 h-6" />
          </span>
          <span className="min-w-0 flex-1">
            <small className="block text-[12px] font-bold opacity-85">
              {dueCount > 0 ? "Recommended for today" : "Keep recall sharp"}
            </small>
            <b className="block font-display text-xl font-extrabold tracking-[-0.02em] mt-0.5">
              Spaced review
            </b>
            <span className="block text-[13px] font-semibold opacity-90 mt-0.5">
              {dueCount > 0
                ? `${dueCount} ${dueCount === 1 ? "question" : "questions"} due · about 6 min`
                : "Nothing due; quick warm-up available"}
            </span>
          </span>
          <ArrowRight className="w-5 h-5 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => {
            const topics = getPracticeMode("topics");
            if (topics) openSetup(topics);
          }}
          className="flex items-center gap-4 rounded-3xl bg-[#fbeff0] dark:bg-[#351a22] text-[#1b1216] dark:text-[#f5eff1] p-5 text-left transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
        >
          <span className="w-[52px] h-[52px] shrink-0 rounded-2xl bg-white dark:bg-[#2b1620] grid place-items-center text-[#8a1630] dark:text-[#de5572]">
            <Crosshair className="w-6 h-6" />
          </span>
          <span className="min-w-0 flex-1">
            <small className="block text-[12px] font-bold text-[#8a7a80] dark:text-[#a89ba1]">
              Your weakest subject
            </small>
            <b className="block font-display text-xl font-extrabold tracking-[-0.02em] mt-0.5 truncate">
              {weakest ? `${weakest.subjectName} drill` : "Take a diagnostic first"}
            </b>
            <span className="block text-[13px] font-semibold text-[#8a7a80] dark:text-[#a89ba1] mt-0.5">
              {weakest ? `Currently ${weakest.accuracyPercentage}% · 10 items` : "10 questions to map your subjects"}
            </span>
          </span>
          <ArrowRight className="w-5 h-5 shrink-0" />
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter modes">
        <button
          type="button"
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          className={`px-4 py-2 rounded-full text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b] ${
            filter === "all"
              ? "bg-[#8a1630] text-white"
              : "bg-white dark:bg-[#2b1620] text-[#1b1216] dark:text-[#f8ecee] shadow-[inset_0_0_0_1.5px_rgba(138,22,48,0.14)] dark:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.14)]"
          }`}
        >
          All <small className="opacity-65">{PRACTICE_MODES.length}</small>
        </button>
        {PRACTICE_MODE_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setFilter(g.id)}
            aria-pressed={filter === g.id}
            className={`px-4 py-2 rounded-full text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b] ${
              filter === g.id
                ? "bg-[#8a1630] text-white"
                : "bg-white dark:bg-[#2b1620] text-[#1b1216] dark:text-[#f8ecee] shadow-[inset_0_0_0_1.5px_rgba(138,22,48,0.14)] dark:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.14)]"
            }`}
          >
            {g.label} <small className="opacity-65">{PRACTICE_MODES.filter((m) => m.group === g.id).length}</small>
          </button>
        ))}
      </div>

      {/* Grouped mode catalog */}
      {grouped.map((g) => (
        <section key={g.id} aria-label={g.label}>
          <div className="flex items-baseline gap-3 mb-3">
            <h2 className="font-display text-xl font-extrabold text-[#1b1216] dark:text-[#f8ecee]">{g.label}</h2>
            <span className="text-[13px] font-semibold text-[#8a7a80] dark:text-[#a89ba1]">{g.blurb}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {PRACTICE_MODES.filter((m) => m.group === g.id).map((m) => modeCard(m))}
          </div>
        </section>
      ))}

      {/* Anchor target for the sidebar "Coming soon" entry */}
      {comingSoon.length > 0 && (
        <section id="coming-soon" aria-label="Coming soon" className="scroll-mt-6 rounded-3xl p-5 shadow-[inset_0_0_0_2px_rgba(138,22,48,0.12)] dark:shadow-[inset_0_0_0_2px_rgba(255,255,255,0.12)]">
          <div className="flex items-center gap-2.5 mb-1">
            <Clock className="w-4 h-4 text-[#8a7a80] dark:text-[#a89ba1]" aria-hidden="true" />
            <h2 className="font-display text-xl font-extrabold text-[#1b1216] dark:text-[#f8ecee]">
              Coming soon
            </h2>
            <span className="ml-auto text-[12.5px] font-bold text-[#8a7a80] dark:text-[#a89ba1]">
              {comingSoon.length} modes in the works
            </span>
          </div>
          <p className="text-[13px] font-semibold text-[#8a7a80] dark:text-[#a89ba1]">
            These are designed and queued; each unlocks as a normal mode when its data is ready.
          </p>
        </section>
      )}

      {/* Deep-dive link to the topic directory */}
      <section className={`${CARD} flex flex-wrap items-center gap-4`}>
        <span className="w-12 h-12 rounded-2xl bg-[#f4ecee] dark:bg-[#3a1f29] grid place-items-center text-[#8a1630] dark:text-[#de5572]">
          <BookOpen className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-[200px]">
          <h3 className="font-display text-lg font-extrabold text-[#1b1216] dark:text-[#f8ecee]">
            Browse every topic
          </h3>
          <p className="text-[13px] font-semibold text-[#8a7a80] dark:text-[#a89ba1]">
            The full topic directory with per-subject question banks.
          </p>
        </div>
        <Link
          href="/practice"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8a1630] text-white text-sm font-extrabold"
        >
          Open directory
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Setup sheet — portaled to <body>: the hub root's .animate-page-enter
          transform would otherwise become the containing block for these fixed
          overlays in Chromium (CTA pushed out of view + exposed dark strip). */}
      {setup &&
        createPortal(
          <>
          <div
            className="fixed inset-0 z-50 bg-[rgba(20,5,10,0.55)]"
            onClick={() => setSetup(null)}
            aria-hidden="true"
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="setup-title"
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[440px] bg-white dark:bg-[#2b1620] shadow-[-30px_0_60px_-30px_rgba(0,0,0,0.5)] flex flex-col"
          >
            <div className="flex items-center gap-3.5 px-6 pt-6 pb-4">
              <span className="w-11 h-11 rounded-2xl bg-[#8a1630] text-white grid place-items-center shrink-0">
                <ModeIcon name={setup.mode.icon} className="w-[22px] h-[22px]" />
              </span>
              <h2 id="setup-title" className="font-display text-2xl font-extrabold text-[#1b1216] dark:text-[#f8ecee] flex-1 min-w-0 truncate">
                {setup.mode.name}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setSetup(null)}
                aria-label="Close setup"
                className="w-9 h-9 grid place-items-center rounded-full bg-[#f4ecee] dark:bg-[#3a1f29] text-[#1b1216] dark:text-[#f8ecee]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-4 overflow-y-auto flex-1 grid gap-4 content-start">
              <p className="text-sm font-semibold text-[#8a7a80] dark:text-[#a89ba1]">
                {setup.mode.description}
              </p>

              {setup.mode.id !== "srs" && setup.mode.id !== "bookmarks" && (
                <div>
                  <h3 className="text-[13px] font-extrabold mb-2 text-[#1b1216] dark:text-[#f8ecee]">Subject</h3>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Subject">
                    {["All subjects", ...subjectNames].map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={setup.subject === s}
                        onClick={() => setSetup({ ...setup, subject: s })}
                        className={`px-3.5 py-2 rounded-full text-[13px] font-bold transition-colors ${
                          setup.subject === s
                            ? "bg-[#8a1630] text-white"
                            : "bg-[#f4ecee] dark:bg-[#3a1f29] text-[#1b1216] dark:text-[#f8ecee]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-[13px] font-extrabold mb-2 text-[#1b1216] dark:text-[#f8ecee]">
                  How do you want feedback?
                </h3>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Feedback mode">
                  {(["study", "exam"] as const).map((fb) => (
                    <button
                      key={fb}
                      type="button"
                      aria-pressed={setup.feedback === fb}
                      onClick={() => setSetup({ ...setup, feedback: fb })}
                      className={`text-left p-3 rounded-2xl transition-shadow ${
                        setup.feedback === fb
                          ? "bg-[#fbeff0] dark:bg-[#351a22] shadow-[inset_0_0_0_2px_#8a1630]"
                          : "bg-[#f4ecee] dark:bg-[#3a1f29]"
                      }`}
                    >
                      <b className="block text-[13.5px] font-extrabold text-[#1b1216] dark:text-[#f8ecee]">
                        {fb === "study" ? "Study mode" : "Exam mode"}
                      </b>
                      <small className="block text-[12px] font-semibold text-[#8a7a80] dark:text-[#a89ba1] mt-0.5">
                        {fb === "study" ? "Explanation after each answer" : "Answers at the end"}
                      </small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <b className="block text-[14px] font-bold text-[#1b1216] dark:text-[#f8ecee]">Timer</b>
                  <small className="text-[12.5px] font-semibold text-[#8a7a80] dark:text-[#a89ba1]">
                    Track how long you take
                  </small>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={setup.timer}
                  aria-label="Timer"
                  onClick={() => setSetup({ ...setup, timer: !setup.timer })}
                  className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors ${
                    setup.timer ? "bg-[#8a1630] justify-end" : "bg-[#e5bcc6] dark:bg-[#3a1f29] justify-start"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              <p className="rounded-2xl bg-[#fbeff0] dark:bg-[#351a22] px-4 py-3 text-[13px] font-semibold text-[#5a4a50] dark:text-[#d6bcc3]">
                {setup.feedback === "study"
                  ? "Coach mode: the owl explains each answer as you go."
                  : "Exam hall: quiet, graded, and timed like the real thing."}
              </p>
            </div>

            <div className="px-6 py-4 border-t border-[#f3e6e9] dark:border-white/10 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
              <button
                type="button"
                onClick={() => {
                  const href = resolveHref(setup.mode, {
                    subject: setup.subject,
                    feedback: setup.feedback,
                    timer: setup.timer,
                  });
                  setSetup(null);
                  router.push(href);
                }}
                className="w-full py-3.5 rounded-2xl bg-[#8a1630] text-white text-[15px] font-extrabold shadow-[0_10px_24px_-10px_rgba(138,22,48,0.75)] hover:-translate-y-0.5 transition-transform"
              >
                Start {setup.mode.name}
              </button>
            </div>
          </div>
          </>,
          document.body
        )}
    </div>
  );
}
