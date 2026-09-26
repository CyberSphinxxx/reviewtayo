"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { History, Trash2, Award, ArrowRight } from "lucide-react";
import { LocalStorageService, type AttemptSummary } from "@/lib/storage";

const CARD =
  "rounded-3xl bg-white dark:bg-[#2b1620] shadow-[0_0_0_1.5px_rgba(138,22,48,0.12),0_18px_36px_-26px_rgba(90,15,35,0.4)] dark:shadow-[0_0_0_1.5px_rgba(255,255,255,0.1)] p-5 sm:p-6";

export function HistoryView() {
  const [history, setHistory] = useState<AttemptSummary[] | null>(null);

  useEffect(() => {
    setHistory(LocalStorageService.getAttemptHistory());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this test attempt record?")) {
      LocalStorageService.deleteAttempt(id);
      setHistory((prev) => (prev ?? []).filter((h) => h.id !== id));
    }
  };

  const items = history ?? [];

  return (
    <div className="animate-page-enter space-y-5">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#1b1216] dark:text-[#f5eff1]">
          History
        </h1>
        <p className="text-[#5a4a50] dark:text-[#a89ba1] text-sm mt-1">
          Every test you have completed, saved on this device.
        </p>
      </div>

      {history === null ? (
        <div className={`${CARD} h-48 animate-pulse`} aria-hidden="true" />
      ) : items.length === 0 ? (
        <div className={`${CARD} text-center py-12`}>
          <Award className="w-12 h-12 text-[#c9b3b9] mx-auto" />
          <h3 className="font-display text-xl font-extrabold mt-3 text-[#1b1216] dark:text-[#f8ecee]">
            No test attempts recorded yet
          </h3>
          <p className="text-sm font-semibold text-[#8a7a80] dark:text-[#a89ba1] mt-1 max-w-sm mx-auto">
            Completed quick tests, medium tests, and full mock exams will appear here automatically.
          </p>
          <Link
            href="/practice"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8a1630] text-white text-sm font-extrabold"
          >
            Launch first quick test
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className={`${CARD} p-0 overflow-hidden`}>
          <div className="divide-y divide-[#f4e7e9] dark:divide-white/10">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="w-9 h-9 shrink-0 rounded-xl bg-[#f4ecee] dark:bg-[#3a1f29] grid place-items-center text-[#8a1630] dark:text-[#de5572]">
                    <History className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[15px] text-[#1b1216] dark:text-[#f8ecee] truncate">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#8a7a80] dark:text-[#a89ba1] mt-0.5">
                      {new Date(item.date).toLocaleString()} ·{" "}
                      <span className="capitalize font-semibold">{item.mode}</span> mode
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-lg font-extrabold font-mono tabular-nums ${
                        item.passed ? "text-[#0a6b35]" : "text-[#d1344b]"
                      }`}
                    >
                      {item.percentage}%
                    </span>
                    <span className="block text-[10px] uppercase font-bold text-[#8a7a80] dark:text-[#a89ba1]">
                      {item.passed ? "Passed" : "Needs review"}
                    </span>
                  </div>

                  <Link
                    href={`/results/${item.id}`}
                    className="px-3.5 py-2 rounded-xl bg-[#f4ecee] dark:bg-[#3a1f29] hover:bg-[#fbeff0] dark:hover:bg-[#4a2530] text-[#8a1630] dark:text-[#ff9fb5] font-bold text-xs transition"
                  >
                    View breakdown
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-[#8a7a80] hover:text-[#d1344b] rounded-lg hover:bg-[#fdecef] dark:hover:bg-[#4a1a27] transition"
                    title="Delete attempt record"
                    aria-label={`Delete attempt record: ${item.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
