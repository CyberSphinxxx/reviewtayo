import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ReviewTayoOwl } from "@/components/brand/ReviewTayoOwl";
import {
  Target,
  Zap,
  BookOpen,
  GraduationCap,
  LineChart,
  ShieldCheck,
  Layers,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About ReviewTayo — Free Philippine Exam Reviewer",
  description:
    "ReviewTayo is a free, independent Philippine exam-preparation platform. The Civil Service Exam (CSE) is the first supported exam, built on a platform designed to welcome more Philippine exams over time.",
  alternates: {
    canonical: "/about",
  },
};

const WHATS_LIVE = [
  "Quick 10-item drills and 30-item medium assessments",
  "Full-length mock exams under one continuous official timer",
  "Instant scoring with per-subject breakdowns and strengths/weaknesses",
  "Detailed explanations for every question, in English and Filipino",
  "Topic-by-topic practice and a spaced-repetition mistake bank",
  "Progress tracking, bookmarks, and study plans — free, no account required",
];

const COMING_LATER = [
  "Additional Philippine exams (LET, Nursing, BFP, NAPOLCOM and more)",
  "More practice modes, study guides, and reviewer content",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-fit">
              <ReviewTayoOwl size={72} withCap alt="The ReviewTayo owl" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              About Review<span className="text-brand-600">Tayo</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              A free study companion for Philippine government exams — made by
              people who remember how hard it was to find good reviewer material.
              <span className="font-semibold text-slate-800"> Tayo</span> means
              &ldquo;us&rdquo;: this platform is built for us, the examinees.
            </p>
          </div>

          {/* Why it was made */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-700">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Why we made it</h2>
                <p className="text-xs text-slate-500">Pass rates shouldn&apos;t depend on luck or expensive reviewers</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Every year, hundreds of thousands of Filipinos take the Civil
              Service Exam, and most do not pass — historical nationwide passing
              rates hover between 14% and 21%. The usual reasons are familiar:
              scattered review materials, no way to know which subjects are
              actually weak, and no realistic practice under real exam timing.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              ReviewTayo exists to fix that: a modern, free, distraction-free
              place to practice with original questions, honest scoring, and
              explanations that teach the concept — not just the answer.
            </p>
          </div>

          {/* Who it helps + how to study */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="p-2 w-fit rounded-lg bg-brand-50 text-brand-700">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Who it helps</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                First-time examinees who want a clear starting point, working
                professionals squeezing review into evenings, repeat takers
                targeting specific weak subjects, and anyone who prefers
                practicing to reading long reviewers.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="p-2 w-fit rounded-lg bg-brand-50 text-brand-700">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">How to study with it</h3>
              <ol className="space-y-2.5 text-xs text-slate-600 leading-relaxed list-decimal list-inside">
                <li>
                  <Link href="/exams/professional/quick" className="font-semibold text-brand-700 hover:underline">
                    Take a 10-question quick drill
                  </Link>{" "}
                  to see where you stand.
                </li>
                <li>Read your subject breakdown — start drilling the weakest one.</li>
                <li>Review your mistakes in the spaced-repetition bank until they stick.</li>
                <li>Simulate the real thing with a full-length, continuously timed mock exam.</li>
              </ol>
            </div>
          </div>

          {/* What is available today — honest split */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-700">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">What&apos;s available today</h2>
                <p className="text-xs text-slate-500">Everything below is live and free to use right now</p>
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-sm font-bold text-emerald-900">
                The Civil Service Exam (CSE) is the first supported exam
              </p>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Both levels — Professional (170 items) and Subprofessional (165
                items) — are covered, matching the real Career Service
                Professional/Subprofessional paper-and-pencil test structure.
              </p>
            </div>

            <ul className="space-y-2.5">
              {WHATS_LIVE.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Sparkles className="w-4 h-4 text-gold-500" />
                What&apos;s planned, not yet live
              </p>
              <ul className="space-y-1.5">
                {COMING_LATER.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-xs text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" aria-hidden="true" />
                    <span>{item} — under construction, with no dates promised yet.</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Built for more exams over time */}
          <div className="bg-gradient-to-br from-brand-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg space-y-5 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-brand-600/10 rounded-full blur-3xl" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-700/80 text-gold-400">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">One platform, more exams over time</h2>
                  <p className="text-xs text-slate-300">CSE first — the platform is designed for what comes after</p>
                </div>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                ReviewTayo is not a one-exam website. The practice engine,
                timers, scoring, and progress tracking are exam-agnostic: adding
                a new Philippine exam means adding its content and
                configuration, not rebuilding the app. Exams like the LET,
                Nursing licensure, BFP, and NAPOLCOM examinations are the
                natural next candidates — and each will launch only when its
                content genuinely meets the standard, never as an empty shell.
              </p>
            </div>
          </div>

          {/* Original content + privacy pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="p-2 w-fit rounded-lg bg-brand-50 text-brand-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">100% original questions</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every item is written fresh for this platform — never copied or
                scraped from reviewer books, PDFs, or leaked papers.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="p-2 w-fit rounded-lg bg-emerald-50 text-emerald-700">
                <LineChart className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Explanations that teach</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Each question carries a rationale explaining the rule, formula,
                or provision behind the correct answer.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="p-2 w-fit rounded-lg bg-amber-50 text-amber-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Free and privacy-first</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Core practice never requires an account, progress stays on your
                device unless you choose to sync, and accounts support full data
                export and deletion.
              </p>
            </div>
          </div>

          {/* Next actions */}
          <div className="text-center pt-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/exams/professional/quick"
                prefetch={true}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-700 text-white font-bold text-sm shadow-md hover:bg-brand-800 transition"
              >
                Take a free quick drill
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/cse"
                prefetch={true}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-brand-200 bg-white text-brand-700 font-bold text-sm hover:bg-brand-50 transition"
              >
                Explore the CSE reviewer
              </Link>
            </div>
            <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
              Questions or feedback? Visit the{" "}
              <Link href="/faq" className="font-semibold text-brand-700 hover:underline">
                FAQ
              </Link>{" "}
              or{" "}
              <Link href="/contact" className="font-semibold text-brand-700 hover:underline">
                contact us
              </Link>
              . ReviewTayo is an independent platform and is not affiliated with
              the Civil Service Commission or any government agency.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
