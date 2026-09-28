import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PracticeHubView } from "@/features/dashboard/practice/PracticeHubView";
import { StudyPlanView } from "@/features/dashboard/plan/StudyPlanView";
import { WorkspaceService } from "@/lib/workspace/workspace-service";
import { LocalStorageService } from "@/lib/storage";
import { PreferencesService } from "@/lib/preferences";
import {
  resolveRunnerLevelSlug,
  getPracticeModeHrefForLevel,
  getPracticeMode,
} from "@/config/practice-modes";

vi.mock("@/lib/auth/auth-client", () => ({
  useSession: () => ({ data: null, isPending: false, refetch: vi.fn() }),
  signOut: vi.fn(),
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
}));

const mockPush = vi.fn();

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");
  return {
    ...actual,
    usePathname: () => "/dashboard/practice",
    useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  };
});

describe("practice setup sheet (P1)", () => {
  beforeEach(() => {
    LocalStorageService.clearAllGuestData();
    LocalStorageService.resetMigrationForTesting();
    window.localStorage.clear();
    PreferencesService.resetAllPreferences();
    WorkspaceService.createWorkspace({ examId: "cse", levelId: "professional" });
    // jsdom does not implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  function openSheet(label: RegExp | string) {
    // The recommended action card and the catalog card share names; both open
    // the same setup sheet for their mode.
    const matches = screen.getAllByRole("button", { name: label });
    fireEvent.click(matches[0]);
  }

  it("portals the sheet outside the hub root so the CTA is a full-width fixed element", () => {
    render(<PracticeHubView />);
    openSheet(/spaced review/i);

    const dialog = screen.getByRole("dialog", { name: /spaced review/i });
    // Portal target: direct child of <body>, NOT inside the animated wrapper.
    expect(dialog.parentElement).toBe(document.body);
    // Viewport-fixed geometry resolves against the real viewport, not the
    // content column (the Chromium containing-block bug this regression pins).
    expect(dialog.className).toContain("fixed");
    // The primary CTA is present and enabled inside the sheet footer.
    const cta = screen.getByRole("button", { name: /start spaced review/i });
    expect(cta).toBeEnabled();
  });

  it("renders the sheet for every setup-enabled mode and keeps its dynamic CTA", () => {
    render(<PracticeHubView />);
    const cases: [RegExp, RegExp][] = [
      [/quick drill/i, /start quick drill/i],
      [/medium assessment/i, /start medium assessment/i],
      [/diagnostic test/i, /start diagnostic test/i],
      [/spaced review/i, /start spaced review/i],
    ];
    for (const [cardLabel, ctaLabel] of cases) {
      openSheet(cardLabel);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: ctaLabel })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /close setup/i }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }
  });

  it("marks the page behind the sheet inert and restores it on close", () => {
    render(<PracticeHubView />);
    openSheet(/spaced review/i);
    const dialog = screen.getByRole("dialog");
    const behind = Array.from(document.body.children).filter(
      (c) => !c.contains(dialog) && c !== dialog
    );
    expect(behind.length).toBeGreaterThan(0);
    expect(behind.every((c) => (c as HTMLElement).inert)).toBe(true);
    // The dialog itself (and its portal container) is never inert.
    expect(dialog.closest("[inert='true']")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /close setup/i }));
    expect(Array.from(document.body.children).every((c) => !(c as HTMLElement).inert)).toBe(true);
  });

  it("traps Tab focus inside the sheet", () => {
    render(<PracticeHubView />);
    openSheet(/spaced review/i);

    const dialog = screen.getByRole("dialog");
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    expect(focusables.length).toBeGreaterThan(1);

    // Focus the last element and press Tab: focus must wrap to the first.
    const last = focusables[focusables.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(focusables[0]);
  });

  it("closes on Escape and returns focus to the card that opened it", () => {
    render(<PracticeHubView />);
    const card = screen.getAllByRole("button", { name: /spaced review/i })[0];
    card.focus(); // jsdom does not focus on programmatic click
    fireEvent.click(card);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Focus restoration target is the opening card.
    expect(document.activeElement).toBe(card);
  });
});

describe("practice hub runner URLs (Quick Drill 404 regression)", () => {
  beforeEach(() => {
    LocalStorageService.clearAllGuestData();
    LocalStorageService.resetMigrationForTesting();
    window.localStorage.clear();
    PreferencesService.resetAllPreferences();
    mockPush.mockClear();
  });

  it("maps workspace level ids to runner route slugs", () => {
    expect(resolveRunnerLevelSlug("professional")).toBe("professional");
    expect(resolveRunnerLevelSlug("subprofessional")).toBe("subprofessional");
    expect(resolveRunnerLevelSlug("cse-professional")).toBe("professional");
    expect(resolveRunnerLevelSlug("cse-subprofessional")).toBe("subprofessional");
    expect(resolveRunnerLevelSlug("track-pro")).toBe("professional");
    expect(resolveRunnerLevelSlug("track-subpro")).toBe("subprofessional");
    expect(resolveRunnerLevelSlug(undefined)).toBe("professional");
  });

  it("substitutes the {level} template so enabled modes never 404", () => {
    const quick = getPracticeMode("quick");
    const medium = getPracticeMode("medium");
    const full = getPracticeMode("full");
    const diagnostic = getPracticeMode("diagnostic");

    expect(getPracticeModeHrefForLevel(quick, "subprofessional")).toBe("/exams/subprofessional/quick");
    expect(getPracticeModeHrefForLevel(medium, "cse-professional")).toBe("/exams/professional/medium");
    expect(getPracticeModeHrefForLevel(full, "track-subpro")).toBe("/exams/subprofessional/full");
    expect(getPracticeModeHrefForLevel(diagnostic, "professional")).toBe("/exams/professional/quick");
    // Disabled / missing modes fall back to the practice hub.
    expect(getPracticeModeHrefForLevel(undefined, "professional")).toBe("/practice");
    expect(getPracticeModeHrefForLevel(getPracticeMode("flashcards"), "professional")).toBe("/practice");
    // The raw catalog href must stay a template (call sites substitute it).
    expect(quick!.href).toContain("{level}");
  });

  it("launches the quick drill exam mode at the active level with feedback=exam", async () => {
    const { getByRole } = render(<PracticeHubView />);
    // The catalog card opens the setup sheet.
    fireEvent.click(getByRole("button", { name: /quick drill/i }));
    const dialog = getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // Choose Exam mode, then Start — the push target must be a real runner URL.
    fireEvent.click(getByRole("button", { name: /exam mode/i }));
    fireEvent.click(getByRole("button", { name: /start quick drill/i }));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/exams/professional/quick?feedback=exam");
    expect(mockPush.mock.calls[0][0]).not.toContain("{level}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("launches study mode and the timer-off variant at the active level", () => {
    render(<PracticeHubView />);
    fireEvent.click(screen.getAllByRole("button", { name: /quick drill/i })[0]);
    // Default: study feedback, timer on.
    fireEvent.click(screen.getByRole("button", { name: /start quick drill/i }));
    expect(mockPush).toHaveBeenCalledWith("/exams/professional/quick");

    mockPush.mockClear();
    fireEvent.click(screen.getAllByRole("button", { name: /quick drill/i })[0]);
    fireEvent.click(screen.getByRole("switch", { name: /timer/i }));
    fireEvent.click(screen.getByRole("button", { name: /start quick drill/i }));
    expect(mockPush).toHaveBeenCalledWith("/exams/professional/quick?timer=off");
  });

  it("follows the active workspace level for subprofessional learners", () => {
    LocalStorageService.clearAllGuestData();
    WorkspaceService.createWorkspace({ examId: "cse", levelId: "subprofessional" });

    render(<PracticeHubView />);
    fireEvent.click(screen.getAllByRole("button", { name: /quick drill/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /exam mode/i }));
    fireEvent.click(screen.getByRole("button", { name: /start quick drill/i }));
    expect(mockPush).toHaveBeenCalledWith("/exams/subprofessional/quick?feedback=exam");
  });

  it("direct-launch modes (full mock, diagnostic) push resolved runner URLs", () => {
    render(<PracticeHubView />);
    fireEvent.click(screen.getAllByRole("button", { name: /full mock exam/i })[0]);
    expect(mockPush).toHaveBeenCalledWith("/exams/professional/full");
    expect(mockPush.mock.calls[0][0]).not.toContain("{level}");

    mockPush.mockClear();
    // Diagnostic is a setup-sheet mode: the card opens the sheet, and its
    // start CTA resolves to the quick runner (it shares the quick engine mode).
    fireEvent.click(screen.getAllByRole("button", { name: /diagnostic test/i })[0]);
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start diagnostic test/i }));
    expect(mockPush).toHaveBeenCalledWith("/exams/professional/quick");
  });
});

describe("study plan calendar (P1)", () => {
  beforeEach(() => {
    LocalStorageService.clearAllGuestData();
    LocalStorageService.resetMigrationForTesting();
    window.localStorage.clear();
    PreferencesService.resetAllPreferences();
    WorkspaceService.createWorkspace({ examId: "cse", levelId: "professional" });
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("opens on today's month even when the exam is months away", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T02:00:00Z"));
    try {
      render(<StudyPlanView />);
      // September 2026 — NOT the exam month (March 2027).
      expect(screen.getByRole("heading", { name: /September 2026/ })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /March 2027/ })).not.toBeInTheDocument();
      // No Today button needed while already on today's month.
      expect(screen.queryByRole("button", { name: /back to today's month/i })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a Today button after navigating away and returns to today's month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T02:00:00Z"));
    try {
      render(<StudyPlanView />);
      fireEvent.click(screen.getByRole("button", { name: /next month/i }));
      expect(screen.getByRole("heading", { name: /October 2026/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /back to today's month/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /back to today's month/i }));
      expect(screen.getByRole("heading", { name: /September 2026/ })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /back to today's month/i })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
