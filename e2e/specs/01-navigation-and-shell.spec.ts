import { test, expect } from "../fixtures/base.fixture";
import { AppShellPage } from "../pages/AppShellPage";

test.describe("App Shell & Navigation", () => {
  test.beforeEach(async ({ app }) => {
    await app.seedStorage();
    await app.goto("/");
  });

  test("navigates across all 6 main views", async ({ app }) => {
    const shell = new AppShellPage(app.page);

    // Initial Overview
    await expect(shell.pageHeading).toHaveText(/Overview|Visión general/i);

    // Expenses
    await shell.navigateTo("Expenses");
    await expect(app.page).toHaveURL(/#\/expenses/);

    // Reports
    await shell.navigateTo("Reports");
    await expect(app.page).toHaveURL(/#\/reports/);

    // Products
    await shell.navigateTo("Products");
    await expect(app.page).toHaveURL(/#\/products/);

    // Shops
    await shell.navigateTo("Shops");
    await expect(app.page).toHaveURL(/#\/shops/);

    // Settings (Data)
    await shell.navigateTo("Data");
    await expect(app.page).toHaveURL(/#\/settings/);

    // Brand link returns to home
    await shell.brand.click();
    await expect(app.page).toHaveURL(/#\//);
  });

  test("toggles language between English and Spanish with persistence", async ({ app }) => {
    const shell = new AppShellPage(app.page);

    // Default is English
    await expect(shell.langCode).toHaveText("EN");
    await expect(shell.addExpenseBtn).toContainText("Add expense");

    // Toggle to Spanish
    await shell.toggleLanguage();
    await expect(shell.langCode).toHaveText("ES");
    await expect(shell.addExpenseBtn).toContainText("Cargar gasto");
    await expect(shell.toast).toBeVisible();

    // Reload page to verify persistence
    await app.page.reload();
    await expect(shell.langCode).toHaveText("ES");
    await expect(shell.addExpenseBtn).toContainText("Cargar gasto");

    // Toggle back to English
    await shell.toggleLanguage();
    await expect(shell.langCode).toHaveText("EN");
    await expect(shell.addExpenseBtn).toContainText("Add expense");
  });

  test("toggles theme between Light and Dark mode with persistence", async ({ app }) => {
    const shell = new AppShellPage(app.page);

    // Switch to Dark
    await shell.toggleTheme();
    const isDark = await app.page.evaluate(() => document.documentElement.getAttribute("data-theme") === "dark");
    expect(isDark).toBe(true);
    await expect(shell.toast).toBeVisible();

    // Reload to verify persistence
    await app.page.reload();
    const isDarkAfterReload = await app.page.evaluate(() => document.documentElement.getAttribute("data-theme") === "dark");
    expect(isDarkAfterReload).toBe(true);

    // Switch back to Light
    await shell.toggleTheme();
    const isLight = await app.page.evaluate(() => document.documentElement.getAttribute("data-theme") === "light");
    expect(isLight).toBe(true);
  });

  test("changes month filter on period toolbar", async ({ app }) => {
    const shell = new AppShellPage(app.page);
    await expect(shell.periodToolbar).toBeVisible();

    // Change month to previous month
    await shell.setMonth("2026-08");
    await expect(shell.monthInput).toHaveValue("2026-08");
  });

  test("toggles currency between NZD and USD", async ({ app }) => {
    const shell = new AppShellPage(app.page);

    // Select USD
    await shell.setCurrency("USD");
    await expect(shell.currencySelect).toHaveValue("USD");
    await expect(shell.rateNote).toBeVisible();
    await expect(shell.rateNote).toContainText("0.62 USD");

    // Switch back to NZD
    await shell.setCurrency("NZD");
    await expect(shell.currencySelect).toHaveValue("NZD");
  });
});
