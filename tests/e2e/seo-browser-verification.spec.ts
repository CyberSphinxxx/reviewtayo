import { test, expect } from "@playwright/test";

test.describe("SEO Public Routes & Mobile Readiness Verification", () => {
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

  const publicRoutes = [
    {
      path: "/",
      expectedH1: "Review smarter",
      expectedTitle: "Philippine Exam Reviewer & Mock Tests",
      canonical: "https://www.reviewtayo.online",
    },
    {
      path: "/reviewers",
      expectedH1: "What are you aiming for?",
      expectedTitle: "Philippine Exam Reviewers & Mock Tests | ReviewTayo",
      canonical: "https://www.reviewtayo.online/reviewers",
      hasBreadcrumbs: true,
    },
    {
      path: "/cse",
      expectedH1: "Pass the CSE on your first take.",
      expectedTitle: "CSE Reviewer Philippines: Free Practice Tests and Mock Exams | ReviewTayo",
      canonical: "https://www.reviewtayo.online/cse",
    },
    {
      path: "/practice",
      expectedH1: "Practice by Subtest & Topic",
      expectedTitle: "Free Civil Service Exam Practice Tests by Subtest | ReviewTayo",
      canonical: "https://www.reviewtayo.online/practice",
    },
    {
      path: "/exam-info",
      expectedH1: "Philippine Civil Service Exam (CSE-PPT) Overview",
      expectedTitle: "Civil Service Exam Guide & Information | ReviewTayo",
      canonical: "https://www.reviewtayo.online/exam-info",
    },
    {
      path: "/cse/exam-guide",
      expectedH1: "CSE Exam Guide and Official CSC Links",
      expectedTitle: "CSE Exam Schedule, Requirements & Testing Centers | ReviewTayo",
      canonical: "https://www.reviewtayo.online/cse/exam-guide",
    },
    {
      path: "/cse/exam-guide/schedule",
      expectedH1: "CSE Exam Guide and Official CSC Links",
      expectedTitle: "CSE Exam Schedule & Calendar (2027 & Historical) | ReviewTayo",
      canonical: "https://www.reviewtayo.online/cse/exam-guide/schedule",
      hasBreadcrumbs: true,
    },
    {
      path: "/articles",
      expectedH1: "Civil Service Preparation Articles",
      expectedTitle: "Civil Service Exam Strategy & Preparation Articles | ReviewTayo",
      canonical: "https://www.reviewtayo.online/articles",
    },
    {
      path: "/articles/cse-professional-exam-reviewer-guide",
      expectedH1: "Civil Service Exam Professional Reviewer: Comprehensive Breakdown & Preparation Strategy",
      expectedTitle: "CSE Professional Reviewer & Guide | ReviewTayo",
      canonical: "https://www.reviewtayo.online/articles/cse-professional-exam-reviewer-guide",
      hasBreadcrumbs: true,
      hasArticleSchema: true,
    },
    {
      path: "/guides",
      expectedH1: "Every exam. Every guide.",
      expectedTitle: "Study Guides & Reviewers for Philippine Exams | ReviewTayo",
      canonical: "https://www.reviewtayo.online/guides",
    },
    {
      path: "/guides/ra-6713-code-of-conduct",
      expectedH1: "Republic Act No. 6713: Code of Conduct & Ethical Standards for Public Officials",
      expectedTitle: "RA 6713 Code of Conduct & Ethics Guide | ReviewTayo",
      canonical: "https://www.reviewtayo.online/guides/ra-6713-code-of-conduct",
      hasBreadcrumbs: true,
      hasTechArticleSchema: true,
    },
    {
      path: "/faq",
      expectedH1: "Civil Service Exam Frequently Asked Questions",
      expectedTitle: "Frequently Asked Questions | ReviewTayo",
      canonical: "https://www.reviewtayo.online/faq",
      hasFaqSchema: true,
    },
    {
      path: "/about",
      expectedH1: "About ReviewTayo",
      expectedTitle: "About Our Mission & Platform | ReviewTayo",
      canonical: "https://www.reviewtayo.online/about",
    },
    {
      path: "/privacy",
      expectedH1: "Privacy Policy",
      expectedTitle: "Privacy Policy | ReviewTayo",
      canonical: "https://www.reviewtayo.online/privacy",
    },
  ];

  for (const route of publicRoutes) {
    test(`Desktop: ${route.path} has valid H1, title, canonical, and Schema`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(route.path, { waitUntil: "domcontentloaded" });

      // Title check - must NOT have duplicated brand suffix
      const title = await page.title();
      expect(title).toBe(route.expectedTitle);
      expect(title).not.toContain("ReviewTayo | ReviewTayo");
      expect(title).not.toContain("ReviewTayo — ReviewTayo");

      // Single H1 check with text content assertion
      const h1Count = await page.locator("h1").count();
      expect(h1Count, `Expected 1 H1 on ${route.path}`).toBe(1);
      await expect(page.locator("h1")).toContainText(route.expectedH1);

      // Canonical link check - must end with expected path
      const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonicalHref).toBeDefined();
      const expectedPath = route.path === "/" ? "" : route.path;
      expect(canonicalHref?.replace(/\/+$/, "")).toMatch(new RegExp(`(:3000|www\\.reviewtayo\\.online)${expectedPath}$`));

      // Visual breadcrumbs check
      if (route.hasBreadcrumbs) {
        const breadcrumbs = page.locator('nav[aria-label="Breadcrumb"]');
        await expect(breadcrumbs).toBeVisible();
      }

      // JSON-LD structured data check
      const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
      expect(scripts.length).toBeGreaterThanOrEqual(1);

      if (route.hasArticleSchema) {
        const hasArticle = scripts.some((s) => s.includes('"@type":"Article"'));
        expect(hasArticle).toBe(true);
      }

      if (route.hasTechArticleSchema) {
        const hasTechArticle = scripts.some((s) => s.includes('"@type":"TechArticle"'));
        expect(hasTechArticle).toBe(true);
      }

      if (route.hasFaqSchema) {
        const hasFaq = scripts.some((s) => s.includes('"@type":"FAQPage"'));
        expect(hasFaq).toBe(true);
      }
    });

    test(`Mobile (375px): ${route.path} renders cleanly without horizontal scroll or blocked navigation`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(route.path, { waitUntil: "load" });
      await page.waitForLoadState("networkidle");

      // Ensure no horizontal body overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px margin for subpixel rounding

      // Ensure H1 is visible and contains expected text
      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();
      await expect(h1).toContainText(route.expectedH1);

      // Test mobile navigation drawer interactivity
      const openMenuBtn = page.getByRole("button", { name: "Open navigation menu" });
      if (await openMenuBtn.isVisible()) {
        await openMenuBtn.click();
        const mobileNav = page.getByRole("navigation", { name: /Primary mobile|Exam workspace mobile/ });
        await expect(mobileNav).toBeVisible();
        await expect(mobileNav.getByRole("link", { name: /Exams|All exams/i }).first()).toBeVisible();
        await page.getByRole("button", { name: "Close navigation menu" }).click();
        await expect(mobileNav).toBeHidden();
        await expect(openMenuBtn).toBeVisible();
      }
    });
  }

  test("Direct robots.txt request returns canonical sitemap and directives", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/Sitemap: https?:\/\/[^\/]+\/sitemap\.xml/);
    expect(text).toContain("Disallow: /api/");
    expect(text).toContain("Disallow: /settings/");
  });

  test("Direct sitemap.xml request returns valid XML with public routes", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("<urlset");
    expect(text).toContain("/articles/cse-professional-exam-reviewer-guide");
    expect(text).toContain("/articles/cse-subprofessional-exam-reviewer-guide");
    expect(text).toContain("/articles/how-civil-service-exam-scoring-works");
  });

  test("Direct ads.txt request returns valid policy-compliant response", async ({ request }) => {
    const res = await request.get("/ads.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    // Either live publisher record or policy compliance placeholder notice
    expect(text.includes("google.com, pub-") || text.includes("reviewtayo.online")).toBe(true);
  });
});
