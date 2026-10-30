import { test, expect } from "../fixtures/base.fixture";
import { ShopsPage } from "../pages/ShopsPage";
import { ExpenseDrawerPage } from "../pages/ExpenseDrawerPage";

test.describe("Shops Management View", () => {
  test.beforeEach(async ({ app }) => {
    await app.seedStorage();
    await app.goto("/shops");
  });

  test("displays list of saved shops", async ({ app }) => {
    const shopsPage = new ShopsPage(app.page);

    await expect(shopsPage.shopCards).toHaveCount(4);
    await expect(shopsPage.shopCards.first()).toBeVisible();
  });

  test("searches and filters shops by keyword", async ({ app }) => {
    const shopsPage = new ShopsPage(app.page);

    await shopsPage.searchInput.fill("Pak'nSave");
    await expect(shopsPage.shopCards).toHaveCount(1);
    await expect(shopsPage.shopCards.first()).toContainText("Pak'nSave Royal Oak");

    await shopsPage.searchInput.fill("");
    await expect(shopsPage.shopCards).toHaveCount(4);
  });

  test("adds a new shop", async ({ app }) => {
    const shopsPage = new ShopsPage(app.page);

    await shopsPage.addShop("Farro Fresh Grey Lynn");
    await expect(shopsPage.shopCards).toHaveCount(5);

    const stored = await app.getStoredData();
    const created = stored?.shops.find((s) => s.name === "Farro Fresh Grey Lynn");
    expect(created).toBeDefined();
  });

  test("edits an existing shop name", async ({ app }) => {
    const shopsPage = new ShopsPage(app.page);

    await shopsPage.editShop("BP Connect", "BP Connect Newmarket");
    await expect(shopsPage.shopCards.filter({ hasText: "BP Connect Newmarket" })).toBeVisible();

    const stored = await app.getStoredData();
    const updated = stored?.shops.find((s) => s.name === "BP Connect Newmarket");
    expect(updated).toBeDefined();
  });

  test("deletes a shop with inline confirmation", async ({ app }) => {
    const shopsPage = new ShopsPage(app.page);

    await expect(shopsPage.shopCards).toHaveCount(4);
    await shopsPage.deleteShop("Woolworths Auckland");

    await expect(shopsPage.shopCards).toHaveCount(3);
    const stored = await app.getStoredData();
    expect(stored?.shops.some((s) => s.name === "Woolworths Auckland")).toBeFalsy();
  });

  test("starts a purchase from shop card prefilling expense drawer", async ({ app }) => {
    const shopsPage = new ShopsPage(app.page);
    const drawer = new ExpenseDrawerPage(app.page);

    await shopsPage.startPurchase("New World Metro");

    await expect(drawer.dialog).toBeVisible();
    await expect(drawer.itemsModeBtn).toHaveAttribute("aria-pressed", "true");
    await expect(drawer.merchantInput).toHaveValue("New World Metro");

    await drawer.close();
    await expect(drawer.dialog).not.toBeVisible();
  });
});
