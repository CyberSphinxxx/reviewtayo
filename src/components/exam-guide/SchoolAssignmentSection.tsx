import React from "react";
import {
  Building2,
  ExternalLink,
  ShieldCheck,
  Clock,
  HelpCircle,
} from "lucide-react";
import { getSafeExternalLinkProps } from "@/lib/exam-guide/csc-domain";

export function SchoolAssignmentSection() {
  return (
    <section id="school-assignment" className="space-y-6 scroll-mt-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Venue & Room Verification</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Check Your School & Room Assignment (eNOSA)
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          Online Notice of School Assignment via official Examination, Recruitment, and Placement Office (ERPO) system.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Official Government Verification Portal: erpo.csc.gov.ph</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Online Notice of School Assignment (eNOSA v3)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              When enabled by the CSC, examinees can view and print their examination venue, assigned school building, room number, and examinee number. Print or screenshot this notice for exam day.
            </p>
          </div>

          <a
            {...getSafeExternalLinkProps("https://erpo.csc.gov.ph/eNOSAv3/")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-700 text-white text-sm font-bold hover:bg-brand-800 transition shadow-md shrink-0 w-full md:w-auto"
          >
            <span>Open CSC eNOSA Portal</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Guidance and Privacy Shield */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>When are assignments uploaded?</span>
            </div>
            <p className="leading-relaxed text-[11px] text-amber-900/90 dark:text-amber-200/90">
              The CSC uploads room assignments approximately <strong>1 to 2 weeks before examination day</strong>. If you check earlier, the system will typically return &quot;No Record Found&quot;.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-100">
              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>What if no assignment appears near exam day?</span>
            </div>
            <p className="leading-relaxed text-[11px] text-blue-900/90 dark:text-blue-200/90">
              Confirm that you entered the exact same name spelling, birthdate, and exam date used on your official CS Form 100. If it still returns no record, contact your responsible CSC Regional or Field Office immediately.
            </p>
          </div>
        </div>

        {/* Zero Personal Data Collection Notice */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Privacy & Security Guarantee:</strong> ReviewTayo never collects, stores, or proxies your CSC credentials, application numbers, or date of birth. All school assignment checks occur exclusively on the official <code>erpo.csc.gov.ph</code> server.
          </p>
        </div>
      </div>
    </section>
  );
}
