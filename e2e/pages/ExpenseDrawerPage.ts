import { type Page, type Locator, expect } from "@playwright/test";

export class ExpenseDrawerPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly title: Locator;
  readonly closeBtn: Locator;
  readonly quickModeBtn: Locator;
  readonly itemsModeBtn: Locator;
  readonly receiptModeBtn: Locator;
  readonly merchantInput: Locator;
  readonly dateInput: Locator;
  readonly globalAccountBtn: Locator;
  readonly nzAccountBtn: Locator;
  readonly categoryOptions: Locator;
  readonly addCategoryLink: Locator;
  readonly amountInput: Locator;
  readonly notesSummary: Locator;
  readonly notesTextarea: Locator;
  readonly saveBtn: Locator;
  readonly errorNote: Locator;

  // Itemized controls
  readonly savedProductSelect: Locator;
  readonly addSavedProductBtn: Locator;
  readonly addItemBtn: Locator;
  readonly purchaseRows: Locator;
  readonly receiptDiscountInput: Locator;
  readonly purchaseTotal: Locator;

  // Inline Category Creator
  readonly inlineCategoryModal: Locator;
  readonly categoryNameInput: Locator;
  readonly categorySaveBtn: Locator;
  readonly categoryModalCloseBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator("dialog.expense-drawer-dialog");
    this.title = this.dialog.locator(".drawer-header h2");
    this.closeBtn = this.dialog.locator("button.close-btn");
    this.quickModeBtn = this.dialog.locator(".entry-tabs button").nth(0);
    this.itemsModeBtn = this.dialog.locator(".entry-tabs button").nth(1);
    this.receiptModeBtn = this.dialog.locator(".entry-tabs button").nth(2);
    this.merchantInput = this.dialog.locator('input[list="saved-shops"]');
    this.dateInput = this.dialog.locator('form input[type="date"]');
    this.globalAccountBtn = this.dialog.locator(".account-toggle-card").first();
    this.nzAccountBtn = this.dialog.locator(".account-toggle-card").last();
    this.categoryOptions = this.dialog.locator(".category-options button");
    this.addCategoryLink = this.dialog.locator(".new-cat-link, .add-category-btn").first();
    this.amountInput = this.dialog.locator("input.amount-input");
    this.notesSummary = this.dialog.locator("details summary");
    this.notesTextarea = this.dialog.locator("details textarea");
    this.saveBtn = this.dialog.locator(".save-bar button.primary");
    this.errorNote = this.dialog.locator(".error-note");

    // Itemized
    this.savedProductSelect = this.dialog.locator(".saved-picker select");
    this.addSavedProductBtn = this.dialog.locator(".saved-picker button");
    this.addItemBtn = this.dialog.locator(".items-editor > button.secondary");
    this.purchaseRows = this.dialog.locator(".purchase-row");
    this.receiptDiscountInput = this.dialog.locator(".discount-field input");
    this.purchaseTotal = this.dialog.locator(".purchase-total strong");

    // Inline Category Modal
    this.inlineCategoryModal = page.locator(".inline-modal");
    this.categoryNameInput = this.inlineCategoryModal.locator('input[placeholder*="Gym"], input[maxlength="50"]').first();
    this.categorySaveBtn = this.inlineCategoryModal.locator('button[type="submit"], form button.primary').first();
    this.categoryModalCloseBtn = this.inlineCategoryModal.locator('button[aria-label="Close category manager"]');
  }

  async fillQuickExpense(params: {
    merchant: string;
    amount: string;
    category?: string;
    date?: string;
    note?: string;
    account?: "global" | "nz";
  }) {
    await this.quickModeBtn.click();
    await this.merchantInput.fill(params.merchant);
    if (params.date) {
      await this.dateInput.fill(params.date);
    }
    if (params.account === "nz") {
      await this.nzAccountBtn.click();
    } else if (params.account === "global") {
      await this.globalAccountBtn.click();
    }
    if (params.category) {
      const catBtn = this.dialog.locator(".category-options button", { hasText: params.category }).first();
      await catBtn.click();
    }
    await this.amountInput.fill(params.amount);
    if (params.note) {
      if (!(await this.notesTextarea.isVisible())) {
        await this.notesSummary.click();
      }
      await this.notesTextarea.fill(params.note);
    }
  }

  async save() {
    await this.saveBtn.click();
  }

  async close() {
    await this.closeBtn.click();
  }
}
