import { test, expect } from "../fixtures/base.fixture";
import { ExpensesPage } from "../pages/ExpensesPage";
import { ExpenseDrawerPage } from "../pages/ExpenseDrawerPage";

test.describe("Expenses View & Bulk Operations", () => {
  test.beforeEach(async ({ app }) => {
    await app.seedStorage();
    await app.goto("/expenses");
  });

  test("displays list of expenses for the current month", async ({ app }) => {
    const expensesPage = new ExpensesPage(app.page);

    await expect(expensesPage.expenseItems.first()).toBeVisible();
    await expect(expensesPage.expenseItems).toHaveCount(4);
  });

  test("switches period between week, month, and all expenses", async ({ app }) => {
    const expensesPage = new ExpensesPage(app.page);

    // Switch to Week
    await expensesPage.periodWeekBtn.click();
    await expect(expensesPage.periodWeekBtn).toHaveClass(/selected/);
    await expect(expensesPage.weekBanner).toBeVisible();

    // Switch to All
    await expensesPage.periodAllBtn.click();
    await expect(expensesPage.periodAllBtn).toHaveClass(/selected/);
    await expect(expensesPage.weekBanner).not.toBeVisible();

    // Switch back to Month
    await expensesPage.periodMonthBtn.click();
    await expect(expensesPage.periodMonthBtn).toHaveClass(/selected/);
  });

  test("filters expenses by keyword search and category", async ({ app }) => {
    const expensesPage = new ExpensesPage(app.page);

    // Search query
    await expensesPage.filterBySearch("BP Connect");
    await expect(expensesPage.expenseItems).toHaveCount(1);
    await expect(expensesPage.expenseItems.first()).toContainText("BP Connect");

    // Clear search
    await expensesPage.filterBySearch("");
    await expect(expensesPage.expenseItems).toHaveCount(4);

    // Category filter
    await expensesPage.filterByCategory("Groceries");
    await expect(expensesPage.expenseItems).toHaveCount(1);
    await expect(expensesPage.expenseItems.first()).toContainText("New World Metro");
  });

  test("filters expenses by financial account", async ({ app }) => {
    const expensesPage = new ExpensesPage(app.page);

    // Filter by NZ Savings
    await expensesPage.filterByAccount("nz");
    await expect(expensesPage.expenseItems).toHaveCount(1);
    await expect(expensesPage.expenseItems.first()).toContainText("Dental Care NZ");

    // Filter by Global
    await expensesPage.filterByAccount("global");
    await expect(expensesPage.expenseItems).toHaveCount(3);
  });

  test("sorts expenses by amount descending and ascending", async ({ app }) => {
    const expensesPage = new ExpensesPage(app.page);

    // Highest first
    await expensesPage.sortBy("amount-desc");
    await expect(expensesPage.expenseItems.first()).toContainText("Dental Care NZ");
    await expect(expensesPage.expenseItems.first()).toContainText("140.00");

    // Lowest first
    await expensesPage.sortBy("amount-asc");
    await expect(expensesPage.expenseItems.first()).toContainText("New World Metro");
    await expect(expensesPage.expenseItems.first()).toContainText("15.20");
  });

  test("toggles expense account inline between Global and NZ Savings", async ({ app }) => {
    const expensesPage = new ExpensesPage(app.page);

    const firstItem = expensesPage.expenseItems.first();
    const accountTag = firstItem.locator("button.account-tag");

    // Initially Global
    await expect(accountTag).toContainText(/Global/);
    await accountTag.click();

    // Verify tag text updated to NZ Savings
    await expect(accountTag).toContainText(/NZ Savings/);

    // Verify in localStorage
    const stored = await app.getStoredData();
    const modified = stored?.expenses[0];
    expect(modified?.accountId).toBe("nz");
  });

  test("creates bulk expenses via bulk entry dialog", async ({ app }) => {
    const expensesPage = new ExpensesPage(app.page);
    const todayDate = new Date().toISOString().slice(0, 10);

    const bulkText = `${todayDate} | Subway Sandwiches | 18.50 | Eating out\n${todayDate} | Chemist Warehouse | 35.00 | Health`;

    await expensesPage.fillAndSaveBulk(bulkText, "global");

    // Verify store has new expenses
    const stored = await app.getStoredData();
    const subway = stored?.expenses.find((e) => e.merchant === "Subway Sandwiches");
    const chemist = stored?.expenses.find((e) => e.merchant === "Chemist Warehouse");

    expect(subway).toBeDefined();
    expect(subway?.amount).toBe(1850);
    expect(chemist).toBeDefined();
    expect(chemist?.amount).toBe(3500);

    // Total expenses should now be 6
    await expect(expensesPage.expenseItems).toHaveCount(6);
  });

  test("repeats an expense via quick repeat button", async ({ app }) => {
    const expensesPage = new ExpensesPage(app.page);
    const drawer = new ExpenseDrawerPage(app.page);

    await expensesPage.repeatExpense(0);
    await expect(drawer.dialog).toBeVisible();

    // Drawer should have pre-filled merchant
    await expect(drawer.merchantInput).not.toBeEmpty();

    await drawer.close();
    await expect(drawer.dialog).not.toBeVisible();
  });

  test("deletes an expense with confirmation dialog", async ({ app }) => {
    const expensesPage = new ExpensesPage(app.page);

    await expect(expensesPage.expenseItems).toHaveCount(4);

    await expensesPage.deleteExpense(0);

    // Should now be 3 items
    await expect(expensesPage.expenseItems).toHaveCount(3);
    const stored = await app.getStoredData();
    expect(stored?.expenses.length).toBe(3);
  });

  test("exports filtered expenses to CSV file", async ({ app }) => {
    const expensesPage = new ExpensesPage(app.page);

    const downloadPromise = app.page.waitForEvent("download");
    await expensesPage.exportBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("expenses");
    expect(download.suggestedFilename()).toContain(".csv");
  });
});
