"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ExamRunner } from "@/features/practice/ExamRunner";
import { LocalStorageService, type StoredMistakeItem } from "@/lib/storage";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  AlertTriangle,
  ChevronLeft,
  Play,
  BookOpen,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Flame,
} from "lucide-react";

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<StoredMistakeItem[]>([]);
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceSubset, setPracticeSubset] = useState<StoredMistakeItem[]>([]);
  const [filter, setFilter] = useState<"all" | "due" | "box1_2" | "mastered">("all");

  const loadMistakes = () => {
    setMistakes(LocalStorageService.getMistakeBank());
  };

  useEffect(() => {
    loadMistakes();
  }, []);

  const stats = LocalStorageService.getMistakeStats();
  const now = Date.now();

  const isItemDue = (item: StoredMistakeItem) => {
    const box = item.box || 1;
    if (box >= 5) return false;
    if (!item.nextReviewDue) return true;
    return new Date(item.nextReviewDue).getTime() <= now;
  };

  const clearMistakes = () => {
    if (confirm("Are you sure you want to clear all questions from your Mistake Bank?")) {
      LocalStorageService.clearMistakeBank();
      setMistakes([]);
    }
  };

  const removeSingleMistake = (qId: string) => {
    LocalStorageService.removeMistake(qId);
    setMistakes((prev) => prev.filter((m) => m.id !== qId));
  };

  const handleMarkMastered = (qId: string) => {
    LocalStorageService.markMistakeMastered(qId);
    loadMistakes();
  };

  const startPractice = (itemsToPractice: StoredMistakeItem[]) => {
    setPracticeSubset(itemsToPractice);
    setIsPracticing(true);
  };

  if (isPracticing && practiceSubset.length > 0) {
    const practiceQuestions = practiceSubset.map((m) => m.question);
    return (
      <ExamRunner
        initialQuestions={practiceQuestions}
        rules={{
          mode: "mistakes",
          itemCount: practiceQuestions.length,
          timeLimitMinutes: Math.max(10, Math.ceil(practiceQuestions.length * 1.5)),
          passingScorePercentage: 80,
          allowsFlagging: true,
          hasContinuousTimer: true,
        }}
        title="Spaced Repetition Mistake Drill"
        subtitle={`Reviewing ${practiceQuestions.length} targeted items with Leitner progression`}
      />
    );
  }

  const filteredMistakes = mistakes.filter((item) => {
    const box = item.box || 1;
    if (filter === "due") return isItemDue(item);
    if (filter === "box1_2") return box <= 2;
    if (filter === "mastered") return box === 5;
    return true;
  });

  const dueItems = mistakes.filter(isItemDue);

  const getDueLabel = (item: StoredMistakeItem) => {
    const box = item.box || 1;
    if (box === 5) return { label: "Mastered", color: "bg-emerald-100 text-emerald-800" };
    if (!item.nextReviewDue) return { label: "Due Now", color: "bg-rose-100 text-rose-800" };

    const diffMs = new Date(item.nextReviewDue).getTime() - now;
    if (diffMs <= 0) {
      return { label: "Due Now", color: "bg-rose-100 text-rose-800" };
    }
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return {
      label: `Due in ${days}d`,
      color: "bg-slate-100 text-slate-700",
    };
  };

  const getBoxBadge = (boxNum?: number) => {
    const b = boxNum || 1;
    switch (b) {
      case 1:
        return { name: "Box 1: Daily", style: "bg-rose-50 border-rose-200 text-rose-700" };
      case 2:
        return { name: "Box 2: 3-Day", style: "bg-amber-50 border-amber-200 text-amber-700" };
      case 3:
        return { name: "Box 3: Weekly", style: "bg-blue-50 border-blue-200 text-blue-700" };
      case 4:
        return { name: "Box 4: 14-Day", style: "bg-indigo-50 border-indigo-200 text-indigo-700" };
      case 5:
        return { name: "Box 5: Mastered", style: "bg-emerald-50 border-emerald-200 text-emerald-700" };
      default:
        return { name: "Box 1: Daily", style: "bg-rose-50 border-rose-200 text-rose-700" };
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 animate-page-enter">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              prefetch={true}
              className="text-sm font-semibold text-brand-700 hover:text-brand-800 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
          </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-sm">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <span>Mistake Bank</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 font-bold">
                    Leitner SRS
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Targeted spaced-repetition drills to convert identified weaknesses into permanent mastery.
                </p>
              </div>
            </div>

            {mistakes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={clearMistakes}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>

                {dueItems.length > 0 && (
                  <button
                    onClick={() => startPractice(dueItems)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition active:scale-95"
                  >
                    <Flame className="w-3.5 h-3.5 fill-white" />
                    <span>Review Due Items ({dueItems.length})</span>
                  </button>
                )}

                <button
                  onClick={() => startPractice(filteredMistakes.length > 0 ? filteredMistakes : mistakes)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-md shadow-brand-700/20 transition active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Practice All ({mistakes.length})</span>
                </button>
              </div>
            )}
          </div>

          {/* Leitner Box Progress Summary Bar */}
          {mistakes.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-brand-600" />
                  <span>Spaced Repetition Stages (Leitner Intervals)</span>
                </div>
                <div className="text-slate-500 font-medium">
                  {stats.dueCount} due today &bull; {stats.masteredCount} mastered
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                  <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">Box 1 (Daily)</div>
                  <div className="text-lg font-black text-rose-900">{stats.byBox[1] || 0}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Box 2 (3-Day)</div>
                  <div className="text-lg font-black text-amber-900">{stats.byBox[2] || 0}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Box 3 (Weekly)</div>
                  <div className="text-lg font-black text-blue-900">{stats.byBox[3] || 0}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                  <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">Box 4 (14-Day)</div>
                  <div className="text-lg font-black text-indigo-900">{stats.byBox[4] || 0}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Box 5 (Mastered)</div>
                  <div className="text-lg font-black text-emerald-900">{stats.byBox[5] || 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* Filter Chips */}
          {mistakes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Missed ({mistakes.length})
              </button>
              <button
                onClick={() => setFilter("due")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  filter === "due"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Due for Review ({stats.dueCount})</span>
              </button>
              <button
                onClick={() => setFilter("box1_2")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filter === "box1_2"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                High Priority (Box 1-2) ({(stats.byBox[1] || 0) + (stats.byBox[2] || 0)})
              </button>
              <button
                onClick={() => setFilter("mastered")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filter === "mastered"
                    ? "bg-emerald-700 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Mastered ({stats.masteredCount})
              </button>
            </div>
          )}

          {/* Questions List */}
          {filteredMistakes.length > 0 ? (
            <div className="space-y-4">
              {filteredMistakes.map((item, idx) => {
                const q = item.question;
                const due = getDueLabel(item);
                const boxInfo = getBoxBadge(item.box);

                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="text-brand-700 font-bold">
                          {q.subjectName} &bull; {q.topicName}
                        </span>
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${boxInfo.style}`}>
                          {boxInfo.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${due.color}`}>
                          {due.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span>Item #{idx + 1}</span>
                        {(item.box || 1) < 5 && (
                          <button
                            onClick={() => handleMarkMastered(item.id)}
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold text-xs bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition"
                            title="Mark directly as Mastered (Box 5)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Mastered</span>
                          </button>
                        )}
                        <button
                          onClick={() => removeSingleMistake(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                          title="Remove from Mistake Bank"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-semibold text-slate-900 text-sm whitespace-pre-line leading-relaxed">
                      {q.questionText}
                    </h4>

                    {/* Choices preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      {q.choices.map((c) => {
                        const isSelectedMistake = c.id === item.selectedChoiceId;
                        const isActualCorrect = c.isCorrect;

                        return (
                          <div
                            key={c.id}
                            className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
                              isActualCorrect
                                ? "bg-emerald-50/80 border-emerald-300 text-emerald-900 font-medium"
                                : isSelectedMistake
                                  ? "bg-rose-50/80 border-rose-300 text-rose-900 line-through"
                                  : "bg-slate-50 border-slate-200 text-slate-600"
                            }`}
                          >
                            <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] shrink-0 bg-white border border-slate-200">
                              {c.choiceLabel}
                            </span>
                            <span>{c.text}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pedagogical Explanation */}
                    {q.explanation && (
                      <div className="p-3 rounded-lg bg-brand-50/60 border border-brand-100 text-xs text-slate-700 flex items-start gap-2">
                        <BookOpen className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{q.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : mistakes.length > 0 ? (
            <div className="text-center py-10 text-slate-500 space-y-2">
              <Sparkles className="w-8 h-8 text-brand-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No items match the selected filter.</p>
              <button
                onClick={() => setFilter("all")}
                className="text-xs text-brand-700 hover:underline font-bold"
              >
                View all missed items
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-lg font-bold">
                ✓
              </div>
              <p className="text-sm font-semibold text-slate-700">Your Mistake Bank is empty!</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Any questions you miss during tests and drills will be saved here automatically with Leitner spaced repetition.
              </p>
              <Link
                href="/practice"
                className="inline-block mt-4 px-4 py-2 rounded-xl bg-brand-700 text-white font-bold text-xs shadow hover:bg-brand-800 transition"
              >
                Take a Quick Test
              </Link>
            </div>
          )}
        </div>
      </div>
      </main>
      <Footer />
    </div>
  );
}
