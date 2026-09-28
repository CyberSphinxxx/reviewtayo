import { describe, it, expect } from "vitest";
import { FAQS } from "@/lib/content";
import {
  FAQ_GENERAL_CATEGORIES,
  type FAQItem,
} from "@/lib/content/types";

const EXAM_IDS = ["cse", "let", "cle", "napolcom", "nursing", "bfp"];

function entryExamIds(faq: FAQItem): string[] {
  return faq.examIds ?? ["cse"];
}

function isGeneralEntry(faq: FAQItem): boolean {
  return (FAQ_GENERAL_CATEGORIES as readonly string[]).includes(faq.category);
}

describe("FAQ structure (general + per-exam grouping)", () => {
  it("has general platform-level entries covering all general categories", () => {
    const general = FAQS.filter(isGeneralEntry);
    expect(general.length).toBeGreaterThanOrEqual(8);

    const categories = new Set(general.map((f) => f.category));
    for (const cat of FAQ_GENERAL_CATEGORIES) {
      expect(categories.has(cat), `missing general category: ${cat}`).toBe(true);
    }
  });

  it("keeps exam-specific entries (CSE first) separate from general ones", () => {
    const cseEntries = FAQS.filter((f) => entryExamIds(f).includes("cse") && !isGeneralEntry(f));
    expect(cseEntries.length).toBeGreaterThanOrEqual(8);
    // CSE answers keep their exam-specific categories.
    const categories = new Set(cseEntries.map((f) => f.category));
    expect(categories.has("Qualifications & Eligibility")).toBe(true);
    expect(categories.has("Exam Format & Scoring")).toBe(true);
  });

  it("treats every entry as either general or exam-tagged — never both", () => {
    for (const faq of FAQS) {
      const ids = faq.examIds;
      if (ids === undefined) {
        // Legacy entries are CSE exam entries.
        expect(entryExamIds(faq)).toEqual(["cse"]);
      } else {
        for (const id of ids) {
          expect(EXAM_IDS).toContain(id);
        }
      }
    }
  });

  it("answers general questions without inventing prices, dates, or guarantees", () => {
    const forbidden = [/₱\s?\d/, /\bPHP\s?\d/, /subscription (?:costs|fee)/i, /will (?:launch|release) on/i];
    for (const faq of FAQS.filter(isGeneralEntry)) {
      for (const re of forbidden) {
        expect(re.test(faq.answer), `${faq.id} matched forbidden pattern ${re}`).toBe(false);
      }
    }
  });

  it("general entries link only to real routes", () => {
    const knownPrefixes = [
      "/cse/exam-guide/", // exam-guide section pages
    ];
    const knownRoutes = new Set([
      "/about",
      "/reviewers",
      "/exams/professional/quick",
      "/onboarding",
      "/dashboard/practice",
      "/practice",
      "/dashboard",
      "/dashboard/history",
      "/settings/data",
      "/privacy",
      "/contact",
      "/cse/exam-guide",
      "/exam-info",
      "/guides",
      "/articles",
      "/articles/professional-vs-subprofessional-difference",
      "/articles/cse-professional-exam-reviewer-guide",
      "/articles/how-civil-service-exam-scoring-works",
      "/articles/continuous-timer-pacing-strategy",
      "/articles/why-examinees-fail-civil-service-exam",
      "/guides/numerical-ability-word-problems",
    ]);
    for (const faq of FAQS) {
      for (const link of faq.relatedLinks ?? []) {
        const ok =
          knownRoutes.has(link.href) ||
          knownPrefixes.some((p) => link.href.startsWith(p));
        expect(ok, `${faq.id} links to unknown route ${link.href}`).toBe(true);
      }
    }
  });
});
