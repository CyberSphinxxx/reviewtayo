"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Check, Plus, Settings } from "lucide-react";
import { getExamConfig, getExamRoutesForLevel, type ExamCatalogEntry } from "@/config/exams";
import { useExamWorkspace } from "@/lib/workspace/useExamWorkspace";
import { useExamLevel } from "@/lib/hooks/useExamLevel";
import { MyExamsDialog } from "@/components/workspace/MyExamsDialog";

interface ExamSubNavProps {
  examId?: string;
  currentLevel?: "professional" | "subprofessional";
  onLevelChange?: (level: "professional" | "subprofessional") => void;
}

export function ExamSubNav({
  examId = "cse",
  currentLevel: propLevel,
  onLevelChange,
}: ExamSubNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentWorkspace, allWorkspaces, switchWorkspace, updateWorkspace } = useExamWorkspace();

  // Public-page preview hint (CSE landing / exam-guide browsing). The WORKSPACE
  // is the authoritative level store; this hint only matters when the visitor
  // is previewing levels without having chosen an exam yet.
  const [previewLevel, setPreviewLevel] = useExamLevel<"professional" | "subprofessional">(examId);

  const [isOpen, setIsOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  // Read config for this exam
  const examConfig: ExamCatalogEntry | undefined = getExamConfig(examId) || getExamConfig("cse");
  const levels = examConfig?.levels || [];

  // Authoritative level: explicit prop → the active workspace's levelId →
  // public-page preview hint → catalog default. Everything below derives its
  // routes from THIS value, so a subprofessional learner never lands on
  // professional question pools.
  const activeLevelSlug =
    propLevel ||
    currentWorkspace?.levelId ||
    previewLevel ||
    levels[0]?.id ||
    "professional";

  const currentLevelObj = levels.find((lvl) => lvl.id === activeLevelSlug) || levels[0];
  const shortName = examConfig?.shortName || "CSE";
  const levelDisplayName = currentLevelObj?.shortName || "Professional";

  // Auto-scroll active sub-nav item into view on mobile
  useEffect(() => {
    if (activeLinkRef.current && typeof activeLinkRef.current.scrollIntoView === "function") {
      activeLinkRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation for level selector
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  const handleSelectLevel = (levelId: string) => {
    setIsOpen(false);
    const typedLevel = levelId === "subprofessional" ? "subprofessional" : "professional";
    const trackName = typedLevel === "subprofessional" ? "Subprofessional" : "Professional";

    // If callback provided, notify parent
    if (onLevelChange) {
      onLevelChange(typedLevel);
    }

    // The workspace is the single write path for the chosen level. When no
    // exam has been chosen yet (public browsing), fall back to the preview
    // hint so the page still agrees with itself.
    if (currentWorkspace) {
      updateWorkspace(currentWorkspace.id, { levelId: typedLevel, trackName });
    } else {
      setPreviewLevel(typedLevel);
    }
  };

  const handleSelectWorkspace = (workspaceId: string) => {
    switchWorkspace(workspaceId);
    setIsOpen(false);
    if (pathname !== "/dashboard") {
      router.push("/dashboard");
    }
  };

  // Sub-nav link definitions — derived from the exam's own config, never a
  // hardcoded CSE path (guide §15).
  const overviewHref = examConfig?.href || "/cse";
  const levelRoutes = getExamRoutesForLevel(examId, activeLevelSlug);
  const practiceHref = levelRoutes.practiceUrl || "/practice";
  const mockHref = levelRoutes.fullMockUrl || "/practice";
  const guidesHref = "/guides";
  const infoHref = examConfig?.routes?.infoUrl || "/cse/exam-guide";

  const isOverview = pathname === overviewHref;
  const isPractice = pathname === "/practice" || Boolean(pathname?.startsWith("/practice/"));
  const isMock = pathname === "/exams" || Boolean(pathname?.startsWith("/exams/"));
  const isGuides = pathname === "/guides" || Boolean(pathname?.startsWith("/guides/"));
  const isInfo = pathname === infoHref || Boolean(pathname?.startsWith(`${infoHref}/`));

  const linkClass = (active: boolean) =>
    `inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
      active
        ? "bg-brand-50 text-brand-800 dark:bg-brand-950/80 dark:text-brand-300 font-bold shadow-2xs"
        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
    }`;

  return (
    <>
      <nav
        aria-label="Exam navigation"
        className="w-full border-b border-border/80 bg-slate-50/90 dark:bg-[#161315]/90 backdrop-blur-sm sticky top-16 z-30 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 h-12">
          {/* Left: Contextual Level / Exam Pill Switcher */}
          <div className="relative shrink-0" ref={menuRef} onKeyDown={handleKeyDown}>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              aria-label={`Exam: ${shortName}, Level: ${levelDisplayName}. Click to switch level or exam.`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-brand-200 dark:border-brand-800 bg-white dark:bg-[#1E191C] text-xs font-bold text-brand-800 dark:text-brand-300 shadow-2xs hover:bg-brand-50 dark:hover:bg-brand-950/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              <span>{shortName}</span>
              <span className="text-slate-300 dark:text-slate-600">&bull;</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{levelDisplayName}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-brand-600 dark:text-brand-400 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu for Level and Exam Switching */}
            {isOpen && (
              <div
                role="menu"
                aria-orientation="vertical"
                className="absolute left-0 mt-1.5 w-72 rounded-xl border border-border bg-white dark:bg-[#1E191C] p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 text-xs"
              >
                <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-border/60 mb-1">
                  Choose Level ({shortName})
                </div>

                {levels.map((lvl) => {
                  const isCurrent = lvl.id === activeLevelSlug;
                  return (
                    <button
                      key={lvl.id}
                      role="menuitem"
                      type="button"
                      onClick={() => handleSelectLevel(lvl.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
                        isCurrent
                          ? "bg-brand-50 text-brand-900 dark:bg-brand-950/60 dark:text-brand-200 font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div>
                        <div>{lvl.name}</div>
                        {lvl.description && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                            {lvl.description}
                          </div>
                        )}
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-brand-700 shrink-0 ml-2" />}
                    </button>
                  );
                })}

                {allWorkspaces.length > 1 && (
                  <>
                    <div className="my-1 border-t border-border/60" />
                    <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Switch Exam Workspace
                    </div>
                    {allWorkspaces.map((ws) => {
                      const cfg = getExamConfig(ws.examId);
                      const isWsCurrent = ws.examId === examId;
                      return (
                        <button
                          key={ws.id}
                          role="menuitem"
                          type="button"
                          onClick={() => handleSelectWorkspace(ws.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                            isWsCurrent
                              ? "bg-brand-50/50 text-brand-900 dark:text-brand-200 font-semibold"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span className="truncate">{cfg?.fullName || ws.examId.toUpperCase()}</span>
                          {isWsCurrent && <Check className="w-3 h-3 text-brand-600" />}
                        </button>
                      );
                    })}
                  </>
                )}

                <div className="mt-1 pt-1 border-t border-border/60 space-y-0.5">
                  <Link
                    href="/reviewers"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3 h-3 text-brand-600" />
                    <span>Browse all Philippine exams</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setManageDialogOpen(true);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition"
                  >
                    <Settings className="w-3 h-3 text-slate-400" />
                    <span>Manage my exams</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Sub-Nav Links (Overview, Practice, Mock exams, Guides, Exam info) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth py-1 mask-fade-edges">
            <Link
              ref={isOverview ? activeLinkRef : undefined}
              href={overviewHref}
              aria-current={isOverview ? "page" : undefined}
              className={linkClass(isOverview)}
            >
              Overview
            </Link>
            <Link
              ref={isPractice ? activeLinkRef : undefined}
              href={practiceHref}
              aria-current={isPractice ? "page" : undefined}
              className={linkClass(isPractice)}
            >
              Practice
            </Link>
            <Link
              ref={isMock ? activeLinkRef : undefined}
              href={mockHref}
              aria-current={isMock ? "page" : undefined}
              className={linkClass(isMock)}
            >
              Mock exams
            </Link>
            <Link
              ref={isGuides ? activeLinkRef : undefined}
              href={guidesHref}
              aria-current={isGuides ? "page" : undefined}
              className={linkClass(isGuides)}
            >
              Guides
            </Link>
            <Link
              ref={isInfo ? activeLinkRef : undefined}
              href={infoHref}
              aria-current={isInfo ? "page" : undefined}
              className={linkClass(isInfo)}
            >
              Exam info
            </Link>
          </div>
        </div>
      </nav>

      {/* My Exams Management Dialog */}
      <MyExamsDialog
        isOpen={manageDialogOpen}
        onClose={() => setManageDialogOpen(false)}
      />
    </>
  );
}
