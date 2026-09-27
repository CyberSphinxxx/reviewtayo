import { test, expect } from "@playwright/test";

test.describe("ReviewTayo Homepage Hero Redesign Visual & Responsive Verification", () => {
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

  test("verifies desktop hero presentation and captures screenshots across resolutions", async ({
    page,
  }, testInfo) => {
    const desktopViewports = [
      { name: "1280", width: 1280, height: 800 },
      { name: "1440", width: 1440, height: 900 },
      { name: "1536", width: 1536, height: 960 },
      { name: "1920", width: 1920, height: 1080 },
    ];

    for (const vp of desktopViewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Hero headline and subheadline
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toContainText(/Review smarter/i);
      await expect(h1).toContainText(/Pass sooner/i);
      await expect(
        page.getByText(/Free timed mock exams for Philippine government/i).first()
      ).toBeVisible();

      // Primary guided entry + secondary sign-in
      await expect(page.getByRole("link", { name: /Get started/i }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /Sign in/i }).first()).toBeVisible();

      // Trust strip
      await expect(page.getByText(/No account needed/i)).toBeVisible();
    }

    await page.screenshot({ path: testInfo.outputPath("hero-desktop-1920.png") });
  });

  test("verifies mobile hero presentation across 375, 390, and 430 widths", async ({
    page,
  }) => {
    const mobileViewports = [
      { name: "375", width: 375, height: 667 },
      { name: "390", width: 390, height: 844 },
      { name: "430", width: 430, height: 932 },
    ];

    for (const vp of mobileViewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Verify no horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      // Hero content visible without horizontal scroll
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toBeVisible();
      await expect(page.getByRole("link", { name: /Get started/i }).first()).toBeVisible();
    }
  });

  test("verifies user interactions: Sign In modal, guided entry, and exam browsing", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. Sign In modal check (header trigger)
    const signInBtn = page.locator("header").getByRole("button", { name: /Sign In/i }).first();
    await expect(signInBtn).toBeVisible({ timeout: 10000 });
    await signInBtn.click();
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();

    // Close modal
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: /Welcome back/i })).not.toBeVisible();

    // 2. Guided entry: hero "Get started" routes to onboarding
    const getStarted = page.getByRole("link", { name: /Get started/i }).first();
    await getStarted.click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole("heading", { name: /How would you like to keep your progress/i })
    ).toBeVisible();

    // 3. Exam browsing stays reachable (the focused onboarding canvas has
    // no global header by design; the header is one step away)
    await page.goto("/reviewers");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/reviewers$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /What are you aiming for\?/i
    );
  });
});
