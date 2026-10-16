import type {
  Expense,
  Category,
  Currency,
  PaymentFrequency,
  FrequentPayment,
  FinancialAccounts,
  SavingsRecord,
  CategoryLimit,
} from "@/lib/types";
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

export function parseOptionalMoney(value: string): number {
  const normalized = value.trim();
  if (!normalized || /^[+-]?0(?:\.0{1,2})?$/.test(normalized)) return 0;
  return parseMoney(normalized);
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
  categoryList?: readonly string[],
): { category: Category; amount: number; percent: number }[] {
  const sum = total(expenses);
  const allCats = categoryList ?? [
    ...new Set([...categories, ...expenses.map((e) => e.category)]),
  ];
  return allCats
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

export function frequencyToWeekly(
  amount: number,
  frequency: PaymentFrequency,
): number {
  if (frequency === "weekly") return amount;
  if (frequency === "fortnightly") return Math.round(amount / 2);
  if (frequency === "monthly") return Math.round((amount * 12) / 52);
  if (frequency === "yearly") return Math.round(amount / 52);
  return amount;
}

export function frequencyToMonthly(
  amount: number,
  frequency: PaymentFrequency,
): number {
  if (frequency === "monthly") return amount;
  if (frequency === "weekly") return Math.round((amount * 52) / 12);
  if (frequency === "fortnightly") return Math.round((amount * 26) / 12);
  if (frequency === "yearly") return Math.round(amount / 12);
  return amount;
}

export function totalFrequentWeekly(payments: FrequentPayment[]): number {
  return payments
    .filter((p) => p.active)
    .reduce((sum, p) => sum + frequencyToWeekly(p.amount, p.frequency), 0);
}

export function totalFrequentMonthly(payments: FrequentPayment[]): number {
  return payments
    .filter((p) => p.active)
    .reduce((sum, p) => sum + frequencyToMonthly(p.amount, p.frequency), 0);
}

export function calculateAccountBalances(
  accounts: FinancialAccounts,
  expenses: Expense[],
  savings: SavingsRecord[] = [],
): {
  globalBalance: number;
  nzBalance: number;
  totalMoney: number;
  globalSpent: number;
  nzSpent: number;
  totalSavings: number;
} {
  const globalInitial = accounts.globalInitialNZD ?? 0;
  const nzInitial = accounts.nzInitialNZD ?? 0;

  let globalSpent = 0;
  let nzSpent = 0;

  for (const exp of expenses) {
    if (exp.currency !== "NZD") continue;
    if (exp.accountId === "nz") {
      nzSpent += exp.amount;
    } else {
      globalSpent += exp.amount;
    }
  }

  const totalSavings = savings.reduce((acc, s) => acc + s.amount, 0);
  const globalBalance = globalInitial - globalSpent;
  const nzBalance = nzInitial + totalSavings - nzSpent;
  const totalMoney = globalBalance + nzBalance;

  return {
    globalBalance,
    nzBalance,
    totalMoney,
    globalSpent,
    nzSpent,
    totalSavings,
  };
}

export function compareSpendWithInitial(
  spentAmount: number,
  initialGlobalNZD: number,
): {
  difference: number;
  spentPercent: number;
  isOverInitial: boolean;
  remaining: number;
} {
  const remaining = initialGlobalNZD - spentAmount;
  const difference = spentAmount - initialGlobalNZD;
  const spentPercent =
    initialGlobalNZD > 0 ? (spentAmount / initialGlobalNZD) * 100 : 0;
  const isOverInitial = spentAmount > initialGlobalNZD;

  return {
    difference,
    spentPercent,
    isOverInitial,
    remaining,
  };
}

export function calculateCategoryBudgetStatus(
  categoryLimits: CategoryLimit[],
  expenses: Expense[],
): {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
  status: "under" | "near" | "over";
}[] {
  return categoryLimits.map((item) => {
    const spent = total(
      expenses.filter(
        (e) =>
          e.currency === "NZD" &&
          e.category.toLowerCase() === item.category.toLowerCase(),
      ),
    );
    const percent = item.amount > 0 ? (spent / item.amount) * 100 : 0;
    const remaining = Math.max(0, item.amount - spent);
    const status: "under" | "near" | "over" =
      percent >= 100 ? "over" : percent >= 80 ? "near" : "under";

    return {
      category: item.category,
      limit: item.amount,
      spent,
      remaining,
      percent,
      status,
    };
  });
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
      "Account",
      "Amount",
      "Currency",
      "Note",
      "Items",
      "Discount",
    ],
  ];
  for (const expense of expenses) {
    const discountAmount =
      expense.adjustment && expense.adjustment < 0
        ? Math.abs(expense.adjustment)
        : (expense.adjustment ?? 0);
    const accountLabel =
      expense.accountId === "nz" ? "NZ Account" : "Global Account";
    rows.push([
      expense.date,
      expense.merchant,
      expense.category,
      accountLabel,
      (expense.amount / 100).toFixed(2),
      expense.currency,
      expense.note,
      (expense.items ?? [])
        .map(
          (item) =>
            `${item.title}: ${item.quantity} x ${(item.unitPrice / 100).toFixed(2)}; size ${item.size ?? 1} ${item.unit ?? "each"}; discount ${((item.discount ?? 0) / 100).toFixed(2)}`,
        )
        .join("; "),
      (discountAmount / 100).toFixed(2),
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

