import { test, expect } from "../fixtures/base.fixture";
import { ProductsPage } from "../pages/ProductsPage";

test.describe("Products Catalog & Price Comparison", () => {
  test.beforeEach(async ({ app }) => {
    await app.seedStorage();
    await app.goto("/products");
  });

  test("displays list of recorded products", async ({ app }) => {
    const productsPage = new ProductsPage(app.page);

    await expect(productsPage.productRows).toHaveCount(3);
    await expect(productsPage.productRows.first()).toBeVisible();
  });

  test("filters products by search keyword and clears filter", async ({ app }) => {
    const productsPage = new ProductsPage(app.page);

    await productsPage.search("Milk");
    await expect(productsPage.productRows).toHaveCount(1);
    await expect(productsPage.productRows.first()).toContainText("Anchor Blue Milk 2L");

    await productsPage.clearSearchBtn.click();
    await expect(productsPage.productRows).toHaveCount(3);
  });

  test("filters products by unit pill", async ({ app }) => {
    const productsPage = new ProductsPage(app.page);

    // Filter by 'kg'
    await productsPage.filterByUnit("kg");
    await expect(productsPage.productRows).toHaveCount(1);
    await expect(productsPage.productRows.first()).toContainText("Royal Gala Apples");

    // Filter by 'All'
    await productsPage.filterByUnit("All");
    await expect(productsPage.productRows).toHaveCount(3);
  });

  test("creates a new product in catalog", async ({ app }) => {
    const productsPage = new ProductsPage(app.page);

    await productsPage.createProduct("Greek Style Yoghurt 1kg", "kg");

    await expect(productsPage.productRows).toHaveCount(4);
    const stored = await app.getStoredData();
    const created = stored?.products.find((p) => p.title === "Greek Style Yoghurt 1kg");
    expect(created).toBeDefined();
    expect(created?.unit).toBe("kg");
  });

  test("edits an existing product details", async ({ app }) => {
    const productsPage = new ProductsPage(app.page);

    const applesRow = productsPage.productRows.filter({ hasText: "Royal Gala Apples" });
    const editBtn = applesRow.locator('button[aria-label^="Edit product"]');
    await editBtn.click();

    await expect(productsPage.editProductForm).toBeVisible();
    await productsPage.productTitleInput.fill("Organic Royal Gala Apples");
    await productsPage.saveProductBtn.click();
    await expect(productsPage.editProductForm).not.toBeVisible();

    const stored = await app.getStoredData();
    const updated = stored?.products.find((p) => p.title === "Organic Royal Gala Apples");
    expect(updated).toBeDefined();
  });

  test("merges duplicate products", async ({ app }) => {
    const productsPage = new ProductsPage(app.page);

    // First create a duplicate-like product
    await productsPage.createProduct("Anchor Milk Blue 2L", "L");
    await expect(productsPage.productRows).toHaveCount(4);

    // Edit the new product and merge into original Anchor Blue Milk 2L
    const newRow = productsPage.productRows.filter({ hasText: "Anchor Milk Blue 2L" });
    await newRow.locator('button[aria-label^="Edit product"]').click();

    // Open merge details
    await productsPage.editProductForm.locator("details summary").click();
    const mergeSelect = productsPage.editProductForm.locator("details select");
    await mergeSelect.selectOption({ label: "Anchor Blue Milk 2L" });

    const mergeBtn = productsPage.editProductForm.locator("details button:has-text('Merge')");
    await mergeBtn.click();
    await expect(productsPage.editProductForm).not.toBeVisible();

    // Now total products back to 3
    await expect(productsPage.productRows).toHaveCount(3);
  });

  test("expands price history subpanel with shop comparison", async ({ app }) => {
    const productsPage = new ProductsPage(app.page);

    const milkRow = productsPage.productRows.filter({ hasText: "Anchor Blue Milk 2L" });
    await milkRow.locator("button.price-toggle-btn").click();

    const pricesWrap = milkRow.locator(".product-prices-wrapper");
    await expect(pricesWrap).toBeVisible();
    // In test-data, New World is 5.60
    await expect(pricesWrap).toContainText(/5\.60/);
  });

  test("opens and closes quick compare modal", async ({ app }) => {
    const productsPage = new ProductsPage(app.page);

    await productsPage.openQuickCompare();
    await expect(productsPage.quickCompareDialog).toBeVisible();

    await productsPage.quickCompareCloseBtn.click();
    await expect(productsPage.quickCompareDialog).not.toBeVisible();
  });

  test("deletes a product with inline confirmation", async ({ app }) => {
    const productsPage = new ProductsPage(app.page);

    await expect(productsPage.productRows).toHaveCount(3);

    const milkRow = productsPage.productRows.filter({ hasText: "Anchor Blue Milk 2L" });
    await milkRow.locator('button[aria-label^="Remove product"]').click();

    // Inline confirm block appears
    const confirmBlock = milkRow.locator(".inline-confirm");
    await expect(confirmBlock).toBeVisible();

    // Confirm deletion
    await confirmBlock.locator("button.danger").click();

    await expect(productsPage.productRows).toHaveCount(2);
    const stored = await app.getStoredData();
    expect(stored?.products.some((p) => p.title === "Anchor Blue Milk 2L")).toBeFalsy();
  });
});
