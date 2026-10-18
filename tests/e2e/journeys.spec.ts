import { test, expect } from "@playwright/test";

test.describe("Freelancer E2E Journeys", () => {
  test("Public Landing Page: verifies Tally branding, hero, tax calculator, and CTA links", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Brand logo & headline
    await expect(page.getByRole("link", { name: "Tally — Home" }).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /freelance finances, simplified/i }),
    ).toBeVisible();
    await expect(page.getByText(/track it\. earn it\. grow it\./i).first()).toBeVisible();

    // 2. Navigation CTA buttons
    const startFreeNav = page.getByRole("link", { name: /start tracking free/i }).first();
    await expect(startFreeNav).toBeVisible();
    await expect(startFreeNav).toHaveAttribute("href", "/sign-up");

    // 3. Tax calculator interactivity
    await expect(
      page.getByRole("heading", { name: /never worry about quarterly taxes again/i }),
    ).toBeVisible();
    const usdBtn = page.getByRole("button", { name: "USD ($)" });
    const phpBtn = page.getByRole("button", { name: "PHP (₱)" });
    await expect(usdBtn).toBeVisible();
    await expect(phpBtn).toBeVisible();
    await usdBtn.click();
    await expect(page.getByText(/\$4,500/)).toBeVisible();
  });

  test("Journeys 1–6: Complete Freelancer workflow (Signup, Transactions, Filters, Edit/Delete/Undo, Clients, CSV Export)", async ({
    page,
  }) => {
    const userEmail = `freelancer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@example.com`;
    const userPassword = "Password123!";

    // --- Journey 1: Sign up → lands on empty dashboard ---
    await page.goto("/sign-up");
    await page.getByLabel(/full name/i).fill("Maria Santos");
    await page.getByLabel(/email/i).fill(userEmail);
    await page.getByLabel(/password/i).fill(userPassword);
    await page.getByRole("button", { name: /sign up/i }).click();

    // Verify redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 25000 });
    await expect(
      page.getByRole("heading", { name: /financial dashboard/i }),
    ).toBeVisible({ timeout: 25000 });

    // Verify empty state amounts
    const netStat = page.getByTestId("stat-net");
    await expect(netStat).toBeVisible({ timeout: 15000 });
    await expect(netStat).toHaveText("₱0.00");

    // Verify empty state messages in breakdowns
    await expect(page.getByText(/no client revenue logged/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/no expenses logged/i)).toBeVisible({
      timeout: 15000,
    });

    // --- Journey 2: Add an income and an expense → dashboard totals update ---
    // 1. Add Income
    await page
      .getByRole("link", { name: /add transaction/i })
      .first()
      .click();
    const addDialog = page.getByRole("dialog");
    await expect(addDialog).toBeVisible({ timeout: 15000 });

    await addDialog.getByRole("button", { name: /\+ income/i }).click();
    await addDialog.getByLabel(/amount/i).fill("50000");
    await addDialog
      .getByLabel(/description/i)
      .fill("E-commerce design contract");
    const incomeSubmit = addDialog.getByRole("button", {
      name: /add transaction/i,
    });
    await expect(incomeSubmit).toBeEnabled({ timeout: 15000 });
    await incomeSubmit.click();
    await expect(addDialog).not.toBeVisible({ timeout: 15000 });

    // 2. Add Expense
    await page
      .getByRole("link", { name: /add transaction/i })
      .first()
      .click();
    await expect(addDialog).toBeVisible({ timeout: 15000 });

    await addDialog.getByRole("button", { name: /− expense/i }).click();
    await addDialog.getByLabel(/amount/i).fill("5000");
    await addDialog.getByLabel(/description/i).fill("Adobe Creative Cloud");
    const expenseSubmit = addDialog.getByRole("button", {
      name: /add transaction/i,
    });
    await expect(expenseSubmit).toBeEnabled({ timeout: 15000 });
    await expenseSubmit.click();
    await expect(addDialog).not.toBeVisible({ timeout: 15000 });

    // Return to dashboard and verify updated totals
    await page.goto("/dashboard");
    await expect(page.getByTestId("stat-net")).toHaveText("+₱45,000.00", {
      timeout: 20000,
    });
    await expect(page.getByTestId("stat-income")).toHaveText("+₱50,000.00", {
      timeout: 15000,
    });
    await expect(page.getByTestId("stat-expense")).toHaveText("−₱5,000.00", {
      timeout: 15000,
    });

    // --- Journey 3: Filter transactions by type and date range ---
    await page.goto("/transactions");

    // Both transactions should be visible initially
    await expect(page.getByText("E-commerce design contract")).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText("Adobe Creative Cloud")).toBeVisible({
      timeout: 15000,
    });

    // Filter by Type: Income
    await page.getByLabel(/filter by type/i).selectOption("income");
    await expect(page.getByText("E-commerce design contract")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Adobe Creative Cloud")).not.toBeVisible({
      timeout: 10000,
    });

    // Filter by Type: Expense
    await page.getByLabel(/filter by type/i).selectOption("expense");
    await expect(page.getByText("Adobe Creative Cloud")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("E-commerce design contract")).not.toBeVisible({
      timeout: 10000,
    });

    // Reset filter
    await page.getByRole("button", { name: /clear all filters/i }).click();
    await expect(page.getByText("E-commerce design contract")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Adobe Creative Cloud")).toBeVisible({
      timeout: 10000,
    });

    // --- Journey 4: Edit and delete a transaction, undo the delete ---
    const editBtn = page.getByRole("button", {
      name: "Edit transaction Adobe Creative Cloud",
    });
    await expect(editBtn).toBeVisible({ timeout: 15000 });
    await editBtn.click();

    // Edit dialog opens
    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible({ timeout: 15000 });
    await editDialog
      .getByLabel(/description/i)
      .fill("Adobe CC Monthly Subscription");
    const saveChangesBtn = editDialog.getByRole("button", {
      name: /save changes/i,
    });
    await expect(saveChangesBtn).toBeEnabled({ timeout: 15000 });
    await saveChangesBtn.click();
    await expect(editDialog).not.toBeVisible({ timeout: 15000 });

    // Verify updated description in table
    await expect(page.getByText("Adobe CC Monthly Subscription")).toBeVisible({
      timeout: 15000,
    });

    // Now delete it
    const deleteBtn = page.getByRole("button", {
      name: "Delete transaction Adobe CC Monthly Subscription",
    });
    await expect(deleteBtn).toBeVisible({ timeout: 15000 });
    await deleteBtn.click();

    // Verify row disappeared
    await expect(
      page.getByText("Adobe CC Monthly Subscription"),
    ).not.toBeVisible({ timeout: 15000 });

    // Click Undo on toast notification
    const undoButton = page.getByRole("button", { name: /undo/i });
    await expect(undoButton).toBeVisible({ timeout: 15000 });
    await undoButton.click();

    // Verify transaction restored
    await expect(page.getByText("Adobe CC Monthly Subscription")).toBeVisible({
      timeout: 15000,
    });

    // --- Journey 5: Create a client, assign a transaction, see client in top clients ---
    await page.goto("/clients");
    await page.getByRole("button", { name: /new client|add client/i }).click();

    // Create client
    const clientDialog = page.getByRole("dialog");
    await expect(clientDialog).toBeVisible({ timeout: 15000 });
    await clientDialog.getByLabel(/client name/i).fill("Acme Global Corp");
    await clientDialog.getByLabel(/email/i).fill("billing@acmeglobal.com");
    await clientDialog.getByRole("button", { name: /create client/i }).click();
    await expect(clientDialog).not.toBeVisible({ timeout: 15000 });

    // Verify client appears in clients view
    await expect(
      page.getByRole("heading", { name: "Acme Global Corp" }),
    ).toBeVisible({ timeout: 15000 });

    // Assign a transaction to Acme Global Corp
    await page.goto("/transactions?action=new");
    const txDialog = page.getByRole("dialog");
    await expect(txDialog).toBeVisible({ timeout: 15000 });
    await txDialog.getByRole("button", { name: /\+ income/i }).click();
    await txDialog.getByLabel(/amount/i).fill("25000");
    await txDialog.getByLabel(/description/i).fill("Acme Consulting Services");
    const clientSelect = txDialog.getByLabel(/client/i);
    await expect(
      clientSelect.locator("option", { hasText: "Acme Global Corp" }),
    ).toBeAttached({ timeout: 15000 });
    await clientSelect.selectOption({ label: "Acme Global Corp" });
    const txBtn = txDialog.getByRole("button", { name: /add transaction/i });
    await expect(txBtn).toBeEnabled({ timeout: 15000 });
    await txBtn.click();
    await expect(txDialog).not.toBeVisible({ timeout: 15000 });

    // Visit dashboard and verify Acme Global Corp is in top clients
    await page.goto("/dashboard");
    await expect(
      page.locator("main").getByText("Acme Global Corp"),
    ).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator("main").getByText("+₱25,000.00")).toBeVisible({
      timeout: 15000,
    });

    // --- Journey 6: Export CSV and check the header row ---
    await page.goto("/transactions");

    const exportLink = page.getByRole("link", { name: /export csv/i });
    await expect(exportLink).toBeVisible({ timeout: 15000 });

    const response = await page.request.get("/api/v1/export/transactions.csv");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");

    const csvContent = await response.text();
    const lines = csvContent.trim().split("\n");

    // Header row verification
    expect(lines[0]?.replace(/\r$/, "")).toBe(
      "date,type,amount,currency,category,client,project,description,payment_method",
    );

    // Verify exported transactions are present
    expect(csvContent).toContain("E-commerce design contract");
    expect(csvContent).toContain("Adobe CC Monthly Subscription");
    expect(csvContent).toContain("Acme Consulting Services");
  });

  // --- Journey 7: Mobile viewport (375px): quick add via bottom bar ---
  test("Journey 7: Mobile viewport (375px): quick add via bottom bar", async ({
    page,
  }) => {
    const mobileUserEmail = `freelancer-mobile-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@example.com`;
    const userPassword = "Password123!";

    await page.setViewportSize({ width: 375, height: 667 });

    // Sign up on mobile
    await page.goto("/sign-up");
    await page.getByLabel(/full name/i).fill("Mobile User");
    await page.getByLabel(/email/i).fill(mobileUserEmail);
    await page.getByLabel(/password/i).fill(userPassword);
    await page.getByRole("button", { name: /sign up/i }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 25000 });

    // Verify mobile bottom navigation is visible
    const bottomNav = page.getByRole("navigation", {
      name: /mobile navigation/i,
    });
    await expect(bottomNav).toBeVisible({ timeout: 15000 });

    // Click center quick add button
    const quickAddButton = bottomNav.getByRole("link", {
      name: /add transaction/i,
    });
    await expect(quickAddButton).toBeVisible({ timeout: 15000 });
    await quickAddButton.click();

    // Quick add sheet should appear
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible({ timeout: 15000 });

    // Fill an expense
    await sheet.getByRole("button", { name: /− expense/i }).click();
    await sheet.getByLabel(/amount/i).fill("1200");
    await sheet.getByLabel(/description/i).fill("Mobile Workspace Pass");

    // Wait for categories to populate
    const categorySelect = sheet.getByLabel(/category/i);
    await expect(
      categorySelect.locator("option", { hasText: "Coworking" }),
    ).toBeAttached({ timeout: 20000 });

    const sheetSubmit = sheet.getByRole("button", { name: /add transaction/i });
    await expect(sheetSubmit).toBeEnabled({ timeout: 15000 });
    await sheetSubmit.click();
    await expect(sheet).not.toBeVisible({ timeout: 15000 });

    // Navigate to transactions list on mobile
    await page.goto("/transactions");
    await expect(page.getByText("Mobile Workspace Pass")).toBeVisible({
      timeout: 20000,
    });
  });
});
