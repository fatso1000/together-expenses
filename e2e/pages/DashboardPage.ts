import { type Page, type Locator, expect } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly quickAmountBtn: Locator;
  readonly addItemsBtn: Locator;
  readonly scanReceiptBtn: Locator;
  readonly compactLimitAlert: Locator;

  // Weekly Limit
  readonly weeklyLimitCard: Locator;
  readonly configureBudgetBtn: Locator;
  readonly budgetDrawer: Locator;
  readonly salaryInput: Locator;
  readonly weeklyLimitInput: Locator;
  readonly saveBudgetBtn: Locator;
  readonly closeBudgetBtn: Locator;

  // Accounts Overview
  readonly accountsSection: Locator;
  readonly addDepositBtn: Locator;
  readonly manageDepositsBtn: Locator;
  readonly depositDrawer: Locator;
  readonly depositAmountInput: Locator;
  readonly depositDateInput: Locator;
  readonly depositNoteInput: Locator;
  readonly saveDepositBtn: Locator;

  // Frequent Payments
  readonly frequentPaymentsSection: Locator;
  readonly addBillBtn: Locator;
  readonly billCards: Locator;
  readonly billDrawer: Locator;
  readonly billNameInput: Locator;
  readonly billAmountInput: Locator;
  readonly saveBillBtn: Locator;

  // Monthly Summary & Recent Expenses
  readonly monthTotalHero: Locator;
  readonly recentExpensesList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.quickAmountBtn = page.locator(".quick-entry-actions button").nth(0);
    this.addItemsBtn = page.locator(".quick-entry-actions button").nth(1);
    this.scanReceiptBtn = page.locator(".quick-entry-actions button").nth(2);
    this.compactLimitAlert = page.locator(".compact-limit-alert");

    // Weekly Limit
    this.weeklyLimitCard = page.locator(".high-impact-limit-card, .limit-card").first();
    this.configureBudgetBtn = page.locator("button:has-text('Configure budget'), button:has-text('Configurar presupuesto')").first();
    this.budgetDrawer = page.locator(".drawer-backdrop:has(.budget-drawer-body)");
    this.salaryInput = this.budgetDrawer.locator("input[placeholder*='1200'], label:has-text('Weekly Salary') input, label:has-text('Sueldo semanal') input").first();
    this.weeklyLimitInput = this.budgetDrawer.locator("input[placeholder*='500'], label:has-text('Limit') input").first();
    this.saveBudgetBtn = this.budgetDrawer.locator("button.primary");
    this.closeBudgetBtn = this.budgetDrawer.locator(".drawer-header button.icon-button");

    // Accounts
    this.accountsSection = page.locator(".accounts-panel");
    this.addDepositBtn = this.accountsSection.locator("button:has-text('Add Savings'), button:has-text('Agregar ahorro'), button:has-text('Deposit'), button:has-text('Depósito')").first();
    this.manageDepositsBtn = this.accountsSection.locator("button:has-text('Manage'), button:has-text('Administrar')").first();
    this.depositDrawer = page.locator(".drawer-backdrop:has(form.drawer-content)");
    this.depositAmountInput = this.depositDrawer.locator("input[placeholder*='1200'], input[inputmode='decimal']").first();
    this.depositDateInput = this.depositDrawer.locator("input[type='date']").first();
    this.depositNoteInput = this.depositDrawer.locator("input[placeholder*='salary']").first();
    this.saveDepositBtn = this.depositDrawer.locator("button.primary");

    // Frequent Payments
    this.frequentPaymentsSection = page.locator(".frequent-panel");
    this.addBillBtn = page.locator("button:has-text('Add Payment'), button:has-text('Nuevo pago')").first();
    this.billCards = page.locator("article.payment-row");
    this.billDrawer = page.locator(".drawer-backdrop:has(form.drawer-content)");
    this.billNameInput = this.billDrawer.locator("input[placeholder*='Electricity']");
    this.billAmountInput = this.billDrawer.locator("input[placeholder*='135']");
    this.saveBillBtn = this.billDrawer.locator("button.primary");

    // Stats
    this.monthTotalHero = page.locator(".total-card .hero-number");
    this.recentExpensesList = page.locator(".expense-list li");
  }

  async openConfigureBudget() {
    await this.configureBudgetBtn.click();
    await expect(this.budgetDrawer).toBeVisible();
  }

  async openAddDeposit() {
    await this.addDepositBtn.click();
    await expect(this.depositDrawer).toBeVisible();
  }

  async fillAndSaveDeposit(amount: string, note?: string) {
    await this.openAddDeposit();
    await this.depositAmountInput.fill(amount);
    if (note) {
      await this.depositNoteInput.fill(note);
    }
    await this.saveDepositBtn.click();
    await expect(this.depositDrawer).not.toBeVisible();
  }
}
