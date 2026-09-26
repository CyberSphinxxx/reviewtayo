export type ExamAvailability = "available" | "beta" | "coming-soon";

export type ExamCategory = "civil-service" | "licensure" | "public-safety";

export interface ExamLevel {
  id: "professional" | "subprofessional" | string;
  name: string;
  shortName: string;
  description: string;
  items: number;
  timeLimitMinutes: number;
  itemCount?: number;
  durationMinutes?: number;
}

export interface ExamDiagnosticConfig {
  questionCount: number;
  durationMinutes: number;
  label: string;
}

export interface ExamStat {
  label: string;
  value: string | number;
}

export interface ExamSubjectConfig {
  id: string;
  slug: string;
  name: string;
  order: number;
  description?: string;
  levelIds?: string[]; // If restricted to specific levels
}

export interface ExamCapabilities {
  hasQuickDrill: boolean;
  hasMediumAssessment: boolean;
  hasFullMock: boolean;
  hasTopicPractice: boolean;
}

export interface ExamRoutes {
  infoUrl: string;
  practiceUrl: string;
  quickDrillUrl?: string;
  fullMockUrl?: string;
}

export interface ExamMockSpecs {
  itemCount: number;
  timeLimitMinutes: number;
  passingScorePercentage: number;
}

export interface ExamCatalogEntry {
  id: string;
  slug: string;
  name?: string;
  shortName: string;
  fullName: string;
  description: string;
  agency: string;
  availability: ExamAvailability;
  status?: "live" | "coming_soon";
  category: ExamCategory;
  levels: ExamLevel[];
  diagnostic: ExamDiagnosticConfig;
  examDate?: string;
  stats?: ExamStat[];
  subtests?: { id: string; name: string; items?: number }[];
  accent: "brand" | "blue" | "emerald" | "amber" | "indigo";
  href: string;
  actionLabel: string;
  badgeText: string;
  subjects?: ExamSubjectConfig[];
  capabilities?: ExamCapabilities;
  routes?: ExamRoutes;
  mockSpecs?: ExamMockSpecs;
  defaultTargetDate?: string;
  defaultTargetName?: string;
}

export const CATEGORY_LABELS: Record<ExamCategory, string> = {
  "civil-service": "Civil Service",
  "licensure": "Licensure",
  "public-safety": "Public Safety",
};

export function getCategoryLabel(category: ExamCategory): string {
  return CATEGORY_LABELS[category] || category;
}

export const EXAM_CATALOG: ExamCatalogEntry[] = [
  {
    id: "cse",
    slug: "cse",
    name: "Civil Service Exam (CSE)",
    shortName: "CSE",
    fullName: "Civil Service Exam (CSE)",
    description:
      "Independent preparation for Career Service Professional and Subprofessional examinations with full-length continuous timers and detailed subject breakdowns.",
    agency: "Civil Service Commission (CSC)",
    availability: "available",
    status: "live",
    category: "civil-service",
    levels: [
      {
        id: "professional",
        name: "Career Service Professional",
        shortName: "Professional",
        description: "For second-level positions",
        items: 170,
        timeLimitMinutes: 190,
        itemCount: 170,
        durationMinutes: 190,
      },
      {
        id: "subprofessional",
        name: "Career Service Subprofessional",
        shortName: "Subprofessional",
        description: "For first-level positions",
        items: 165,
        timeLimitMinutes: 160,
        itemCount: 165,
        durationMinutes: 160,
      },
    ],
    diagnostic: {
      questionCount: 10,
      durationMinutes: 10,
      label: "10 questions · 10 minutes",
    },
    examDate: "2027-03-14",
    stats: [
      { label: "Subtests", value: 5 },
      { label: "Full mock items", value: "170 / 165" },
      { label: "Mock duration", value: "3h 10m / 2h 40m" },
    ],
    subtests: [
      { id: "sub-pro-verbal", name: "Verbal Ability", items: 50 },
      { id: "sub-pro-numerical", name: "Numerical Ability", items: 40 },
      { id: "sub-pro-analytical", name: "Analytical Ability", items: 40 },
      { id: "sub-pro-geninfo", name: "General Information", items: 20 },
      { id: "sub-subpro-clerical", name: "Clerical Operations", items: 35 },
    ],
    accent: "brand",
    href: "/cse",
    actionLabel: "Open exam",
    badgeText: "Available Today",
    capabilities: {
      hasQuickDrill: true,
      hasMediumAssessment: true,
      hasFullMock: true,
      hasTopicPractice: true,
    },
    routes: {
      infoUrl: "/cse/exam-guide",
      practiceUrl: "/practice",
      quickDrillUrl: "/exams/professional/quick",
      fullMockUrl: "/exams/professional/full",
    },
    mockSpecs: {
      itemCount: 170,
      timeLimitMinutes: 190,
      passingScorePercentage: 80,
    },
    defaultTargetDate: "2027-03-14",
    defaultTargetName: "March 2027 CSE-PPT",
    subjects: [
      { id: "sub-pro-verbal", slug: "verbal-ability", name: "Verbal Ability", order: 1 },
      { id: "sub-pro-numerical", slug: "numerical-ability", name: "Numerical Ability", order: 2 },
      { id: "sub-pro-analytical", slug: "analytical-ability", name: "Analytical Ability", order: 3, levelIds: ["professional"] },
      { id: "sub-pro-geninfo", slug: "general-information", name: "General Information", order: 4 },
      { id: "sub-subpro-clerical", slug: "clerical-operations", name: "Clerical Operations", order: 5, levelIds: ["subprofessional"] },
    ],
  },
  {
    id: "let",
    slug: "let",
    name: "Licensure Examination for Teachers",
    shortName: "LET",
    fullName: "Licensure Examination for Teachers (LET)",
    description:
      "Comprehensive reviewer covering General Education, Professional Education, and major subject specializations for future Filipino educators.",
    agency: "Professional Regulation Commission (PRC)",
    availability: "coming-soon",
    status: "coming_soon",
    category: "licensure",
    levels: [
      {
        id: "elementary",
        name: "Elementary Teacher Education",
        shortName: "Elementary",
        description: "General Education (40%) and Professional Education (60%).",
        items: 150,
        timeLimitMinutes: 180,
        itemCount: 150,
        durationMinutes: 180,
      },
      {
        id: "secondary",
        name: "Secondary Teacher Education",
        shortName: "Secondary",
        description: "General Education (20%), Professional Education (40%), and Specialization (40%).",
        items: 150,
        timeLimitMinutes: 180,
        itemCount: 150,
        durationMinutes: 180,
      },
    ],
    diagnostic: {
      questionCount: 10,
      durationMinutes: 10,
      label: "10 questions · 10 minutes",
    },
    accent: "blue",
    href: "/let",
    actionLabel: "Planned Reviewer",
    badgeText: "Coming Soon",
    capabilities: {
      hasQuickDrill: false,
      hasMediumAssessment: false,
      hasFullMock: false,
      hasTopicPractice: false,
    },
    routes: {
      infoUrl: "/reviewers",
      practiceUrl: "/reviewers",
    },
    defaultTargetDate: "2027-09-26",
    defaultTargetName: "September 2027 LET",
    examDate: "2027-09-26",
    subjects: [
      { id: "sub-let-gened", slug: "general-education", name: "General Education", order: 1 },
      { id: "sub-let-profed", slug: "professional-education", name: "Professional Education", order: 2 },
      { id: "sub-let-specialization", slug: "specialization", name: "Major / Specialization", order: 3, levelIds: ["secondary"] },
    ],
  },
  {
    id: "cle",
    slug: "criminology",
    name: "Criminologist Licensure Examination",
    shortName: "CLE",
    fullName: "Criminologist Licensure Examination",
    description:
      "Core criminology competencies covering criminal jurisprudence, law enforcement administration, criminalistics, and correctional administration.",
    agency: "Professional Regulation Commission (PRC)",
    availability: "coming-soon",
    status: "coming_soon",
    category: "licensure",
    levels: [
      {
        id: "boards",
        name: "Criminologist Licensure",
        shortName: "CLE Boards",
        description: "Comprehensive 6-part professional licensure examination.",
        items: 600,
        timeLimitMinutes: 360,
        itemCount: 600,
        durationMinutes: 360,
      },
    ],
    diagnostic: {
      questionCount: 10,
      durationMinutes: 10,
      label: "10 questions · 10 minutes",
    },
    accent: "emerald",
    href: "/criminology",
    actionLabel: "Planned Reviewer",
    badgeText: "Coming Soon",
    capabilities: {
      hasQuickDrill: false,
      hasMediumAssessment: false,
      hasFullMock: false,
      hasTopicPractice: false,
    },
    routes: {
      infoUrl: "/reviewers",
      practiceUrl: "/reviewers",
    },
    subjects: [
      { id: "sub-cle-juris", slug: "criminal-jurisprudence", name: "Criminal Jurisprudence & Procedure", order: 1 },
      { id: "sub-cle-admin", slug: "law-enforcement-admin", name: "Law Enforcement Administration", order: 2 },
      { id: "sub-cle-crim", slug: "criminalistics", name: "Criminalistics", order: 3 },
      { id: "sub-cle-soc", slug: "crime-detection", name: "Crime Detection & Investigation", order: 4 },
      { id: "sub-cle-corr", slug: "correctional-admin", name: "Correctional Administration", order: 5 },
      { id: "sub-cle-ethics", slug: "criminology-ethics", name: "Criminology Ethics & Human Relations", order: 6 },
    ],
  },
  {
    id: "napolcom",
    slug: "napolcom",
    name: "PNP / NAPOLCOM Entrance Exam",
    shortName: "NAPOLCOM",
    fullName: "NAPOLCOM Police Examinations & Entrance Test",
    description:
      "PNP Entrance and Police Promotional Examinations covering police operations, constitutional mandates, and public safety ethics.",
    agency: "National Police Commission (NAPOLCOM)",
    availability: "coming-soon",
    status: "coming_soon",
    category: "public-safety",
    levels: [
      {
        id: "entrance",
        name: "PNP Entrance Examination",
        shortName: "PNP Entrance",
        description: "Required for civilian applicants entering the Philippine National Police.",
        items: 150,
        timeLimitMinutes: 180,
        itemCount: 150,
        durationMinutes: 180,
      },
      {
        id: "promotional",
        name: "Police Promotional Examinations",
        shortName: "Promotional",
        description: "Eligibility assessment for active police personnel advancing in rank.",
        items: 150,
        timeLimitMinutes: 180,
        itemCount: 150,
        durationMinutes: 180,
      },
    ],
    diagnostic: {
      questionCount: 10,
      durationMinutes: 10,
      label: "10 questions · 10 minutes",
    },
    accent: "indigo",
    href: "/napolcom",
    actionLabel: "Planned Reviewer",
    badgeText: "Coming Soon",
    capabilities: {
      hasQuickDrill: false,
      hasMediumAssessment: false,
      hasFullMock: false,
      hasTopicPractice: false,
    },
    routes: {
      infoUrl: "/reviewers",
      practiceUrl: "/reviewers",
    },
    subjects: [
      { id: "sub-nap-law", slug: "law-enforcement", name: "Law Enforcement & Police Operations", order: 1 },
      { id: "sub-nap-const", slug: "constitutional-law", name: "Constitutional & Criminal Law", order: 2 },
      { id: "sub-nap-verbal", slug: "verbal-aptitude", name: "Verbal Aptitude", order: 3 },
      { id: "sub-nap-quant", slug: "quantitative-reasoning", name: "Quantitative Reasoning", order: 4 },
    ],
  },
  {
    id: "nursing",
    slug: "nursing",
    name: "Philippine Nursing Licensure Examination",
    shortName: "NLE",
    fullName: "Philippine Nursing Licensure Examination",
    description:
      "Comprehensive 5-part clinical and theoretical nursing practice assessment for aspiring Registered Nurses.",
    agency: "Professional Regulation Commission (PRC)",
    availability: "coming-soon",
    status: "coming_soon",
    category: "licensure",
    levels: [
      {
        id: "boards",
        name: "Nurse Licensure (NLE)",
        shortName: "RN Licensure",
        description: "Comprehensive 5-part nursing practice assessment.",
        items: 500,
        timeLimitMinutes: 300,
        itemCount: 500,
        durationMinutes: 300,
      },
    ],
    diagnostic: {
      questionCount: 10,
      durationMinutes: 10,
      label: "10 questions · 10 minutes",
    },
    accent: "emerald",
    href: "/nursing",
    actionLabel: "Planned Reviewer",
    badgeText: "Coming Soon",
    capabilities: {
      hasQuickDrill: false,
      hasMediumAssessment: false,
      hasFullMock: false,
      hasTopicPractice: false,
    },
    routes: {
      infoUrl: "/reviewers",
      practiceUrl: "/reviewers",
    },
    defaultTargetDate: "2027-11-14",
    defaultTargetName: "November 2027 NLE",
    subjects: [
      { id: "sub-nle-ch", slug: "community-health", name: "Community Health Nursing", order: 1 },
      { id: "sub-nle-mc", slug: "maternal-child", name: "Maternal and Child Nursing", order: 2 },
      { id: "sub-nle-ms", slug: "medical-surgical", name: "Medical-Surgical Nursing", order: 3 },
      { id: "sub-nle-mh", slug: "mental-health", name: "Mental Health & Psychiatric Nursing", order: 4 },
      { id: "sub-nle-fund", slug: "fundamentals", name: "Fundamentals of Nursing", order: 5 },
    ],
  },
  {
    id: "bfp",
    slug: "bfp",
    name: "Bureau of Fire Protection Examinations",
    shortName: "BFP / FOE",
    fullName: "Bureau of Fire Protection Examinations",
    description:
      "Recruitment and entry qualification for fire service personnel covering Fire Safety Code, suppression, and administration.",
    agency: "Bureau of Fire Protection / CSC",
    availability: "coming-soon",
    status: "coming_soon",
    category: "public-safety",
    levels: [
      {
        id: "foe",
        name: "Fire Officer Examination (FOE)",
        shortName: "FOE Qualifying",
        description: "Recruitment and entry qualification for fire service personnel.",
        items: 100,
        timeLimitMinutes: 120,
        itemCount: 100,
        durationMinutes: 120,
      },
    ],
    diagnostic: {
      questionCount: 10,
      durationMinutes: 10,
      label: "10 questions · 10 minutes",
    },
    accent: "amber",
    href: "/bfp",
    actionLabel: "Planned Reviewer",
    badgeText: "Coming Soon",
    capabilities: {
      hasQuickDrill: false,
      hasMediumAssessment: false,
      hasFullMock: false,
      hasTopicPractice: false,
    },
    routes: {
      infoUrl: "/reviewers",
      practiceUrl: "/reviewers",
    },
    subjects: [
      { id: "sub-bfp-fire", slug: "fire-suppression", name: "Fire Suppression & Investigation", order: 1 },
      { id: "sub-bfp-safety", slug: "fire-safety-code", name: "Fire Safety & RA 9514 Code", order: 2 },
      { id: "sub-bfp-admin", slug: "administrative-service", name: "Administrative Service Matters", order: 3 },
      { id: "sub-bfp-general", slug: "general-ability", name: "General Ability", order: 4 },
    ],
  },
];

export function getAllExams(): ExamCatalogEntry[] {
  return EXAM_CATALOG;
}

export function getAvailableExams(): ExamCatalogEntry[] {
  return EXAM_CATALOG.filter((exam) => exam.availability === "available");
}

export function getExamBySlug(slug: string): ExamCatalogEntry | undefined {
  return EXAM_CATALOG.find((exam) => exam.slug.toLowerCase() === slug.toLowerCase() || exam.id.toLowerCase() === slug.toLowerCase());
}

export function getExamConfig(examId: string): ExamCatalogEntry | undefined {
  return EXAM_CATALOG.find((exam) => exam.id.toLowerCase() === examId.toLowerCase() || exam.slug.toLowerCase() === examId.toLowerCase());
}

export function getExamSubjects(examId: string, levelId?: string): ExamSubjectConfig[] {
  const exam = getExamConfig(examId);
  if (!exam || !exam.subjects) return [];
  if (!levelId) return exam.subjects;
  return exam.subjects.filter((s) => !s.levelIds || s.levelIds.includes(levelId));
}

export function getExamTrack(examId: string, levelId?: string): ExamLevel | undefined {
  const exam = getExamConfig(examId);
  if (!exam || !exam.levels) return undefined;
  if (!levelId) return exam.levels[0];
  return exam.levels.find((lvl) => lvl.id.toLowerCase() === levelId.toLowerCase());
}

export function getFeaturedExam(): ExamCatalogEntry {
  const cse = EXAM_CATALOG.find((exam) => exam.id === "cse");
  if (!cse) {
    throw new Error("Featured CSE exam configuration is required in catalog");
  }
  return cse;
}

/**
 * Level-aware route bundle for the ACTIVE workspace.
 *
 * EXAM_CATALOG.routes stays the documented marketing/default routes, but any
 * surface tied to what the learner is actually studying must derive its runner
 * links from the active workspace's level — otherwise a subprofessional
 * learner gets professional question pools. Falls back to the exam's catalog
 * routes when the level is missing or has no catalog entry.
 */
export function getExamRoutesForLevel(
  examId: string,
  levelId?: string
): ExamRoutes {
  const exam = getExamConfig(examId);
  const routes: ExamRoutes = exam?.routes ?? {
    infoUrl: "/cse/exam-guide",
    practiceUrl: "/practice",
  };
  if (!exam || !levelId) return routes;

  const levelSlug = levelId.startsWith("cse-") ? levelId.slice(4) : levelId;
  if (!exam.levels.some((lvl) => lvl.id === levelSlug)) return routes;

  return {
    ...routes,
    quickDrillUrl: routes.quickDrillUrl
      ? routes.quickDrillUrl.replace("/professional/", `/${levelSlug}/`)
      : `/exams/${levelSlug}/quick`,
    fullMockUrl: routes.fullMockUrl
      ? routes.fullMockUrl.replace("/professional/", `/${levelSlug}/`)
      : `/exams/${levelSlug}/full`,
  };
}

/** Level-aware runner specs (items, duration, passing score) for a workspace. */
export function getExamMockSpecsForLevel(
  examId: string,
  levelId?: string
): ExamMockSpecs | undefined {
  const exam = getExamConfig(examId);
  if (!exam?.mockSpecs) return undefined;
  const levelSlug = levelId?.startsWith("cse-") ? levelId.slice(4) : levelId;
  const level = exam.levels.find((lvl) => lvl.id === levelSlug);
  if (!level) return exam.mockSpecs;
  return {
    itemCount: level.itemCount ?? level.items,
    timeLimitMinutes: level.durationMinutes ?? level.timeLimitMinutes,
    passingScorePercentage: exam.mockSpecs.passingScorePercentage,
  };
}

/**
 * Runner route for a specific exam level and mode (guide §16: centralized
 * route generation — no component constructs exam runner URLs by hand).
 * Derives from the exam's catalog runner URLs. Modes without a dedicated
 * runner route (topic practice, mistake/bookmark drills) return the exam's
 * practice hub instead of a fabricated /exams/[level]/[mode] 404.
 */
export function getExamRunnerRouteForMode(
  examId: string,
  levelId: string | undefined,
  mode: string
): string | undefined {
  const routes = getExamRoutesForLevel(examId, levelId);
  if (mode === "quick") return routes.quickDrillUrl;
  if (mode === "full") return routes.fullMockUrl;
  return routes.practiceUrl;
}
