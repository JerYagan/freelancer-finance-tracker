import { test, expect } from "@playwright/test";

test.describe("Auth Flow & Session Guard", () => {
  test("redirects unauthenticated user from /dashboard to /sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*sign-in/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("renders sign-in page with required inputs and link to sign-up", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();
    await expect(page).toHaveURL(/.*sign-up/);
  });

  test("validates password length on sign-up page", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel(/full name/i).fill("Test Freelancer");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill("short");

    await page.getByRole("button", { name: /sign up/i }).click();
    await expect(
      page.getByText(/password must be at least 10 characters long/i),
    ).toBeVisible();
  });
});
