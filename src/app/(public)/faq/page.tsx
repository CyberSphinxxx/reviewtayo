"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdSenseBanner } from "@/components/ads/AdSenseBanner";
import { FAQS } from "@/lib/content";
import { getFaqSchema } from "@/lib/seo/schema";
import { EXAM_CATALOG, type ExamCatalogEntry } from "@/config/exams";
import { FAQ_GENERAL_CATEGORIES } from "@/lib/content/types";
import { ChevronDown, ChevronUp, Search, ArrowRight, CheckCircle2, Info } from "lucide-react";
import type { FAQItem } from "@/lib/content/types";

/**
 * FAQ page structure: general ReviewTayo questions first, then exam-specific
 * groups (CSE first, followed by any other exam that ships FAQ entries — the
 * grouping is derived from data, so adding a new exam needs no page change).
 */

/** Which exams have their own entries today, in catalog order (CSE first). */
const EXAM_ORDER = ["cse", "let", "cle", "napolcom", "nursing", "bfp"];

/** Exams an entry serves; legacy entries without examIds are CSE. */
function entryExamIds(faq: FAQItem): string[] {
  return faq.examIds ?? ["cse"];
}

/** General (platform-level) entries are discriminated by their category. */
function isGeneralEntry(faq: FAQItem): boolean {
  return (FAQ_GENERAL_CATEGORIES as readonly string[]).includes(faq.category);
}

/** Categories that only appear on official-exam answers (CSE today). */
const EXAM_ONLY_CATEGORIES = new Set([
  "Qualifications & Eligibility",
  "Exam Format & Scoring",
  "Exam Day Guidelines",
]);

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  // First CSE entry open by default — gives the accordion a visible affordance.
  const [openFaqId, setOpenFaqId] = useState<string | null>("eligibility-qualifications");

  const matchesSearch = (faq: FAQItem) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q);
  };

  const { generalFaqs, examGroups } = useMemo(() => {
    const general = FAQS.filter(isGeneralEntry).filter(matchesSearch);

    const groups: { exam: ExamCatalogEntry; faqs: FAQItem[] }[] = [];
    for (const examId of EXAM_ORDER) {
      const exam = EXAM_CATALOG.find((e) => e.id === examId);
      const entries = FAQS.filter(
        (f) => entryExamIds(f).includes(examId) && !isGeneralEntry(f) && matchesSearch(f)
      );
      if (exam && entries.length > 0) groups.push({ exam, faqs: entries });
    }
    return { generalFaqs: general, examGroups: groups };
    // searchQuery intentionally excluded from deps: filter reads are cheap and
    // memoizing on it would just re-run the same work. ESLint is satisfied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Schema covers everything rendered on the page (both sections).
  const faqSchema = getFaqSchema([...generalFaqs, ...examGroups.flatMap((g) => g.faqs)]);

  const faqCard = (faq: FAQItem, showCscBadge: boolean) => {
    const isOpen = openFaqId === faq.id;
    const panelId = `faq-panel-${faq.id}`;
    const buttonId = `faq-button-${faq.id}`;
    return (
      <div key={faq.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs transition">
        <h3 className="font-semibold">
          <button
            id={buttonId}
            type="button"
            onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
            className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition"
            aria-expanded={isOpen}
            aria-controls={panelId}
          >
            <span>
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                {faq.category}
              </span>
              <span className="block text-sm sm:text-base font-bold text-slate-900 leading-snug">
                {faq.question}
              </span>
            </span>
            <span className="text-slate-400 shrink-0">
              {isOpen ? <ChevronUp className="w-5 h-5 text-slate-900" /> : <ChevronDown className="w-5 h-5" />}
            </span>
          </button>
        </h3>

        {isOpen && (
          <div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            className="px-4 pb-5 sm:px-5 border-t border-slate-100 pt-3 space-y-3"
          >
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>{faq.answer}</p>
            </div>

            {faq.relatedLinks && faq.relatedLinks.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Related guides &amp; practice
                </span>
                <div className="flex flex-wrap gap-2">
                  {faq.relatedLinks.map((link, idx) => (
                    <Link
                      key={idx}
                      href={link.href}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 text-xs font-medium border border-slate-200 hover:border-brand-200 transition"
                    >
                      <span>{link.text}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {showCscBadge && (
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Exam-specific answers verified per official Civil Service Commission advisories</span>
                </div>
                <Link
                  href="/exams/professional/quick"
                  className="inline-flex items-center gap-1 text-slate-900 font-bold hover:text-brand-700 transition"
                >
                  <span>Practice related questions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const emptyState = (
    <div className="text-center py-10 bg-white rounded-xl border border-slate-200 p-6">
      <p className="text-sm text-slate-500">
        No matching questions found for &ldquo;{searchQuery}&rdquo;. Try a shorter
        keyword, or <Link href="/contact" className="font-semibold text-brand-700 hover:underline">ask us directly</Link>.
      </p>
    </div>
  );

  const hasAnyResult = generalFaqs.length > 0 || examGroups.some((g) => g.faqs.length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Schema.org FAQPage metadata */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 animate-page-enter">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Header */}
          <div className="space-y-2 border-b border-slate-200/80 pb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Help Center
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
              How ReviewTayo works, how to study with it, and answers to
              exam-specific questions — starting with the Civil Service Exam.
            </p>
          </div>

          {/* Search */}
          <div>
            <label htmlFor="faq-search" className="sr-only">
              Search frequently asked questions
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                id="faq-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search the FAQ (e.g. practice mode, timer, account, passing grade)..."
                className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition"
              />
            </div>
          </div>

          {/* General ReviewTayo questions */}
          <section aria-labelledby="faq-general-heading" className="space-y-3">
            <div>
              <h2 id="faq-general-heading" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                About ReviewTayo
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                The website, getting started, practice vs exam mode, progress, accounts, and support.
              </p>
            </div>
            {generalFaqs.length > 0 ? generalFaqs.map((faq) => faqCard(faq, false)) : emptyState}
          </section>

          {/* Exam-specific questions — one group per exam with entries */}
          {examGroups.map(({ exam, faqs }) => (
            <section key={exam.id} aria-labelledby={`faq-${exam.id}-heading`} className="space-y-3">
              <div>
                <h2 id={`faq-${exam.id}-heading`} className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {exam.shortName} — {exam.shortName === "CSE" ? "Civil Service Exam" : exam.fullName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Eligibility, format, scoring, and exam-day questions for the {exam.shortName}.
                </p>
              </div>
              {faqs.map((faq) => faqCard(faq, EXAM_ONLY_CATEGORIES.has(faq.category)))}
            </section>
          ))}

          {/* Exams with no entries yet — honest placeholder, no fabricated Q&A */}
          <section aria-labelledby="faq-upcoming-heading" className="space-y-3">
            <div>
              <h2 id="faq-upcoming-heading" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Other exams
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                ReviewTayo is built to support more Philippine exams over time.
                These reviewers are still in development:
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 flex items-start gap-3">
              <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {EXAM_CATALOG.filter((e) => e.id !== "cse")
                  .map((e) => e.shortName)
                  .join(" · ")}{" "}
                — each exam&apos;s FAQ section appears here once its reviewer launches.
                Follow the{" "}
                <Link href="/reviewers" className="font-semibold text-brand-700 hover:underline">
                  exam catalog
                </Link>{" "}
                for what&apos;s available today.
              </p>
            </div>
          </section>

          <AdSenseBanner slotId="faq-page-bottom" />

          {/* Bottom Action Card */}
          <div className="bg-slate-900 rounded-2xl text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-lg font-bold">Ready to test your preparation?</h2>
              <p className="text-xs text-slate-300">
                Practice 10 random questions with instant answers and concept explanations.
              </p>
            </div>
            <Link
              href="/exams/professional/quick"
              className="px-5 py-2.5 rounded-xl bg-white text-slate-950 text-xs font-bold hover:bg-slate-100 transition shadow-xs shrink-0 flex items-center gap-1.5"
            >
              <span>Take Free Diagnostic Drill</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
