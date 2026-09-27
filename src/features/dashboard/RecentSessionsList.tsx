"use client";

import React from "react";
import Link from "next/link";
import { History, ArrowRight } from "lucide-react";
import type { AttemptSummary } from "@/lib/storage";

interface RecentSessionsListProps {
  history: AttemptSummary[];
}

export function RecentSessionsList({ history }: RecentSessionsListProps) {
  const recentThree = history.slice(0, 3);

  return (
    <section
      aria-labelledby="recent-sessions-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3
            id="recent-sessions-heading"
            className="text-lg font-extrabold text-slate-900 flex items-center gap-2"
          >
            <History className="w-5 h-5 text-brand-700" />
            <span>Recent Test Sessions</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Your latest practice attempts and score reviews.
          </p>
        </div>

        {history.length > 0 && (
          <Link
            href="/dashboard/history"
            prefetch={true}
            className="text-xs font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
          >
            <span>View full history</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {recentThree.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {recentThree.map((item) => (
            <div
              key={item.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div>
                <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                <div className="text-xs text-slate-400 mt-0.5">
                  {new Date(item.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  &bull; <span className="capitalize">{item.mode}</span> drill
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                    item.passed
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {item.percentage}% &bull; {item.passed ? "Target Met" : "Needs Review"}
                </span>

                <Link
                  href={`/results/${item.id}`}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
                >
                  Review
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-500 space-y-2">
          <p className="text-xs font-medium">No test sessions recorded yet.</p>
          <Link
            href="/practice"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800"
          >
            <span>Take your first 10-question diagnostic</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}
