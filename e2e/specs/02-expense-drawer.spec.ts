import { test, expect } from "../fixtures/base.fixture";
import { AppShellPage } from "../pages/AppShellPage";
import { ExpenseDrawerPage } from "../pages/ExpenseDrawerPage";

test.describe("Expense Drawer (New & Edit Expense)", () => {
  test.beforeEach(async ({ app }) => {
    await app.seedStorage();
    await app.goto("/");
  });

  test("opens and closes expense drawer", async ({ app }) => {
    const shell = new AppShellPage(app.page);
    const drawer = new ExpenseDrawerPage(app.page);

    await shell.openExpenseDrawer();
    await expect(drawer.dialog).toBeVisible();
    await expect(drawer.title).toHaveText(/New expense|Nuevo gasto/i);

    // Close via close button
    await drawer.close();
    await expect(drawer.dialog).not.toBeVisible();
  });

  test("creates a quick amount expense", async ({ app }) => {
    const shell = new AppShellPage(app.page);
    const drawer = new ExpenseDrawerPage(app.page);

    await shell.openExpenseDrawer();
    await drawer.fillQuickExpense({
      merchant: "Countdown Quay Street",
      amount: "34.50",
      category: "Groceries",
      note: "Weekly groceries run",
      account: "global",
    });

    await drawer.save();
    await expect(drawer.dialog).not.toBeVisible();
    await expect(shell.toast).toBeVisible();

    const stored = await app.getStoredData();
    const created = stored?.expenses.find((e) => e.merchant === "Countdown Quay Street");
    expect(created).toBeDefined();
    expect(created?.amount).toBe(3450);
    expect(created?.category).toBe("Groceries");
    expect(created?.accountId).toBe("global");
    expect(created?.note).toBe("Weekly groceries run");
  });

  test("creates an expense charged to NZ Savings account", async ({ app }) => {
    const shell = new AppShellPage(app.page);
    const drawer = new ExpenseDrawerPage(app.page);

    await shell.openExpenseDrawer();
    await drawer.fillQuickExpense({
      merchant: "Southern Cross Health",
      amount: "120.00",
      category: "Health",
      note: "Medical insurance copay",
      account: "nz",
    });

    await drawer.save();
    await expect(drawer.dialog).not.toBeVisible();

    const stored = await app.getStoredData();
    const created = stored?.expenses.find((e) => e.merchant === "Southern Cross Health");
    expect(created).toBeDefined();
    expect(created?.amount).toBe(12000);
    expect(created?.accountId).toBe("nz");
  });

  test("rejects future dates with validation error", async ({ app }) => {
    const shell = new AppShellPage(app.page);
    const drawer = new ExpenseDrawerPage(app.page);

    await shell.openExpenseDrawer();
    const futureDate = "2026-11-05";
    await drawer.fillQuickExpense({
      merchant: "Future Store",
      amount: "50.00",
      date: futureDate,
    });

    await drawer.save();
    // HTML5 validation catches the future date and marks field as invalid with rangeOverflow
    await expect(drawer.dateInput).toHaveJSProperty("validity.valid", false);
    await expect(drawer.dateInput).toHaveJSProperty("validity.rangeOverflow", true);
    await expect(drawer.dialog).toBeVisible();

    // Verify expense was not saved
    const stored = await app.getStoredData();
    expect(stored?.expenses.some((e) => e.merchant === "Future Store")).toBeFalsy();
  });

  test("creates itemized expense with item lines and receipt discount", async ({ app }) => {
    const shell = new AppShellPage(app.page);
    const drawer = new ExpenseDrawerPage(app.page);

    await shell.openExpenseDrawer();
    await drawer.itemsModeBtn.click();

    await drawer.merchantInput.fill("Pak'nSave Albany");

    // Add saved product
    await drawer.savedProductSelect.selectOption({ label: "Anchor Blue Milk 2L" });
    await drawer.addSavedProductBtn.click();

    // Verify first row added
    await expect(drawer.purchaseRows).toHaveCount(1);

    // Add another item
    await drawer.addItemBtn.click();
    await expect(drawer.purchaseRows).toHaveCount(2);

    // Fill in second item details
    const row2 = drawer.purchaseRows.nth(1);
    await row2.locator('input[placeholder="e.g. Oats"], input.item-title-input, input').first().fill("Organic Coffee Beans");
    await row2.locator('input[placeholder="0.00"], input.price-input').first().fill("14.50");

    // Add overall receipt discount
    await drawer.receiptDiscountInput.fill("2.00");

    await drawer.save();
    await expect(drawer.dialog).not.toBeVisible();

    const stored = await app.getStoredData();
    const created = stored?.expenses.find((e) => e.merchant === "Pak'nSave Albany");
    expect(created).toBeDefined();
    expect(created?.items?.length).toBe(2);
    expect(created?.adjustment).toBe(-200); // 200 cents discount
  });

  test("creates custom category inside expense drawer", async ({ app }) => {
    const shell = new AppShellPage(app.page);
    const drawer = new ExpenseDrawerPage(app.page);

    await shell.openExpenseDrawer();
    await drawer.addCategoryLink.click();
    await expect(drawer.inlineCategoryModal).toBeVisible();

    await drawer.categoryNameInput.fill("Art & Craft");
    // Click a color swatch
    await drawer.inlineCategoryModal.locator(".color-swatch").nth(3).click();
    await drawer.categorySaveBtn.click();

    await expect(drawer.inlineCategoryModal).not.toBeVisible();

    // Assert the new category is selected in the category options
    const selectedCategory = drawer.dialog.locator('.category-options button[aria-pressed="true"]');
    await expect(selectedCategory).toContainText("Art & Craft");
  });
});
