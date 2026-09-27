import { test, expect } from "@playwright/test";

test.describe("ReviewTayo Landing Page V3 Verification", () => {
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

  test("verifies full desktop experience, typography, mascot, and all 5 sections", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.setViewportSize({ width: 1280, height: 850 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 1. Header Verification
    const logoLink = page.getByRole("link", { name: /reviewtayo/i }).first();
    await expect(logoLink).toBeVisible();
    await expect(page.getByRole("link", { name: "Exams" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Study resources" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "My dashboard" }).first()).toBeVisible();

    // 2. Hero Section Verification
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toContainText(/Review smarter.\s*Pass sooner./i);

    const startDiagHero = page.getByRole("link", { name: /Start free diagnostic/i }).first();
    await expect(startDiagHero).toBeVisible();
    await expect(startDiagHero).toHaveAttribute("href", "/exams/professional/quick");

    // Trust strip
    await expect(page.getByText("No account needed")).toBeVisible();
    await expect(page.getByText("Free diagnostic").first()).toBeVisible();
    await expect(page.getByText("Explanations included")).toBeVisible();

    // Floating UI preview cards
    await expect(page.getByText("Opposite of “scarce”?")).toBeVisible();
    await expect(page.getByText("82%")).toBeVisible();
    await expect(page.getByText("Scarce means hard to find, so the opposite is plentiful.")).toBeVisible();

    // Hero Owl Mascot
    const heroOwl = page.getByRole("img", { name: /ReviewTayo Owl Mascot/i });
    await expect(heroOwl).toBeVisible();

    // 3. Section 2: Try a Real Question
    await expect(page.getByRole("heading", { name: /Try a real question\. Right now\./i })).toBeVisible();
    await expect(page.getByText("What is 15% of 240?")).toBeVisible();

    // Click Option B (36)
    const optB = page.getByRole("button", { name: /B 36/i });
    await expect(optB).toBeVisible();
    await optB.click();

    // Verify explanation box appears with Correct header
    await expect(page.getByText("Correct.")).toBeVisible();
    await expect(page.getByText(/10% of 240 is 24 and 5% is 12\. Add them to get 36\./i)).toBeVisible();

    // Verify Next Question button advances
    const nextBtn = page.getByRole("button", { name: /Next question/i });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    await expect(page.getByText(/Choose the word closest in meaning to “prudent”\./i)).toBeVisible();

    // 4. Section 3: Which Exam Are You Taking?
    await expect(page.getByRole("heading", { name: /Which exam are you taking\?/i })).toBeVisible();

    // Category tabs
    const civilTab = page.getByRole("button", { name: "Civil Service" });
    await expect(civilTab).toBeVisible();
    await civilTab.click();
    await expect(civilTab).toHaveAttribute("aria-pressed", "true");

    const allTab = page.getByRole("button", { name: "All" });
    await allTab.click();
    await expect(allTab).toHaveAttribute("aria-pressed", "true");

    // Live CSE Card
    await expect(page.getByRole("heading", { name: "Civil Service Exam", exact: true })).toBeVisible();
    const openExamLink = page.getByRole("link", { name: /Open exam/i });
    await expect(openExamLink).toHaveAttribute("href", "/cse");

    // Vote button on coming soon card
    const voteBtn = page.getByRole("button", { name: /Vote for this exam/i }).first();
    await expect(voteBtn).toBeVisible();
    await voteBtn.click();
    await expect(page.getByRole("button", { name: "Voted" })).toBeVisible();

    // 5. Section 4: What's Inside Bento
    await expect(page.getByRole("heading", { name: /Practice like it’s exam day\./i })).toBeVisible();

    // Practice length selector
    const length10 = page.getByRole("radio", { name: /10 items Quick drill/i });
    await length10.click();
    await expect(length10).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("Best for a spare few minutes.")).toBeVisible();

    // Subject breakdown
    await expect(page.getByText("Subject breakdown")).toBeVisible();
    await expect(page.getByText("Verbal").first()).toBeVisible();

    // Sequence rationale tile
    await expect(page.getByText("Why 162?")).toBeVisible();

    // Recommended next plan tile
    await expect(page.getByText("Numerical ability").first()).toBeVisible();

    // 6. Section 5: Countdown Close & Marquee
    await expect(page.getByText(/days until the Civil Service Exam\./i)).toBeVisible();
    await expect(page.getByText("Where would you score today? Find out in 10 minutes.")).toBeVisible();

    // Footer
    await expect(page.getByText("Non-affiliation notice.")).toBeVisible();
    await expect(page.getByText(/Privacy-first · RA 10173/i).first()).toBeVisible();

    // 7. Verify Design Notes are completely removed
    const notesBtn = page.locator("#notesbtn");
    await expect(notesBtn).toHaveCount(0);
    const notesOverlay = page.locator(".note");
    await expect(notesOverlay).toHaveCount(0);

    // 8. Verify Moon Owl is centered inside the golden circle
    const moon = page.locator("#sec-e .aspect-square");
    await expect(moon).toBeVisible();
    const moonBox = await moon.boundingBox();
    const moonOwl = page.getByRole("img", { name: /ReviewTayo mascot in the moon/i });
    await expect(moonOwl).toBeVisible();
    const owlBox = await moonOwl.boundingBox();
    expect(moonBox).not.toBeNull();
    expect(owlBox).not.toBeNull();
    if (moonBox && owlBox) {
      const moonCenterX = moonBox.x + moonBox.width / 2;
      const owlCenterX = owlBox.x + owlBox.width / 2;
      // Centered within a 4px tolerance
      expect(Math.abs(moonCenterX - owlCenterX)).toBeLessThanOrEqual(4);
    }

    // 9. Verify Exam rail has c-rail class and hidden scrollbar
    const cRail = page.locator(".c-rail");
    await expect(cRail).toBeVisible();
    const scrollbarWidth = await cRail.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.scrollbarWidth;
    });
    expect(scrollbarWidth).toBe("none");

    // 10. Verify Hero Floating Cards Parallax Movement
    await page.locator("#sec-a").scrollIntoViewIfNeeded();
    const card1 = page.locator('.fw[data-depth="26"]');
    await expect(card1).toBeVisible();
    await page.mouse.move(100, 200);
    await page.waitForTimeout(200);
    const transform1 = await card1.evaluate((el) => (el as HTMLElement).style.transform);
    expect(transform1).toContain("translate(");

    // 11. Verify All Owls Pupil Tracking on pointermove
    const pupils = page.locator(".pupil");
    const pupilCount = await pupils.count();
    expect(pupilCount).toBeGreaterThanOrEqual(4);
    const pupilTransform = await pupils.first().evaluate((el) => (el as SVGElement).style.transform);
    expect(pupilTransform).toContain("translate(");

    // 12. Verify Bento "Why 162?" tile has t-why-owl hover target
    const whyOwl = page.locator(".t-why .t-why-owl");
    await expect(whyOwl).toBeVisible();

    // Capture Full Page Screenshot
    await page.screenshot({ path: "artifacts/landing-page-desktop.png", fullPage: true });

    // Assert zero critical console errors
    const fatalErrors = consoleErrors.filter(
      (err) => !err.includes("favicon") && !err.includes("pagead") && !err.includes("adsbygoogle")
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test("verifies mobile layout, responsive wrapping, and hamburger menu", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // Verify Hamburger button exists and opens menu
    const burgerBtn = page.getByRole("button", { name: /menu/i });
    await expect(burgerBtn).toBeVisible();
    await burgerBtn.click();

    // Verify mobile drawer navigation links (homepage uses the global
    // Header, whose mobile nav is labeled "Primary mobile …")
    const mobileMenu = page.getByRole("navigation", { name: /mobile/i });
    await expect(mobileMenu).toBeVisible();
    await expect(mobileMenu.getByRole("link", { name: "Exams" })).toBeVisible();
    await expect(mobileMenu.getByRole("link", { name: "Study resources" })).toBeVisible();
    await expect(mobileMenu.getByRole("link", { name: "My dashboard" })).toBeVisible();
    await expect(mobileMenu.getByRole("link", { name: /FAQ/i })).toBeVisible();

    // Close menu by clicking again
    await burgerBtn.click();
    await expect(mobileMenu).not.toBeVisible();

    // Capture Mobile Screenshot
    await page.screenshot({ path: "artifacts/landing-page-mobile.png", fullPage: false });
  });

  test("verifies keyboard accessibility and focus navigation", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Tab through interactive elements
    await page.keyboard.press("Tab");
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(["A", "BUTTON"]).toContain(firstFocused);

    // Continue tabbing to ensure focus is not trapped
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
    }
    const currentFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(["A", "BUTTON", "INPUT"]).toContain(currentFocused);
  });
});
