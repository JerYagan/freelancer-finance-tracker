import { test, expect } from "@playwright/test";

test.describe("E2E Smoke Test", () => {
  test("renders the homepage successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Tally/i);
    await expect(page.locator("main")).toBeVisible();
  });
});
