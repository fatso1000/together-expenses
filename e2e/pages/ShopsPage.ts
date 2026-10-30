import { type Page, type Locator, expect } from "@playwright/test";

export class ShopsPage {
  readonly page: Page;
  readonly shopNameInput: Locator;
  readonly addShopBtn: Locator;
  readonly cancelEditBtn: Locator;
  readonly searchInput: Locator;
  readonly shopCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.shopNameInput = page.locator("form label input").first();
    this.addShopBtn = page.locator("form button.primary");
    this.cancelEditBtn = page.locator("form button.secondary");
    this.searchInput = page.locator('input[type="search"]');
    this.shopCards = page.locator(".shop-card");
  }

  async addShop(name: string) {
    await this.shopNameInput.fill(name);
    await this.addShopBtn.click();
  }

  async editShop(shopName: string, newName: string) {
    const card = this.shopCards.filter({ hasText: shopName }).first();
    await card.locator('button[aria-label^="Edit shop"], button[aria-label^="Editar comercio"]').click();
    await this.shopNameInput.fill(newName);
    await this.addShopBtn.click();
  }

  async deleteShop(shopName: string) {
    const card = this.shopCards.filter({ hasText: shopName }).first();
    await card.locator('button[aria-label^="Remove shop"], button[aria-label^="Eliminar comercio"]').click();
    // Inline confirmation button
    const deleteConfirmBtn = card.locator(".inline-confirm button.danger, .inline-confirm button:has-text('Delete'), .inline-confirm button:has-text('Eliminar')");
    await deleteConfirmBtn.click();
  }

  async startPurchase(shopName: string) {
    const card = this.shopCards.filter({ hasText: shopName }).first();
    await card.locator("button:has-text('Log purchase'), button:has-text('Cargar compra'), button:has-text('purchase'), button:has-text('compra')").first().click();
  }
}
