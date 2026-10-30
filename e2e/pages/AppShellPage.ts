import { type Page, type Locator, expect } from "@playwright/test";

export class AppShellPage {
  readonly page: Page;
  readonly brand: Locator;
  readonly sidebar: Locator;
  readonly navLinks: Locator;
  readonly pageHeading: Locator;
  readonly langToggleBtn: Locator;
  readonly langCode: Locator;
  readonly themeToggleBtn: Locator;
  readonly addExpenseBtn: Locator;
  readonly periodToolbar: Locator;
  readonly monthInput: Locator;
  readonly currencySelect: Locator;
  readonly rateNote: Locator;
  readonly toast: Locator;
  readonly toastDismissBtn: Locator;
  readonly syncLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.brand = page.locator(".brand");
    this.sidebar = page.locator(".sidebar");
    this.navLinks = page.locator(".sidebar nav a");
    this.pageHeading = page.locator(".page-heading h1");
    this.langToggleBtn = page.locator(".lang-toggle-btn");
    this.langCode = page.locator(".lang-code");
    this.themeToggleBtn = page.locator(".theme-toggle-btn");
    this.addExpenseBtn = page.locator("button.add-expense");
    this.periodToolbar = page.locator(".period-toolbar");
    this.monthInput = page.locator('.period-toolbar input[type="month"]');
    this.currencySelect = page.locator('.period-toolbar select[aria-label="View currency"]');
    this.rateNote = page.locator(".rate-note");
    this.toast = page.locator(".toast");
    this.toastDismissBtn = page.locator(".toast .icon-button");
    this.syncLink = page.locator(".sync-link");
  }

  async navigateTo(name: "Overview" | "Expenses" | "Reports" | "Products" | "Shops" | "Settings" | "Data") {
    const link = this.sidebar.locator("nav a", { hasText: name });
    await link.click();
    await this.page.waitForLoadState("domcontentloaded");
  }

  async toggleLanguage() {
    await this.langToggleBtn.click();
  }

  async toggleTheme() {
    await this.themeToggleBtn.click();
  }

  async openExpenseDrawer() {
    await this.addExpenseBtn.click();
  }

  async setMonth(month: string) {
    await this.monthInput.fill(month);
    await this.monthInput.dispatchEvent("change");
  }

  async setCurrency(currency: "NZD" | "USD") {
    await this.currencySelect.selectOption(currency);
  }

  async dismissToast() {
    if (await this.toast.isVisible()) {
      await this.toastDismissBtn.click();
    }
  }
}
