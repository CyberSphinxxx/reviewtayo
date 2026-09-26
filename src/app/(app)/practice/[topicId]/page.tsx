import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SEED_TOPICS, SEED_SUBJECTS, SEED_LEVELS } from "@/db/seed-data";
import { prepareExamSession } from "@/features/practice/practice-service";
import { ExamRunner } from "@/features/practice/ExamRunner";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

// Per-request question selection — see exams/[level]/quick/page.tsx rationale.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return SEED_TOPICS.map((t) => ({
    topicId: t.id,
  }));
}

export default async function TopicPracticeSessionPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const topic = SEED_TOPICS.find((t) => t.id === topicId);

  if (!topic) {
    notFound();
  }

  const subject = SEED_SUBJECTS.find((s) => s.id === topic.subjectId);

  // Resolve the topic's own exam level instead of hardcoding one, so a
  // subprofessional (e.g. clerical) topic practices against the right pool.
  const topicLevel = SEED_LEVELS.find((l) => l.id === subject?.examLevelId);

  // Prepare a practice session for this topic. A topic with no eligible
  // questions must not open a timed runner with zero items.
  const { questions, rules } = prepareExamSession(topicLevel?.slug ?? "professional", "practice", {
    topicId: topic.id,
    questionLimit: 10,
  });

  if (questions.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="font-display text-2xl font-extrabold text-[#1b1216] dark:text-[#f8ecee]">
          No questions here yet
        </h1>
        <p className="text-sm text-[color:var(--brand-muted)]">
          This topic has no practice items available right now. Try another topic from the practice hub.
        </p>
        <Link
          href="/practice"
          className="mt-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
        >
          Back to practice
        </Link>
      </div>
    );
  }

  return (
    <ExamRunner
      initialQuestions={questions}
      rules={{
        ...rules,
        mode: "practice",
        timeLimitMinutes: 15, // Comfortable practice timing
      }}
      title={`${topic.name} — Topic Practice`}
      subtitle={`Subject: ${subject?.name || "Civil Service"}`}
    />
  );
}
