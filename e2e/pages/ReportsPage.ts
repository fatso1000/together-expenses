import { type Page, type Locator, expect } from "@playwright/test";

export class ReportsPage {
  readonly page: Page;
  readonly periodTabs: Locator;
  readonly weekTab: Locator;
  readonly monthTab: Locator;
  readonly yearTab: Locator;
  readonly allTab: Locator;
  readonly customTab: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly exportBtn: Locator;
  readonly statsCards: Locator;
  readonly baselineHub: Locator;
  readonly donutChart: Locator;
  readonly trajectoryChart: Locator;
  readonly varianceChart: Locator;
  readonly cashflowChart: Locator;

  constructor(page: Page) {
    this.page = page;
    this.periodTabs = page.locator(".report-filters .segmented button");
    this.weekTab = this.periodTabs.nth(0);
    this.monthTab = this.periodTabs.nth(1);
    this.yearTab = this.periodTabs.nth(2);
    this.allTab = this.periodTabs.nth(3);
    this.customTab = this.periodTabs.nth(4);

    this.fromDateInput = page.locator('.form-pair input[type="date"]').first();
    this.toDateInput = page.locator('.form-pair input[type="date"]').last();
    this.exportBtn = page.locator(".report-filters button.export-btn");

    this.statsCards = page.locator(".report-stats article.panel");
    this.baselineHub = page.locator(".baseline-hub-panel");
    this.donutChart = page.locator(".donut-chart-wrapper");
    this.trajectoryChart = page.locator(".trajectory-chart-wrap");
    this.varianceChart = page.locator(".variance-chart-wrap");
    this.cashflowChart = page.locator(".cashflow-chart-wrap");
  }

  async selectCustomRange(from: string, to: string) {
    await this.customTab.click();
    await this.fromDateInput.fill(from);
    await this.toDateInput.fill(to);
  }
}
