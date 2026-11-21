import { test, expect } from "../fixtures/base.fixture";

const SAMPLE_VALID_KEY = "a".repeat(58) + "9876fe";

test.describe("Onboarding & Intuitive Data Settings UX", () => {
  test("shows onboarding welcome screen on fresh empty install", async ({ app }) => {
    await app.goto("/");

    await expect(app.page.getByTestId("onboarding-flow")).toBeVisible();
    await expect(app.page.getByTestId("onboarding-start-scratch")).toBeVisible();
    await expect(app.page.getByTestId("onboarding-choose-connect")).toBeVisible();
  });

  test("does not show onboarding when user already has a connected database key", async ({
    app,
  }) => {
    await app.page.addInitScript((syncKey) => {
      window.localStorage.setItem("expenses-sync-key", syncKey);
    }, SAMPLE_VALID_KEY);

    await app.goto("/");

    await expect(app.page.getByTestId("onboarding-flow")).toHaveCount(0);
    await expect(app.page.locator(".page-heading")).toBeVisible();
  });

  test("does not show onboarding when local app data already exists", async ({
    app,
  }) => {
    await app.seedStorage();
    await app.goto("/");

    await expect(app.page.getByTestId("onboarding-flow")).toHaveCount(0);
    await expect(app.page.locator(".page-heading")).toBeVisible();
  });

  test("completes configure-from-scratch onboarding and persists all settings across reload", async ({
    app,
  }) => {
    await app.goto("/");
    await expect(app.page.getByTestId("onboarding-flow")).toBeVisible();

    // Start guided setup
    await app.page.getByTestId("onboarding-start-scratch").click();

    // Step 1: Accounts & Salary
    await app.page.getByPlaceholder("e.g. 8200.00").fill("5000.00");
    await app.page.getByPlaceholder("e.g. 2000.00").fill("1500.00");
    await app.page.getByPlaceholder("e.g. 1200.00").fill("1100.00");
    await app.page.getByTestId("onboarding-next").click();

    // Step 2: Weekly Spending Limit (switch to Single Overall Limit)
    await app.page.getByRole("button", { name: /Single Overall Limit|Límite General Único/i }).click();
    await app.page.getByPlaceholder("e.g. 500.00").fill("650.00");
    await app.page.getByTestId("onboarding-next").click();

    // Step 3: Categories (add a custom category)
    await app.page.getByRole("button", { name: /Add custom category|Agregar categoría personalizada/i }).click();
    await app.page.getByPlaceholder("e.g. Gym & Fitness").fill("Coffee & Cafes");
    await app.page.getByRole("button", { name: /Save category|Guardar categoría/i }).click();
    await expect(app.page.getByText("Coffee & Cafes")).toBeVisible();
    await app.page.getByTestId("onboarding-next").click();

    // Step 4: Frequent Payments (add a recurring bill)
    await app.page.getByPlaceholder("e.g. Electricity, Rent, Mobile Plan").fill("Fiber Internet");
    await app.page.getByPlaceholder("e.g. 135.00").fill("89.00");
    await app.page.getByRole("button", { name: /Add payment|Agregar pago/i }).click();
    await expect(app.page.getByText("Fiber Internet")).toBeVisible();
    await app.page.getByTestId("onboarding-next").click();

    // Step 5: Review & Finish (local only by default)
    await expect(app.page.getByText("14 preset + 1 custom")).toBeVisible();
    await app.page.getByTestId("onboarding-finish").click();

    // Onboarding closes and Dashboard appears
    await expect(app.page.getByTestId("onboarding-flow")).toHaveCount(0);
    await expect(app.page.locator(".page-heading")).toBeVisible();

    // Verify persisted storage
    const stored = await app.getStoredData();
    expect(stored?.accounts?.globalInitialNZD).toBe(500000);
    expect(stored?.accounts?.nzInitialNZD).toBe(150000);
    expect(stored?.salary?.weeklyAverageNZD).toBe(110000);
    expect(stored?.weeklyLimit).toBe(65000);
    expect(stored?.customCategories?.some((c) => c.name === "Coffee & Cafes")).toBe(true);
    expect(stored?.frequentPayments?.some((p) => p.name === "Fiber Internet")).toBe(true);

    // Reload and confirm onboarding stays dismissed
    await app.page.reload();
    await expect(app.page.getByTestId("onboarding-flow")).toHaveCount(0);
    await expect(app.page.locator(".page-heading")).toBeVisible();
  });

  test("auto-detects incoming ?connect= link in onboarding on fresh device", async ({
    app,
  }) => {
    await app.goto(`/?connect=${SAMPLE_VALID_KEY}`);

    await expect(app.page.getByTestId("onboarding-flow")).toBeVisible();
    await expect(app.page.getByText(/Private connection link detected|Enlace privado de conexión detectado/i)).toBeVisible();
    await expect(app.page.getByText("••••9876fe")).toBeVisible();
  });

  test("redesigned /settings/data screen provides live key validation and clear sections", async ({
    app,
  }) => {
    await app.seedStorage();
    await app.goto("/settings/data");

    // Database overview strip
    await expect(app.page.getByText(/Database Overview|Resumen de la Base de Datos/i)).toBeVisible();

    // Live link validation in DatabaseConnectCard
    const linkInput = app.page.getByPlaceholder(/Paste link|Pegá el enlace/i);
    await expect(linkInput).toBeVisible();

    await linkInput.fill("short-invalid-key");
    await expect(app.page.getByText(/doesn't look complete|no parece completo/i)).toBeVisible();

    await linkInput.fill(`https://example.com/#/settings/data?connect=${SAMPLE_VALID_KEY}`);
    await expect(app.page.getByText(/Valid private link detected|Enlace privado válido detectado/i)).toBeVisible();
    await expect(app.page.getByText("••••9876fe")).toBeVisible();
  });
});
