import { test, expect } from "../fixtures/base.fixture";
import { SettingsPage } from "../pages/SettingsPage";
import { createMockAppData } from "../fixtures/test-data";

test.describe("Settings, Baseline Accounts & Data Backup", () => {
  test.beforeEach(async ({ app }) => {
    await app.seedStorage();
    await app.goto("/settings");
  });

  test("displays financial accounts baseline setup with initial values", async ({ app }) => {
    const settings = new SettingsPage(app.page);

    await expect(settings.nzdInitialInput).toHaveValue("5000.00");
    await expect(settings.usdInitialInput).toHaveValue("3100.00");
    await expect(settings.nzSavingsInitialInput).toHaveValue("2500.00");
    await expect(settings.weeklySalaryInput).toHaveValue("1200.00");
  });

  test("auto-converts USD to NZD based on exchange rate and saves accounts setup", async ({ app }) => {
    const settings = new SettingsPage(app.page);

    // Mock rate is 0.62. $620 USD / 0.62 = $1000 NZD
    await settings.usdInitialInput.fill("620.00");
    // Trigger input event
    await settings.usdInitialInput.dispatchEvent("input");

    await expect(settings.nzdInitialInput).toHaveValue("1000.00");

    await settings.saveAccountsBtn.click();
    await expect(settings.saveAccountsBtn).toContainText(/Saved|Guardado/i);

    const stored = await app.getStoredData();
    expect(stored?.accounts?.globalInitialUSD).toBe(62000);
    expect(stored?.accounts?.globalInitialNZD).toBe(100000);
  });

  test("creates custom category in Category Manager on settings page", async ({ app }) => {
    const newCategoryBtn = app.page.locator(".category-manager button:has-text('New category'), .category-manager button:has-text('Nueva categoría')").first();
    await newCategoryBtn.click();

    const nameInput = app.page.locator(".category-editor-panel input[type='text'], .category-editor-panel input").first();
    await nameInput.fill("Tech Subscriptions");

    // Click color swatch
    await app.page.locator(".category-editor-panel .color-swatch").nth(4).click();

    // Click submit
    const saveBtn = app.page.locator(".category-editor-panel button.primary, .category-editor-panel button[type='submit']").first();
    await saveBtn.click();

    await expect(app.page.locator(".category-editor-panel")).not.toBeVisible();

    const stored = await app.getStoredData();
    const createdCat = stored?.customCategories?.find((c) => c.name === "Tech Subscriptions");
    expect(createdCat).toBeDefined();
  });

  test("exports full JSON backup", async ({ app }) => {
    const settings = new SettingsPage(app.page);

    const downloadPromise = app.page.waitForEvent("download");
    await settings.exportBackupBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("expenses");
    expect(download.suggestedFilename()).toContain(".json");
  });

  test("restores database from valid backup JSON", async ({ app }) => {
    const settings = new SettingsPage(app.page);

    // Prepare modified backup
    const backupData = createMockAppData();
    backupData.expenses = [
      {
        id: "exp-restored-1",
        merchant: "Restored Mart",
        amount: 8800,
        currency: "NZD",
        category: "Groceries",
        date: new Date().toISOString().slice(0, 10),
        note: "Restored from backup",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        accountId: "global",
      },
    ];

    app.page.once("dialog", (d) => d.accept());

    await settings.restoreFileInput.setInputFiles({
      name: "expenses-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backupData, null, 2)),
    });

    // Wait for store to update
    await expect(app.page.locator("body")).toBeVisible();

    const stored = await app.getStoredData();
    expect(stored?.expenses.length).toBe(1);
    expect(stored?.expenses[0].merchant).toBe("Restored Mart");
  });

  test("clears all database expenses after confirmation", async ({ app }) => {
    const settings = new SettingsPage(app.page);

    // Initial expenses count 4
    const initial = await app.getStoredData();
    expect(initial?.expenses.length).toBe(4);

    app.page.once("dialog", (d) => d.accept());
    await settings.clearAllBtn.click();

    // Poll until storage is updated asynchronously
    await expect.poll(async () => {
      const data = await app.getStoredData();
      return data?.expenses.length;
    }).toBe(0);
  });
});
