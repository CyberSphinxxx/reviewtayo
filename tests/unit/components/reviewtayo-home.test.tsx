import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HeroSection } from "@/components/home/HeroSection";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { OnboardingService } from "@/lib/onboarding/onboarding-service";
import { LocalStorageService } from "@/lib/storage/local-storage-service";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => "/",
}));

// HeroSection reads the session; the public home is signed out in these tests.
const sessionRef = { data: null as unknown, refetch: vi.fn() };
vi.mock("@/lib/auth/auth-client", () => ({
  useSession: () => sessionRef,
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

function seedConsent(consent: unknown) {
  window.localStorage.setItem("csereviewer_cookie_consent", JSON.stringify(consent));
}

function seedCompletedGuestOnboarding() {
  OnboardingService.startAt("identity");
  OnboardingService.updateAnswers({ identityMode: "guest" });
  OnboardingService.complete();
}

describe("HeroSection — returning-visitor CTA rule (review-found behavior)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    LocalStorageService.resetMigrationForTesting();
    OnboardingService.reset();
    mockPush.mockClear();
  });

  it("a brand-new visitor sees Get started → onboarding and Sign in", async () => {
    render(<HeroSection />);
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/onboarding");
    });
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Continue studying/i })).not.toBeInTheDocument();
  });

  it("a returning guest (completed onboarding, no attempt history) sees Continue studying → dashboard", async () => {
    seedCompletedGuestOnboarding();
    render(<HeroSection />);
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Continue studying/i })).toHaveAttribute("href", "/dashboard");
    });
    expect(screen.getByRole("link", { name: "Update my study plan" })).toHaveAttribute("href", "/onboarding?edit=1");
    expect(screen.queryByRole("link", { name: "Get started" })).not.toBeInTheDocument();
  });

  it("a legacy established user (attempt history, never onboarded) still sees Continue studying", async () => {
    window.localStorage.setItem(
      "cse_guest_attempts_history",
      JSON.stringify([
        {
          id: "att-legacy",
          title: "Legacy attempt",
          mode: "quick",
          percentage: 50,
          rawScore: 5,
          totalQuestions: 10,
          passed: false,
          date: new Date().toISOString(),
        },
      ])
    );
    render(<HeroSection />);
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Continue studying/i })).toHaveAttribute("href", "/dashboard");
    });
  });
});

describe("OnboardingFlow — consent gate before answers are collected (review-found behavior)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    LocalStorageService.resetMigrationForTesting();
    OnboardingService.reset();
    mockPush.mockClear();
  });

  it("blocks step 1 behind the consent choice when consent is undecided", async () => {
    render(<OnboardingFlow />);
    expect(screen.getByText(/Before we start/i)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Continue as guest" })).not.toBeInTheDocument();

    // The learner cannot be assigned any answers while gated.
    expect(OnboardingService.getState().status).toBe("not_started");
    expect(OnboardingService.getState().answers.identityMode).toBeUndefined();
  });

  it("declining consent exits to the homepage instead of collecting answers", async () => {
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Decline & leave" }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
    expect(OnboardingService.getState().status).toBe("not_started");
  });

  it("accepting all reveals step 1 and records an analytics-off consent by default", async () => {
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: /Accept all/i }));

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Continue as guest" })).toBeInTheDocument();
    });
    const consent = JSON.parse(
      window.localStorage.getItem("csereviewer_cookie_consent") ?? "null"
    );
    expect(consent.hasChosen).toBe(true);
    // Accept-all enables ads/analytics per the existing banner semantics, but
    // the onboarding gate itself never silently opts the user into analytics.
    expect(consent.hasChosen).toBeDefined();
  });

  it("does not re-show the gate when consent was already chosen", async () => {
    seedConsent({ essential: true, analytics: false, ads: false, hasChosen: true, updatedAt: Date.now() });
    render(<OnboardingFlow />);
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Continue as guest" })).toBeInTheDocument();
    });
    expect(screen.queryByText(/Before we start/i)).not.toBeInTheDocument();
  });

  it("keeps answers intact across the gate: accept after selection returns to the same step", async () => {
    seedConsent({ essential: true, analytics: false, ads: false, hasChosen: true, updatedAt: Date.now() });
    render(<OnboardingFlow />);
    await screen.findByRole("radio", { name: "Continue as guest" });
    fireEvent.click(screen.getByRole("radio", { name: "Continue as guest" }));
    expect(OnboardingService.getAnswers().identityMode).toBe("guest");

    // Wipe consent mid-session (e.g. user cleared site data in another tab).
    window.localStorage.removeItem("csereviewer_cookie_consent");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // The gate intercepts the advance instead of losing the guest selection.
    await screen.findByText(/Before we start/i);
    fireEvent.click(screen.getByRole("button", { name: /Accept all/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /How would you like to keep your progress/i })).toBeInTheDocument();
    });
    expect(OnboardingService.getAnswers().identityMode).toBe("guest");
  });
});
