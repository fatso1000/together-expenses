import { test, expect } from "../fixtures/base.fixture";
import { AppShellPage } from "../pages/AppShellPage";
import { ExpenseDrawerPage } from "../pages/ExpenseDrawerPage";
import { ShopsPage } from "../pages/ShopsPage";

test.describe("Offline Resilience & Storage Persistence", () => {
  test.beforeEach(async ({ app }) => {
    await app.seedStorage();
    await app.goto("/");
  });

  test("persists newly created expense across page reloads", async ({ app }) => {
    const shell = new AppShellPage(app.page);
    const drawer = new ExpenseDrawerPage(app.page);

    await shell.openExpenseDrawer();
    await drawer.fillQuickExpense({
      merchant: "Corner Artisan Bakery",
      amount: "14.20",
      category: "Eating out",
      note: "Morning sourdough",
    });
    await drawer.save();
    await expect(drawer.dialog).not.toBeVisible();

    // Reload browser completely
    await app.page.reload();

    // Verify recent expense contains Corner Artisan Bakery
    await expect(app.page.locator(".expense-list")).toContainText("Corner Artisan Bakery");
    await expect(app.page.locator(".expense-list")).toContainText("14.20");

    const stored = await app.getStoredData();
    expect(stored?.expenses.some((e) => e.merchant === "Corner Artisan Bakery")).toBe(true);
  });

  test("persists theme preference across page reloads", async ({ app }) => {
    const shell = new AppShellPage(app.page);

    // Initial theme should be light
    await expect(app.page.locator("html")).not.toHaveAttribute("data-theme", "dark");

    // Toggle to Dark
    await shell.toggleTheme();
    await expect(app.page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Reload
    await app.page.reload();
    await expect(app.page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("persists locale preference across page reloads", async ({ app }) => {
    const shell = new AppShellPage(app.page);

    // Initial language is English
    await expect(shell.langCode).toHaveText("EN");
    await expect(shell.addExpenseBtn).toContainText("Add expense");

    // Toggle to Spanish
    await shell.toggleLanguage();
    await expect(shell.langCode).toHaveText("ES");
    await expect(shell.addExpenseBtn).toContainText("Cargar gasto");

    // Reload
    await app.page.reload();
    await expect(shell.langCode).toHaveText("ES");
    await expect(shell.addExpenseBtn).toContainText("Cargar gasto");
  });

  test("functions seamlessly while offline without network connectivity", async ({ app }) => {
    const shell = new AppShellPage(app.page);
    const shopsPage = new ShopsPage(app.page);

    // Cut off all external network access
    await app.page.context().setOffline(true);

    // Navigate to shops view via client-side routing
    await shell.navigateTo("Shops");
    await expect(shopsPage.shopCards.first()).toBeVisible();

    // Add a shop while completely offline
    await shopsPage.addShop("Offline Dairy Ponsonby");
    await expect(shopsPage.shopCards.filter({ hasText: "Offline Dairy Ponsonby" })).toBeVisible();

    // Verify written to local storage
    const stored = await app.getStoredData();
    expect(stored?.shops.some((s) => s.name === "Offline Dairy Ponsonby")).toBe(true);

    // Restore network
    await app.page.context().setOffline(false);

    // Reload and ensure data survived
    await app.page.reload();
    await expect(shopsPage.shopCards.filter({ hasText: "Offline Dairy Ponsonby" })).toBeVisible();
  });
});
