import Link from "next/link";
import { Compass, Home, BookOpen, Zap } from "lucide-react";

/**
 * In-app state for a runner URL whose level segment doesn't resolve to a real
 * question pool (e.g. /exams/advanced/quick). A useful, branded recovery
 * screen instead of an unexplained 404 — the runner routes are noindex, so
 * this is a navigation aid, not an SEO surface.
 */
export function ExamLevelUnavailable({ level }: { level: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center mb-5">
        <Compass className="w-8 h-8" aria-hidden="true" />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200 mb-3">
        Session unavailable
      </span>
      <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] text-[#1b1216] dark:text-[#f8ecee] mb-3">
        No question pool for &ldquo;{level}&rdquo;
      </h1>
      <p className="text-sm text-[#5a4a50] max-w-md leading-relaxed mb-8">
        This exam level doesn&apos;t have a practice session. The Career Service
        Exam currently offers the Professional and Subprofessional levels — start
        one of those instead.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
        <Link
          href="/exams/professional/quick"
          className="flex flex-col items-center gap-1 p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-sm transition"
        >
          <Zap className="w-5 h-5 text-brand-600 mb-1" aria-hidden="true" />
          <span className="text-xs font-bold text-slate-800">Professional quick drill</span>
          <span className="text-[11px] text-slate-500">10 items · 10 minutes</span>
        </Link>
        <Link
          href="/practice"
          className="flex flex-col items-center gap-1 p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-sm transition"
        >
          <BookOpen className="w-5 h-5 text-gold-500 mb-1" aria-hidden="true" />
          <span className="text-xs font-bold text-slate-800">Topic practice</span>
          <span className="text-[11px] text-slate-500">Drill a single subject</span>
        </Link>
        <Link
          href="/"
          className="flex flex-col items-center gap-1 p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-sm transition"
        >
          <Home className="w-5 h-5 text-emerald-600 mb-1" aria-hidden="true" />
          <span className="text-xs font-bold text-slate-800">Back to home</span>
          <span className="text-[11px] text-slate-500">reviewtayo.online</span>
        </Link>
      </div>
    </div>
  );
}
