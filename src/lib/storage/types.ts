import type { EngineQuestion, ExamRuleConfig, ScoringResult } from "@/features/exam-engine";

export interface StoredUserAnswer {
  questionId: string;
  selectedChoiceId?: string;
  isFlagged: boolean;
  timeSpentSeconds: number;
}

export interface ActiveExamSessionDraft {
  id: string; // e.g., session-level-mode
  levelSlug: string;
  mode: string;
  title: string;
  subtitle?: string;
  rules: ExamRuleConfig;
  questions: EngineQuestion[];
  answers: Record<string, StoredUserAnswer>;
  flaggedQuestionIds: string[];
  currentQuestionIndex: number;
  remainingSeconds: number;
  startedAt: string;
  lastSavedAt: string;
}


export interface AttemptSummary {
  id: string;
  title: string;
  /**
   * Explicit exam identity (guide §22): the track/level the attempt belongs
   * to, e.g. "professional". Optional only for records created before exam
   * identity was tracked; new attempts always set it.
   */
  examLevelId?: string;
  mode: string;
  percentage: number;
  rawScore: number;
  totalQuestions: number;
  passed: boolean;
  date: string;
}

export interface StoredAttemptDetails {
  id: string;
  title: string;
  /**
   * Explicit exam identity (guide §22). Propagated to AttemptSummary on
   * completion. Optional only for legacy records; new attempts always set it.
   */
  examLevelId?: string;
  mode: string;
  rules: ExamRuleConfig;
  questions: EngineQuestion[];
  answers: StoredUserAnswer[];
  scoreResult: ScoringResult;
  completedAt: string;
}

export interface StoredMistakeItem {
  id: string; // Question ID
  question: EngineQuestion;
  attemptId: string;
  selectedChoiceId?: string;
  correctChoiceId?: string;
  addedAt: string;
  reviewCount: number;
  box?: 1 | 2 | 3 | 4 | 5; // Leitner box (1: daily, 2: 3-day, 3: 7-day, 4: 14-day, 5: mastered)
  nextReviewDue?: string; // ISO date string when due for review
  consecutiveCorrect?: number;
  lastReviewedAt?: string;
}

export interface TargetExamConfig {
  targetDate: string; // YYYY-MM-DD
  examName: string; // e.g., "August 2026 CSE-PPT"
  dailyGoal: number; // e.g., 25 questions/day
}

export interface StoredBookmarkItem {
  id: string; // Question ID
  question: EngineQuestion;
  bookmarkedAt: string;
  notes?: string;
}

export interface StudyStreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  activeDates: string[]; // List of YYYY-MM-DD
  checkInDates?: string[]; // List of YYYY-MM-DD check-in dates
}

export interface DailyActivityCell {
  date: string; // YYYY-MM-DD
  formattedDate: string; // e.g., "Sep 13, 2026"
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  questionCount: number;
  hasCheckIn: boolean;
  sessionsCount: number;
  activityLevel: 0 | 1 | 2 | 3;
  isToday: boolean;
  isFuture: boolean;
}

export interface SubjectReadinessMetric {
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  questionsAnswered: number;
  correctCount: number;
  accuracyPercentage: number;
}

import type { ExamWorkspace } from "@/lib/workspace/types";
import type { StoredNote } from "./notes-service";
import type { SyncAttemptDetail } from "./sync-payload";

export interface GuestBackupPayload {
  version: 1 | 2;
  exportedAt: string;
  history: AttemptSummary[];
  attempts: Record<string, StoredAttemptDetails>;
  mistakeBank: StoredMistakeItem[];
  bookmarks: StoredBookmarkItem[];
  streak: StudyStreakData;
  targetExam?: TargetExamConfig;
  workspaces?: ExamWorkspace[];
  currentWorkspaceId?: string | null;
  /** Present in version 2 payloads only. v1 imports skip it gracefully. */
  notes?: StoredNote[];
}
