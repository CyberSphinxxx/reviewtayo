"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  type EngineQuestion,
  type ScoringResult,
  type UserAnswerState,
} from "@/features/exam-engine";
import { LocalStorageService } from "@/lib/storage";
import {
  Award,
  CheckCircle2,
  RotateCcw,
  Bookmark,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Info,
  Printer,
  AlertCircle,
} from "lucide-react";
import { QuestionReportModal } from "@/features/practice/QuestionReportModal";
import { getExamRunnerRouteForMode } from "@/config/exams";
import { useSession } from "@/lib/auth/auth-client";

export interface AttemptData {
  id: string;
  title: string;
  /** Explicit exam identity (guide §22); absent on legacy attempts. */
  examLevelId?: string;
  mode: string;
  questions: EngineQuestion[];
  answers: UserAnswerState[];
  scoreResult: ScoringResult;
  completedAt: string;
}

interface ResultsViewProps {
  attemptData: AttemptData;
}

export function ResultsView({ attemptData }: ResultsViewProps) {
  const { title, mode, questions, answers, scoreResult } = attemptData;
  const { data: session } = useSession();

  // Retake route derives from the attempt's explicit exam identity (guide
  // §24) — never a hardcoded CSE path. Attempts recorded before identity was
  // tracked have no retake route; they get the neutral practice hub instead.
  const attemptLevelId = attemptData.examLevelId;
  const retakeHref = attemptLevelId
    ? getExamRunnerRouteForMode("cse", attemptLevelId, mode)
    : undefined;

  const [filter, setFilter] = useState<"all" | "incorrect" | "correct" | "flagged">("all");
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [reportingQuestion, setReportingQuestion] = useState<EngineQuestion | null>(null);

  // Load bookmarks via LocalStorageService
  useEffect(() => {
    const saved = LocalStorageService.getBookmarks();
    setBookmarkedIds(new Set(saved.map((b) => b.id)));
  }, []);

  const toggleBookmark = (q: EngineQuestion) => {
    const isNowBookmarked = LocalStorageService.toggleBookmark(q);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isNowBookmarked) {
        next.add(q.id);
      } else {
        next.delete(q.id);
      }
      return next;
    });
  };

  const toggleExpand = (qId: string) => {
    setExpandedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  const answersMap = new Map<string, UserAnswerState>();
  for (const a of answers) {
    answersMap.set(a.questionId, a);
  }

  const filteredQuestions = questions.filter((q) => {
    const userAns = answersMap.get(q.id);
    const correctChoice = q.choices.find((c) => c.isCorrect);
    const isCorrect = userAns?.selectedChoiceId && userAns.selectedChoiceId === correctChoice?.id;
    const isFlagged = userAns?.isFlagged;

    if (filter === "correct") return isCorrect;
    if (filter === "incorrect") return !isCorrect;
    if (filter === "flagged") return isFlagged;
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 animate-page-enter">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb / Header */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            href="/"
            prefetch={true}
            className="text-sm font-semibold text-brand-700 hover:text-brand-800 flex items-center gap-1"
          >
            &larr; Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition"
              id="print-scorecard-btn"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print Scorecard (PDF)</span>
            </button>
            <span className="text-xs text-slate-400">Attempt ID: {attemptData.id}</span>
          </div>
        </div>

        {/* Print-Only Official Diagnostic Header */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-4">
          <div className="text-xl font-black text-slate-900">PHILIPPINE CIVIL SERVICE EXAM REVIEWER</div>
          <div className="text-sm font-bold text-slate-700">Diagnostic Performance Scorecard & Competency Report</div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span>Exam: {title} ({mode.toUpperCase()})</span>
            <span>Date Completed: {new Date(attemptData.completedAt).toLocaleDateString("en-PH", { dateStyle: "long" })}</span>
          </div>
        </div>

        {/* Hero Score Banner */}
        <div
          className={`rounded-3xl p-6 sm:p-10 border shadow-lg relative overflow-hidden transition-all ${
            scoreResult.isPassed
              ? "bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white border-emerald-700 shadow-emerald-900/20"
              : "bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 text-white border-slate-800 shadow-slate-950/30"
          }`}
        >
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm mb-3">
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span>{title} &bull; {mode} mode</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                {scoreResult.isPassed ? "Congratulations! Benchmark Achieved!" : "Diagnostic Score Summary"}
              </h1>

              <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-xl">
                {scoreResult.isPassed
                  ? `Your estimated score of ${scoreResult.percentageScore}% meets or exceeds the estimated 80.00% benchmark based on percentage of items correct.`
                  : `Your estimated score is ${scoreResult.percentageScore}% based on percentage of items correct. The benchmark target is 80.00%. Practice your weak areas below to close the gap.`}
              </p>
            </div>

            {/* Big Circular / Rounded Score Badge */}
            <div className="flex-shrink-0 flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
              <div className="text-center">
                <span className="text-[11px] uppercase tracking-wider font-bold text-gold-300 block mb-1">
                  Estimated Score
                </span>
                <span className="block text-4xl sm:text-5xl font-black text-gold-400">
                  {scoreResult.percentageScore}%
                </span>
                <span className="text-xs uppercase tracking-wider font-bold text-slate-300">
                  {scoreResult.correctCount} / {scoreResult.totalQuestions} Correct
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CSC Rating Formula Transparency Notice (Product Plan Addendum §50) */}
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-5 text-xs sm:text-sm text-slate-700 shadow-sm space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>Score Interpretation & Official CSC Rating Notice</span>
          </div>
          <p>
            <strong>Estimate based on percentage correct:</strong> This score represents an estimate calculated from the percentage of items answered correctly ({scoreResult.percentageScore}%) against the standard 80.00% passing threshold.
          </p>
          <p className="text-slate-600 text-xs leading-relaxed">
            <strong>CSC Proprietary Rating Formula:</strong> The Philippine Civil Service Commission (CSC) utilizes a proprietary general rating formula across subtests with calibrated statistical weighting that is not publicly disclosed. Diagnostic scores on this reviewer are designed to evaluate topic mastery and guide preparation, and do not replicate or guarantee an official CSC Certificate of Eligibility rating.
          </p>
        </div>

        {/* Guest Progress Save Nudge (Non-blocking) */}
        {!session?.user && (
          <div className="rounded-2xl border border-brand-200 dark:border-brand-800 bg-brand-50/70 dark:bg-brand-950/40 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-brand-800 dark:text-brand-300 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                <span>Save your progress and track improvement</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Create a free account or sign in to sync your diagnostic scores, review mistakes across devices, and unlock streak tracking.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/create-account"
                prefetch={true}
                className="inline-flex min-h-10 items-center justify-center px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs sm:text-sm shadow-2xs transition"
              >
                Create free account
              </Link>
              <Link
                href="/sign-in"
                prefetch={true}
                className="inline-flex min-h-10 items-center justify-center px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}

        {/* Performance Breakdown by Subject */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-brand-600" />
            <span>Subtest Performance Breakdown</span>
          </h2>

          <div className="space-y-5">
            {scoreResult.subjectBreakdown.map((subj) => (
              <div key={subj.subjectId} className="space-y-1.5">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-800">{subj.subjectName}</span>
                  <span
                    className={`font-mono font-bold ${
                      subj.percentage >= 80
                        ? "text-emerald-600"
                        : subj.percentage >= 60
                        ? "text-amber-600"
                        : "text-rose-600"
                    }`}
                  >
                    {subj.correct} / {subj.total} ({subj.percentage}%)
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      subj.percentage >= 80
                        ? "bg-emerald-500"
                        : subj.percentage >= 60
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, subj.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths & Weak Areas Diagnosis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <h3 className="font-bold text-emerald-950 flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Demonstrated Strengths</span>
            </h3>
            {scoreResult.strengths.length > 0 ? (
              <ul className="text-xs sm:text-sm text-emerald-900 space-y-1 mt-2">
                {scoreResult.strengths.map((st, i) => (
                  <li key={i}>&bull; {st}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-emerald-800 mt-2">
                Continue balanced drills across all subtests to establish mastery.
              </p>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200">
            <h3 className="font-bold text-amber-950 flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <span>Priority Improvement Areas</span>
            </h3>
            {scoreResult.weakAreas.length > 0 ? (
              <ul className="text-xs sm:text-sm text-amber-900 space-y-1 mt-2">
                {scoreResult.weakAreas.map((w, i) => (
                  <li key={i}>&bull; {w}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-amber-800 mt-2">
                Outstanding consistency! All subjects meet or exceed passing threshold.
              </p>
            )}
          </div>
        </div>

        {/* What Should I Study Next? Recommendation */}
        {scoreResult.recommendedTopics.length > 0 && (
          <div className="bg-gradient-to-r from-brand-50 to-brand-100/40 rounded-2xl border border-brand-200 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-brand-950 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-700" />
              <span>What Should I Study Next?</span>
            </h2>
            <p className="text-xs sm:text-sm text-brand-800 mt-1">
              Personalized practice recommendations based on your performance:
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {scoreResult.recommendedTopics.map((rec) => (
                <div
                  key={rec.topicId}
                  className="p-4 rounded-xl bg-white border border-brand-100 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{rec.topicName}</h4>
                    <p className="text-xs text-slate-500 mt-1">{rec.reason}</p>
                  </div>
                  <Link
                    href={`/practice/${rec.topicId}`}
                    prefetch={true}
                    className="mt-4 inline-flex items-center text-xs font-bold text-brand-700 hover:text-brand-800"
                  >
                    <span>Practice Topic</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-between items-center pt-2 print:hidden">
          <div className="flex flex-wrap gap-3">
            <Link
              href={retakeHref ?? "/practice"}
              prefetch={true}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm shadow transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{retakeHref ? `Retake ${title}` : "Back to practice"}</span>
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-50 text-sm shadow-sm transition"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Diagnostic Scorecard</span>
            </button>
            <Link
              href="/dashboard"
              prefetch={true}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 text-sm shadow-sm transition"
            >
              View Dashboard
            </Link>
          </div>
        </div>

        {/* Question by Question Detailed Answer Review */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Detailed Answer Review</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review educational explanations and rationale for each question.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({questions.length})
              </button>
              <button
                onClick={() => setFilter("incorrect")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filter === "incorrect" ? "bg-white text-rose-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Incorrect ({scoreResult.incorrectCount})
              </button>
              <button
                onClick={() => setFilter("correct")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filter === "correct" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Correct ({scoreResult.correctCount})
              </button>
              <button
                onClick={() => setFilter("flagged")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filter === "flagged" ? "bg-white text-amber-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Flagged
              </button>
            </div>
          </div>

          {/* List of Questions with Explanations */}
          <div className="mt-6 space-y-6">
            {filteredQuestions.map((q, idx) => {
              const userAns = answersMap.get(q.id);
              const correctChoice = q.choices.find((c) => c.isCorrect);
              const isCorrect = userAns?.selectedChoiceId && userAns.selectedChoiceId === correctChoice?.id;
              const isExpanded = expandedQuestionIds.has(q.id);
              const isBookmarked = bookmarkedIds.has(q.id);

              return (
                <div
                  key={q.id}
                  className={`rounded-xl border p-5 transition-all ${
                    isCorrect ? "border-emerald-200 bg-emerald-50/20" : "border-rose-200 bg-rose-50/20"
                  }`}
                >
                  {/* Question Summary Bar */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          isCorrect ? "bg-emerald-600" : "bg-rose-600"
                        }`}
                      >
                        {isCorrect ? "✓" : "✗"}
                      </span>
                      <span className="font-bold text-sm text-slate-800">Question {idx + 1}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {q.subjectName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                      {/* Report Question Button */}
                      <button
                        type="button"
                        onClick={() => setReportingQuestion(q)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-amber-600 transition"
                        title="Report an error or issue with this question"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>

                      {/* Bookmark Button */}
                      <button
                        onClick={() => toggleBookmark(q)}
                        className={`p-1.5 rounded-lg border transition ${
                          isBookmarked
                            ? "bg-brand-50 border-brand-300 text-brand-700"
                            : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                        }`}
                        title="Bookmark Question"
                      >
                        <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-brand-700" : ""}`} />
                      </button>

                      {/* Expand/Collapse Button */}
                      <button
                        onClick={() => toggleExpand(q.id)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="mt-3 text-sm sm:text-base font-medium text-slate-900 whitespace-pre-line">
                    {q.questionText}
                  </div>

                  {/* Choices Display */}
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    {q.choices.map((c) => {
                      const isUserSelected = userAns?.selectedChoiceId === c.id;
                      const isThisCorrect = c.isCorrect;

                      return (
                        <div
                          key={c.id}
                          className={`p-3 rounded-lg border text-sm flex items-start gap-3 ${
                            isThisCorrect
                              ? "bg-emerald-100/60 border-emerald-300 text-emerald-950 font-semibold"
                              : isUserSelected
                              ? "bg-rose-100/60 border-rose-300 text-rose-950 font-semibold"
                              : "bg-white border-slate-200 text-slate-700"
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              isThisCorrect
                                ? "bg-emerald-700 text-white"
                                : isUserSelected
                                ? "bg-rose-700 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {c.choiceLabel}
                          </span>
                          <span className="flex-1 pt-0.5">{c.text}</span>
                          {isThisCorrect && (
                            <span className="text-xs font-bold text-emerald-700 self-center">
                              Correct Answer
                            </span>
                          )}
                          {isUserSelected && !isThisCorrect && (
                            <span className="text-xs font-bold text-rose-700 self-center">
                              Your Answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Concept Explanation Box */}
                  <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-700 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Educational Concept & Rationale</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Print Footer Disclaimer (CSC Rule Addendum §50) */}
        <div className="hidden print:block pt-6 border-t border-slate-300 text-[10px] text-slate-500 leading-relaxed space-y-1">
          <p className="font-bold text-slate-700">Official Civil Service Commission (CSC) Advisory Disclaimer:</p>
          <p>
            This diagnostic scorecard is provided as an independent preparation and diagnostic study aid by ReviewTayo (reviewtayo.online) and does not constitute an official Civil Service rating released by the Civil Service Commission. In actual Civil Service Examination (CSE-PPT) administrations, final ratings are calculated through CSC statistical item-response equating.
          </p>
        </div>

        {/* Report Question Modal */}
        {reportingQuestion && (
          <QuestionReportModal
            isOpen={Boolean(reportingQuestion)}
            onClose={() => setReportingQuestion(null)}
            questionId={reportingQuestion.id}
            questionText={reportingQuestion.questionText}
          />
        )}
      </div>
    </div>
  );
}
