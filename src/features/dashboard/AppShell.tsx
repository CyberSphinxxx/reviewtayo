"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  GraduationCap,
  RotateCcw,
  History,
  Trophy,
  StickyNote,
  BookOpen,
  Settings as SettingsIcon,
  Sparkles,
  MoreHorizontal,
  X,
  Zap,
  Lock,
  ArrowRight,
} from "lucide-react";
import { DashboardOnboardingView } from "@/features/dashboard/DashboardOnboardingView";
import { SetupPlanCard } from "@/features/dashboard/SetupPlanCard";
import { ReviewTayoOwl } from "@/components/brand/ReviewTayoOwl";
import { useExamWorkspace } from "@/lib/workspace/useExamWorkspace";
import { WorkspaceService } from "@/lib/workspace/workspace-service";
import { usePreferences } from "@/lib/preferences";
import { getTargetExamSummary, type TargetExamSummary } from "@/lib/workspace/target-exam";
import { daysUntilManila, formatManilaDate } from "@/lib/study-plan";
import { LocalStorageService } from "@/lib/storage";
import { getEnabledPracticeModes } from "@/config/practice-modes";

type ShellNavId =
  | "dashboard"
  | "plan"
  | "practice"
  | "review"
  | "history"
  | "achievements"
  | "notes"
  | "learn"
  | "soon"
  | "settings";

interface ShellNavItem {
  id: ShellNavId;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Shows the gold "New" pill (recently added surfaces). */
  isNew?: boolean;
}

const NAV_GROUPS: { group: string; items: ShellNavItem[] }[] = [
  {
    group: "Study",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { id: "plan", label: "Study plan", href: "/dashboard/plan", icon: CalendarDays, isNew: true },
      { id: "practice", label: "Practice", href: "/dashboard/practice", icon: GraduationCap, isNew: true },
      { id: "review", label: "Review", href: "/dashboard/review", icon: RotateCcw, isNew: true },
    ],
  },
  {
    group: "Track",
    items: [
      { id: "history", label: "History", href: "/dashboard/history", icon: History },
      { id: "achievements", label: "Achievements", href: "/dashboard/achievements", icon: Trophy, isNew: true },
    ],
  },
  {
    group: "Resources",
    items: [
      { id: "notes", label: "Notes", href: "/dashboard/notes", icon: StickyNote, isNew: true },
      { id: "learn", label: "Learn", href: "/dashboard/learn", icon: BookOpen, isNew: true },
      { id: "soon", label: "Coming soon", href: "/dashboard/practice#coming-soon", icon: Sparkles },
    ],
  },
];

const MORE_SHEET_ITEMS: ShellNavItem[] = [
  { id: "history", label: "History", href: "/dashboard/history", icon: History },
  { id: "achievements", label: "Achievements", href: "/dashboard/achievements", icon: Trophy },
  { id: "notes", label: "Notes", href: "/dashboard/notes", icon: StickyNote },
  { id: "learn", label: "Learn", href: "/dashboard/learn", icon: BookOpen },
  { id: "settings", label: "Settings", href: "/settings", icon: SettingsIcon },
];

const TAB_BAR: { id: ShellNavId; label: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { id: "plan", label: "Plan", href: "/dashboard/plan", icon: CalendarDays },
  { id: "practice", label: "Practice", href: "/dashboard/practice", icon: GraduationCap },
  { id: "review", label: "Review", href: "/dashboard/review", icon: RotateCcw },
];

function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolveNavId(pathname: string | null): ShellNavId {
  if (!pathname) return "dashboard";
  if (pathname.startsWith("/dashboard/practice")) return "practice";
  if (pathname.startsWith("/dashboard/plan")) return "plan";
  if (pathname.startsWith("/dashboard/review")) return "review";
  if (pathname.startsWith("/dashboard/achievements")) return "achievements";
  if (pathname.startsWith("/dashboard/notes")) return "notes";
  if (pathname.startsWith("/dashboard/learn")) return "learn";
  if (pathname.startsWith("/dashboard/history")) return "history";
  if (pathname.startsWith("/settings")) return "settings";
  return "dashboard";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeId = resolveNavId(pathname);
  const { currentWorkspace, isLoaded, refreshWorkspaces } = useExamWorkspace();
  const { preferences, mounted } = usePreferences();

  /**
   * Exam gate: "no exam chosen" is a first-class state. Until a workspace
   * exists, every surface except this gate (reached via Dashboard) and
   * Settings stays locked. Pure derived state — no setters, no redirects.
   */
  const hasExam = !!currentWorkspace;
  const locked = isLoaded && !hasExam;

  const [target, setTarget] = useState<TargetExamSummary | null>(null);
  const [dailyDone, setDailyDone] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const refreshCounts = useCallback(() => {
    setTarget(getTargetExamSummary());
    setDailyDone(LocalStorageService.getDailyQuestionsAnswered());
    setDueCount(LocalStorageService.getDueMistakes().length);
  }, []);

  // The storage migration can provision a workspace for legacy profiles AFTER
  // the workspace hook has already read an empty list (it writes without
  // dispatching). When the gate is showing but storage disagrees, re-sync once
  // from an effect — never during render.
  useEffect(() => {
    if (!locked) return;
    if (WorkspaceService.getAllWorkspaces().length > 0) {
      refreshWorkspaces();
    }
  }, [locked, refreshWorkspaces]);

  const wsId = currentWorkspace?.id;
  useEffect(() => {
    refreshCounts();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("cse_guest_") || e.key.startsWith("rt_ws_")) {
        refreshCounts();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // Re-run when the active workspace changes so the target card, goal mini,
    // and due badge follow the chosen exam immediately.
  }, [refreshCounts, pathname, wsId]);

  // More sheet: Escape closes, focus is trapped, background is inert.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMoreOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const daysLeft = target ? daysUntilManila(target.targetDate) : null;
  const goal = target?.dailyGoal ?? preferences.study.dailyGoal;
  const goalPct = goal > 0 ? Math.min(100, Math.round((dailyDone / goal) * 100)) : 0;
  const showNewPills = mounted;

  const navButton = (item: ShellNavItem) => {
    const Icon = item.icon;
    const active = item.id !== "soon" && isActivePath(pathname, item.href);
    const muted = item.id === "soon";
    // Locked until an exam is chosen (Dashboard stays open as the gate entry).
    const itemLocked = locked && item.id !== "dashboard";
    if (itemLocked) {
      return (
        <Link
          key={item.id}
          href="/dashboard"
          title="Choose an exam to unlock"
          aria-label={`${item.label} (locked, choose an exam to unlock)`}
          className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-[14px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b] text-[#8a1630]/40 hover:bg-[#fbeff0] hover:text-[#8a1630]/70 dark:text-[#ecd2d8]/40 dark:hover:bg-white/10 dark:hover:text-[#ecd2d8]/70"
        >
          <Icon className="w-[18px] h-[18px] shrink-0" />
          <span className="truncate">{item.label}</span>
          <Lock className="ml-auto w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </Link>
      );
    }
    return (
      <Link
        key={item.id}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-[14px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b] ${
          muted
            ? "text-[#8a1630]/55 hover:bg-[#fbeff0] hover:text-[#8a1630] dark:text-[#c99aa6] dark:hover:bg-white/10 dark:hover:text-white"
            : active
            ? "bg-[#8a1630] text-white dark:bg-white dark:text-[#8a1630]"
            : "text-[#8a1630]/80 hover:bg-[#fbeff0] hover:text-[#8a1630] dark:text-[#ecd2d8] dark:hover:bg-white/10 dark:hover:text-white"
        }`}
      >
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <span className="truncate">{item.label}</span>
        {item.id === "review" && dueCount > 0 && (
          <span
            className="ml-auto min-w-[22px] text-center rounded-full bg-[#f6b93b] text-[#2a0a12] text-[11px] font-extrabold px-1.5 py-0.5"
            title={`${dueCount} questions due for review`}
          >
            {dueCount}
          </span>
        )}
        {showNewPills && item.isNew && (item.id !== "review" || dueCount === 0) && (
          <span className="ml-auto rounded-full bg-[#f6b93b] text-[#2a0a12] text-[10px] font-extrabold px-1.5 py-0.5 leading-4">
            New
          </span>
        )}
      </Link>
    );
  };

  const sidebar = (
    <aside
      aria-label="Main"
      className="hidden lg:flex sticky top-0 self-start h-dvh w-[262px] shrink-0 flex-col gap-4 overflow-y-auto bg-[#fdf8f6] dark:bg-gradient-to-b dark:from-[#2c0b14] dark:to-[#1c060c] border-r border-[#f3e6e9] dark:border-white/10 text-[#8a1630] dark:text-[#f3dde2] p-5 pb-4 print:hidden"
    >
      <Link
        href="/"
        className="flex items-center gap-2 font-logo text-[23px] text-[#8a1630] dark:text-white rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
        aria-label="ReviewTayo home"
      >
        <ReviewTayoOwl size={30} withCap aria-hidden="true" />
        <span>reviewtayo</span>
      </Link>

      {/* Target exam quick card */}
      {target ? (
        <Link
          href="/settings/study"
          className="block w-full text-left bg-white dark:bg-white/[0.07] rounded-2xl p-3.5 shadow-[inset_0_0_0_1px_rgba(138,22,48,0.10)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] hover:bg-[#fbeff0] dark:hover:bg-white/[0.12] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
        >
          <small className="block text-[12px] font-bold text-[#a97a86] dark:text-[#e6bcc6]">Target exam</small>
          <b className="block font-display text-[17px] font-extrabold tracking-[-0.02em] text-[#1b1216] dark:text-white mt-0.5 truncate">
            {`${target.examId === "cse" ? "CSE-PPT" : target.examId.toUpperCase()} ${target.trackName || ""}`.trim()}
          </b>
          <span className="block text-[13px] font-bold text-[#8a1630] dark:text-[#f6b93b] mt-0.5">
            {daysLeft !== null
              ? `${daysLeft} days · ${formatManilaDate(target.targetDate, false)}`
              : "Choose a date"}
          </span>
        </Link>
      ) : (
        <Link
          href="/dashboard"
          className="block w-full text-left bg-white dark:bg-white/[0.07] rounded-2xl p-3.5 shadow-[inset_0_0_0_1px_rgba(138,22,48,0.10)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] hover:bg-[#fbeff0] dark:hover:bg-white/[0.12] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
        >
          <small className="block text-[12px] font-bold text-[#a97a86] dark:text-[#e6bcc6]">Target exam</small>
          <b className="block font-display text-[15px] font-extrabold tracking-[-0.02em] text-[#1b1216] dark:text-white mt-0.5">
            Choose your exam
          </b>
          <span className="block text-[13px] font-bold text-[#8a1630] dark:text-[#f6b93b] mt-0.5">
            Pick one to unlock your plan
          </span>
        </Link>
      )}

      <div className="grid gap-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.group}>
            <h2 className="px-3.5 mb-1 text-[12px] font-bold text-[#a97a86] dark:text-[#c99aa6]">{group.group}</h2>
            <nav aria-label={group.group} className="grid gap-1">
              {group.items.map(navButton)}
            </nav>
          </div>
        ))}
      </div>

      <div className="mt-auto grid gap-3">
        {/* Daily goal mini progress */}
        <div className="bg-white dark:bg-white/[0.07] rounded-2xl p-3 shadow-[inset_0_0_0_1px_rgba(138,22,48,0.10)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
          <div className="flex justify-between text-[13px] font-bold text-[#8a7a80] dark:text-[#ecd2d8]">
            <span>Daily goal</span>
            <b className="text-[#1b1216] dark:text-white tabular-nums">
              {dailyDone}/{goal}
            </b>
          </div>
          <div className="h-2 rounded-full bg-[#f4e7e9] dark:bg-white/[0.14] mt-2 overflow-hidden">
            <i
              className="block h-full rounded-full bg-[#f6b93b] transition-[width] duration-500"
              style={{ width: `${goalPct}%` }}
            />
          </div>
        </div>

        <Link
          href="/settings"
          aria-current={activeId === "settings" ? "page" : undefined}
          className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-[14px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b] ${
            activeId === "settings"
              ? "bg-[#8a1630] text-white dark:bg-white dark:text-[#8a1630]"
              : "text-[#8a1630]/80 hover:bg-[#fbeff0] hover:text-[#8a1630] dark:text-[#ecd2d8] dark:hover:bg-white/10 dark:hover:text-white"
          }`}
        >
          <SettingsIcon className="w-[18px] h-[18px] shrink-0" />
          Settings
        </Link>
      </div>
    </aside>
  );

  const tabbar = (
    <nav
      aria-label="Main"
      className="lg:hidden fixed left-0 right-0 bottom-0 z-40 grid grid-cols-5 bg-[#fdf8f6] dark:bg-[#1c060c] border-t border-[#f3e6e9] dark:border-white/10 px-1.5 pt-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))] print:hidden"
    >
      {TAB_BAR.map((tab) => {
        const Icon = tab.icon;
        const active = isActivePath(pathname, tab.href);
        const tabLocked = locked && tab.id !== "dashboard";
        return (
          <Link
            key={tab.id}
            href={tabLocked ? "/dashboard" : tab.href}
            aria-current={active ? "page" : undefined}
            className={`relative grid justify-items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b] ${
              tabLocked
                ? "text-[#8a1630]/40 dark:text-[#e6bcc6]/40"
                : active
                ? "text-white bg-[#8a1630] dark:bg-white/[0.14] dark:text-white"
                : "text-[#8a1630]/70 dark:text-[#e6bcc6]"
            }`}
          >
            <Icon className="w-[22px] h-[22px]" />
            {tab.label}
            {tab.id === "review" && dueCount > 0 && (
              <span
                className="absolute top-1 right-[calc(50%-20px)] w-2.5 h-2.5 rounded-full bg-[#f6b93b]"
                aria-label={`${dueCount} questions due`}
              />
            )}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => setMoreOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        className={`grid justify-items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b] ${
          moreOpen ? "text-white bg-white/[0.14]" : "text-[#e6bcc6]"
        }`}
      >
        <MoreHorizontal className="w-[22px] h-[22px]" />
        More
      </button>
    </nav>
  );

  const moreSheet = (
    <>
      <div
        className={`fixed inset-0 z-50 bg-[rgba(20,5,10,0.55)] transition-opacity lg:hidden ${moreOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMoreOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="More menu"
        inert={!moreOpen}
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white dark:bg-[#2b1620] p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] transition-transform duration-300 lg:hidden ${
          moreOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-extrabold text-[#1b1216] dark:text-[#f8ecee]">
            More
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => setMoreOpen(false)}
            aria-label="Close menu"
            className="w-9 h-9 grid place-items-center rounded-full bg-[#f4ecee] dark:bg-[#3a1f29] text-[#1b1216] dark:text-[#f8ecee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid gap-2">
          {MORE_SHEET_ITEMS.map((item) => {
            const Icon = item.icon;
            const itemLocked = locked && item.id !== "settings";
            return (
              <Link
                key={item.id}
                href={itemLocked ? "/dashboard" : item.href}
                title={itemLocked ? "Choose an exam to unlock" : undefined}
                aria-label={itemLocked ? `${item.label} (locked, choose an exam to unlock)` : undefined}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b] ${
                  itemLocked
                    ? "text-[#1b1216]/40 dark:text-[#f8ecee]/40"
                    : isActivePath(pathname, item.href)
                    ? "bg-[#fbeff0] text-[#8a1630] dark:bg-[#3b1a25] dark:text-[#ff9fb5]"
                    : "bg-[#f4ecee] text-[#1b1216] dark:bg-[#3a1f29] dark:text-[#f8ecee]"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {itemLocked && <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[262px_minmax(0,1fr)] bg-[#fdf8f6] dark:bg-[#1a0c11]">
      {sidebar}
      <div className="min-w-0 flex flex-col min-h-dvh">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-5 py-3 bg-[#fdf8f6] dark:bg-gradient-to-b dark:from-[#2c0b14] dark:to-[#1c060c] text-[#8a1630] dark:text-white border-b border-[#f3e6e9] dark:border-white/10 print:hidden">
          <Link
            href="/"
            className="flex items-center gap-2 font-logo text-[21px] text-[#8a1630] dark:text-white"
            aria-label="ReviewTayo home"
          >
            <ReviewTayoOwl size={26} withCap aria-hidden="true" />
            <span>reviewtayo</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdeec6] text-[#6b4300] px-3 py-1.5 text-[13px] font-extrabold">
            <Zap className="w-3.5 h-3.5" aria-hidden="true" />
            {LocalStorageService.formatDayStreak(
              LocalStorageService.getStudyStreak().currentStreak
            )}
          </span>
        </header>

        <main
          id="main-content"
          className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8 pb-28 lg:pb-16"
        >
          {!isLoaded ? null : locked ? (
            <div className="animate-page-enter">
              <DashboardOnboardingView embedded />
              <div className="mt-8 text-[14px] text-[#5a4a50] dark:text-[#a89ba1]">
                Not sure which exam fits you?{" "}
                <Link
                  href="/reviewers"
                  className="inline-flex items-center gap-1 font-extrabold text-[#8a1630] dark:text-[#de5572] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b93b] rounded"
                >
                  Ask the owl to find it for you <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <SetupPlanCard />
              {children}
            </>
          )}
        </main>
      </div>
      {tabbar}
      {moreSheet}
    </div>
  );
}

/** Convenience hook for pages that need the enabled practice route map. */
export function useEnabledPracticeRoutes(): string[] {
  return getEnabledPracticeModes().map((m) => m.href).filter((h): h is string => Boolean(h));
}
