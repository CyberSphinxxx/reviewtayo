import type { FAQItem } from "./types";

/**
 * General ReviewTayo questions first (platform-level; no examIds), followed by
 * exam-specific entries (CSE today; entries tagged with other exam ids join
 * automatically when those exams launch). Every answer below describes
 * implemented behavior — no invented prices, guarantees, or release dates.
 */
const GENERAL_FAQS: FAQItem[] = [
  {
    id: "what-is-reviewtayo",
    category: "The website",
    question: "What is ReviewTayo?",
    answer:
      "ReviewTayo is a free, independent online reviewer for Philippine government examinations. It gives you realistic timed practice, original questions with detailed explanations, and progress tracking that shows exactly which subjects need work. The Civil Service Exam (CSE) is the first supported exam, and the platform is designed to add more Philippine exams over time.",
    relatedLinks: [
      { text: "About ReviewTayo", href: "/about" },
      { text: "Browse exams", href: "/reviewers" },
    ],
  },
  {
    id: "is-reviewtayo-free",
    category: "The website",
    question: "Is ReviewTayo free to use?",
    answer:
      "Yes. Every practice mode — quick drills, medium assessments, topic practice, and full mock exams — is free, and the core practice features work without an account. Some informational pages display advertising, which keeps the platform free; exams and practice screens themselves stay ad-free.",
  },  {
    id: "is-reviewtayo-official",
    category: "The website",
    question: "Is ReviewTayo affiliated with the Civil Service Commission?",
    answer:
      "No. ReviewTayo is an independent educational platform and is not affiliated with, endorsed by, or authorized by the Civil Service Commission (CSC) or any government agency. Official schedules, requirements, and results only come from official CSC channels — our exam guide links to those official sources where relevant, and study content is our own.",
    relatedLinks: [{ text: "CSE exam guide", href: "/cse/exam-guide" }],
  },
  {
    id: "getting-started-first-step",
    category: "Getting started",
    question: "I'm new — where should I start?",
    answer:
      "Take a 10-question quick drill first. It mixes all subjects, takes about 10 minutes, and gives you a per-subject breakdown so you know where you stand. From there, your dashboard recommends what to practice next, and you can set up a study plan built around your exam date and daily goal.",
    relatedLinks: [
      { text: "Take the quick drill", href: "/exams/professional/quick" },
      { text: "Set up a study plan", href: "/onboarding" },
    ],
  },
  {
    id: "choose-level",
    category: "Getting started",
    question: "How do I choose between Professional and Subprofessional?",
    answer:
      "Both are levels of the Career Service Exam. Professional eligibility qualifies you for second-level (technical/professional) positions and includes Analytical Ability; Subprofessional eligibility qualifies you for first-level (clerical/trades) positions and includes Clerical Ability instead. You can switch levels anytime — your dashboard, practice routes, and plans follow your active choice.",
    relatedLinks: [{ text: "Professional vs Subprofessional comparison", href: "/articles/professional-vs-subprofessional-difference" }],
  },
  {
    id: "practice-vs-exam-mode",
    category: "Practice vs exam mode",
    question: "What's the difference between practice mode and exam mode?",
    answer:
      "Practice (topic) mode teaches as you go: you pick an answer, press the Answer button to lock it in, and see immediately whether it was correct, along with a full explanation. Exam modes (quick, medium, and full mock) are graded assessments: answers stay hidden until you submit, so your score reflects real exam conditions. The dashboard practice hub lets you choose the feedback style for quick and medium sessions.",
    relatedLinks: [
      { text: "Open the practice hub", href: "/dashboard/practice" },
      { text: "Topic practice directory", href: "/practice" },
    ],
  },
  {
    id: "timer-behavior",
    category: "Practice vs exam mode",
    question: "How do the timers work?",
    answer:
      "Quick and medium tests run short session timers (10 and 30 minutes). Full mock exams use one single continuous countdown for the whole paper — 3 hours 10 minutes for Professional, 2 hours 40 minutes for Subprofessional — matching the real exam's single overall time allotment rather than per-section timers. Your session auto-submits when time runs out, and an unfinished session can be saved and resumed later.",
  },
  {
    id: "where-are-results",
    category: "Progress & results",
    question: "Where can I see my past results and progress?",
    answer:
      "Every completed session lands on your dashboard: recent sessions with scores, full history, per-subject accuracy against your target, an activity calendar, and a mistake bank that schedules previously missed questions for spaced review. Results pages also break down every question with the correct answer and explanation.",
    relatedLinks: [
      { text: "Open your dashboard", href: "/dashboard" },
      { text: "Session history", href: "/dashboard/history" },
    ],
  },
  {
    id: "progress-stored-where",
    category: "Progress & results",
    question: "Is my progress saved if I close the browser?",
    answer:
      "Yes — for guests, progress is saved on your device (browser storage), so returning to the same browser picks up where you left off, including unfinished sessions. Progress doesn't follow you to another browser or device until you sign in, which lets you sync your local progress to your account.",
    relatedLinks: [{ text: "Data & privacy settings", href: "/settings/data" }],
  },
  {
    id: "account-required",
    category: "Accounts & privacy",
    question: "Do I need an account to practice?",
    answer:
      "No. You can practice immediately as a guest — no sign-up, no email. Creating a free account is optional and only adds cross-device sync of your progress. You can also export all of your data or delete your account (and every record tied to it) at any time from Settings.",
    relatedLinks: [{ text: "Privacy policy (RA 10173)", href: "/privacy" }],
  },
  {
    id: "report-question-issue",
    category: "Help & feedback",
    question: "I think a question has an error — how do I report it?",
    answer:
      "Every question in a session has a Report button (in the question's toolbar). It opens a short form where you pick the issue type — wrong answer, wrong explanation, typo, ambiguous question, or outdated information — and describe what you saw. Reports go straight to the content team for review.",
  },
];

export const FAQS: FAQItem[] = [
  ...GENERAL_FAQS,
  {
    id: "eligibility-qualifications",
    category: "Qualifications & Eligibility",
    question: "Who is qualified to take the Philippine Civil Service Examination (CSE-PPT)?",
    answer:
      "Filipino citizens who are at least 18 years of age on the date of filing, of good moral character, and who have not been convicted of a crime involving moral turpitude, dishonorably discharged from military service, or dismissed for cause from government service. There is no educational requirement; both high school graduates and college degree holders may apply depending on the exam level.",
    relatedLinks: [
      { text: "CSE Documentary Requirements Checklist", href: "/cse/exam-guide/requirements" },
      { text: "How to Apply for the Civil Service Exam", href: "/cse/exam-guide/how-to-apply" },
    ],
  },
  {
    id: "pro-vs-subpro-difference",
    category: "Qualifications & Eligibility",
    question: "What is the difference between the Professional and Subprofessional exams?",
    answer:
      "The Career Service Professional Eligibility qualifies you for both first-level (clerical, trades, crafts) and second-level (technical, scientific, executive, managerial) positions in government. The Subprofessional Eligibility qualifies you strictly for first-level positions. The Professional exam includes Analytical Ability, whereas the Subprofessional exam covers Clerical Ability instead.",
    relatedLinks: [
      { text: "Professional vs. Subprofessional Comparison Guide", href: "/articles/professional-vs-subprofessional-difference" },
      { text: "CSE Professional Reviewer Breakdown", href: "/articles/cse-professional-exam-reviewer-guide" },
    ],
  },
  {
    id: "eligibility-expiration",
    category: "Qualifications & Eligibility",
    question: "Does the Civil Service Certificate of Eligibility (CoE) expire?",
    answer:
      "No. Career Service Eligibility gained through passing the Civil Service Examination has lifetime validity. It does not expire and does not require periodic renewal.",
    relatedLinks: [
      { text: "Results Verification & Claiming Your CoE", href: "/cse/exam-guide/results" },
    ],
  },
  {
    id: "exam-frequency-retake",
    category: "Qualifications & Eligibility",
    question: "How often can I take the Civil Service Examination?",
    answer:
      "Under CSC guidelines, examinees who fail may take the examination again after a three-month waiting period (the three-month retake ban). The CSC typically conducts the nationwide Pen and Paper Test (CSE-PPT) twice each calendar year (usually in March and August).",
    relatedLinks: [
      { text: "View Civil Service Exam Schedules & Calendars", href: "/cse/exam-guide/schedule" },
    ],
  },
  {
    id: "passing-grade-percentage",
    category: "Exam Format & Scoring",
    question: "What is the passing grade for the Civil Service Exam?",
    answer:
      "To pass, an examinee must obtain a general rating of at least 80.00%. The Civil Service Commission computes this rating using a calibrated statistical weighting formula across all subtests. Examinees must perform consistently across all subtests, as failing severely in any single subtest can prevent passing even if your overall raw count is high.",
    relatedLinks: [
      { text: "How Civil Service Exam Scoring Works", href: "/articles/how-civil-service-exam-scoring-works" },
      { text: "Complete CSE-PPT Overview & Comparison Matrix", href: "/exam-info" },
    ],
  },
  {
    id: "exam-duration-items",
    category: "Exam Format & Scoring",
    question: "How many items are there, and how long is the exam duration?",
    answer:
      "For the Professional Level, there are 170 items administered within a single continuous time limit of 3 hours and 10 minutes (190 minutes). For the Subprofessional Level, there are 165 items with a time limit of 2 hours and 40 minutes (160 minutes). Both tests use a single overall countdown timer rather than partitioned section timers.",
    relatedLinks: [
      { text: "The 67-Second Rule Pacing Guide", href: "/articles/continuous-timer-pacing-strategy" },
      { text: "Practice Full Mock Exam with Continuous Timer", href: "/practice" },
    ],
  },
  {
    id: "exam-day-items-bring",
    category: "Exam Day Guidelines",
    question: "What items must I bring on the day of the examination?",
    answer:
      "Examinees must bring: (1) Valid government-issued photo ID accepted by the CSC (e.g., PhilID/National ID, Passport, Driver's License, UMID, PRC ID, Voter's ID); (2) Black ballpens (strictly black ink only, no friction pens or gel pens that bleed); (3) Official Application Receipt (if issued); (4) Printed Notice of School Assignment (ONSA); and (5) Clear water bottle without labels.",
    relatedLinks: [
      { text: "Exam-Day Protocols & What to Bring Checklist", href: "/cse/exam-guide/exam-day" },
    ],
  },
  {
    id: "prohibited-items-exam",
    category: "Exam Day Guidelines",
    question: "What items are strictly prohibited inside the examination room?",
    answer:
      "Prohibited items include calculators, cellular phones, smartwatches, recording devices, blank scratch paper, correction fluids/tape, books, and unauthorized review sheets. Possession of any electronic communication device during the test can lead to immediate disqualification and permanent disbarment from taking government examinations.",
    relatedLinks: [
      { text: "Exam-Day Protocols & Prohibited Items", href: "/cse/exam-guide/exam-day" },
    ],
  },
  {
    id: "recommended-study-timeline",
    category: "Preparation & Review",
    question: "How long should I prepare before taking the Civil Service Exam?",
    answer:
      "A focused study period of 6 to 10 weeks (dedicating 1 to 2 hours daily) is recommended for most working professionals and students. Allocate the first 4 weeks to reviewing core rules (grammar, RA 6713, and math shortcuts), followed by timed mock simulations to adapt to the 67-second-per-item pace.",
    relatedLinks: [
      { text: "Explore All Subtest Study Guides", href: "/guides" },
      { text: "Common Pitfalls to Avoid in the CSE", href: "/articles/why-examinees-fail-civil-service-exam" },
    ],
  },
  {
    id: "calculator-allowed",
    category: "Preparation & Review",
    question: "Are calculators allowed for the Numerical Ability subtest?",
    answer:
      "No. Absolutely no calculators of any kind (basic, scientific, or digital) are permitted in the CSE-PPT. All calculations must be performed using mental math or by computing on the test booklet margins using your black ballpen.",
    relatedLinks: [
      { text: "Word Problems & Arithmetic Shortcuts Guide", href: "/guides/numerical-ability-word-problems" },
      { text: "Practice Numerical Ability Subtest", href: "/practice" },
    ],
  },
];
