import type { EngineQuestion } from "@/features/exam-engine";

export interface SeedExam {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface SeedExamLevel {
  id: string;
  examId: string;
  slug: string;
  /** Track id as used by workspaces/preferences (e.g. "professional"). */
  trackId: string;
  name: string;
  description: string;
  isDefault: boolean;
}

export interface SeedSubject {
  id: string;
  examLevelId: string;
  slug: string;
  name: string;
  order: number;
  description: string;
}

export interface SeedTopic {
  id: string;
  subjectId: string;
  slug: string;
  name: string;
  order: number;
  description: string;
}

export interface SeedExamRule {
  id: string;
  examLevelId: string;
  mode: "quick" | "medium" | "full";
  itemCount: number;
  timeLimitMinutes: number;
  passingScorePercentage: number;
  allowsFlagging: boolean;
  hasContinuousTimer: boolean;
  subjectDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
}

export const SEED_EXAM: SeedExam = {
  id: "exam-cse",
  slug: "ph-cse",
  name: "Philippine Civil Service Examination",
  description:
    "Official Civil Service Commission (CSC) Career Service Examination Pen and Paper Test (CSE-PPT) for Professional and Subprofessional eligibility.",
};

export const SEED_LEVELS: SeedExamLevel[] = [
  {
    id: "level-pro",
    examId: "exam-cse",
    slug: "professional",
    trackId: "professional",
    name: "Career Service Professional",
    description: "Eligible for second-level and first-level positions in the Philippine Civil Service.",
    isDefault: true,
  },
  {
    id: "level-subpro",
    examId: "exam-cse",
    slug: "subprofessional",
    trackId: "subprofessional",
    name: "Career Service Subprofessional",
    description: "Eligible for first-level (clerical, trades, crafts) positions in the Philippine Civil Service.",
    isDefault: false,
  },
];

export const SEED_RULES: SeedExamRule[] = [
  // Professional Rules
  {
    id: "rule-pro-quick",
    examLevelId: "level-pro",
    mode: "quick",
    itemCount: 10,
    timeLimitMinutes: 10,
    passingScorePercentage: 80,
    allowsFlagging: true,
    hasContinuousTimer: true,
    subjectDistribution: {
      "sub-pro-verbal": 3,
      "sub-pro-numerical": 3,
      "sub-pro-analytical": 2,
      "sub-pro-geninfo": 2,
    },
    difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
  },
  {
    id: "rule-pro-medium",
    examLevelId: "level-pro",
    mode: "medium",
    itemCount: 30,
    timeLimitMinutes: 30,
    passingScorePercentage: 80,
    allowsFlagging: true,
    hasContinuousTimer: true,
    subjectDistribution: {
      "sub-pro-verbal": 8,
      "sub-pro-numerical": 8,
      "sub-pro-analytical": 8,
      "sub-pro-geninfo": 6,
    },
    difficultyDistribution: { easy: 25, medium: 55, hard: 20 },
  },
  {
    id: "rule-pro-full",
    examLevelId: "level-pro",
    mode: "full",
    itemCount: 170, // 170 items per real CSE Professional PPT
    timeLimitMinutes: 190, // 3 hours 10 minutes single continuous timer per §50
    passingScorePercentage: 80,
    allowsFlagging: true,
    hasContinuousTimer: true,
    subjectDistribution: {
      "sub-pro-verbal": 50,
      "sub-pro-numerical": 40,
      "sub-pro-analytical": 40,
      "sub-pro-geninfo": 40,
    },
    difficultyDistribution: { easy: 20, medium: 60, hard: 20 },
  },
  // Subprofessional Rules
  {
    id: "rule-subpro-quick",
    examLevelId: "level-subpro",
    mode: "quick",
    itemCount: 10,
    timeLimitMinutes: 10,
    passingScorePercentage: 80,
    allowsFlagging: true,
    hasContinuousTimer: true,
    subjectDistribution: {
      "sub-subpro-verbal": 3,
      "sub-subpro-numerical": 3,
      "sub-subpro-clerical": 2,
      "sub-subpro-geninfo": 2,
    },
    difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
  },
  {
    id: "rule-subpro-medium",
    examLevelId: "level-subpro",
    mode: "medium",
    itemCount: 30,
    timeLimitMinutes: 30,
    passingScorePercentage: 80,
    allowsFlagging: true,
    hasContinuousTimer: true,
    subjectDistribution: {
      "sub-subpro-verbal": 8,
      "sub-subpro-numerical": 8,
      "sub-subpro-clerical": 8,
      "sub-subpro-geninfo": 6,
    },
    difficultyDistribution: { easy: 25, medium: 55, hard: 20 },
  },
  {
    id: "rule-subpro-full",
    examLevelId: "level-subpro",
    mode: "full",
    itemCount: 165, // 165 items per real CSE Subprofessional PPT
    timeLimitMinutes: 160, // 2 hours 40 minutes single continuous timer per §50
    passingScorePercentage: 80,
    allowsFlagging: true,
    hasContinuousTimer: true,
    subjectDistribution: {
      "sub-subpro-verbal": 50,
      "sub-subpro-numerical": 40,
      "sub-subpro-clerical": 40,
      "sub-subpro-geninfo": 35,
    },
    difficultyDistribution: { easy: 20, medium: 60, hard: 20 },
  },
];

export const SEED_SUBJECTS: SeedSubject[] = [
  // Professional Subjects
  {
    id: "sub-pro-verbal",
    examLevelId: "level-pro",
    slug: "verbal-ability",
    name: "Verbal Ability",
    order: 1,
    description: "Grammar, correct usage, vocabulary, reading comprehension, and paragraph organization in English and Filipino.",
  },
  {
    id: "sub-pro-numerical",
    examLevelId: "level-pro",
    slug: "numerical-ability",
    name: "Numerical Ability",
    order: 2,
    description: "Basic operations, fractions, percentages, ratios, number sequences, word problems, and data interpretation.",
  },
  {
    id: "sub-pro-analytical",
    examLevelId: "level-pro",
    slug: "analytical-ability",
    name: "Analytical Ability",
    order: 3,
    description: "Analogy, logic, critical reasoning, identifying assumptions and conclusions.",
  },
  {
    id: "sub-pro-geninfo",
    examLevelId: "level-pro",
    slug: "general-information",
    name: "General Information",
    order: 4,
    description: "Philippine Constitution, Code of Conduct (RA 6713), Human Rights, and Environmental Protection.",
  },
  // Subprofessional Subjects
  {
    id: "sub-subpro-verbal",
    examLevelId: "level-subpro",
    slug: "verbal-ability",
    name: "Verbal Ability",
    order: 1,
    description: "Grammar, vocabulary, and reading comprehension.",
  },
  {
    id: "sub-subpro-numerical",
    examLevelId: "level-subpro",
    slug: "numerical-ability",
    name: "Numerical Ability",
    order: 2,
    description: "Fundamental arithmetic, fractions, percentages, and practical word problems.",
  },
  {
    id: "sub-subpro-clerical",
    examLevelId: "level-subpro",
    slug: "clerical-ability",
    name: "Clerical Ability",
    order: 3,
    description: "Alphabetizing, filing rules, spelling, proofreading, and office information procedures.",
  },
  {
    id: "sub-subpro-geninfo",
    examLevelId: "level-subpro",
    slug: "general-information",
    name: "General Information",
    order: 4,
    description: "Philippine Constitution, RA 6713 ethics, and civic duties.",
  },
];

export const SEED_TOPICS: SeedTopic[] = [
  // Professional Topics
  { id: "top-pro-grammar", subjectId: "sub-pro-verbal", slug: "grammar-usage", name: "Grammar & Correct Usage", order: 1, description: "Subject-verb agreement, pronoun cases, modifiers, parallelism, idioms." },
  { id: "top-pro-vocab", subjectId: "sub-pro-verbal", slug: "vocabulary", name: "Vocabulary & Context Clues", order: 2, description: "Synonyms, antonyms, tone, and contextual vocabulary." },
  { id: "top-pro-reading", subjectId: "sub-pro-verbal", slug: "reading-comprehension", name: "Reading Comprehension", order: 3, description: "Main ideas, inferences, author's tone, and structural analysis." },
  { id: "top-pro-percentages", subjectId: "sub-pro-numerical", slug: "percentages", name: "Percentages & Interest", order: 1, description: "Percentage increases, discounts, simple and compound interest." },
  { id: "top-pro-sequences", subjectId: "sub-pro-numerical", slug: "number-sequences", name: "Number Sequences & Series", order: 2, description: "Arithmetic, geometric, alternating, and pattern series." },
  { id: "top-pro-wordprobs", subjectId: "sub-pro-numerical", slug: "word-problems", name: "Word Problems & Rates", order: 3, description: "Work problems, motion, ages, mixture, and financial math." },
  { id: "top-pro-analogy", subjectId: "sub-pro-analytical", slug: "analogy", name: "Analogy & Logic", order: 1, description: "Word relationships, part-to-whole, degree, function, and categorical analogies." },
  { id: "top-pro-reasoning", subjectId: "sub-pro-analytical", slug: "critical-reasoning", name: "Critical & Deductive Reasoning", order: 2, description: "Syllogisms, assumptions, valid deductions, and logical fallacies." },
  { id: "top-pro-consti", subjectId: "sub-pro-geninfo", slug: "philippine-constitution", name: "1987 Philippine Constitution", order: 1, description: "Bill of Rights, three branches of government, constitutional commissions." },
  { id: "top-pro-ra6713", subjectId: "sub-pro-geninfo", slug: "ra-6713-ethics", name: "RA 6713 Code of Conduct", order: 2, description: "Public servant ethical standards, prohibited transactions, SALN requirements." },

  // Subprofessional Topics
  { id: "top-subpro-clerical-filing", subjectId: "sub-subpro-clerical", slug: "filing-alphabetizing", name: "Filing & Alphabetizing", order: 1, description: "Standard filing rules, indexing order, and alphabetical sorting procedures." },
  { id: "top-subpro-spelling", subjectId: "sub-subpro-clerical", slug: "spelling-proofreading", name: "Spelling & Proofreading", order: 2, description: "Detecting typographical, orthographical, and clerical errors." },
];

/**
 * Original development & seed questions authored from scratch per skills/content-authoring/SKILL.md.
 * All questions are strictly marked isSeedData: true for data tracking and status: 'draft'.
 * Never copied from external third-party reviewers.
 */
export const SEED_QUESTIONS: EngineQuestion[] = [
  // 1. Verbal Ability - Grammar
  {
    id: "seed-q1",
    topicId: "top-pro-grammar",
    topicName: "Grammar & Correct Usage",
    topicSlug: "grammar-usage",
    subjectId: "sub-pro-verbal",
    subjectName: "Verbal Ability",
    subjectSlug: "verbal-ability",
    questionText: "Which sentence demonstrates correct subject-verb agreement?",
    explanation: "When a collective noun like 'committee' acts as a unified singular body in unanimous agreement, it takes a singular verb ('has'). When members act individually, plural verbs apply.",
    difficulty: "medium",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq1-a", choiceLabel: "A", text: "The committee has submitted its official evaluation report on schedule.", isCorrect: true, order: 0 },
      { id: "sq1-b", choiceLabel: "B", text: "The committee have submitted its official evaluation report on schedule.", isCorrect: false, order: 1 },
      { id: "sq1-c", choiceLabel: "C", text: "The committee have submit their official evaluation report on schedule.", isCorrect: false, order: 2 },
      { id: "sq1-d", choiceLabel: "D", text: "The committee has submitted their official evaluation report on schedule.", isCorrect: false, order: 3 },
    ],
  },
  // 2. Verbal Ability - Vocabulary
  {
    id: "seed-q2",
    topicId: "top-pro-vocab",
    topicName: "Vocabulary & Context Clues",
    topicSlug: "vocabulary",
    subjectId: "sub-pro-verbal",
    subjectName: "Verbal Ability",
    subjectSlug: "verbal-ability",
    questionText: "In the sentence: 'The ombudsman conducted a meticulous audit of all public expenditures,' the word 'meticulous' most nearly means:",
    explanation: "'Meticulous' originates from Latin for fearful or precise, modernly meaning marked by extreme or excessive care in the consideration or treatment of details. 'Thorough and exacting' matches this definition precisely.",
    difficulty: "easy",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq2-a", choiceLabel: "A", text: "Hurried and superficial", isCorrect: false, order: 0 },
      { id: "sq2-b", choiceLabel: "B", text: "Thorough and exacting", isCorrect: true, order: 1 },
      { id: "sq2-c", choiceLabel: "C", text: "Indifferent and lenient", isCorrect: false, order: 2 },
      { id: "sq2-d", choiceLabel: "D", text: "Publicly disputed", isCorrect: false, order: 3 },
    ],
  },
  // 3. Verbal Ability - Filipino Grammar (CSE Verbal Ability covers English and Filipino!)
  {
    id: "seed-q3",
    topicId: "top-pro-grammar",
    topicName: "Grammar & Correct Usage",
    topicSlug: "grammar-usage",
    subjectId: "sub-pro-verbal",
    subjectName: "Verbal Ability",
    subjectSlug: "verbal-ability",
    questionText: "Piliin ang wastong gamit ng 'ng' o 'nang' sa sumusunod na pangungusap:\n'Nagsumikap siya nang husto upang makapasa sa pagsusulit ____ Komisyon sa Serbisyo Sibil.'",
    explanation: "Ginagamit ang 'ng' bilang katumbas ng 'of' na nagpapahayag ng pag-aari o ugnayan ng pangngalan ('pagsusulit ng Komisyon'). Ang 'nang' naman ay ginagamit sa pang-abay (gaya ng 'nang husto') o kung katumbas ng 'noong' / 'para'.",
    difficulty: "medium",
    language: "fil",
    isSeedData: true,
    choices: [
      { id: "sq3-a", choiceLabel: "A", text: "ng", isCorrect: true, order: 0 },
      { id: "sq3-b", choiceLabel: "B", text: "nang", isCorrect: false, order: 1 },
      { id: "sq3-c", choiceLabel: "C", text: "kung", isCorrect: false, order: 2 },
      { id: "sq3-d", choiceLabel: "D", text: "may", isCorrect: false, order: 3 },
    ],
  },
  // 4. Numerical Ability - Percentages
  {
    id: "seed-q4",
    topicId: "top-pro-percentages",
    topicName: "Percentages & Interest",
    topicSlug: "percentages",
    subjectId: "sub-pro-numerical",
    subjectName: "Numerical Ability",
    subjectSlug: "numerical-ability",
    questionText: "A government office budget increased by 15% from last year's allocation of ₱1,200,000. What is the newly approved total budget?",
    explanation: "To calculate an increase of 15%: ₱1,200,000 * 0.15 = ₱180,000 increase. Total = ₱1,200,000 + ₱180,000 = ₱1,380,000 (or simply ₱1,200,000 * 1.15 = ₱1,380,000).",
    difficulty: "easy",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq4-a", choiceLabel: "A", text: "₱1,320,000", isCorrect: false, order: 0 },
      { id: "sq4-b", choiceLabel: "B", text: "₱1,350,000", isCorrect: false, order: 1 },
      { id: "sq4-c", choiceLabel: "C", text: "₱1,380,000", isCorrect: true, order: 2 },
      { id: "sq4-d", choiceLabel: "D", text: "₱1,400,000", isCorrect: false, order: 3 },
    ],
  },
  // 5. Numerical Ability - Number Sequences
  {
    id: "seed-q5",
    topicId: "top-pro-sequences",
    topicName: "Number Sequences & Series",
    topicSlug: "number-sequences",
    subjectId: "sub-pro-numerical",
    subjectName: "Numerical Ability",
    subjectSlug: "numerical-ability",
    questionText: "Determine the next number in the pattern: 3, 7, 15, 31, 63, ____?",
    explanation: "Each term is double the preceding term plus one: 3*2 + 1 = 7, 7*2 + 1 = 15, 15*2 + 1 = 31, 31*2 + 1 = 63. Therefore, 63*2 + 1 = 126 + 1 = 127. Alternatively, the differences are 4, 8, 16, 32, so the next difference is 64 (63 + 64 = 127).",
    difficulty: "medium",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq5-a", choiceLabel: "A", text: "124", isCorrect: false, order: 0 },
      { id: "sq5-b", choiceLabel: "B", text: "126", isCorrect: false, order: 1 },
      { id: "sq5-c", choiceLabel: "C", text: "127", isCorrect: true, order: 2 },
      { id: "sq5-d", choiceLabel: "D", text: "129", isCorrect: false, order: 3 },
    ],
  },
  // 6. Numerical Ability - Word Problems
  {
    id: "seed-q6",
    topicId: "top-pro-wordprobs",
    topicName: "Word Problems & Rates",
    topicSlug: "word-problems",
    subjectId: "sub-pro-numerical",
    subjectName: "Numerical Ability",
    subjectSlug: "numerical-ability",
    questionText: "Officer Perez can process 120 license renewals in 6 hours, while Officer Santos can process 120 license renewals in 4 hours. How long will it take them working together to process 120 renewals?",
    explanation: "Rate of Perez = 120 / 6 = 20 renewals/hr. Rate of Santos = 120 / 4 = 30 renewals/hr. Combined rate = 20 + 30 = 50 renewals/hr. Time required = 120 renewals / 50 renewals/hr = 2.4 hours (2 hours and 24 minutes).",
    difficulty: "hard",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq6-a", choiceLabel: "A", text: "2 hours 15 minutes", isCorrect: false, order: 0 },
      { id: "sq6-b", choiceLabel: "B", text: "2 hours 24 minutes", isCorrect: true, order: 1 },
      { id: "sq6-c", choiceLabel: "C", text: "2 hours 30 minutes", isCorrect: false, order: 2 },
      { id: "sq6-d", choiceLabel: "D", text: "2 hours 45 minutes", isCorrect: false, order: 3 },
    ],
  },
  // 7. Analytical Ability - Analogy
  {
    id: "seed-q7",
    topicId: "top-pro-analogy",
    topicName: "Analogy & Logic",
    topicSlug: "analogy",
    subjectId: "sub-pro-analytical",
    subjectName: "Analytical Ability",
    subjectSlug: "analytical-ability",
    questionText: "TELESCOPE : ASTRONOMER ::\nFind the pair that exhibits the same relationship.",
    explanation: "The relationship is Tool : User. A telescope is the primary instrument used by an astronomer. Similarly, a scalpel is the primary instrument used by a surgeon.",
    difficulty: "easy",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq7-a", choiceLabel: "A", text: "Scalpel : Surgeon", isCorrect: true, order: 0 },
      { id: "sq7-b", choiceLabel: "B", text: "Microscope : Biology", isCorrect: false, order: 1 },
      { id: "sq7-c", choiceLabel: "C", text: "Compass : Direction", isCorrect: false, order: 2 },
      { id: "sq7-d", choiceLabel: "D", text: "Gavel : Courtroom", isCorrect: false, order: 3 },
    ],
  },
  // 8. Analytical Ability - Logic & Deduction
  {
    id: "seed-q8",
    topicId: "top-pro-reasoning",
    topicName: "Critical & Deductive Reasoning",
    topicSlug: "critical-reasoning",
    subjectId: "sub-pro-analytical",
    subjectName: "Analytical Ability",
    subjectSlug: "analytical-ability",
    questionText: "Premise 1: All permanent government personnel must submit a Statement of Assets, Liabilities, and Net Worth (SALN).\nPremise 2: Maria is a permanent personnel in the Department of Budget and Management.\nConclusion: Which deduction must necessarily be true?",
    explanation: "In deductive categorical logic: All A are B. X is A. Therefore, X is B. Since Maria is a permanent personnel, she must strictly submit a SALN.",
    difficulty: "medium",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq8-a", choiceLabel: "A", text: "Maria is exempt from submitting a SALN.", isCorrect: false, order: 0 },
      { id: "sq8-b", choiceLabel: "B", text: "Maria is legally obligated to submit a SALN.", isCorrect: true, order: 1 },
      { id: "sq8-c", choiceLabel: "C", text: "Only personnel in Maria's department are required to submit a SALN.", isCorrect: false, order: 2 },
      { id: "sq8-d", choiceLabel: "D", text: "Maria will receive an automatic promotion upon filing her SALN.", isCorrect: false, order: 3 },
    ],
  },
  // 9. General Information - Constitution
  {
    id: "seed-q9",
    topicId: "top-pro-consti",
    topicName: "1987 Philippine Constitution",
    topicSlug: "philippine-constitution",
    subjectId: "sub-pro-geninfo",
    subjectName: "General Information",
    subjectSlug: "general-information",
    questionText: "Under Article IX-B of the 1987 Philippine Constitution, which body serves as the central personnel agency of the Philippine government?",
    explanation: "Section 3, Article IX-B of the 1987 Constitution explicitly designates the Civil Service Commission (CSC) as the central personnel agency of the Government.",
    difficulty: "easy",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq9-a", choiceLabel: "A", text: "Commission on Audit (COA)", isCorrect: false, order: 0 },
      { id: "sq9-b", choiceLabel: "B", text: "Department of the Interior and Local Government (DILG)", isCorrect: false, order: 1 },
      { id: "sq9-c", choiceLabel: "C", text: "Civil Service Commission (CSC)", isCorrect: true, order: 2 },
      { id: "sq9-d", choiceLabel: "D", text: "Office of the Ombudsman", isCorrect: false, order: 3 },
    ],
  },
  // 10. General Information - RA 6713
  {
    id: "seed-q10",
    topicId: "top-pro-ra6713",
    topicName: "RA 6713 Code of Conduct",
    topicSlug: "ra-6713-ethics",
    subjectId: "sub-pro-geninfo",
    subjectName: "General Information",
    subjectSlug: "general-information",
    questionText: "Under Republic Act No. 6713, within how many working days from receipt must public officials and employees respond to letters, telegrams, or other communications sent by the public?",
    explanation: "Section 5(a) of RA 6713 dictates that all public officials and employees shall, within fifteen (15) working days from receipt thereof, respond to letters, telegrams or other means of communications sent by the public.",
    difficulty: "medium",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq10-a", choiceLabel: "A", text: "5 working days", isCorrect: false, order: 0 },
      { id: "sq10-b", choiceLabel: "B", text: "10 working days", isCorrect: false, order: 1 },
      { id: "sq10-c", choiceLabel: "C", text: "15 working days", isCorrect: true, order: 2 },
      { id: "sq10-d", choiceLabel: "D", text: "30 working days", isCorrect: false, order: 3 },
    ],
  },
  // 11. Subprofessional - Clerical Filing / Alphabetizing
  {
    id: "seed-q11",
    topicId: "top-subpro-clerical-filing",
    topicName: "Filing & Alphabetizing",
    topicSlug: "filing-alphabetizing",
    subjectId: "sub-subpro-clerical",
    subjectName: "Clerical Ability",
    subjectSlug: "clerical-ability",
    questionText: "Under standard alphabetical indexing rules, in what sequence should the following names be filed?\n1. De la Cruz, Juan\n2. Del Rosario, Ana\n3. De los Santos, Pedro\n4. Dela Torre, Maria",
    explanation: "Under standard letter-by-letter indexing of prefixes, spaces between prefix elements are disregarded: 'Delacruz, Juan' comes first, followed by 'Delatorre, Maria', 'Delos Santos, Pedro', and 'Delrosario, Ana'.",
    difficulty: "medium",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq11-a", choiceLabel: "A", text: "1, 4, 3, 2", isCorrect: true, order: 0 },
      { id: "sq11-b", choiceLabel: "B", text: "1, 2, 3, 4", isCorrect: false, order: 1 },
      { id: "sq11-c", choiceLabel: "C", text: "2, 1, 4, 3", isCorrect: false, order: 2 },
      { id: "sq11-d", choiceLabel: "D", text: "4, 1, 3, 2", isCorrect: false, order: 3 },
    ],
  },
  // 12. Subprofessional - Spelling & Proofreading
  {
    id: "seed-q12",
    topicId: "top-subpro-spelling",
    topicName: "Spelling & Proofreading",
    topicSlug: "spelling-proofreading",
    subjectId: "sub-subpro-clerical",
    subjectName: "Clerical Ability",
    subjectSlug: "clerical-ability",
    questionText: "Identify the option that contains a spelling error in clerical documentation:",
    explanation: "'Accomodation' is misspelled; the correct standard spelling requires double 'c' and double 'm': 'Accommodation'. 'Superintendent', 'Liaison', and 'Prerogative' are spelled correctly.",
    difficulty: "easy",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq12-a", choiceLabel: "A", text: "Superintendent", isCorrect: false, order: 0 },
      { id: "sq12-b", choiceLabel: "B", text: "Liaison", isCorrect: false, order: 1 },
      { id: "sq12-c", choiceLabel: "C", text: "Accomodation", isCorrect: true, order: 2 },
      { id: "sq12-d", choiceLabel: "D", text: "Prerogative", isCorrect: false, order: 3 },
    ],
  },
  // 13. Verbal Ability - Paragraph Organization
  {
    id: "seed-q13",
    topicId: "top-pro-grammar",
    topicName: "Grammar & Correct Usage",
    topicSlug: "grammar-usage",
    subjectId: "sub-pro-verbal",
    subjectName: "Verbal Ability",
    subjectSlug: "verbal-ability",
    questionText: "Arrange the sentences into a coherent paragraph:\n1. Consequently, citizen trust in government processes significantly improves.\n2. Digital transformation in government agencies streamlines basic document requests.\n3. By automating repetitive paperwork, processing times are cut in half.\n4. Frontline workers can then dedicate attention to complex community cases.",
    explanation: "Sentence 2 establishes the main topic (digital transformation). Sentence 3 explains how it operates (automating repetitive paperwork cuts processing times). Sentence 4 describes the immediate operational result (workers assist complex cases). Sentence 1 delivers the ultimate impact introduced by 'Consequently'. Sequence: 2-3-4-1.",
    difficulty: "medium",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq13-a", choiceLabel: "A", text: "2 - 3 - 4 - 1", isCorrect: true, order: 0 },
      { id: "sq13-b", choiceLabel: "B", text: "3 - 2 - 1 - 4", isCorrect: false, order: 1 },
      { id: "sq13-c", choiceLabel: "C", text: "2 - 4 - 3 - 1", isCorrect: false, order: 2 },
      { id: "sq13-d", choiceLabel: "D", text: "1 - 2 - 3 - 4", isCorrect: false, order: 3 },
    ],
  },
  // 14. Numerical Ability - Data Interpretation
  {
    id: "seed-q14",
    topicId: "top-pro-percentages",
    topicName: "Percentages & Interest",
    topicSlug: "percentages",
    subjectId: "sub-pro-numerical",
    subjectName: "Numerical Ability",
    subjectSlug: "numerical-ability",
    questionText: "An applicant scored 68 out of 80 in Verbal Ability and 76 out of 90 in Numerical Ability. What is the applicant's combined average percentage score (rounded to two decimal places)?",
    explanation: "Total items correct = 68 + 76 = 144. Total items overall = 80 + 90 = 170. Combined percentage = (144 / 170) * 100 = 84.71%.",
    difficulty: "medium",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq14-a", choiceLabel: "A", text: "84.71%", isCorrect: true, order: 0 },
      { id: "sq14-b", choiceLabel: "B", text: "85.00%", isCorrect: false, order: 1 },
      { id: "sq14-c", choiceLabel: "C", text: "82.50%", isCorrect: false, order: 2 },
      { id: "sq14-d", choiceLabel: "D", text: "86.25%", isCorrect: false, order: 3 },
    ],
  },
  // 15. Analytical Ability - Assumptions
  {
    id: "seed-q15",
    topicId: "top-pro-reasoning",
    topicName: "Critical & Deductive Reasoning",
    topicSlug: "critical-reasoning",
    subjectId: "sub-pro-analytical",
    subjectName: "Analytical Ability",
    subjectSlug: "analytical-ability",
    questionText: "Statement: 'The municipality should invest in solar-powered public streetlights to reduce municipal electricity expenditure.'\nWhich unstated assumption underlies this recommendation?",
    explanation: "For the investment in solar streetlights to actually reduce municipal electricity expenditure, electricity costs incurred from current grid streetlights must exceed the ongoing maintenance/operational cost of solar alternatives. If solar maintenance were equal or more expensive, expenditure wouldn't be reduced.",
    difficulty: "hard",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq15-a", choiceLabel: "A", text: "Solar streetlights will result in lower total long-term municipal energy costs than current grid lighting.", isCorrect: true, order: 0 },
      { id: "sq15-b", choiceLabel: "B", text: "The municipality currently has zero streetlights.", isCorrect: false, order: 1 },
      { id: "sq15-c", choiceLabel: "C", text: "Grid electricity will become completely unavailable next year.", isCorrect: false, order: 2 },
      { id: "sq15-d", choiceLabel: "D", text: "Solar power is the only renewable energy option available.", isCorrect: false, order: 3 },
    ],
  },
  // 16. General Information - Environmental Management
  {
    id: "seed-q16",
    topicId: "top-pro-consti",
    topicName: "1987 Philippine Constitution",
    topicSlug: "philippine-constitution",
    subjectId: "sub-pro-geninfo",
    subjectName: "General Information",
    subjectSlug: "general-information",
    questionText: "Under Section 16, Article II of the 1987 Philippine Constitution, the State protects and advances which fundamental right of the people?",
    explanation: "Section 16, Article II states: 'The State shall protect and advance the right of the people to a balanced and healthful ecology in accord with the rhythm and harmony of nature.' This famous provision established the landmark Oposa v. Factoran doctrine of intergenerational responsibility.",
    difficulty: "easy",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq16-a", choiceLabel: "A", text: "The right to free higher education in state universities", isCorrect: false, order: 0 },
      { id: "sq16-b", choiceLabel: "B", text: "The right to a balanced and healthful ecology", isCorrect: true, order: 1 },
      { id: "sq16-c", choiceLabel: "C", text: "The right to strike for all civil servants", isCorrect: false, order: 2 },
      { id: "sq16-d", choiceLabel: "D", text: "The right to automatic government employment upon graduation", isCorrect: false, order: 3 },
    ],
  },
  // 17. Subprofessional - Office Information & Procedures
  {
    id: "seed-q17",
    topicId: "top-subpro-clerical-filing",
    topicName: "Filing & Alphabetizing",
    topicSlug: "filing-alphabetizing",
    subjectId: "sub-subpro-clerical",
    subjectName: "Clerical Ability",
    subjectSlug: "clerical-ability",
    questionText: "When an official document is temporarily removed from a central filing cabinet for review by another division, what clerical tool should be inserted in its exact place?",
    explanation: "An 'Out-card' or 'Out-folder' is placed in the file drawer at the exact position from which a record is removed, noting who borrowed the file, the date, and expected return date, to prevent misplaced or lost records.",
    difficulty: "easy",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq17-a", choiceLabel: "A", text: "An Out-card or Out-folder with borrower information", isCorrect: true, order: 0 },
      { id: "sq17-b", choiceLabel: "B", text: "A duplicate blank folder", isCorrect: false, order: 1 },
      { id: "sq17-c", choiceLabel: "C", text: "A formal disciplinary notice", isCorrect: false, order: 2 },
      { id: "sq17-d", choiceLabel: "D", text: "A permanent archiving label", isCorrect: false, order: 3 },
    ],
  },
  // 18. Verbal Ability - Vocabulary in Context (Filipino)
  {
    id: "seed-q18",
    topicId: "top-pro-vocab",
    topicName: "Vocabulary & Context Clues",
    topicSlug: "vocabulary",
    subjectId: "sub-pro-verbal",
    subjectName: "Verbal Ability",
    subjectSlug: "verbal-ability",
    questionText: "Ano ang kasingkahulugan ng salitang 'masinop' sa pangungusap na:\n'Kinilala ang kawani dahil sa kaniyang masinop na pag-iingat sa mga pampublikong talaan.'",
    explanation: "Ang salitang 'masinop' ay nangangahulugang maingat, maayos, at mapagpahalaga sa mga bagay upang hindi masira o maaksaya. Ang 'maingat at maayos' ang pinakatumpak na kasingkahulugan nito.",
    difficulty: "easy",
    language: "fil",
    isSeedData: true,
    choices: [
      { id: "sq18-a", choiceLabel: "A", text: "Maingat at maayos", isCorrect: true, order: 0 },
      { id: "sq18-b", choiceLabel: "B", text: "Mabilis at pabaya", isCorrect: false, order: 1 },
      { id: "sq18-c", choiceLabel: "C", text: "Mahihiyain at tahimik", isCorrect: false, order: 2 },
      { id: "sq18-d", choiceLabel: "D", text: "Maramot sa kapwa", isCorrect: false, order: 3 },
    ],
  },
  // 19. Analytical Ability - Analogy
  {
    id: "seed-q19",
    topicId: "top-pro-analogy",
    topicName: "Analogy & Logic",
    topicSlug: "analogy",
    subjectId: "sub-pro-analytical",
    subjectName: "Analytical Ability",
    subjectSlug: "analytical-ability",
    questionText: "THERMOMETER : TEMPERATURE ::\nChoose the pair that expresses the same relationship as the given pair.",
    explanation: "The relationship is Instrument : Measurement. A thermometer is an instrument specifically designed to measure temperature. Similarly, a barometer is an instrument specifically designed to measure atmospheric pressure.",
    difficulty: "easy",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq19-a", choiceLabel: "A", text: "Barometer : Atmospheric Pressure", isCorrect: true, order: 0 },
      { id: "sq19-b", choiceLabel: "B", text: "Speedometer : Highway", isCorrect: false, order: 1 },
      { id: "sq19-c", choiceLabel: "C", text: "Scale : Kilogram", isCorrect: false, order: 2 },
      { id: "sq19-d", choiceLabel: "D", text: "Clock : Battery", isCorrect: false, order: 3 },
    ],
  },
  // 20. Analytical Ability - Analogy
  {
    id: "seed-q20",
    topicId: "top-pro-analogy",
    topicName: "Analogy & Logic",
    topicSlug: "analogy",
    subjectId: "sub-pro-analytical",
    subjectName: "Analytical Ability",
    subjectSlug: "analytical-ability",
    questionText: "STANZA : POEM ::\nChoose the pair that best expresses the relationship between the capitalized words.",
    explanation: "The relationship is Part : Whole. A stanza is a constituent division or unit of a poem. Similarly, a chapter is a constituent unit of a novel.",
    difficulty: "medium",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq20-a", choiceLabel: "A", text: "Paragraph : Punctuation", isCorrect: false, order: 0 },
      { id: "sq20-b", choiceLabel: "B", text: "Chapter : Novel", isCorrect: true, order: 1 },
      { id: "sq20-c", choiceLabel: "C", text: "Canvas : Painter", isCorrect: false, order: 2 },
      { id: "sq20-d", choiceLabel: "D", text: "Actor : Theater", isCorrect: false, order: 3 },
    ],
  },
  // 21. Analytical Ability - Analogy
  {
    id: "seed-q21",
    topicId: "top-pro-analogy",
    topicName: "Analogy & Logic",
    topicSlug: "analogy",
    subjectId: "sub-pro-analytical",
    subjectName: "Analytical Ability",
    subjectSlug: "analytical-ability",
    questionText: "ANALGESIC : PAIN ::\nSelect the pair with the closest analogical relationship.",
    explanation: "The relationship is Agent : Target of Relief / Mitigation. An analgesic is a substance administered to alleviate pain. Similarly, a sedative is administered to alleviate anxiety or agitation.",
    difficulty: "hard",
    language: "en",
    isSeedData: true,
    choices: [
      { id: "sq21-a", choiceLabel: "A", text: "Antibiotic : Prescription", isCorrect: false, order: 0 },
      { id: "sq21-b", choiceLabel: "B", text: "Vaccine : Needle", isCorrect: false, order: 1 },
      { id: "sq21-c", choiceLabel: "C", text: "Sedative : Anxiety", isCorrect: true, order: 2 },
      { id: "sq21-d", choiceLabel: "D", text: "Symptom : Disease", isCorrect: false, order: 3 },
    ],
  },
  // 22. Analytical Ability - Analogy (Filipino)
  {
    id: "seed-q22",
    topicId: "top-pro-analogy",
    topicName: "Analogy & Logic",
    topicSlug: "analogy",
    subjectId: "sub-pro-analytical",
    subjectName: "Analytical Ability",
    subjectSlug: "analytical-ability",
    questionText: "PLUMA : MANUNULAT ::\nPiliin ang tambal ng mga salita na may parehong ugnayan sa ibinigay na pares.",
    explanation: "Ang ugnayan ay Kasangkapan : Gumagamit (Tool : User). Ang pluma ay pangunahing kasangkapan ng isang manunulat. Gayundin, ang lagari ay pangunahing kasangkapan ng isang karpintero.",
    difficulty: "easy",
    language: "fil",
    isSeedData: true,
    choices: [
      { id: "sq22-a", choiceLabel: "A", text: "Lagari : Karpintero", isCorrect: true, order: 0 },
      { id: "sq22-b", choiceLabel: "B", text: "Kuwaderno : Tinta", isCorrect: false, order: 1 },
      { id: "sq22-c", choiceLabel: "C", text: "Aklat : Silid-aklatan", isCorrect: false, order: 2 },
      { id: "sq22-d", choiceLabel: "D", text: "Guro : Pisara", isCorrect: false, order: 3 },
    ],
  },
];
