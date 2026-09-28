import { SEED_LEVELS } from "@/db/seed-data";
import { prepareExamSession } from "@/features/practice/practice-service";
import { ExamRunner } from "@/features/practice/ExamRunner";
import { ExamLevelUnavailable } from "@/features/practice/ExamLevelUnavailable";

// Per-request question selection — see quick/page.tsx rationale.
export const dynamic = "force-dynamic";

export default async function MediumTestPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level } = await params;
  const examLevel = SEED_LEVELS.find((l) => l.slug === level);

  // Unknown level segment: a useful in-app state, not an unexplained 404.
  if (!examLevel) {
    return <ExamLevelUnavailable level={level} />;
  }

  const { questions, rules } = prepareExamSession(level, "medium", {
    questionLimit: 30,
  });

  return (
    <ExamRunner
      initialQuestions={questions}
      rules={{ ...rules, itemCount: questions.length }}
      title={`${examLevel.name} — Medium Test`}
      subtitle={`${questions.length} questions • 30 minutes • Balanced subtests & detailed analytics`}
      examLevelId={examLevel.trackId}
      trackId={examLevel.trackId}
    />
  );
}
