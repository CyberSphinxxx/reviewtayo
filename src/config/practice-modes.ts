import type { ExamMode } from "@/features/exam-engine";

/**
 * Practice mode catalog.
 *
 * Single config for every practice entry point shown across the app
 * (dashboard shell, practice page, setup sheet). Modes flagged `enabled:
 * false` render as a real "Coming soon" state: interactive UI is suppressed
 * and the mode is skipped when building routes, but flipping the flag on is
 * the only change needed to launch it.
 */

export type PracticeModeGroup = "tests" | "review" | "focus" | "memorize" | "challenge";

/** Exam-runner level slugs the routes are templated against. */
export type ExamRunnerLevel = "professional" | "subprofessional";

export interface PracticeModeDef {
  id: string;
  group: PracticeModeGroup;
  name: string;
  description: string;
  icon: string; // lucide icon name consumed by the UI layer
  /** Real exam-engine mode driving the session, when enabled. */
  engineMode?: ExamMode;
  /**
   * Route template this mode opens, when enabled. `{level}` is substituted
   * with the active level slug, so one entry serves both CSE tracks and the
   * active level can never drift from the workspace that declares it.
   */
  href?: string;
  enabled: boolean;
  /** Short fact chips shown on the card, e.g. ["170 items", "3h 10m"]. */
  facts: string[];
}

export const PRACTICE_MODE_GROUPS: { id: PracticeModeGroup; label: string; blurb: string }[] = [
  { id: "tests", label: "Tests", blurb: "Measure where you stand" },
  { id: "review", label: "Review", blurb: "Fix what you got wrong" },
  { id: "focus", label: "Focus", blurb: "Train one thing at a time" },
  { id: "memorize", label: "Memorize", blurb: "Make it stick" },
  { id: "challenge", label: "Challenge", blurb: "Push your pace" },
];

export const PRACTICE_MODES: PracticeModeDef[] = [
  {
    id: "quick",
    group: "tests",
    name: "Quick drill",
    description: "10 mixed questions to warm up.",
    icon: "zap",
    engineMode: "quick",
    href: "/exams/{level}/quick",
    enabled: true,
    facts: ["10 items", "~10 min"],
  },
  {
    id: "medium",
    group: "tests",
    name: "Medium assessment",
    description: "A 30-item check across all subjects.",
    icon: "list-checks",
    engineMode: "medium",
    href: "/exams/{level}/medium",
    enabled: true,
    facts: ["30 items", "~30 min"],
  },
  {
    id: "full",
    group: "tests",
    name: "Full mock exam",
    description: "The complete exam under one continuous countdown.",
    icon: "target",
    engineMode: "full",
    href: "/exams/{level}/full",
    enabled: true,
    facts: ["Level length", "Exam conditions"],
  },
  {
    id: "diagnostic",
    group: "tests",
    name: "Diagnostic test",
    description: "A short check that shows where you stand.",
    icon: "gauge",
    engineMode: "quick",
    href: "/exams/{level}/quick",
    enabled: true,
    facts: ["All subjects"],
  },
  {
    id: "srs",
    group: "review",
    name: "Spaced review",
    description: "Questions return just before you would forget them.",
    icon: "repeat",
    engineMode: "mistakes",
    href: "/dashboard/mistakes",
    enabled: true,
    facts: ["Due items first"],
  },
  {
    id: "mistakes",
    group: "review",
    name: "Mistake bank",
    description: "Retry every question you got wrong.",
    icon: "layers",
    engineMode: "mistakes",
    href: "/dashboard/mistakes",
    enabled: true,
    facts: ["From your sessions"],
  },
  {
    id: "bookmarks",
    group: "review",
    name: "Bookmarked questions",
    description: "Practice the questions you saved.",
    icon: "bookmark",
    engineMode: "bookmarks",
    href: "/dashboard/bookmarks",
    enabled: true,
    facts: ["Your saved items"],
  },
  {
    id: "topics",
    group: "focus",
    name: "Topic practice",
    description: "Pick a subject and drill only that.",
    icon: "book-open",
    engineMode: "practice",
    href: "/practice",
    enabled: true,
    facts: ["By subject"],
  },
  {
    id: "weak-spot",
    group: "focus",
    name: "Weak-spot drill",
    description: "Automatically picks your lowest subject.",
    icon: "crosshair",
    enabled: false,
    facts: ["Auto"],
  },
  {
    id: "custom-builder",
    group: "focus",
    name: "Custom test builder",
    description: "Choose subjects, length, and timer yourself.",
    icon: "sliders-horizontal",
    enabled: false,
    facts: ["You decide"],
  },
  {
    id: "flashcards",
    group: "memorize",
    name: "Flashcards",
    description: "Flip through key terms, laws, and formulas.",
    icon: "square-stack",
    enabled: false,
    facts: ["Self-paced"],
  },
  {
    id: "vocab",
    group: "memorize",
    name: "Vocabulary builder",
    description: "Short daily word sets for the verbal section.",
    icon: "letter-text",
    enabled: false,
    facts: ["5 min a day"],
  },
  {
    id: "formula-sheets",
    group: "memorize",
    name: "Rules and formula sheets",
    description: "One-page summaries you can open mid-practice.",
    icon: "file-text",
    enabled: false,
    facts: ["Quick reference"],
  },
  {
    id: "timed-sprint",
    group: "challenge",
    name: "Timed sprint",
    description: "Answer as many as you can before time runs out.",
    icon: "timer",
    enabled: false,
    facts: ["Speed"],
  },
  {
    id: "daily-challenge",
    group: "challenge",
    name: "Daily challenge",
    description: "Five mixed questions, one new set every day.",
    icon: "trophy",
    enabled: false,
    facts: ["5 items"],
  },
];

/** Substitutes `{level}` (and tolerates legacy literal routes) for a level. */
export function resolvePracticeModeHref(
  href: string | undefined,
  level: string
): string {
  if (!href) return "/practice";
  return href.replace(/\{level\}/g, level);
}

/**
 * Maps a workspace `levelId` to the runner route's level slug.
 *
 * Workspace level ids come in three shapes: plain slugs ("professional"),
 * exam-prefixed ids ("cse-professional" from Preferences), and legacy
 * "track-*" ids from pre-migration workspaces. Runner routes are addressed
 * by plain slug (/exams/[level]/...), so every call site that builds a runner
 * URL must go through this mapping instead of embedding the raw level id.
 */
export function resolveRunnerLevelSlug(levelId: string | undefined | null): string {
  const raw = (levelId || "").toLowerCase();
  if (raw.endsWith("subprofessional") || raw.endsWith("track-subpro")) return "subprofessional";
  if (raw.endsWith("professional") || raw.endsWith("track-pro")) return "professional";
  return "professional";
}

/**
 * Resolves a practice mode's route for a workspace level id, substituting the
 * `{level}` template segment. Returns the practice hub when the mode has no
 * route (or is disabled) — never a literal `{level}` URL, which 404s.
 */
export function getPracticeModeHrefForLevel(mode: PracticeModeDef | undefined, levelId: string | undefined | null): string {
  if (!mode || !mode.enabled) return "/practice";
  return getPracticeModeHref(mode, resolveRunnerLevelSlug(levelId));
}

/** Resolves a mode's href for the given level. */
export function getPracticeModeHref(mode: PracticeModeDef, level: string): string {
  return resolvePracticeModeHref(mode.href, level);
}

export function getEnabledPracticeModes(): PracticeModeDef[] {
  return PRACTICE_MODES.filter((m) => m.enabled);
}

export function getPracticeModesByGroup(group: PracticeModeGroup): PracticeModeDef[] {
  return PRACTICE_MODES.filter((m) => m.group === group);
}

export function getPracticeMode(id: string): PracticeModeDef | undefined {
  return PRACTICE_MODES.find((m) => m.id === id);
}
