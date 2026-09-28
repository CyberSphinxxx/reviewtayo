import { SEED_LEVELS } from "@/db/seed-data";
import { getExamConfig } from "@/config/exams";
import { prepareExamSession } from "@/features/practice/practice-service";
import { ExamRunner } from "@/features/practice/ExamRunner";
import { ExamLevelUnavailable } from "@/features/practice/ExamLevelUnavailable";

// Per-request question selection — see exams/[level]/quick/page.tsx rationale.
export const dynamic = "force-dynamic";

export default async function FullMockExamPage({
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

  // Item count and timer come from the catalog's level configuration — the
  // single source of exam rules — never from hardcoded constants. (Phase 5:
  // configuration-driven rules.)
  const examConfig = getExamConfig("cse");
  const catalogLevel = examConfig?.levels.find((l) => l.id === examLevel.trackId);
  const targetItemCount = catalogLevel?.itemCount ?? catalogLevel?.items;
  const timeLimitMinutes = catalogLevel?.durationMinutes ?? catalogLevel?.timeLimitMinutes;
  if (!targetItemCount || !timeLimitMinutes) {
    throw new Error(
      `Full mock exam configuration missing for level "${examLevel.trackId}". Add items/timeLimitMinutes to the catalog level.`
    );
  }

  const { questions, rules } = prepareExamSession(level, "full", {
    questionLimit: targetItemCount,
  });

  // An insufficient bank yields an honest, clearly labeled shorter session —
  // never duplicated filler presented as a complete exam.
  const shortened = questions.length < targetItemCount;

  return (
    <ExamRunner
      initialQuestions={questions}
      rules={{
        ...rules,
        itemCount: questions.length,
        timeLimitMinutes,
      }}
      title={`${examLevel.name} — Full Mock Exam`}
      subtitle={
        shortened
          ? `Honest practice: ${questions.length} of ${targetItemCount} items available — the full bank is still being written. Timer: ${Math.floor(timeLimitMinutes / 60)}h ${timeLimitMinutes % 60}m.`
          : `${targetItemCount} items • ${Math.floor(timeLimitMinutes / 60)}h ${timeLimitMinutes % 60}m continuous single timer • Real CSE-PPT Simulation`
      }
      examLevelId={examLevel.trackId}
      trackId={examLevel.trackId}
    />
  );
}
