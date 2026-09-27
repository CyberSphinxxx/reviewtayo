import {
  SEED_LEVELS,
  SEED_SUBJECTS,
  SEED_TOPICS,
  SEED_RULES,
  SEED_QUESTIONS,
} from "@/db/seed-data";
import {
  selectQuestionsForExam,
  createExamSession,
  type EngineQuestion,
  type ExamRuleConfig,
  type ExamSessionState,
  type ExamMode,
} from "@/features/exam-engine";

export interface ExamLevelInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  subjects: {
    id: string;
    slug: string;
    name: string;
    topics: {
      id: string;
      slug: string;
      name: string;
      questionCount: number;
    }[];
  }[];
}

export function getExamLevelInfo(levelSlug: string): ExamLevelInfo | null {
  const level = SEED_LEVELS.find((l) => l.slug === levelSlug);
  if (!level) return null;

  const subjects = SEED_SUBJECTS.filter((s) => s.examLevelId === level.id).map((sub) => {
    const topics = SEED_TOPICS.filter((t) => t.subjectId === sub.id).map((top) => {
      const qCount = SEED_QUESTIONS.filter((q) => q.topicId === top.id).length;
      return {
        id: top.id,
        slug: top.slug,
        name: top.name,
        questionCount: qCount,
      };
    });
    return {
      id: sub.id,
      slug: sub.slug,
      name: sub.name,
      topics,
    };
  });

  return {
    id: level.id,
    slug: level.slug,
    name: level.name,
    description: level.description,
    subjects,
  };
}

export function getAllExamLevels(): ExamLevelInfo[] {
  return SEED_LEVELS.map((lvl) => getExamLevelInfo(lvl.slug)!);
}

export function getTopicQuestions(topicId: string): EngineQuestion[] {
  return SEED_QUESTIONS.filter((q) => q.topicId === topicId);
}

export function prepareExamSession(
  levelSlug: string | undefined,
  mode: ExamMode,
  options?: {
    topicId?: string;
    exposureHistory?: Set<string>;
    questionLimit?: number;
  }
): { session: ExamSessionState; questions: EngineQuestion[]; rules: ExamRuleConfig } {
  // An unknown level must fail loudly (guide §5/§14): silently serving CSE's
  // question pool for an unresolvable level is exactly how cross-exam
  // contamination starts. Only an omitted slug (legacy call sites) resolves
  // to the default level.
  if (levelSlug === undefined) {
    if (SEED_LEVELS.length === 0) {
      throw new Error(`No exam levels are registered; cannot prepare a session.`);
    }
    levelSlug = SEED_LEVELS[0].slug;
  }
  const level = SEED_LEVELS.find((l) => l.slug === levelSlug);
  if (!level) {
    throw new Error(`Unknown exam level "${levelSlug}" — no question pool exists for it.`);
  }

  // Scope the candidate pool to the requested exam level: only questions
  // whose topic belongs to one of this level's subjects are eligible. This
  // keeps professional exams free of clerical content and subprofessional
  // exams free of analytical content, as the real exams are separated.
  const levelSubjectIds = new Set(
    SEED_SUBJECTS.filter((s) => s.examLevelId === level.id).map((s) => s.id)
  );
  const levelTopicIds = new Set(
    SEED_TOPICS.filter((t) => levelSubjectIds.has(t.subjectId)).map((t) => t.id)
  );
  let candidatePool = SEED_QUESTIONS.filter((q) => levelTopicIds.has(q.topicId));
  if (options?.topicId) {
    candidatePool = candidatePool.filter((q) => q.topicId === options.topicId);
  }

  // Default item count and timing per mode
  const defaultItemCount =
    mode === "quick"
      ? 10
      : mode === "medium"
      ? 30
      : mode === "practice"
      ? Math.min(options?.questionLimit ?? 10, candidatePool.length > 0 ? candidatePool.length : 10)
      : 170;

  const defaultTimeLimit =
    mode === "quick" ? 10 : mode === "medium" ? 30 : mode === "practice" ? 15 : 190;

  const matchingRules = SEED_RULES.find((r) => r.examLevelId === level.id && r.mode === mode) || {
    id: `rule-default-${mode}`,
    examLevelId: level.id,
    mode,
    itemCount: defaultItemCount,
    timeLimitMinutes: defaultTimeLimit,
    passingScorePercentage: 80,
    allowsFlagging: true,
    hasContinuousTimer: true,
    subjectDistribution: {},
    difficultyDistribution: {},
  };

  // Target item count
  const targetCount =
    options?.questionLimit !== undefined
      ? options.questionLimit
      : mode === "practice"
      ? defaultItemCount
      : matchingRules.itemCount;
  const effectiveCount = Math.max(1, targetCount);

  const ruleConfig: ExamRuleConfig = {
    ...matchingRules,
    itemCount: effectiveCount,
  };

  const selected = selectQuestionsForExam(candidatePool, ruleConfig, options?.exposureHistory);

  // Honest selection: a pool smaller than the target yields a shorter exam
  // rather than cloned filler. Duplicated "items" in a full mock misrepresent
  // the real exam and double-count answers toward the score.
  const finalQuestions = selected;

  const session = createExamSession(
    finalQuestions,
    ruleConfig.timeLimitMinutes,
    ruleConfig.allowsFlagging
  );

  return {
    session,
    questions: finalQuestions,
    rules: {
      ...ruleConfig,
      itemCount: finalQuestions.length,
    },
  };
}

/**
 * True when the configured session can actually start: a runner must never
 * open with a timer and zero questions.
 */
export function hasStartableQuestions(candidatePool: EngineQuestion[]): boolean {
  return candidatePool.length > 0;
}
