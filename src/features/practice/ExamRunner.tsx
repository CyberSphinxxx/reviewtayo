"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  type EngineQuestion,
  type ExamRuleConfig,
  type ExamSessionState,
  createExamSession,
  selectChoice,
  toggleFlag,
  navigateNext,
  navigatePrev,
  jumpToQuestion,
  stepTimer,
  getExamSessionSummary,
  formatTimeRemaining,
  calculateScore,
} from "@/features/exam-engine";
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  LayoutGrid,
  X,
  Edit3,
  EyeOff,
  Eye,
  Check,
  Sliders,
} from "lucide-react";

import {
  LocalStorageService,
  type ActiveExamSessionDraft,
  type StoredUserAnswer,
  type StoredAttemptDetails,
} from "@/lib/storage";
import { triggerHaptic } from "@/lib/haptics";
import { useExamKeyboardShortcuts } from "./hooks/useExamKeyboardShortcuts";
import { ExamScratchpad } from "./ExamScratchpad";
import { QuestionReportModal } from "./QuestionReportModal";
import { TestModeBar } from "./TestModeBar";
import { getExamTheme } from "@/features/practice/examTheme";
import { getCoachQuip, nextStreak } from "@/features/practice/coach";
import { CoachPanel } from "@/components/practice/CoachPanel";
import { resolveExamLevelIdForAttempt } from "@/lib/exam-context";

/**
 * Question Map page size. Large banks (300-500 items) are paginated instead of
 * rendered as one long scrollable grid.
 */
export const MAP_PAGE_SIZE = 50;

interface ExamRunnerProps {
  initialQuestions: EngineQuestion[];
  rules: ExamRuleConfig;
  title: string;
  subtitle?: string;
  /**
   * Explicit exam identity (Phase 0): callers that know the track/level
   * (e.g. /exams/[level]/* runner routes) must pass it here. When omitted,
   * identity is derived from the questions' subject ids — never from the
   * display title.
   */
  examLevelId?: string;
  trackId?: string;
  onComplete?: (attemptId: string) => void;
}

export function ExamRunner({
  initialQuestions,
  rules,
  title,
  subtitle,
  examLevelId,
  trackId,
}: ExamRunnerProps) {
  const router = useRouter();
  // Explicit identity only (guide §5/§6): the supplied trackId/level wins,
  // otherwise the questions' subject ids resolve their own exam level.
  // Bookmarks/mistake drills (mixed-topic pools) may resolve per-session.
  const resolvedTrackId =
    trackId ?? resolveExamLevelIdForAttempt(initialQuestions.map((q) => q.subjectId), examLevelId);
  const levelSlug = resolvedTrackId ?? "general";
  const trackNameLabel =
    resolvedTrackId === "subprofessional"
      ? "Subprofessional"
      : resolvedTrackId === "professional"
      ? "Professional"
      : undefined;
  const topicId =
    initialQuestions[0]?.topicId && rules.mode === "practice"
      ? initialQuestions[0].topicId
      : undefined;

  const [savedDraft, setSavedDraft] = useState<ActiveExamSessionDraft | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const startedAtRef = useRef<string>(new Date().toISOString());

  // Initialize session state
  const [session, setSession] = useState<ExamSessionState>(() =>
    createExamSession(initialQuestions, rules.timeLimitMinutes, rules.allowsFlagging)
  );

  // Testing UX & Accessibility States
  const [eliminatedChoices, setEliminatedChoices] = useState<Record<string, string[]>>({});
  const [practiceFeedbackMode] = useState<"instant" | "simulated">("instant");
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchpadNotes, setScratchpadNotes] = useState("");
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xl">("normal");
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDisplayMenu, setShowDisplayMenu] = useState(false);
  const displayMenuRef = useRef<HTMLDivElement>(null);

  // Check for existing active draft on mount
  useEffect(() => {
    const draft = LocalStorageService.getActiveDraft(levelSlug, rules.mode, topicId);
    if (
      draft &&
      draft.questions.length === initialQuestions.length &&
      Object.keys(draft.answers).length > 0
    ) {
      setSavedDraft(draft);
      setShowResumeBanner(true);
    }
  }, [levelSlug, rules.mode, topicId, initialQuestions.length]);

  // Click outside to dismiss Display menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (displayMenuRef.current && !displayMenuRef.current.contains(event.target as Node)) {
        setShowDisplayMenu(false);
      }
    }
    if (showDisplayMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDisplayMenu]);

  const handleResumeDraft = () => {
    if (!savedDraft) return;
    const restoredAnswers = new Map();
    for (const [qId, a] of Object.entries(savedDraft.answers)) {
      restoredAnswers.set(qId, {
        questionId: a.questionId,
        selectedChoiceId: a.selectedChoiceId,
        isFlagged: Boolean(a.isFlagged),
        timeSpentSeconds: a.timeSpentSeconds || 0,
      });
    }
    setSession({
      totalQuestions: savedDraft.questions.length,
      currentIndex: Math.min(savedDraft.currentQuestionIndex, savedDraft.questions.length - 1),
      answers: restoredAnswers,
      timer: {
        totalSeconds: savedDraft.rules.timeLimitMinutes * 60,
        remainingSeconds: savedDraft.remainingSeconds,
        isExpired: savedDraft.remainingSeconds <= 0,
        isWarning: savedDraft.remainingSeconds <= 300,
      },
      isReviewing: false,
      isSubmitted: false,
      allowsFlagging: savedDraft.rules.allowsFlagging,
    });
    startedAtRef.current = savedDraft.startedAt;
    setShowResumeBanner(false);
  };

  const handleDiscardDraft = () => {
    LocalStorageService.clearActiveDraft(levelSlug, rules.mode, topicId);
    setShowResumeBanner(false);
    setSavedDraft(null);
  };

  // Allow testExpirySeconds query param for automated e2e testing of timeout auto-submit
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const testExpiry = params.get("testExpirySeconds");
      if (testExpiry) {
        const secs = parseInt(testExpiry, 10);
        if (!isNaN(secs) && secs > 0) {
          setSession((prev) => ({
            ...prev,
            timer: {
              totalSeconds: secs,
              remainingSeconds: secs,
              isExpired: false,
              isWarning: false,
            },
          }));
        }
      }
    }
  }, []);

  const [showNavigator, setShowNavigator] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  // Signature of the last autosaved draft state; used to suppress writes that
  // would only capture timer movement.
  const lastSavedSigRef = useRef<string>("");
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const currentQuestion = initialQuestions[session.currentIndex] || initialQuestions[0];
  const currentAnswer = session.answers.get(currentQuestion?.id);
  const summary = getExamSessionSummary(session);

  // Question Map pagination: keep the map usable on 300-500 item banks.
  const mapPageCount = Math.max(1, Math.ceil(session.totalQuestions / MAP_PAGE_SIZE));
  const [mapPage, setMapPage] = useState(0);
  // Always follow the active question so jumps from Next/Prev land on the right page.
  useEffect(() => {
    setMapPage(Math.floor(session.currentIndex / MAP_PAGE_SIZE));
  }, [session.currentIndex]);
  const pageQuestions = useMemo(
    () =>
      initialQuestions
        .slice(mapPage * MAP_PAGE_SIZE, mapPage * MAP_PAGE_SIZE + MAP_PAGE_SIZE)
        .map((q, i) => ({ q, __idx: mapPage * MAP_PAGE_SIZE + i })),
    [initialQuestions, mapPage]
  );

  // Auto-save active draft to LocalStorageService
  useEffect(() => {
    if (isSubmittingRef.current || session.timer.isExpired) return;

    // Recovery gate: while a saved draft's fate (Resume/Discard) is still
    // unresolved, autosave must not run — otherwise the incoming session
    // overwrites the draft the banner is offering to restore.
    if (showResumeBanner) return;

    // Only auto-save if at least one question has been answered
    if (session.answers.size === 0) return;

    // Skip timer-only renders: the timer mutates `session` every second, but
    // only answers, flags and navigation are worth persisting (~190 KB of
    // serialized draft per write otherwise). A tick changes only
    // remainingSeconds, which this signature deliberately ignores.
    const sig = `${session.answers.size}|${session.currentIndex}|${
      Array.from(session.answers.values()).filter((a) => a.isFlagged).length
    }`;
    if (sig === lastSavedSigRef.current) return;
    lastSavedSigRef.current = sig;

    const answersObj: Record<string, StoredUserAnswer> = {};
    const flaggedIds: string[] = [];

    session.answers.forEach((ans, qId) => {
      answersObj[qId] = {
        questionId: ans.questionId,
        selectedChoiceId: ans.selectedChoiceId ?? undefined,
        isFlagged: Boolean(ans.isFlagged),
        timeSpentSeconds: ans.timeSpentSeconds || 0,
      };
      if (ans.isFlagged) {
        flaggedIds.push(qId);
      }
    });

    LocalStorageService.saveActiveDraft({
      id: `draft-${levelSlug}-${rules.mode}${topicId ? `-${topicId}` : ""}`,
      levelSlug,
      mode: rules.mode,
      title,
      rules,
      questions: initialQuestions,
      answers: answersObj,
      flaggedQuestionIds: flaggedIds,
      currentQuestionIndex: session.currentIndex,
      remainingSeconds: session.timer.remainingSeconds,
      startedAt: startedAtRef.current,
      lastSavedAt: new Date().toISOString(),
    });
  }, [session, showResumeBanner, levelSlug, rules, topicId, title, initialQuestions]);


  const handleSaveAndExit = () => {
    if (session.answers.size > 0) {
      const answersObj: Record<string, StoredUserAnswer> = {};
      const flaggedIds: string[] = [];

      session.answers.forEach((ans, qId) => {
        answersObj[qId] = {
          questionId: ans.questionId,
          selectedChoiceId: ans.selectedChoiceId ?? undefined,
          isFlagged: Boolean(ans.isFlagged),
          timeSpentSeconds: ans.timeSpentSeconds || 0,
        };
        if (ans.isFlagged) {
          flaggedIds.push(qId);
        }
      });

      LocalStorageService.saveActiveDraft({
        id: `draft-${levelSlug}-${rules.mode}${topicId ? `-${topicId}` : ""}`,
        levelSlug,
        mode: rules.mode,
        title,
        rules,
        questions: initialQuestions,
        answers: answersObj,
        flaggedQuestionIds: flaggedIds,
        currentQuestionIndex: session.currentIndex,
        remainingSeconds: session.timer.remainingSeconds,
        startedAt: startedAtRef.current,
        lastSavedAt: new Date().toISOString(),
      });
    } else {
      // If 0 answers were submitted, ensure no empty draft lingers
      LocalStorageService.clearActiveDraft(levelSlug, rules.mode, topicId);
    }
    setShowExitModal(false);
    router.push("/practice");
  };

  const handleDiscardAndExit = () => {
    LocalStorageService.clearActiveDraft(levelSlug, rules.mode, topicId);
    setShowExitModal(false);
    router.push(rules.mode === "quick" ? "/" : "/practice");
  };

  // Submit test and persist results
  const handleSubmit = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    triggerHaptic(20);

    const activeSession = sessionRef.current;
    const timeSpentTotal = activeSession.timer.totalSeconds - activeSession.timer.remainingSeconds;

    const engineAnswersList = initialQuestions.map((q) => {
      const ans = activeSession.answers.get(q.id);
      return {
        questionId: q.id,
        selectedChoiceId: ans?.selectedChoiceId || null,
        isFlagged: ans?.isFlagged || false,
        timeSpentSeconds: ans?.timeSpentSeconds || 0,
      };
    });

    const userAnswersList: StoredUserAnswer[] = initialQuestions.map((q) => {
      const ans = activeSession.answers.get(q.id);
      return {
        questionId: q.id,
        selectedChoiceId: ans?.selectedChoiceId || undefined,
        isFlagged: ans?.isFlagged || false,
        timeSpentSeconds: ans?.timeSpentSeconds || 0,
      };
    });

    const scoreResult = calculateScore(
      initialQuestions,
      engineAnswersList,
      rules.passingScorePercentage,
      timeSpentTotal
    );

    const attemptId = `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const attemptData: StoredAttemptDetails = {
      id: attemptId,
      title,
      examLevelId: examLevelId ?? resolvedTrackId,
      mode: rules.mode,
      rules,
      questions: initialQuestions,
      answers: userAnswersList,
      scoreResult,
      completedAt: new Date().toISOString(),
    };

    try {
      LocalStorageService.recordCompletedAttempt(attemptData);
      LocalStorageService.clearActiveDraft(levelSlug, rules.mode, topicId);
    } catch {
      // Graceful localstorage failure handling
    }

    router.push(`/results/${attemptId}`);
  }, [initialQuestions, levelSlug, rules, title, topicId, examLevelId, resolvedTrackId, router]);

  // Continuous Single Timer step
  useEffect(() => {
    if (session.timer.isExpired) return;

    let lastTick = performance.now();
    const timerInterval = setInterval(() => {
      const now = performance.now();
      const elapsedSeconds = Math.floor((now - lastTick) / 1000);

      if (elapsedSeconds >= 1) {
        lastTick = now;
        setSession((prev) => {
          if (prev.timer.isExpired) return prev;
          return stepTimer(prev, elapsedSeconds);
        });
      }
    }, 1000);

    const handleVisibilityChange = () => {
      if (!document.hidden && !sessionRef.current.timer.isExpired) {
        const now = performance.now();
        const elapsed = Math.floor((now - lastTick) / 1000);
        if (elapsed >= 1) {
          lastTick = now;
          setSession((prev) => stepTimer(prev, elapsed));
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timerInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session.timer.isExpired]);

  // Auto-submit on timer expiry
  useEffect(() => {
    if (session.timer.isExpired && !isSubmittingRef.current) {
      handleSubmit();
    }
  }, [session.timer.isExpired, handleSubmit]);

  // Choice elimination toggle handler
  const handleToggleEliminate = (choiceId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    triggerHaptic(15);
    const qId = currentQuestion.id;
    setEliminatedChoices((prev) => {
      const currentList = prev[qId] || [];
      const isAlreadyEliminated = currentList.includes(choiceId);
      const updatedList = isAlreadyEliminated
        ? currentList.filter((id) => id !== choiceId)
        : [...currentList, choiceId];

      if (!isAlreadyEliminated && currentAnswer?.selectedChoiceId === choiceId) {
        setSession((prevSession) => selectChoice(prevSession, qId, ""));
      }

      return {
        ...prev,
        [qId]: updatedList,
      };
    });
  };

  // Keyboard Shortcuts Hook integration
  useExamKeyboardShortcuts({
    onSelectChoice: (index) => {
      if (!currentQuestion?.choices[index]) return;
      const targetChoice = currentQuestion.choices[index];
      const isElim = (eliminatedChoices[currentQuestion.id] || []).includes(targetChoice.id);
      if (isElim) return;

      triggerHaptic(12);
      setSession((prev) => selectChoice(prev, currentQuestion.id, targetChoice.id));
      applyCoachReaction(targetChoice.id);
    },
    onNext: () => {
      triggerHaptic(10);
      if (session.currentIndex === session.totalQuestions - 1) {
        if (usesReviewConfirmation) {
          setShowReviewModal(true);
        } else {
          handleSubmit();
        }
      } else {
        setSession((prev) => navigateNext(prev));
      }
    },
    onPrev: () => {
      triggerHaptic(10);
      setSession((prev) => navigatePrev(prev));
    },
    onToggleFlag: () => {
      if (rules.allowsFlagging) {
        triggerHaptic(12);
        setSession((prev) => toggleFlag(prev, currentQuestion.id));
      }
    },
    onToggleNavigator: () => {
      setShowNavigator((prev) => !prev);
    },
    onToggleScratchpad: () => {
      setShowScratchpad((prev) => !prev);
    },
    onCloseModal: () => {
      setShowNavigator(false);
      setShowReviewModal(false);
      setShowScratchpad(false);
      setShowExitModal(false);
      setShowDisplayMenu(false);
    },
    isModalOpen:
      showNavigator ||
      showReviewModal ||
      showScratchpad ||
      showExitModal ||
      showDisplayMenu,
  });

  const questionFontSizeClass = {
    normal: "text-lg sm:text-xl",
    large: "text-xl sm:text-2xl",
    xl: "text-2xl sm:text-3xl",
  }[fontSize];

  const choiceFontSizeClass = {
    normal: "text-base",
    large: "text-lg",
    xl: "text-xl",
  }[fontSize];

  const isMathOrAnalytical =
    currentQuestion?.subjectSlug === "numerical-ability" ||
    currentQuestion?.subjectSlug === "analytical-ability" ||
    currentQuestion?.subjectName?.toLowerCase().includes("numerical") ||
    currentQuestion?.subjectName?.toLowerCase().includes("analytical");

  // Owl Coach vs Exam Hall — presentation chrome derived from rules.mode (view-layer only).
  const theme = getExamTheme(rules.mode);
  const isCoach = theme === "exam-coach";

  // Whether the Review Before Submission confirmation should appear.
  // Practice-style coach sessions already revealed every answer with its
  // explanation, so the confirmation only adds friction there; timed
  // assessments (quick, medium, full) keep the final check.
  const usesReviewConfirmation = !isCoach || rules.mode === "quick";

  // Coach reactions: mood, streak and the latest bubble copy.
  const [coachStreak, setCoachStreak] = useState(0);
  const [coachMood, setCoachMood] = useState<"idle" | "happy" | "oops">("idle");
  const [coachFeedback, setCoachFeedback] = useState<{ title: string; body: string } | null>(null);
  const [coachCorrectCount, setCoachCorrectCount] = useState(0);

  // Stable quip seed per question so the idle line does not flicker between renders.
  const coachSeed = useMemo(() => {
    let h = 0;
    const id = currentQuestion?.id ?? "";
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return h;
  }, [currentQuestion?.id]);

  // After answering in practice mode, the owl itself delivers the verdict and
  // the full explanation in its bubble — no separate rationale card below.
  const coachBubble = coachFeedback
    ? coachFeedback
    : currentAnswer?.selectedChoiceId
      ? {
          title: "Ulitin mo \u2019yan kapag nag-review.",
          body: currentQuestion?.explanation ?? "",
        }
      : {
          title: `Question ${session.currentIndex + 1}:`,
          body: `${getCoachQuip("idle", coachSeed)} Answered ${summary.answered}/${session.totalQuestions} - Correct ${coachCorrectCount}.`,
        };

  const [coachLastCorrect, setCoachLastCorrect] = useState<boolean | undefined>(undefined);

  // Confetti burst on correct answers (coach theme only, motion-safe).
  const confettiAnchorRef = useRef<HTMLDivElement>(null);
  const fireConfetti = useCallback(() => {
    if (reduceMotion) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    const anchor = confettiAnchorRef.current;
    if (!anchor) return;
    const colors = ["#8a1630", "#f6b93b", "#12a150", "#a81b3b"];
    for (let i = 0; i < 16; i++) {
      const particle = document.createElement("span");
      particle.className = "conf-particle";
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 110;
      particle.style.background = colors[i % colors.length];
      particle.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      particle.style.setProperty("--dy", `${Math.sin(angle) * dist - 40}px`);
      particle.style.setProperty("--rot", `${Math.random() * 540 - 270}deg`);
      anchor.appendChild(particle);
      setTimeout(() => particle.remove(), 1000);
    }
  }, [reduceMotion]);

  // Coach reaction applied on every selection in practice-mode runners.
  const applyCoachReaction = useCallback(
    (choiceId: string) => {
      if (rules.mode !== "practice") return;
      const choice = currentQuestion?.choices.find((c) => c.id === choiceId);
      if (!choice) return;
      const isCorrect = Boolean(choice.isCorrect);
      setCoachStreak((prev) => nextStreak(prev, isCorrect));
      setCoachMood(isCorrect ? "happy" : "oops");
      setCoachLastCorrect(isCorrect);
      if (isCorrect) setCoachCorrectCount((prev) => prev + 1);
      setCoachFeedback({
        title: isCorrect ? getCoachQuip("correct", coachSeed) : getCoachQuip("wrong", coachSeed),
        body: currentQuestion.explanation,
      });
      if (isCorrect) fireConfetti();
    },
    [rules.mode, currentQuestion, coachSeed, fireConfetti]
  );

  // Reset the bubble when navigating; the owl calms down shortly after reacting.
  useEffect(() => {
    setCoachFeedback(null);
  }, [session.currentIndex]);

  useEffect(() => {
    if (!coachFeedback) return;
    const t = setTimeout(() => setCoachMood("idle"), 2200);
    return () => clearTimeout(t);
  }, [coachFeedback, session.currentIndex]);

  // Shared Question Map card: under the owl in coach mode (left rail),
  // standalone right aside in exam hall.
  const mapCard = (
    <div
      className={`bg-white rounded-3xl border border-brand-100 exam-card-shadow p-5 space-y-4 ${
        isCoach ? "" : "sticky top-20"
      }`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[#f6e9ec]">
        <h3 className="text-sm font-bold text-[#1b1216] flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-brand-600" />
          <span>Question Map</span>
        </h3>
        <button
          type="button"
          onClick={() => (usesReviewConfirmation ? setShowReviewModal(true) : handleSubmit())}
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2a0a12] hover:bg-brand-900 text-white text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-60"
        >
          <Send className="w-3.5 h-3.5 text-gold-400" />
          <span>{isSubmitting ? "Submitting..." : "Submit"}</span>
        </button>
      </div>

      {/* Compact Legend: ● Answered ○ Unanswered ◇ Flagged */}
      <div className="flex items-center justify-between text-[11px] font-medium text-[#6d5d63] pb-2 border-b border-[#f6e9ec]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-brand-700" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-white border border-[#d8c7cd]" />
          <span>Unanswered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rotate-45 border border-amber-500 bg-amber-200" />
          <span>Flagged</span>
        </div>
      </div>

      {/* Question Grid — paginated for large banks */}
      <div className="grid grid-cols-5 gap-1.5 p-1">
        {pageQuestions.map((entry) => {
          const idx = entry.__idx;
          const q = entry.q;
          const ans = session.answers.get(q.id);
          const isAnswered = Boolean(ans?.selectedChoiceId);
          const isFlagged = Boolean(ans?.isFlagged);
          const isCurrent = idx === session.currentIndex;

          let btnClasses = "bg-white border-[#e8d7db] text-[#3a2c32] hover:bg-[#faf3f4]";
          if (isAnswered) {
            btnClasses = "bg-brand-700 border-brand-700 text-white font-bold";
          }
          if (isFlagged) {
            btnClasses = "bg-gold-100 border-gold-400 text-amber-900 font-bold";
          }
          if (isCurrent) {
            btnClasses += " ring-2 ring-brand-700 ring-offset-1";
          }

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setSession((prev) => jumpToQuestion(prev, idx));
              }}
              className={`relative h-9 rounded-lg border text-xs font-semibold flex items-center justify-center transition ${btnClasses}`}
            >
              {idx + 1}
              {isFlagged && isAnswered && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 border border-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Pagination footer (only for multi-page maps) */}
      {mapPageCount > 1 && (
        <div
          className="flex items-center justify-center gap-2 pt-2 border-t border-[#f6e9ec]"
          data-testid="map-pagination"
        >
          <button
            type="button"
            onClick={() => setMapPage((p) => Math.max(0, p - 1))}
            disabled={mapPage === 0}
            aria-label="Previous map page"
            className="w-8 h-8 grid place-items-center rounded-lg border border-[#e8d7db] text-[#5a4a50] hover:bg-[#faf3f4] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-[#6d5d63] px-1 tabular-nums">
            {mapPage + 1} / {mapPageCount}
          </span>
          <button
            type="button"
            onClick={() => setMapPage((p) => Math.min(mapPageCount - 1, p + 1))}
            disabled={mapPage >= mapPageCount - 1}
            aria-label="Next map page"
            className="w-8 h-8 grid place-items-center rounded-lg border border-[#e8d7db] text-[#5a4a50] hover:bg-[#faf3f4] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`min-h-screen flex flex-col justify-between ${
        highContrast ? "bg-[#efe6e8]" : isCoach ? "exam-coach-bg" : "exam-hall-bg"
      } ${reduceMotion ? "[&_*]:!transition-none [&_*]:!animation-none" : ""}`}
    >
      {/* Top Focused Minimal Test Mode Header */}
      <TestModeBar
        examName={title}
        levelName={trackNameLabel}
        currentIndex={session.currentIndex}
        totalQuestions={session.totalQuestions}
        remainingSeconds={session.timer.remainingSeconds}
        isWarning={session.timer.isWarning}
        hasAnswers={summary.answered > 0}
        theme={theme}
        onExit={() => {
          if (summary.answered > 0) {
            handleSaveAndExit();
          } else {
            handleDiscardAndExit();
          }
        }}
      />

      {/* Resume Session Banner */}
      {showResumeBanner && savedDraft && (
        <div className="bg-gold-100 border-b border-gold-300 px-4 py-3 text-amber-950 shadow-inner">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Unfinished Session Found:</strong> You have an in-progress test with{" "}
                <span className="font-semibold text-amber-950">
                  {Object.keys(savedDraft.answers).length} answered
                </span>{" "}
                and{" "}
                <span className="font-semibold text-amber-950">
                  {formatTimeRemaining(savedDraft.remainingSeconds)} remaining
                </span>
                .
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleResumeDraft}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition shadow-xs"
              >
                Resume Session
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-3 py-1.5 text-[#6d5d63] hover:text-[#1b1216] text-xs font-medium transition"
              >
                Discard &amp; Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Exam Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left rail (coach theme only) — owl on top, Question Map under it.
              Stacking them frees the whole right side for the question, which
              stretches wider, like the approved mockup. */}
          {isCoach && (
            <div className="lg:col-span-4 order-1 lg:order-1 space-y-6">
              <div className="hidden lg:block">
                <CoachPanel
                  mood={coachMood}
                  bubbleTitle={coachBubble.title}
                  bubbleBody={coachBubble.body}
                  streak={coachStreak}
                  lastCorrect={coachLastCorrect}
                  answeredCount={summary.answered}
                  correctCount={coachCorrectCount}
                  total={session.totalQuestions}
                />
              </div>
              <div className="lg:hidden">
                <CoachPanel
                  variant="compact"
                  mood={coachMood}
                  bubbleTitle={coachBubble.title}
                  bubbleBody={coachBubble.body}
                  streak={coachStreak}
                  lastCorrect={coachLastCorrect}
                  answeredCount={summary.answered}
                  correctCount={coachCorrectCount}
                  total={session.totalQuestions}
                />
              </div>
              {/* Map sits under the owl so the question owns the full right side */}
              <div className="hidden lg:block">{mapCard}</div>
            </div>
          )}

          {/* Dominant Question Column — 8 of 12 tracks in both themes */}
          <div className="lg:col-span-8 space-y-6 order-2 lg:order-2">
            {currentQuestion && (
              <div
                className={`relative rounded-3xl exam-card-shadow p-5 sm:p-7 md:p-8 transition-all ${
                  highContrast ? "bg-white border-2 border-slate-900" : "bg-white border border-brand-100"
                }`}
              >
                <div ref={confettiAnchorRef} className="conf-anchor" aria-hidden="true" />
                {/* Session subtitle (e.g. the honest "N of TARGET items" notice
                    for shortened full mocks) shown once above the first item. */}
                {session.currentIndex === 0 && subtitle && (
                  <p className="text-[13px] leading-relaxed text-[#5a4a50] dark:text-[#d6bcc3] mb-3">
                    {subtitle}
                  </p>
                )}
                {/* Question Subtest & Utility Bar — rows stack so narrow
                    columns never force the tools to wrap into a mess */}
                <div className="pb-4 border-b border-slate-100 space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 font-bold text-xs tracking-wide">
                      {currentQuestion.subjectName}
                    </span>
                    <span className="text-xs text-slate-400">&bull;</span>
                    <span className="text-xs text-slate-500 font-medium">{currentQuestion.topicName}</span>
                    {currentQuestion.language === "fil" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        FILIPINO
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className="hidden md:inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-[#8a7a80]">
                      Press <kbd className="px-1.5 py-0.5 bg-[#faf3f4] rounded text-[#5a4a50] border border-[#e8d7db] text-[10px] font-mono">A-E</kbd> to answer
                      <span className="text-[#d8c7cd]" aria-hidden="true">&bull;</span>
                      <kbd className="px-1.5 py-0.5 bg-[#faf3f4] rounded text-[#5a4a50] border border-[#e8d7db] text-[10px] font-mono">F</kbd> to flag
                    </span>

                    {rules.allowsFlagging && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(12);
                          setSession((prev) => toggleFlag(prev, currentQuestion.id));
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          currentAnswer?.isFlagged
                            ? "bg-gold-100 text-amber-900 border border-gold-300"
                            : "bg-[#faf3f4] text-[#5a4a50] hover:bg-[#f3e2e6] hover:text-brand-700"
                        }`}
                        id="flag-question-button"
                      >
                        <Flag className={`w-3.5 h-3.5 ${currentAnswer?.isFlagged ? "fill-amber-600 text-amber-600" : ""}`} />
                        <span>{currentAnswer?.isFlagged ? "Flagged" : "Flag"}</span>
                      </button>
                    )}

                    {/* Virtual Scratchpad for calculations */}
                    <button
                      type="button"
                      onClick={() => setShowScratchpad(true)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        isMathOrAnalytical
                          ? "bg-brand-50 text-brand-900 border border-brand-300"
                          : "bg-[#faf3f4] text-[#3a2c32] hover:bg-[#f3e2e6]"
                      }`}
                      title="Open Virtual Scratchpad (Press S)"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      <span>Scratchpad</span>
                    </button>

                    {/* Question Map / Palette Drawer Trigger */}
                    <button
                      type="button"
                      onClick={() => setShowNavigator(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#5a4a50] hover:text-brand-700 bg-[#faf3f4] hover:bg-[#f3e2e6] transition"
                      aria-label="Open Question Map / Palette"
                      title="Open Question Map / Palette"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-brand-600" />
                      <span className="hidden sm:inline">Map</span>
                    </button>

                    {/* Display Menu Trigger */}
                    <div className="relative" ref={displayMenuRef}>
                      <button
                        type="button"
                        onClick={() => setShowDisplayMenu((prev) => !prev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#5a4a50] hover:text-brand-700 bg-[#faf3f4] hover:bg-[#f3e2e6] transition"
                        aria-label="Display accessibility settings"
                        aria-expanded={showDisplayMenu}
                      >
                        <Sliders className="w-3.5 h-3.5 text-brand-600" />
                        <span className="hidden sm:inline">Display</span>
                      </button>

                      {showDisplayMenu && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 space-y-3 text-xs">
                          <div>
                            <span className="font-bold text-slate-800 block mb-1.5">Font Size</span>
                            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => setFontSize("normal")}
                                className={`py-1 rounded-lg font-semibold transition ${
                                  fontSize === "normal"
                                    ? "bg-white text-slate-900 shadow-xs"
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                Normal
                              </button>
                              <button
                                type="button"
                                onClick={() => setFontSize("large")}
                                className={`py-1 rounded-lg font-semibold transition ${
                                  fontSize === "large"
                                    ? "bg-white text-slate-900 shadow-xs"
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                Large
                              </button>
                              <button
                                type="button"
                                onClick={() => setFontSize("xl")}
                                className={`py-1 rounded-lg font-semibold transition ${
                                  fontSize === "xl"
                                    ? "bg-white text-slate-900 shadow-xs"
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                X-Large
                              </button>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-800 block">High Contrast</span>
                              <span className="text-[10px] text-slate-500">Sharper borders &amp; text</span>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={highContrast}
                              aria-label="Toggle high contrast"
                              onClick={() => setHighContrast((prev) => !prev)}
                              className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                                highContrast ? "bg-slate-900 justify-end" : "bg-slate-200 justify-start"
                              }`}
                            >
                              <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                            </button>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-800 block">Reduce Motion</span>
                              <span className="text-[10px] text-slate-500">Minimize animations</span>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={reduceMotion}
                              aria-label="Toggle reduce motion"
                              onClick={() => setReduceMotion((prev) => !prev)}
                              className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                                reduceMotion ? "bg-slate-900 justify-end" : "bg-slate-200 justify-start"
                              }`}
                            >
                              <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowReportModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#8a7a80] hover:text-brand-700 bg-[#faf3f4] hover:bg-[#f3e2e6] transition"
                      id="report-question-btn"
                      title="Report an error or issue with this question"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-[#8a7a80]" />
                      <span className="hidden sm:inline">Report</span>
                    </button>
                  </div>
                </div>

                {/* Progress Hierarchy */}
                <div className="mt-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <h2 className="text-xl sm:text-2xl font-display font-extrabold text-[#1b1216] tracking-[-0.03em]">
                      Question {session.currentIndex + 1} of {session.totalQuestions}
                    </h2>
                    <div className="text-xs font-medium text-[#6d5d63]">
                      Progress: <span className="font-semibold text-brand-700">{summary.answered} answered</span> &bull;{" "}
                      <span className="font-semibold text-brand-700">{summary.flagged} flagged</span> &bull;{" "}
                      <span className="font-semibold text-brand-700">{summary.unanswered} remaining</span>
                    </div>
                  </div>
                  {/* Inline Mini Progress Bar */}
                  <div className="w-full bg-[#f6e9ec] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-brand-700 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${summary.total > 0 ? Math.round((summary.answered / summary.total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Question Text */}
                <div
                  className={`mt-4 font-medium leading-relaxed whitespace-pre-line ${questionFontSizeClass} ${
                    highContrast ? "text-black font-semibold" : "text-[#1b1216]"
                  }`}
                >
                  {currentQuestion.questionText}
                </div>

                {/* Choices (Clean rows, hover-revealed eliminate button) */}
                <div className="mt-6 space-y-3">
                  {currentQuestion.choices.map((choice) => {
                    const isSelected = currentAnswer?.selectedChoiceId === choice.id;
                    const isEliminated = (eliminatedChoices[currentQuestion.id] || []).includes(choice.id);

                    // Practice Instant Feedback calculation
                    const isPracticeInstant =
                      rules.mode === "practice" &&
                      practiceFeedbackMode === "instant" &&
                      Boolean(currentAnswer?.selectedChoiceId);
                    const isCorrectChoice = choice.isCorrect;
                    const isSelectedAndWrong = isSelected && !isCorrectChoice;

                    let choiceCardClasses = "border-[#efe3e5] hover:border-brand-300 bg-white hover:bg-[#fdf7f8]";
                    let choiceBadgeClasses = "bg-[#fbeff0] text-brand-700 group-hover:bg-[#f3d9df]";

                    if (isPracticeInstant) {
                      if (isCorrectChoice) {
                        choiceCardClasses = "border-emerald-500 bg-emerald-50/70 shadow-xs";
                        choiceBadgeClasses = "bg-emerald-600 text-white";
                      } else if (isSelectedAndWrong) {
                        choiceCardClasses = "border-rose-400 bg-rose-50/70 shadow-xs";
                        choiceBadgeClasses = "bg-rose-600 text-white";
                      }
                    } else if (isSelected) {
                      choiceCardClasses = "border-brand-700 dark:border-brand-400 bg-highlight dark:bg-brand-950/40 ring-1 ring-brand-700 dark:ring-brand-400 shadow-xs";
                      choiceBadgeClasses = "bg-brand-700 dark:bg-brand-600 text-white";
                    }

                    if (isEliminated) {
                      choiceCardClasses = "border-dashed border-[#e8d7db] bg-[#faf6f7]/80 opacity-60";
                      choiceBadgeClasses = "bg-[#e8d7db] text-[#b9a6ac]";
                    }

                    if (highContrast && !isEliminated) {
                      choiceCardClasses += " border-2 border-slate-800 text-black";
                    }

                    return (
                      <div
                        key={choice.id}
                        data-testid={`choice-card-${choice.choiceLabel}`}
                        onContextMenu={(e) => handleToggleEliminate(choice.id, e)}
                        className={`group relative w-full text-left p-3.5 sm:p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${choiceCardClasses}`}
                      >
                        <button
                          type="button"
                          data-testid={`choice-option-${choice.choiceLabel}`}
                          disabled={isEliminated}
                          onClick={() => {
                            if (isEliminated) return;
                            triggerHaptic(12);
                            setSession((prev) => selectChoice(prev, currentQuestion.id, choice.id));
                            applyCoachReaction(choice.id);
                          }}
                          className="flex-1 flex items-start sm:items-center gap-3 sm:gap-4 text-left disabled:cursor-not-allowed"
                        >
                          <span
                            className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm transition-colors ${choiceBadgeClasses}`}
                          >
                            {choice.choiceLabel}
                          </span>
                          <span
                            className={`flex-1 ${choiceFontSizeClass} leading-snug ${
                              isEliminated
                                ? "line-through text-slate-400 italic"                                : highContrast
                                ? "text-black font-semibold"
                                : "text-[#2a1e24]"
                              }`}
                          >
                            {choice.text}
                          </span>
                          {isSelected && (
                            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-700 dark:bg-brand-600 text-white text-[11px] font-semibold">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Selected</span>
                            </span>
                          )}
                        </button>

                        {/* Strikethrough / Choice Eliminator Tool: Subtle on hover/focus, visible when eliminated */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleEliminate(choice.id, e)}
                          className={`p-1.5 rounded-lg border transition shrink-0 ${
                            isEliminated
                              ? "opacity-100 bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300"
                              : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 bg-white border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          }`}
                          title={isEliminated ? `Restore Option ${choice.choiceLabel}` : `Cross-out Option ${choice.choiceLabel}`}
                          aria-label={isEliminated ? `Restore Option ${choice.choiceLabel}` : `Cross-out Option ${choice.choiceLabel}`}
                        >
                          {isEliminated ? <Eye className="w-4 h-4 text-brand-700" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/*
                  Coach practice mode delivers the rationale through the owl's
                  speech bubble in the left rail instead of a card below the
                  question — the coach speaks, the column stays clean.
                */}

                {/* Bottom Navigation Controls */}
                <div className="mt-8 flex items-center justify-between gap-4 pt-4 border-t border-[#f6e9ec]">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setSession((prev) => navigatePrev(prev));
                    }}
                    disabled={session.currentIndex === 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-brand-200 bg-white font-semibold text-sm text-[#3a2c32] shadow-xs hover:bg-[#faf3f4] disabled:opacity-40 disabled:cursor-not-allowed transition"
                    id="prev-question-btn"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      if (session.currentIndex === session.totalQuestions - 1) {
                        if (usesReviewConfirmation) {
                          setShowReviewModal(true);
                        } else {
                          handleSubmit();
                        }
                      } else {
                        setSession((prev) => navigateNext(prev));
                      }
                    }}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm shadow-[0_10px_24px_-10px_rgba(138,22,48,0.75)] transition active:scale-95 disabled:opacity-60"
                    id="next-question-btn"
                  >
                    <span>
                      {session.currentIndex === session.totalQuestions - 1
                        ? usesReviewConfirmation
                          ? "Review & Submit"
                          : "Submit Test"
                        : "Next"}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Exam Hall: Question Map as its own right column */}
          {!isCoach && (
            <aside className="hidden lg:block lg:col-span-4 order-3">{mapCard}</aside>
          )}
        </div>
      </main>

      {/* Save & Exit Confirmation Modal */}
      {showExitModal && (        <div className="fixed inset-0 z-50 bg-[#2a0a12]/55 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-brand-100">
            <h3 className="text-lg font-bold text-[#1b1216] mb-2">Leave this test?</h3>

            <p className="text-sm text-[#5a4a50] mb-6">
              {summary.answered > 0
                ? "Your progress is saved and you can resume this test later."
                : "You have not answered any questions yet."}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2.5 rounded-xl border border-brand-200 font-semibold text-sm text-[#3a2c32] hover:bg-[#faf3f4] transition"
              >
                Keep Practicing
              </button>
              <button
                type="button"
                onClick={summary.answered > 0 ? handleSaveAndExit : handleDiscardAndExit}
                className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm shadow-sm transition"
              >
                {summary.answered > 0 ? "Save & Leave" : "Leave Test"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Virtual Scratchpad Component */}
      <ExamScratchpad
        isOpen={showScratchpad}
        onClose={() => setShowScratchpad(false)}
        notes={scratchpadNotes}
        onNotesChange={setScratchpadNotes}
      />

      {/* Question Map Modal / Drawer */}
      {showNavigator && (
        <div className="fixed inset-0 z-50 bg-[#2a0a12]/55 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#f6e9ec]">
                <h3 className="text-lg font-bold text-[#1b1216] flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-brand-700" />
                  <span>Question Map</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNavigator(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition"
                  aria-label="Close question map"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Legend */}
              <div className="flex items-center justify-between text-xs font-medium text-[#6d5d63] my-4 pb-2 border-b border-[#f6e9ec]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-brand-700" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-white border border-[#d8c7cd]" />
                  <span>Unanswered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rotate-45 border border-amber-500 bg-amber-200" />
                  <span>Flagged</span>
                </div>
              </div>

              {/* Question Number Grid — paginated for large banks */}
              <div className="grid grid-cols-5 gap-2 p-1">
                {pageQuestions.map((entry) => {
                  const idx = entry.__idx;
                  const q = entry.q;
                  const ans = session.answers.get(q.id);
                  const isAnswered = Boolean(ans?.selectedChoiceId);
                  const isFlagged = Boolean(ans?.isFlagged);
                  const isCurrent = idx === session.currentIndex;

                  let btnClasses = "bg-white border-[#e8d7db] text-[#3a2c32] hover:bg-[#faf3f4]";
                  if (isAnswered) {
                    btnClasses = "bg-brand-700 border-brand-700 text-white font-bold";
                  }
                  if (isFlagged) {
                    btnClasses = "bg-gold-100 border-gold-400 text-amber-900 font-bold";
                  }
                  if (isCurrent) {
                    btnClasses += " ring-2 ring-brand-700 ring-offset-2";
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(10);
                        setSession((prev) => jumpToQuestion(prev, idx));
                        setShowNavigator(false);
                      }}
                      className={`relative h-11 rounded-xl border text-sm font-semibold flex items-center justify-center transition ${btnClasses}`}
                    >
                      {idx + 1}
                      {isFlagged && isAnswered && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Pagination footer (only for multi-page maps) */}
              {mapPageCount > 1 && (
                <div
                  className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-[#f6e9ec]"
                  data-testid="drawer-map-pagination"
                >
                  <button
                    type="button"
                    onClick={() => setMapPage((p) => Math.max(0, p - 1))}
                    disabled={mapPage === 0}
                    aria-label="Previous map page"
                    className="h-10 px-3 inline-flex items-center gap-1 rounded-xl border border-[#e8d7db] text-xs font-semibold text-[#5a4a50] hover:bg-[#faf3f4] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev</span>
                  </button>
                  <span className="text-xs font-semibold text-[#6d5d63] px-1 tabular-nums">
                    {mapPage + 1} / {mapPageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMapPage((p) => Math.min(mapPageCount - 1, p + 1))}
                    disabled={mapPage >= mapPageCount - 1}
                    aria-label="Next map page"
                    className="h-10 px-3 inline-flex items-center gap-1 rounded-xl border border-[#e8d7db] text-xs font-semibold text-[#5a4a50] hover:bg-[#faf3f4] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-[#f6e9ec]">
              <button
                type="button"
                onClick={() => setShowNavigator(false)}
                className="w-full py-2.5 rounded-xl border border-brand-200 font-semibold text-sm text-[#3a2c32] hover:bg-[#faf3f4] transition"
              >
                Return to Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal Prior to Submission */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-[#2a0a12]/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-brand-100 animate-in fade-in duration-150">
            <h3 className="text-lg font-bold text-[#1b1216] mb-1.5">Review Before Submission</h3>
            <p className="text-xs text-[#8a7a80] mb-6">
              Ensure you have addressed all questions and flagged items before submitting your final answers.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3.5 rounded-xl bg-[#faf3f4] border border-brand-100 text-center">
                <div className="text-2xl font-display font-extrabold text-[#1b1216]">
                  {summary.answered} of {summary.total}
                </div>
                <div className="text-[11px] font-semibold text-[#8a7a80] uppercase tracking-wide">Answered</div>
              </div>
              <div
                className={`p-3.5 rounded-xl border text-center ${
                  summary.unanswered > 0 ? "bg-rose-50/70 border-rose-200" : "bg-[#faf3f4] border-brand-100"
                }`}
              >
                <div className={`text-2xl font-display font-extrabold ${summary.unanswered > 0 ? "text-rose-600" : "text-[#b9a6ac]"}`}>
                  {summary.unanswered}
                </div>
                <div className="text-[11px] font-semibold text-[#8a7a80] uppercase tracking-wide">Unanswered</div>
              </div>
              <div
                className={`p-3.5 rounded-xl border text-center ${
                  summary.flagged > 0 ? "bg-gold-100/70 border-gold-300" : "bg-[#faf3f4] border-brand-100"
                }`}
              >
                <div className={`text-2xl font-display font-extrabold ${summary.flagged > 0 ? "text-amber-600" : "text-[#b9a6ac]"}`}>
                  {summary.flagged}
                </div>
                <div className="text-[11px] font-semibold text-[#8a7a80] uppercase tracking-wide">Flagged</div>
              </div>
            </div>

            {summary.unanswered > 0 && (
              <div className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  You have <strong>{summary.unanswered} unanswered</strong> question(s). Unanswered questions are scored as incorrect.
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-brand-200 font-semibold text-[#3a2c32] hover:bg-[#faf3f4] text-sm transition"
              >
                Return to Questions
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 font-bold text-white text-sm shadow-md transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                id="confirm-submit-btn"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? "Calculating Results..." : "Submit Test"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Error / Typo Reporting Modal */}
      {currentQuestion && (
        <QuestionReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          questionId={currentQuestion.id}
          questionText={currentQuestion.questionText}
        />
      )}
    </div>
  );
}
