import React from "react";
import {
  Award,
  FileCheck,
  ExternalLink,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { getSafeExternalLinkProps } from "@/lib/exam-guide/csc-domain";

export function ResultsSection() {
  return (
    <section id="results" className="space-y-6 scroll-mt-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" />
            <span>Post-Examination Procedures</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Results, Ratings & Certification of Eligibility
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          Guidelines on official result releases, OCSERGS rating lookup, and claiming civil service eligibility.
        </p>
      </div>

      {/* Official Results Policy Notice */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/30 p-4 text-xs text-blue-950 dark:text-blue-200 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Official Results Policy:</strong> Only results published through verified CSC channels (<code>csc.gov.ph</code>) are official and legally recognized. ReviewTayo does not host, reproduce, or query passer databases to protect applicant privacy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Official List of Passers */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              1. Official List of Passers
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              The CSC releases nationwide passer lists alphabetically and by CSC region on the main website approximately 60 calendar days post-exam. Target dates are targets, not guarantees.
            </p>
          </div>

          <a
            {...getSafeExternalLinkProps("https://www.csc.gov.ph/")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline pt-2"
          >
            <span>Visit CSC Announcements</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 2. Individual Report of Rating (OCSERGS) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              2. Individual Report of Rating
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Both passers and non-passers can generate their official Report of Rating via the Online Civil Service Examination Result Generation System (OCSERGS) approximately 15 days after passer release.
            </p>
          </div>

          <a
            {...getSafeExternalLinkProps("https://erpo.csc.gov.ph/")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline pt-2"
          >
            <span>Check OCSERGS Service</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 3. Certificate of Eligibility (CoE) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              3. Claiming Your CoE
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Passers may claim their official Certificate of Eligibility on security paper at their responsible CSC Regional Office, or request electronic authentication through official regional booking.
            </p>
          </div>

          <a
            {...getSafeExternalLinkProps("https://www.csc.gov.ph/career/")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline pt-2"
          >
            <span>Browse Government Careers</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
