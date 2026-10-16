import { findProduct, productId } from "@/lib/products";
import type { AppData, ExpenseDraft, PurchaseItem } from "@/lib/types";

export function lineTotal(
  item: Pick<PurchaseItem, "unitPrice" | "quantity" | "discount">,
): number {
  return (
    Math.round((item.unitPrice * Math.round(item.quantity * 1000)) / 1000) -
    (item.discount ?? 0)
  );
}
export function itemsTotal(items: PurchaseItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}
export function validQuantity(quantity: number): boolean {
  return (
    Number.isFinite(quantity) &&
    quantity > 0 &&
    quantity <= 10000 &&
    Math.abs(quantity * 1000 - Math.round(quantity * 1000)) < 0.000001
  );
}
export function validDate(date: unknown): date is string {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}
export function priceLevel(
  amount: number,
  comparison: number,
): "low" | "normal" | "high" {
  if (!comparison) return "normal";
  if (amount > comparison) return "high";
  if (amount < comparison) return "low";
  return "normal";
}
export function rememberPurchase(
  data: AppData,
  draft: ExpenseDraft,
  newId: () => string,
): void {
  const name = draft.merchant.trim();
  let shop = data.shops.find(
    (item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
  if (!shop) {
    shop = { id: newId(), name, items: [] };
    data.shops.push(shop);
  }
  for (const item of draft.items ?? []) {
    let product =
      data.products.find((product) => product.id === item.productId) ??
      findProduct(data.products, item.title);
    if (!product) {
      product = {
        id: productId(item.title),
        title: item.title.trim(),
        aliases: [],
        unit: item.unit ?? "each",
      };
      data.products.push(product);
    }
    item.productId = product.id;
    if (
      item.title.trim().toLowerCase() !== product.title.toLowerCase() &&
      !product.aliases.includes(item.title.trim())
    ) {
      product.aliases.push(item.title.trim());
    }
  }
}
