import { type Page, type Locator, expect } from "@playwright/test";

export class ExpensesPage {
  readonly page: Page;
  readonly bulkBtn: Locator;
  readonly periodWeekBtn: Locator;
  readonly periodMonthBtn: Locator;
  readonly periodAllBtn: Locator;
  readonly weekBanner: Locator;
  readonly searchInput: Locator;
  readonly categorySelect: Locator;
  readonly accountSelect: Locator;
  readonly sortSelect: Locator;
  readonly exportBtn: Locator;
  readonly resetFiltersBtn: Locator;
  readonly expenseItems: Locator;

  // Bulk Entry Dialog
  readonly bulkDialog: Locator;
  readonly bulkTextarea: Locator;
  readonly bulkAccountSelect: Locator;
  readonly bulkPreviewBtn: Locator;
  readonly bulkConfirmCheckbox: Locator;
  readonly bulkSaveBtn: Locator;
  readonly bulkCloseBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bulkBtn = page.locator("button.bulk-button");
    this.periodWeekBtn = page.locator(".period-segmented button").nth(0);
    this.periodMonthBtn = page.locator(".period-segmented button").nth(1);
    this.periodAllBtn = page.locator(".period-segmented button").nth(2);
    this.weekBanner = page.locator(".week-banner");
    this.searchInput = page.locator('.filter-bar input[type="search"]');
    this.categorySelect = page.locator(".category-select-label select");
    this.accountSelect = page.locator(".account-select-label select");
    this.sortSelect = page.locator(".sort-select-label select");
    this.exportBtn = page.locator("button.export-btn");
    this.resetFiltersBtn = page.locator("button.reset-btn");
    this.expenseItems = page.locator(".expense-list li");

    // Bulk Dialog
    this.bulkDialog = page.locator("dialog.purchase-dialog");
    this.bulkTextarea = page.locator("dialog.purchase-dialog textarea");
    this.bulkAccountSelect = page.locator("dialog.purchase-dialog select");
    this.bulkPreviewBtn = page.locator("dialog.purchase-dialog button:has-text('Preview'), dialog.purchase-dialog button:has-text('Previsualizar')");
    this.bulkConfirmCheckbox = page.locator("dialog.purchase-dialog input[type='checkbox']");
    this.bulkSaveBtn = page.locator("dialog.purchase-dialog button.primary:has-text('Save'), dialog.purchase-dialog button.primary:has-text('Guardar')");
    this.bulkCloseBtn = page.locator("dialog.purchase-dialog button[aria-label='Close bulk entry']");
  }

  async filterBySearch(query: string) {
    await this.searchInput.fill(query);
  }

  async filterByCategory(category: string) {
    await this.categorySelect.selectOption(category);
  }

  async filterByAccount(account: "" | "global" | "nz") {
    await this.accountSelect.selectOption(account);
  }

  async sortBy(sort: "date-desc" | "date-asc" | "amount-desc" | "amount-asc") {
    await this.sortSelect.selectOption(sort);
  }

  async openBulkEntry() {
    await this.bulkBtn.click();
    await expect(this.bulkDialog).toBeVisible();
  }

  async fillAndSaveBulk(lines: string, account = "global") {
    await this.openBulkEntry();
    await this.bulkAccountSelect.selectOption(account);
    await this.bulkTextarea.fill(lines);
    await this.bulkPreviewBtn.click();
    await this.bulkConfirmCheckbox.check();
    await this.bulkSaveBtn.click();
    await expect(this.bulkDialog).not.toBeVisible();
  }

  async repeatExpense(index = 0) {
    const repeatBtn = this.expenseItems.nth(index).locator('button[aria-label^="Repeat"], button[aria-label^="Repetir"]');
    await repeatBtn.click();
  }

  async deleteExpense(index = 0) {
    this.page.once("dialog", (dialog) => dialog.accept());
    const deleteBtn = this.expenseItems.nth(index).locator('button[aria-label^="Delete"], button[aria-label^="Eliminar"]');
    await deleteBtn.click();
  }
}
