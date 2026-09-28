import { test, expect } from "@playwright/test";

/**
 * Practice-mode (instant feedback) answer gate: Answer → commit → verdict →
 * Next. Pins the two-step behavior and the exam-mode contrast end to end.
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
  });
});

test("topic practice requires Answer before revealing the verdict, then Next", async ({ page }) => {
  await page.goto("/practice/top-pro-grammar");

  await expect(page.locator("#exam-timer")).toBeVisible();

  // No selection yet: the primary action is a disabled Answer with a hint.
  const answerBtn = page.locator("#next-question-btn");
  await expect(answerBtn).toHaveText(/Answer/);
  await expect(answerBtn).toBeDisabled();
  await expect(page.getByText(/Select an answer to continue/i)).toBeVisible();

  // Selection alone reveals nothing.
  await page.locator("button:has(span.rounded-lg:text('A'))").first().click();
  await expect(page.getByTestId("practice-verdict")).toHaveCount(0);

  // Committing reveals the verdict + explanation and swaps the CTA to Next.
  await answerBtn.click();
  const verdict = page.getByTestId("practice-verdict");
  await expect(verdict).toBeVisible();
  const verdictText = (await verdict.textContent()) ?? "";
  expect(verdictText).toMatch(/Correct\.|Incorrect/);
  // The owl bubble carries the rationale after commit.
  await expect(page.getByTestId("coach-panel")).toBeVisible();
  // The committed choice is locked; the primary action is now Next.
  await expect(answerBtn).toHaveText(/Next/);
});

test("practice verdict and reveal survive keyboard operation", async ({ page }) => {
  await page.goto("/practice/top-pro-grammar");
  await page.locator("main").click();

  // Keyboard: select with A, commit by focusing the action row's primary
  // button and pressing Enter (the global ArrowRight handler also routes
  // through the same gate).
  await page.keyboard.press("KeyA");
  const answerBtn = page.locator("#next-question-btn");
  await expect(answerBtn).toHaveText(/Answer/);
  await answerBtn.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("practice-verdict")).toBeVisible();
  await expect(answerBtn).toHaveText(/Next/);

  // ArrowRight advances to question 2 after commit.
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/Question 2 of/i)).toBeVisible();
});

test("exam mode keeps the Next flow and hides the verdict entirely", async ({ page }) => {
  await page.goto("/exams/professional/quick");

  const nextBtn = page.locator("#next-question-btn");
  await expect(nextBtn).toHaveText(/Next/);

  await page.locator("button:has(span.rounded-lg:text('A'))").first().click();
  await expect(page.getByText("Selected").first()).toBeVisible();

  // No verdict, no explanation, no Answer label — answers stay hidden.
  await expect(page.getByTestId("practice-verdict")).toHaveCount(0);
  await expect(nextBtn).toHaveText(/Next/);
  await nextBtn.click();
  await expect(page.getByText(/Question 2 of 10/i)).toBeVisible();
});
