import { type Page, type Locator, expect } from "@playwright/test";

export class ProductsPage {
  readonly page: Page;
  readonly compareLaunchBtn: Locator;
  readonly searchInput: Locator;
  readonly clearSearchBtn: Locator;
  readonly unitPills: Locator;
  readonly newProductBtn: Locator;
  readonly editProductForm: Locator;
  readonly productTitleInput: Locator;
  readonly productUnitSelect: Locator;
  readonly saveProductBtn: Locator;
  readonly productRows: Locator;

  // Quick Compare
  readonly quickCompareDialog: Locator;
  readonly quickCompareCloseBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.compareLaunchBtn = page.locator("button.compare-launch");
    this.searchInput = page.locator(".compact-search-input");
    this.clearSearchBtn = page.locator(".clear-btn");
    this.unitPills = page.locator(".unit-pill");
    this.newProductBtn = page.locator(".header-actions button:has-text('New product'), .header-actions button:has-text('Nuevo producto')");
    this.editProductForm = page.locator("form.edit-product-form");
    this.productTitleInput = page.locator("form.edit-product-form input").first();
    this.productUnitSelect = page.locator("form.edit-product-form select").first();
    this.saveProductBtn = page.locator("form.edit-product-form button.primary");
    this.productRows = page.locator("article.compact-product-row");

    // Quick Compare
    this.quickCompareDialog = page.locator("dialog.purchase-dialog");
    this.quickCompareCloseBtn = page.locator("dialog.purchase-dialog button[aria-label='Close price comparison']");
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async filterByUnit(unitLabel: string) {
    const pill = this.unitPills.filter({ hasText: unitLabel }).first();
    await pill.click();
  }

  async createProduct(title: string, unit = "each") {
    await this.newProductBtn.click();
    await expect(this.editProductForm).toBeVisible();
    await this.productTitleInput.fill(title);
    await this.productUnitSelect.selectOption(unit);
    await this.saveProductBtn.click();
    await expect(this.editProductForm).not.toBeVisible();
  }

  async openQuickCompare() {
    await this.compareLaunchBtn.click();
    await expect(this.quickCompareDialog).toBeVisible();
  }

  async togglePriceHistory(index = 0) {
    const toggleBtn = this.productRows.nth(index).locator("button.price-toggle-btn");
    await toggleBtn.click();
  }
}
