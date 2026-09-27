import { test, expect } from "@playwright/test";

test.describe("ReviewTayo Multi-Exam Platform Visual & Interactive Walkthrough", () => {
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

  test("captures desktop and mobile walkthrough of /, /reviewers, and /cse", async ({ page }) => {
    // 1. Desktop 1280x800: Umbrella Homepage
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Review smarter/i);
    await expect(page.getByText(/Free timed mock exams for Philippine government/i).first()).toBeVisible();

    // Verify the guided "Get started" entry links to onboarding
    const getStartedBtn = page.getByRole("link", { name: /Get started/i }).first();
    await expect(getStartedBtn).toBeVisible();
    await expect(getStartedBtn).toHaveAttribute("href", "/onboarding");

    // 2. Hero "Get started" -> onboarding; exams are browsed via the header
    await getStartedBtn.click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole("heading", { name: /How would you like to keep your progress/i })).toBeVisible();

    // Browse exams via the global header instead
    await page.goto("/reviewers");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/reviewers$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/What are you aiming for\?/i);

    // Test category filter
    await page.getByRole("button", { name: /Education/i }).first().click();
    await expect(page.getByText(/Licensure Examination for Professional Teachers/i).first()).toBeVisible();
    await page.getByRole("button", { name: /All exams/i }).click();

    // 3. Click "Open exam" on live CSE card -> navigates to /cse
    const cseCardBtn = page.getByRole("link", { name: /Open exam/i }).first();
    await expect(cseCardBtn).toBeVisible();
    await cseCardBtn.click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/cse(\?.*)?$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Pass the CSE/i);

    // Verify ExamSubNav is present with Overview active
    const subNav = page.getByRole("navigation", { name: /Exam navigation/i });
    await expect(subNav).toBeVisible();
    await expect(subNav.getByRole("link", { name: "Overview" })).toBeVisible();

    // 4. Test 2-click hero diagnostic flow from homepage
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const diagnosticBtn = page.getByRole("link", { name: /Start free diagnostic/i });
    await expect(diagnosticBtn).toBeVisible();
    await diagnosticBtn.click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/exams\/professional\/quick$/);

    // 5. Mobile Viewport 375x812 on Homepage
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Confirm no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

  });
});
