"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ExamRunner } from "@/features/practice/ExamRunner";
import { LocalStorageService, type StoredBookmarkItem } from "@/lib/storage";
import { Bookmark, ChevronLeft, Play, BookOpen, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<StoredBookmarkItem[]>([]);
  const [isPracticing, setIsPracticing] = useState(false);

  useEffect(() => {
    setBookmarks(LocalStorageService.getBookmarks());
  }, []);

  const removeBookmark = (qId: string) => {
    LocalStorageService.removeBookmark(qId);
    setBookmarks((prev) => prev.filter((b) => b.id !== qId));
  };

  if (isPracticing && bookmarks.length > 0) {
    const practiceQuestions = bookmarks.map((b) => b.question);
    return (
      <ExamRunner
        initialQuestions={practiceQuestions}
        rules={{
          mode: "bookmarks",
          itemCount: practiceQuestions.length,
          timeLimitMinutes: Math.max(10, Math.ceil(practiceQuestions.length * 1.5)),
          passingScorePercentage: 80,
          allowsFlagging: true,
          hasContinuousTimer: true,
        }}
        title="Bookmarked Questions Practice"
        subtitle={`Reviewing ${practiceQuestions.length} saved questions`}
      />
    );
  }

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold">
                <Bookmark className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">Saved Bookmarks</h1>
                <p className="text-xs text-slate-500">
                  Questions you saved during test reviews for deeper conceptual practice.
                </p>
              </div>
            </div>

            {bookmarks.length > 0 && (
              <button
                onClick={() => setIsPracticing(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-md shadow-brand-700/20 transition active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Practice Bookmarks ({bookmarks.length})</span>
              </button>
            )}
          </div>

          {bookmarks.length > 0 ? (
            <div className="space-y-4">
              {bookmarks.map((item, idx) => {
                const q = item.question;
                return (
                  <div key={item.id} className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
                      <span className="text-brand-700">
                        {q.subjectName} &bull; {q.topicName}
                      </span>
                      <div className="flex items-center gap-3">
                        <span>Item #{idx + 1}</span>
                        <button
                          onClick={() => removeBookmark(item.id)}
                          className="text-rose-600 hover:text-rose-800 p-1 rounded"
                          title="Remove bookmark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm whitespace-pre-line">
                      {q.questionText}
                    </h4>
                    <div className="mt-3 p-3 rounded-lg bg-slate-50 text-xs text-slate-600 flex items-start gap-2">
                      <BookOpen className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                      <span>{q.explanation}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 space-y-3">
              <Bookmark className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No bookmarked questions yet.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                While reviewing any exam or quiz result, click the bookmark icon on any question to save it here for future drills.
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
