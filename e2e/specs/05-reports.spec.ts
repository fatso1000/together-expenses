import { test, expect } from "../fixtures/base.fixture";
import { ReportsPage } from "../pages/ReportsPage";

test.describe("Reports & Visual Analytics", () => {
  test.beforeEach(async ({ app }) => {
    await app.seedStorage();
    await app.goto("/reports");
  });

  test("displays executive summary stats and baseline hub", async ({ app }) => {
    const reportsPage = new ReportsPage(app.page);

    await expect(reportsPage.statsCards).toHaveCount(3);
    // Largest transaction in seed data is $140.00
    await expect(reportsPage.statsCards.nth(2)).toContainText(/140\.00/);

    // Initial baseline capital hub
    await expect(reportsPage.baselineHub).toBeVisible();
    await expect(reportsPage.baselineHub).toContainText(/5,000\.00/);
  });

  test("switches between report timeframes (Week, Month, Year, All)", async ({ app }) => {
    const reportsPage = new ReportsPage(app.page);

    // Week mode
    await reportsPage.weekTab.click();
    await expect(reportsPage.weekTab).toHaveClass(/selected/);
    await expect(app.page.locator(".week-filter-details")).toBeVisible();

    // Year mode
    await reportsPage.yearTab.click();
    await expect(reportsPage.yearTab).toHaveClass(/selected/);

    // All mode
    await reportsPage.allTab.click();
    await expect(reportsPage.allTab).toHaveClass(/selected/);

    // Month mode
    await reportsPage.monthTab.click();
    await expect(reportsPage.monthTab).toHaveClass(/selected/);
  });

  test("filters by custom date range", async ({ app }) => {
    const reportsPage = new ReportsPage(app.page);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    await reportsPage.selectCustomRange(yesterday, yesterday);
    await expect(reportsPage.fromDateInput).toHaveValue(yesterday);
    await expect(reportsPage.toDateInput).toHaveValue(yesterday);

    // Transactions card should reflect only expenses on yesterday (BP Connect $65.00 + Dental Care $140.00 = 2 transactions)
    await expect(reportsPage.statsCards.nth(0)).toContainText("2");
  });

  test("renders all 4 analytical visual charts", async ({ app }) => {
    const reportsPage = new ReportsPage(app.page);

    // 1. Spend Trajectory
    await expect(reportsPage.trajectoryChart).toBeVisible();

    // 2. Category Donut Chart
    await expect(reportsPage.donutChart).toBeVisible();
    await expect(reportsPage.donutChart.locator("svg")).toBeVisible();

    // 3. Structured Budget Variance
    await expect(reportsPage.varianceChart).toBeVisible();

    // 4. Dual Account Cashflow
    await expect(reportsPage.cashflowChart).toBeVisible();
  });

  test("exports report to CSV file", async ({ app }) => {
    const reportsPage = new ReportsPage(app.page);

    const downloadPromise = app.page.waitForEvent("download");
    await reportsPage.exportBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("report");
    expect(download.suggestedFilename()).toContain(".csv");
  });
});
