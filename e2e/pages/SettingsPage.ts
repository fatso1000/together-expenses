import { type Page, type Locator, expect } from "@playwright/test";

export class SettingsPage {
  readonly page: Page;
  readonly usdInitialInput: Locator;
  readonly nzdInitialInput: Locator;
  readonly nzSavingsInitialInput: Locator;
  readonly weeklySalaryInput: Locator;
  readonly convertRateBtn: Locator;
  readonly saveAccountsBtn: Locator;
  readonly exportBackupBtn: Locator;
  readonly restoreFileInput: Locator;
  readonly clearAllBtn: Locator;
  readonly newCategoryBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usdInitialInput = page.locator(".accounts-config-panel input").nth(0);
    this.nzdInitialInput = page.locator(".accounts-config-panel input").nth(1);
    this.nzSavingsInitialInput = page.locator(".accounts-config-panel input").nth(2);
    this.weeklySalaryInput = page.locator(".accounts-config-panel input").nth(3);
    this.convertRateBtn = page.locator(".convert-btn");
    this.saveAccountsBtn = page.locator(".accounts-config-panel button.primary");
    this.exportBackupBtn = page.locator("button:has-text('Export backup'), button:has-text('Descargar copia')");
    this.restoreFileInput = page.locator('.restore-input input[type="file"]');
    this.clearAllBtn = page.locator("button.danger");
    this.newCategoryBtn = page.locator("button:has-text('New category'), button:has-text('Nueva categoría')");
  }

  async configureAccounts(params: {
    usd?: string;
    nzd?: string;
    nzSavings?: string;
    salary?: string;
  }) {
    if (params.usd !== undefined) await this.usdInitialInput.fill(params.usd);
    if (params.nzd !== undefined) await this.nzdInitialInput.fill(params.nzd);
    if (params.nzSavings !== undefined) await this.nzSavingsInitialInput.fill(params.nzSavings);
    if (params.salary !== undefined) await this.weeklySalaryInput.fill(params.salary);
    await this.saveAccountsBtn.click();
  }
}
