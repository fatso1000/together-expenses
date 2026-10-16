import type { Expense, Product, PurchaseItem, Unit } from "@/lib/types";
import { lineTotal } from "@/lib/purchases";

export const units: {
  value: Unit;
  label: string;
  family: string;
  factor: number;
}[] = [
  { value: "each", label: "each", family: "count", factor: 1 },
  { value: "kg", label: "kg", family: "weight", factor: 1 },
  { value: "g", label: "g", family: "weight", factor: 0.001 },
  { value: "lb", label: "lb", family: "weight", factor: 0.45359237 },
  { value: "oz", label: "oz", family: "weight", factor: 0.028349523125 },
  { value: "L", label: "L", family: "volume", factor: 1 },
  { value: "ml", label: "ml", family: "volume", factor: 0.001 },
  { value: "m", label: "m", family: "length", factor: 1 },
  { value: "cm", label: "cm", family: "length", factor: 0.01 },
];
export function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
export function productId(title: string): string {
  return `product-${encodeURIComponent(normalizeName(title))}`;
}
export function findProduct(
  products: Product[],
  title: string,
): Product | undefined {
  const name = normalizeName(title);
  if (!name) return undefined;
  return products.find((product) =>
    [product.title, ...product.aliases].some(
      (alias) => normalizeName(alias) === name,
    ),
  );
}
export function suggestProducts(products: Product[], title: string): Product[] {
  const query = normalizeName(title);
  if (query.length < 2) return [];
  const exact = findProduct(products, title);
  const words = query.split(" ").filter((word) => word.length > 1);
  return products
    .map((product) => {
      const names = [product.title, ...product.aliases].map(normalizeName);
      let score = 0;
      for (const name of names) {
        if (name === query) score = Math.max(score, 100);
        else if (name.includes(query) || query.includes(name))
          score = Math.max(score, 60);
        else
          score = Math.max(
            score,
            words.filter((word) => name.split(" ").includes(word)).length * 20,
          );
      }
      return { product, score };
    })
    .filter((row) => row.score > 0 && row.product.id !== exact?.id)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((row) => row.product);
}
export function normalizedPrice(item: PurchaseItem) {
  const unit = units.find((unit) => unit.value === (item.unit ?? "each"))!;
  const size = item.size ?? 1;
  const quantity = item.quantity * size * unit.factor;
  const labels: Record<string, string> = {
    count: "each",
    weight: "kg",
    volume: "L",
    length: "m",
  };
  return {
    amount: lineTotal(item) / quantity,
    family: unit.family,
    label: labels[unit.family],
  };
}
export function priceHistory(
  product: Product,
  expenses: Expense[],
  excludeExpenseId?: string,
) {
  return expenses
    .filter(
      (expense) =>
        expense.id !== excludeExpenseId && expense.currency === "NZD",
    )
    .flatMap((expense) =>
      (expense.items ?? [])
        .filter(
          (item) =>
            item.productId === product.id ||
            (!item.productId && findProduct([product], item.title)),
        )
        .map((item) => ({
          ...normalizedPrice(item),
          date: expense.date,
          shop: expense.merchant,
          expenseId: expense.id,
          paid: lineTotal(item),
          item,
        })),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function comparePrice(
  item: PurchaseItem,
  product: Product | undefined,
  expenses: Expense[],
  excludeExpenseId?: string,
) {
  if (!product) return null;
  const current = normalizedPrice(item);
  const history = priceHistory(product, expenses, excludeExpenseId).filter(
    (row) => row.family === current.family,
  );
  if (!history.length) return null;
  const average =
    history.reduce((sum, row) => sum + row.amount, 0) / history.length;
  if (average <= 0) return null;
  const percent = (current.amount / average - 1) * 100;
  let level: "high" | "low" | "normal" = "normal";
  if (percent > 5) level = "high";
  if (percent < -5) level = "low";
  return {
    ...current,
    average,
    percent,
    level,
    count: history.length,
    lowest: Math.min(...history.map((row) => row.amount)),
  };
}
