import { test, expect } from "@playwright/test";

/**
 * Onboarding e2e (docs/onboarding-handoff/IMPLEMENTATION_LOOP.md stage 5).
 *
 * Auth endpoints are intercepted so these tests exercise ReviewTayo's own
 * logic — entry routing, step flow, resume, and the guest→account migration
 * screen — deterministically, without depending on a live database.
 */

const MOCK_SESSION = {
  user: { id: "u-mock", name: "Juan Mock", email: "juan@example.ph", emailVerified: true, image: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  session: { id: "s-mock", userId: "u-mock", token: "mock-token", expiresAt: new Date(Date.now() + 864e5).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ipAddress: "", userAgent: "" },
};

// Seed cookie consent up front so the consent banner never intercepts clicks
// (same convention as exam-flow.spec.ts).
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem(
      "csereviewer_cookie_consent",
      JSON.stringify({
        essential: true,
        analytics: false,
        ads: false,
        hasChosen: true,
        updatedAt: Date.now(),
      })
    );
  });
});

async function mockSignedIn(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({ json: MOCK_SESSION })
  );
}

test.describe("Onboarding — entry and guest path", () => {
  test("hero Get started opens onboarding; guest completes all steps and reaches the first activity", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    const getStarted = page.getByRole("link", { name: "Get started" }).first();
    await expect(getStarted).toBeVisible({ timeout: 15000 });
    await getStarted.click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole("heading", { name: /How would you like to keep your progress/i })
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("01-identity.png") });

    // Guest choice (honest local-only explanation visible)
    await expect(page.getByText(/kept on this device only/i)).toBeVisible();
    await page.getByRole("radio", { name: "Continue as guest" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Exam + level from config
    await expect(
      page.getByRole("heading", { name: /What are you preparing for/i })
    ).toBeVisible();
    await page.getByRole("radio", { name: "CSE" }).click();
    await page.getByRole("button", { name: "Professional", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Starting point: skip
    await expect(
      page.getByRole("heading", { name: /Where are you in your prep/i })
    ).toBeVisible();
    await page.getByRole("button", { name: "Skip for now" }).click();

    // Rhythm: Mon/Wed
    await page.getByRole("button", { name: "Monday" }).click();
    await page.getByRole("button", { name: "Wednesday" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Goal: 20 questions
    await page.getByRole("radio", { name: /20 questions a day/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Review: truthful summary + edit affordances
    await expect(page.getByRole("heading", { name: /Here's your study plan/i })).toBeVisible();
    await expect(page.getByText("CSE · Professional")).toBeVisible();
    await expect(page.getByText("Mon, Wed")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("02-review.png") });
    await page.getByRole("button", { name: /Looks good — continue/i }).click();

    // Personalize: skip
    await page.getByRole("button", { name: "Continue" }).click();

    // Finish: atomic save then celebration
    await page.getByRole("button", { name: /Save & continue/i }).click();
    await expect(page.getByText(/Your study plan is ready/i)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("03-finish.png") });

    await page.getByRole("button", { name: "Start my first practice" }).click();
    await expect(page).toHaveURL(/\/exams\/professional\/quick$/);
  });

  test("refresh mid-flow resumes the saved step with answers intact", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("radio", { name: "Continue as guest" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("radio", { name: "CSE" }).click();
    await expect(
      page.getByRole("heading", { name: /What are you preparing for/i })
    ).toBeVisible();

    // Simulated refresh: reload and expect the same step, same selection.
    await page.reload();
    await expect(
      page.getByRole("heading", { name: /What are you preparing for/i })
    ).toBeVisible();
    await expect(page.getByRole("radio", { name: "CSE" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  test("direct /onboarding entry redirects a completed user to the dashboard", async ({ page }) => {
    // Seed completed onboarding + a workspace before the page boots.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "rt_onboarding_v1",
        JSON.stringify({
          version: 1,
          status: "completed",
          currentStep: "finish",
          maxStepReached: "finish",
          answers: { identityMode: "guest", examId: "cse", levelId: "professional" },
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        })
      );
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
      window.localStorage.setItem("rt_current_workspace_id_v1", "workspace_cse");
    });

    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe("Onboarding — signed-in paths", () => {
  test("first-time signed-in user is routed to onboarding; established user is not", async ({
    page,
  }) => {
    await mockSignedIn(page);
    await page.goto("/");

    // New account (no history): hero still says Get started → onboarding.
    await expect(page.getByRole("link", { name: "Get started" }).first()).toBeVisible();

    await page.goto("/onboarding");
    await expect(
      page.getByRole("heading", { name: /How would you like to keep your progress/i })
    ).toBeVisible();

    // Choose account → the existing auth modal opens on the flow page.
    await page.getByRole("radio", { name: "Save my progress" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Create your free account/i })).toBeVisible();
  });

  test("established user sees Continue studying and is redirected away from /onboarding", async ({
    page,
  }) => {
    await mockSignedIn(page);
    await page.addInitScript(() => {
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
      window.localStorage.setItem("rt_current_workspace_id_v1", "workspace_cse");
      window.localStorage.setItem(
        "cse_guest_history",
        JSON.stringify([])
      );
    });

    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /Continue studying/i })
    ).toBeVisible({ timeout: 15000 });

    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("guest-to-account migration is offered and never destroys local progress", async ({
    page,
  }) => {
    // Note: no get-session mock here — the header must render the signed-out
    // state so the Sign In trigger exists; only the sign-in POST is mocked.
    await page.addInitScript(() => {
      // Guest has real local progress on this device (real storage key:
      // cse_guest_attempts_history — see LocalStorageService.STORAGE_KEYS).
      window.localStorage.setItem(
        "cse_guest_attempts_history",
        JSON.stringify([
          {
            id: "att-e2e-1",
            title: "Quick Test",
            mode: "quick",
            percentage: 80,
            rawScore: 8,
            totalQuestions: 10,
            passed: true,
            date: new Date().toISOString(),
          },
        ])
      );
    });

    // The homepage hosts the auth modal with the migration screen.
    await page.goto("/");
    await page.locator("header").getByRole("button", { name: "Sign In" }).first().click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // Sign in (Better Auth POST intercepted at the boundary).
    await page.route("**/api/auth/sign-in/email", (route) =>
      route.fulfill({ json: MOCK_SESSION })
    );
    await modal.getByLabel("Email Address").fill("juan@example.ph");
    await modal.getByPlaceholder("Enter your password").fill("Secret123!");
    // Scoped to the submit control: "Sign In" also matches the tab switcher.
    await modal.locator("button[type=submit]").click();

    // The post-auth migration screen appears because local progress exists.
    await expect(page.getByText(/Signed In Successfully/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/detected offline study progress/i)).toBeVisible();

    // Skipping keeps every local record — no silent destruction.
    await page.getByRole("button", { name: /Skip for Now/i }).click();
    await expect(modal).not.toBeVisible();
    const history = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem("cse_guest_attempts_history") || "[]")
    );
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe("att-e2e-1");
  });
});
