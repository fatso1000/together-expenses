import type { Expense, Category, Currency } from "@/lib/types";
import { categories } from "@/lib/types";

export function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseMoney(value: string): number {
  const normalized = value.trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(normalized))
    throw new Error("Enter an amount with up to two decimal places.");
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents <= 0 || cents > 999999999)
    throw new Error("Enter an amount greater than zero and below 10 million.");
  return cents;
}

export function money(cents: number, currency = "NZD"): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(cents / 100);
}

export function expensesInCurrency(
  expenses: Expense[],
  currency: Currency,
): Expense[] {
  return expenses.filter((expense) => (expense.currency ?? "NZD") === currency);
}

export function total(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

export function categoryTotals(
  expenses: Expense[],
): { category: Category; amount: number; percent: number }[] {
  const sum = total(expenses);
  return categories
    .map((category) => {
      const amount = total(
        expenses.filter((expense) => expense.category === category),
      );
      return { category, amount, percent: sum ? (amount / sum) * 100 : 0 };
    })
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function previousMonth(month: string): string {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(year, number - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function csv(expenses: Expense[]): string {
  function cell(value: string): string {
    // Spreadsheet applications can execute cells starting with formula characters.
    const safe = /^[\s]*[=+@\-\t\r]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  }
  const rows = [
    [
      "Date",
      "Merchant",
      "Category",
      "Amount",
      "Currency",
      "Note",
      "Items",
      "Tax / discount",
    ],
  ];
  for (const expense of expenses) {
    rows.push([
      expense.date,
      expense.merchant,
      expense.category,
      (expense.amount / 100).toFixed(2),
      expense.currency,
      expense.note,
      (expense.items ?? [])
        .map(
          (item) =>
            `${item.title}: ${item.quantity} x ${(item.unitPrice / 100).toFixed(2)}; size ${item.size ?? 1} ${item.unit ?? "each"}; discount ${((item.discount ?? 0) / 100).toFixed(2)}`,
        )
        .join("; "),
      ((expense.adjustment ?? 0) / 100).toFixed(2),
    ]);
  }
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

export function downloadFile(
  filename: string,
  content: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari may consume the download URL after the click handler has returned.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function signedMoney(value: string): number {
  const normalized = value.trim();
  if (!normalized || /^[+-]?0(?:\.0{1,2})?$/.test(normalized)) return 0;
  const negative = normalized.startsWith("-");
  const absolute = normalized.replace(/^[+-]/, "");
  return (negative ? -1 : 1) * parseMoney(absolute);
}
