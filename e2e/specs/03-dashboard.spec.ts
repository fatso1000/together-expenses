import { test, expect } from "../fixtures/base.fixture";
import { AppShellPage } from "../pages/AppShellPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ExpenseDrawerPage } from "../pages/ExpenseDrawerPage";
import { createMockAppData } from "../fixtures/test-data";

test.describe("Dashboard View & Features", () => {
  test.beforeEach(async ({ app }) => {
    await app.seedStorage();
    await app.goto("/");
  });

  test("displays weekly spending limit and on-track status", async ({ app }) => {
    const dashboard = new DashboardPage(app.page);

    await expect(dashboard.weeklyLimitCard).toBeVisible();
    await expect(dashboard.weeklyLimitCard).toContainText(/On track|En camino|remaining|restante/i);
    // Weekly limit of $350.00 should be visible
    await expect(dashboard.weeklyLimitCard).toContainText(/350\.00/);
  });

  test("configures weekly salary and budget in drawer", async ({ app }) => {
    const dashboard = new DashboardPage(app.page);

    await dashboard.openConfigureBudget();
    await expect(dashboard.salaryInput).toBeVisible();

    // Update weekly salary to 1500.00
    await dashboard.salaryInput.fill("1500.00");
    await dashboard.saveBudgetBtn.click();
    await expect(dashboard.budgetDrawer).not.toBeVisible();

    const stored = await app.getStoredData();
    expect(stored?.salary?.weeklyAverageNZD).toBe(150000);
  });

  test("displays over-limit alert when weekly spending exceeds limit", async ({ app }) => {
    // Seed with high spend that exceeds the $350.00 limit
    const highSpendData = createMockAppData();
    highSpendData.expenses.push({
      id: "exp-over-limit",
      merchant: "Mega Electronic Store",
      amount: 40000, // $400.00
      currency: "NZD",
      category: "Shopping",
      date: new Date().toISOString().slice(0, 10),
      note: "New monitor",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      accountId: "global",
    });

    await app.seedStorage(highSpendData);
    await app.page.reload();

    const dashboard = new DashboardPage(app.page);
    await expect(dashboard.compactLimitAlert).toBeVisible();
    await expect(dashboard.compactLimitAlert).toHaveAttribute("role", "alert");
    await expect(dashboard.compactLimitAlert).toContainText(/Weekly limit exceeded|Límite semanal superado/i);
  });

  test("adds a savings deposit and updates financial accounts", async ({ app }) => {
    const dashboard = new DashboardPage(app.page);

    await expect(dashboard.accountsSection).toBeVisible();
    await dashboard.fillAndSaveDeposit("350.00", "Freelance bonus deposit");

    const stored = await app.getStoredData();
    const newDeposit = stored?.savingsRecords?.find((s) => s.note === "Freelance bonus deposit");
    expect(newDeposit).toBeDefined();
    expect(newDeposit?.amount).toBe(35000);
  });

  test("logs frequent payment into current week expenses", async ({ app }) => {
    const dashboard = new DashboardPage(app.page);
    const shell = new AppShellPage(app.page);

    await expect(dashboard.frequentPaymentsSection).toBeVisible();

    // Find the log button for Apartment Rent
    const rentCard = app.page.locator("article.payment-row", { hasText: "Apartment Rent" });
    await expect(rentCard).toBeVisible();

    const logBtn = rentCard.locator("button.log-btn-prominent, button:has-text('Log')").first();
    await logBtn.click();

    await expect(shell.toast).toBeVisible();

    // Verify expense created in store
    const stored = await app.getStoredData();
    const rentExpense = stored?.expenses.find((e) => e.merchant === "Apartment Rent");
    expect(rentExpense).toBeDefined();
    expect(rentExpense?.amount).toBe(45000);
    expect(rentExpense?.category).toBe("Rent");
  });

  test("skips frequent payment without creating expense", async ({ app }) => {
    const dashboard = new DashboardPage(app.page);

    await expect(dashboard.frequentPaymentsSection).toBeVisible();

    const gymCard = app.page.locator("article.payment-row", { hasText: "CityFitness Membership" });
    await expect(gymCard).toBeVisible();

    const skipBtn = gymCard.locator("button.skip-btn, button:has-text('Skip')").first();
    await skipBtn.click();

    // Status pill should change to skipped
    const skippedTag = gymCard.locator(".status-tag.skipped-tag");
    await expect(skippedTag).toBeVisible();

    // Verify no expense created
    const stored = await app.getStoredData();
    const gymExpense = stored?.expenses.find((e) => e.merchant === "CityFitness Membership");
    expect(gymExpense).toBeUndefined();

    // Check payment has lastSkippedDate set
    const payment = stored?.frequentPayments?.find((p) => p.name === "CityFitness Membership");
    expect(payment?.lastSkippedDate).toBeDefined();
  });

  test("quick entry buttons open expense drawer in respective modes", async ({ app }) => {
    const dashboard = new DashboardPage(app.page);
    const drawer = new ExpenseDrawerPage(app.page);

    // 1. Quick amount
    await dashboard.quickAmountBtn.click();
    await expect(drawer.dialog).toBeVisible();
    await expect(drawer.amountInput).toBeVisible();
    await drawer.close();
    await expect(drawer.dialog).not.toBeVisible();

    // 2. Add items mode
    await dashboard.addItemsBtn.click();
    await expect(drawer.dialog).toBeVisible();
    await expect(drawer.itemsModeBtn).toHaveAttribute("aria-pressed", "true");
    await drawer.close();
    await expect(drawer.dialog).not.toBeVisible();
  });
});
