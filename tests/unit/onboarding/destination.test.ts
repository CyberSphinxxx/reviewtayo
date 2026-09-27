import { describe, it, expect, beforeEach } from "vitest";
import {
  getPostAuthDestination,
  sanitizeReturnTo,
  getPostAuthDestinationFromState,
} from "@/lib/onboarding/destination";
import { OnboardingService } from "@/lib/onboarding/onboarding-service";
import { LocalStorageService } from "@/lib/storage/local-storage-service";

describe("sanitizeReturnTo", () => {
  it("accepts same-site absolute paths", () => {
    expect(sanitizeReturnTo("/dashboard")).toBe("/dashboard");
    expect(sanitizeReturnTo("/exams/professional/quick")).toBe(
      "/exams/professional/quick"
    );
  });

  it("rejects off-site and protocol-relative URLs", () => {
    expect(sanitizeReturnTo("https://evil.example")).toBeNull();
    expect(sanitizeReturnTo("//evil.example")).toBeNull();
    expect(sanitizeReturnTo("javascript:alert(1)")).toBeNull();
    expect(sanitizeReturnTo(null)).toBeNull();
    expect(sanitizeReturnTo("")).toBeNull();
  });
});

describe("getPostAuthDestination — routing matrix", () => {
  it.each([
    ["completed", false, "/dashboard"],
    ["completed", true, "/dashboard"],
    ["dismissed", false, "/dashboard"],
    ["dismissed", true, "/dashboard"],
    ["not_started", true, "/dashboard"],
    ["in_progress", true, "/dashboard"],
    ["not_started", false, "/onboarding"],
    ["in_progress", false, "/onboarding"],
  ] as const)(
    "status=%s established=%s → %s",
    (status, established, expected) => {
      expect(getPostAuthDestination({ status, established })).toBe(expected);
    }
  );

  it("honors a sanitized returnTo over the default", () => {
    expect(
      getPostAuthDestination({
        status: "completed",
        established: true,
        returnTo: "/dashboard/plan",
      })
    ).toBe("/dashboard/plan");
  });

  it("ignores an unsafe returnTo", () => {
    expect(
      getPostAuthDestination({
        status: "completed",
        established: true,
        returnTo: "https://evil.example",
      })
    ).toBe("/dashboard");
  });

  it("does not send an established user back through onboarding even when returnTo is onboarding", () => {
    // Never loop an established user into the first-run flow.
    expect(
      getPostAuthDestination({
        status: "not_started",
        established: true,
        returnTo: "/onboarding",
      })
    ).toBe("/onboarding");
  });
});

describe("getPostAuthDestinationFromState — local-state wiring", () => {
  beforeEach(() => {
    window.localStorage.clear();
    LocalStorageService.resetMigrationForTesting();
    OnboardingService.reset();
  });

  it("routes a brand-new visitor to onboarding", () => {
    expect(getPostAuthDestinationFromState()).toBe("/onboarding");
  });

  it("resumes onboarding for an in-progress new user (saved step restored by the page)", () => {
    OnboardingService.startAt("identity");
    OnboardingService.moveTo("goal");
    expect(getPostAuthDestinationFromState()).toBe("/onboarding");
  });

  it("routes an established legacy user straight to the dashboard", () => {
    window.localStorage.setItem(
      "rt_workspaces_v1",
      JSON.stringify([
        {
          id: "workspace_cse",
          examId: "cse",
          levelId: "professional",
          createdAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
        },
      ])
    );
    expect(getPostAuthDestinationFromState()).toBe("/dashboard");
  });

  it("routes a completed user to their returnTo destination", () => {
    OnboardingService.startAt("identity");
    OnboardingService.complete();
    expect(getPostAuthDestinationFromState("/practice")).toBe("/practice");
  });
});
