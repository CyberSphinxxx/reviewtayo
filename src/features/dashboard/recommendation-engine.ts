import type { AttemptSummary, StoredMistakeItem } from "@/lib/storage";
import { getFeaturedExam } from "@/config/exams";

export interface SubtestAccuracySummary {
  name: string;
  accuracy: number;
}

export interface ExamRecommendationContext {
  examShortName?: string; // e.g., "Civil Service", "LET", "Nursing"
  trackName?: string; // e.g., "Professional", "Secondary"
  quickDrillHref?: string;
  fullMockHref?: string;
  practiceHref?: string;
  fullMockItems?: number;
  fullMockMinutes?: number;
  passingTarget?: number;
}

export interface NextBestStepRecommendation {
  type: "diagnostic" | "srs_review" | "weak_subtest" | "full_mock" | "maintain_streak";
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  tag: string;
  urgency: "urgent" | "high" | "medium" | "milestone" | "normal";
  badgeCount?: number;
  subtext?: string;
}

/**
 * Computes the examinee's single most impactful next action based on their
 * real learning history, Leitner SRS due items, and subtest practice accuracy,
 * contextualized to their active examination workspace.
 */
export function getNextBestStepRecommendation(
  attempts: AttemptSummary[],
  dueMistakes: StoredMistakeItem[],
  allMistakes: StoredMistakeItem[],
  subtestAccuracies?: SubtestAccuracySummary[],
  context?: ExamRecommendationContext
): NextBestStepRecommendation {
  // Defaults come from the exam registry (the featured catalog entry), never
  // from hardcoded CSE literals (guide §5/§10). Callers with an active
  // workspace always pass explicit context; this is only a safety net.
  const featured = getFeaturedExam();
  const examName = context?.examShortName || featured?.shortName || "ReviewTayo";
  const quickHref = context?.quickDrillHref || featured?.routes?.quickDrillUrl || "/practice";
  const fullMockHref = context?.fullMockHref || featured?.routes?.fullMockUrl || "/practice";
  const practiceHref = context?.practiceHref || "/practice";
  const mockItems = context?.fullMockItems || featured?.mockSpecs?.itemCount || 0;
  const mockMinutes = context?.fullMockMinutes || featured?.mockSpecs?.timeLimitMinutes || 0;
  const passingTarget = context?.passingTarget || featured?.mockSpecs?.passingScorePercentage || 80;

  const mockDurationStr =
    mockMinutes >= 60
      ? `${Math.floor(mockMinutes / 60)}h ${mockMinutes % 60 > 0 ? `${mockMinutes % 60}m ` : ""}`
      : `${mockMinutes}m `;

  // 1. First-time examinee: Zero attempts completed
  if (attempts.length === 0) {
    return {
      type: "diagnostic",
      title: "Take a 10-Question Diagnostic Benchmark",
      description: `Establish your baseline practice accuracy across ${examName} subtests against your ${passingTarget}% study target.`,
      actionLabel: "Start Diagnostic Drill (10 min)",
      actionHref: quickHref,
      tag: "Immediate Priority",
      urgency: "high",
      subtext: "10 mixed questions • Instant concept explanations",
    };
  }

  // 2. Active Spaced Repetition (SRS): Due items in Mistake Bank
  if (dueMistakes.length > 0) {
    const count = dueMistakes.length;
    const plural = count > 1;
    return {
      type: "srs_review",
      title: `${count} question${plural ? "s" : ""} ready to review`,
      description: "Revisit these questions from your earlier practice to reinforce concept retention.",
      actionLabel: `Review ${count} question${plural ? "s" : ""}`,
      actionHref: "/dashboard/mistakes?filter=due",
      tag: "Spaced Repetition",
      urgency: "urgent",
      badgeCount: count,
      subtext: "Leitner spaced review • Scheduled for today",
    };
  }

  // 3. Weak Subtest Targeting: Any subtest performing below benchmark target
  if (subtestAccuracies && subtestAccuracies.length > 0) {
    const subtestsBelowBenchmark = subtestAccuracies
      .filter((s) => s.accuracy < passingTarget)
      .sort((a, b) => a.accuracy - b.accuracy);

    if (subtestsBelowBenchmark.length > 0) {
      const weakest = subtestsBelowBenchmark[0];
      return {
        type: "weak_subtest",
        title: `Strengthen ${weakest.name} (${weakest.accuracy}%)`,
        description: `Your practice accuracy in ${weakest.name} is currently ${weakest.accuracy}%, below your ${passingTarget}% study target. Focused topic drills will help close this gap.`,
        actionLabel: `Practice ${weakest.name}`,
        actionHref: practiceHref,
        tag: "Study Target Gap",
        urgency: "medium",
        subtext: `Goal: Reach ${passingTarget}%+ practice accuracy`,
      };
    }
  }

  // 4. Milestone Simulation: Examinee has passed multiple tests with high overall accuracy
  const totalPassed = attempts.filter((a) => a.passed).length;
  const recentAccuracy =
    attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length;

  if (attempts.length >= 3 && recentAccuracy >= passingTarget && totalPassed >= 2) {
    return {
      type: "full_mock",
      title: `Take a Full ${mockItems}-Item Mock Exam`,
      description: `Validate your stamina and pacing under official ${mockDurationStr.trim()} continuous timing.`,
      actionLabel: "Launch Full Mock Exam",
      actionHref: fullMockHref,
      tag: "Exam Simulation",
      urgency: "milestone",
      subtext: `${mockItems} items • ${mockDurationStr.trim()} continuous timer • Real exam pacing`,
    };
  }

  // 5. Daily Consistency / Maintenance
  return {
    type: "maintain_streak",
    title: "Daily 10-Question Quick Drill",
    description:
      "Sharpen your question pacing and keep your recall active with a short mixed-subject session.",
    actionLabel: "Start Quick Drill (10 min)",
    actionHref: quickHref,
    tag: "Daily Pacing",
    urgency: "normal",
    subtext: "10 mixed items • Maintain daily study habit",
  };
}
