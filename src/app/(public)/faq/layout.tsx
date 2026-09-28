import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions on Exam Review & Preparation",
  description:
    "How ReviewTayo works — getting started, practice vs exam mode, progress, accounts — plus exam-specific FAQs for the Civil Service Exam: eligibility, passing scores, format, and exam day.",
  alternates: {
    canonical: "/faq",
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
