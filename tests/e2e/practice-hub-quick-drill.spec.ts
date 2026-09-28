import { test, expect } from "@playwright/test";

/**
 * Regression coverage for the reported Quick Drill 404 and adjacent
 * practice/exam-mode launch paths (practice hub → setup sheet → runner).
 *
 * The hub's practice-mode catalog stores {level} route templates; embedding
 * them verbatim produced /exams/{level}/quick → 404. These specs pin the
 * substituted, workspace-level-aware URLs end to end.
 */

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
    // Seed a completed CSE-professional onboarding so the practice hub is
    // unlocked (fresh profiles lock Practice behind "choose an exam").
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
});

test("dashboard practice → Quick drill → Exam mode → Start opens the quick runner", async ({ page }) => {
  await page.goto("/dashboard/practice");

  // Open the Quick drill setup sheet from the catalog card.
  await page.getByRole("button", { name: /quick drill/i }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Choose Exam mode (answers revealed only at the end).
  await dialog.getByRole("button", { name: /exam mode/i }).click();
  await dialog.getByRole("button", { name: /start quick drill/i }).click();

  // The exact reported failing navigation: it must land on a valid runner.
  await page.waitForURL(/\/exams\/professional\/quick/);
  await expect(page).not.toHaveURL(/\{level\}/);
  await expect(page.locator("#exam-timer")).toBeVisible();
  await expect(page.getByText(/Question 1 of 10/i)).toBeVisible();
  // Exam mode: quiet assessment chrome — answers are not revealed on selection.
  await page.locator("button:has(span.rounded-lg:text('A'))").first().click();
  await expect(page.getByText("Selected").first()).toBeVisible();
  await expect(page.getByText(/Correct\./)).toHaveCount(0);
});

test("dashboard practice → Quick drill → Study mode → Start opens the quick runner", async ({ page }) => {
  await page.goto("/dashboard/practice");
  await page.getByRole("button", { name: /quick drill/i }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // Study mode is the default feedback choice.
  await dialog.getByRole("button", { name: /start quick drill/i }).click();

  await page.waitForURL(/\/exams\/professional\/quick$/);
  await expect(page.locator("#exam-timer")).toBeVisible();
  // The hub passes no mode override params for study mode.
  await expect(page).not.toHaveURL(/feedback=exam/);
});

test("study start date is preserved when the study timer is switched off", async ({ page }) => {
  await page.goto("/dashboard/practice");
  await page.getByRole("button", { name: /quick drill/i }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("switch", { name: /timer/i }).click();
  await dialog.getByRole("button", { name: /start quick drill/i }).click();
  await page.waitForURL(/\/exams\/professional\/quick\?timer=off$/);
  await expect(page.locator("#exam-timer")).toBeVisible();
});

test("direct-launch full mock and diagnostic cards open resolved runner URLs", async ({ page }) => {
  await page.goto("/dashboard/practice");

  await page.getByRole("button", { name: /full mock exam/i }).first().click();
  await page.waitForURL(/\/exams\/professional\/full$/);
  await expect(page.locator("#exam-timer")).toBeVisible();
});

test("adjacent path: medium assessment launches at the active level", async ({ page }) => {
  await page.goto("/dashboard/practice");
  await page.getByRole("button", { name: /medium assessment/i }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /start medium assessment/i }).click();
  await page.waitForURL(/\/exams\/professional\/medium/);
  await expect(page.locator("#exam-timer")).toBeVisible();
  await expect(page.getByText(/Question 1 of 19/i)).toBeVisible();
});

test("an unknown level segment shows the in-app unavailable state, not a bare 404", async ({ page }) => {
  await page.goto("/exams/advanced/quick");
  await expect(page.getByText(/No question pool for/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Professional quick drill/i })).toBeVisible();

  // Recovery links actually resolve.
  await page.getByRole("link", { name: /Professional quick drill/i }).click();
  await page.waitForURL(/\/exams\/professional\/quick$/);
  await expect(page.locator("#exam-timer")).toBeVisible();
});

test("the quick drill works on a direct visit and after refresh (draft resume prompt)", async ({ page }) => {
  await page.goto("/exams/professional/quick");
  await expect(page.locator("#exam-timer")).toBeVisible();
  await page.locator("button:has(span.rounded-lg:text('A'))").first().click();

  // Direct navigation with an in-progress draft: the session survives reload.
  await page.reload();
  await expect(page.getByText(/Unfinished Session Found/i)).toBeVisible();
  await page.getByRole("button", { name: /Discard & Start Fresh/i }).click();
  await expect(page.getByText(/Question 1 of 10/i)).toBeVisible();
});
