import type { PlanTemplateId } from "@/config/study-plan-templates";

export interface ExamWorkspace {
  id: string; // e.g., "workspace_cse", "ws_let_secondary"
  examId: string; // e.g., "cse", "let"
  levelId?: string; // e.g., "professional", "subprofessional", "secondary"
  trackName?: string; // e.g., "Professional", "Secondary"
  targetExamDate?: string; // YYYY-MM-DD
  targetExamName?: string; // e.g., "March 2027 CSE-PPT"
  dailyGoal?: number; // e.g., 25
  /** YYYY-MM-DD first day of the learner's study period (plan window start). */
  studyStartDate?: string;
  /** Weekly study-plan template (guide §20): a workspace concern, not global. */
  studyPlanTemplate?: PlanTemplateId;
  createdAt: string; // ISO date
  lastAccessedAt: string; // ISO date
}

export interface WorkspaceStorageState {
  workspaces: ExamWorkspace[];
  currentWorkspaceId: string | null;
}

export const WORKSPACE_STORAGE_KEYS = {
  WORKSPACES: "rt_workspaces_v1",
  CURRENT_WORKSPACE_ID: "rt_current_workspace_id_v1",
} as const;

export const RT_WORKSPACE_CHANGED_EVENT = "rt-workspace-changed";
