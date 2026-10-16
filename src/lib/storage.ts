import {
  categories,
  type Expense,
  type AppData,
  type Shop,
  type PurchaseItem,
  type MonthlyLimit,
  type Product,
  type CategoryDefinition,
  type AccountId,
  type FinancialAccounts,
  type SalaryConfig,
  type CategoryLimit,
  type FrequentPayment,
  type SavingsRecord,
  type PaymentFrequency,
} from "@/lib/types";
import { units, findProduct, productId } from "@/lib/products";
import { itemsTotal, validDate, validQuantity } from "@/lib/purchases";

// Keep the original key so upgrades retain existing spending records.
export const storageKey = "daily-expenses-v1";
export type Backup = AppData;
export function emptyData(): AppData {
  return {
    version: 4,
    expenses: [],
    shops: [],
    limits: [],
    products: [],
    weeklyLimit: 0,
    categoryLimits: [],
    accounts: {
      globalInitialNZD: 0,
      nzInitialNZD: 0,
    },
    salary: {
      weeklyAverageNZD: 0,
    },
    frequentPayments: [],
    savingsRecords: [],
  };
}
function text(value: unknown, max: number, empty = false): value is string {
  return (
    typeof value === "string" &&
    (empty || value.trim().length > 0) &&
    value.length <= max
  );
}
function cents(value: unknown, zero = false): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= (zero ? 0 : 1) &&
    value <= 999999999
  );
}
function currency(value: unknown): boolean {
  return value === "NZD" || value === "USD";
}
function unique(values: string[]) {
  return new Set(values).size === values.length;
}
function invalid(): never {
  throw new Error("The backup contains invalid or duplicate records.");
}
function parseItems(value: unknown): PurchaseItem[] {
  if (!Array.isArray(value) || value.length > 200) return invalid();
  const items = value.map((item: PurchaseItem) => {
    if (
      !item ||
      !text(item.id, 100) ||
      !text(item.title, 100) ||
      !cents(item.unitPrice, true) ||
      !validQuantity(item.quantity)
    )
      return invalid();
    const unit = item.unit ?? "each";
    const size = item.size ?? 1;
    const discount = item.discount ?? 0;
    if (
      !units.some((value) => value.value === unit) ||
      !validQuantity(size) ||
      !cents(discount, true) ||
      discount > Math.round(item.unitPrice * item.quantity) ||
      (item.productId !== undefined && !text(item.productId, 500))
    )
      return invalid();
    return {
      ...(item.productId ? { productId: item.productId } : {}),
      unit,
      size,
      discount,
      id: item.id,
      title: item.title.trim(),
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    };
  });
  if (!unique(items.map((item) => item.id))) return invalid();
  return items;
}
export function parseBackup(source: string): AppData {
  const data = JSON.parse(source);
  if (
    !data ||
    ![1, 2, 3, 4].includes(data.version) ||
    !Array.isArray(data.expenses)
  )
    return invalid();

  const customCategories: CategoryDefinition[] = [];
  const rawCustomCategories = Array.isArray(data.customCategories)
    ? data.customCategories
    : [];
  for (const cat of rawCustomCategories) {
    if (
      !cat ||
      !text(cat.id, 100) ||
      !text(cat.name, 100) ||
      !text(cat.icon, 100) ||
      !text(cat.color, 50)
    )
      return invalid();
    customCategories.push({
      id: cat.id,
      name: cat.name.trim(),
      icon: cat.icon.trim(),
      color: cat.color.trim(),
      ...(cat.isDefault ? { isDefault: true } : {}),
    });
  }
  if (
    !unique(customCategories.map((c) => c.id)) ||
    !unique(customCategories.map((c) => c.name.toLowerCase()))
  )
    return invalid();

  const allowedCategoryNames = new Set([
    ...(categories as readonly string[]).map((name) => name.toLowerCase()),
    ...customCategories.map((c) => c.name.toLowerCase()),
  ]);

  const expenses: Expense[] = data.expenses.map((item: Expense) => {
    const categoryMatches =
      typeof item?.category === "string" &&
      (allowedCategoryNames.has(item.category.trim().toLowerCase()) ||
        (customCategories.length > 0 && text(item.category, 100)));
    const accountValid =
      item.accountId === undefined ||
      item.accountId === "global" ||
      item.accountId === "nz";
    if (
      !item ||
      !text(item.id, 100) ||
      !cents(item.amount) ||
      !currency(item.currency) ||
      !categoryMatches ||
      !accountValid ||
      !text(item.merchant, 100) ||
      !text(item.note, 500, true) ||
      !validDate(item.date) ||
      !Number.isSafeInteger(item.createdAt) ||
      !Number.isSafeInteger(item.updatedAt)
    )
      return invalid();
    const items = parseItems(item.items ?? []);
    const adjustment = item.adjustment ?? 0;
    if (!Number.isSafeInteger(adjustment) || Math.abs(adjustment) > 999999999)
      return invalid();
    if (items.length && itemsTotal(items) + adjustment !== item.amount)
      return invalid();
    if (!items.length && adjustment !== 0) return invalid();
    return {
      id: item.id,
      amount: item.amount,
      currency: item.currency,
      category: item.category,
      merchant: item.merchant.trim(),
      note: item.note,
      date: item.date,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      accountId: item.accountId === "nz" ? "nz" : "global",
      ...(item.originalUSD ? { originalUSD: item.originalUSD } : {}),
      ...(items.length ? { items, adjustment } : {}),
    };
  });
  if (!unique(expenses.map((item) => item.id))) return invalid();
  const rawShops = data.version === 1 ? [] : data.shops;
  const rawLimits = data.version === 1 ? [] : data.limits;
  if (!Array.isArray(rawShops) || !Array.isArray(rawLimits)) return invalid();
  const shops: Shop[] = rawShops.map((shop: Shop) => {
    if (
      !shop ||
      !text(shop.id, 100) ||
      !text(shop.name, 100) ||
      !Array.isArray(shop.items)
    )
      return invalid();
    const items = shop.items.map((item) => {
      if (
        !item ||
        !text(item.id, 100) ||
        !text(item.title, 100) ||
        !cents(item.unitPrice, true) ||
        !currency(item.currency)
      )
        return invalid();
      return {
        id: item.id,
        title: item.title.trim(),
        unitPrice: item.unitPrice,
        currency: item.currency,
      };
    });
    if (
      !unique(items.map((item) => item.id)) ||
      !unique(
        items.map(
          (item) => `${item.currency}:${item.title.toLocaleLowerCase()}`,
        ),
      )
    )
      return invalid();
    return { id: shop.id, name: shop.name.trim(), items };
  });
  if (
    !unique(shops.map((shop) => shop.id)) ||
    !unique(shops.map((shop) => shop.name.toLocaleLowerCase()))
  )
    return invalid();
  const limits: MonthlyLimit[] = rawLimits.map((limit: MonthlyLimit) => {
    if (
      !limit ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(limit.month) ||
      !currency(limit.currency) ||
      !cents(limit.amount)
    )
      return invalid();
    return {
      month: limit.month,
      currency: limit.currency,
      amount: limit.amount,
    };
  });
  if (!unique(limits.map((limit) => `${limit.month}:${limit.currency}`)))
    return invalid();
  const products: Product[] = [];
  const rawProducts = data.version >= 3 ? data.products : [];
  if (!Array.isArray(rawProducts)) return invalid();
  for (const product of rawProducts) {
    if (
      !product ||
      !text(product.id, 500) ||
      !text(product.title, 100) ||
      !Array.isArray(product.aliases) ||
      product.aliases.length > 200 ||
      !product.aliases.every((alias: unknown) => text(alias, 100)) ||
      !units.some((unit) => unit.value === product.unit)
    )
      return invalid();
    products.push({
      id: product.id,
      title: product.title.trim(),
      aliases: product.aliases,
      unit: product.unit,
    });
  }
  if (data.version < 3) {
    const legacyItems = [
      ...shops.flatMap((shop) => shop.items),
      ...expenses.flatMap((expense) => expense.items ?? []),
    ];
    for (const item of legacyItems) {
      if (!findProduct(products, item.title))
        products.push({
          id: productId(item.title),
          title: item.title,
          aliases: [],
          unit: "each",
        });
    }
    for (const expense of expenses) {
      for (const item of expense.items ?? [])
        item.productId = findProduct(products, item.title)?.id;
    }
  }
  if (
    !unique(products.map((product) => product.id)) ||
    !unique(products.map((product) => product.title.trim().toLowerCase()))
  )
    return invalid();
  const weeklyLimit = data.version >= 3 ? data.weeklyLimit : 0;
  if (!cents(weeklyLimit, true)) return invalid();

  // Category limits
  const categoryLimits: CategoryLimit[] = [];
  if (Array.isArray(data.categoryLimits)) {
    for (const lim of data.categoryLimits) {
      if (
        !lim ||
        !text(lim.category, 100) ||
        !cents(lim.amount, true)
      )
        return invalid();
      categoryLimits.push({
        category: lim.category.trim(),
        amount: lim.amount,
      });
    }
    if (!unique(categoryLimits.map((c) => c.category.toLowerCase())))
      return invalid();
  }

  // Financial accounts
  let accounts: FinancialAccounts = {
    globalInitialNZD: 0,
    nzInitialNZD: 0,
  };
  if (data.accounts && typeof data.accounts === "object") {
    const acc = data.accounts;
    if (
      !cents(acc.globalInitialNZD ?? 0, true) ||
      !cents(acc.nzInitialNZD ?? 0, true) ||
      (acc.globalInitialUSD !== undefined && !cents(acc.globalInitialUSD, true)) ||
      (acc.globalManualNZD !== undefined && typeof acc.globalManualNZD !== "boolean") ||
      (acc.updatedAt !== undefined && !Number.isSafeInteger(acc.updatedAt))
    )
      return invalid();
    accounts = {
      globalInitialNZD: acc.globalInitialNZD ?? 0,
      nzInitialNZD: acc.nzInitialNZD ?? 0,
      ...(acc.globalInitialUSD !== undefined ? { globalInitialUSD: acc.globalInitialUSD } : {}),
      ...(acc.globalManualNZD !== undefined ? { globalManualNZD: acc.globalManualNZD } : {}),
      ...(acc.updatedAt !== undefined ? { updatedAt: acc.updatedAt } : {}),
    };
  }

  // Salary
  let salary: SalaryConfig = {
    weeklyAverageNZD: 0,
  };
  if (data.salary && typeof data.salary === "object") {
    const sal = data.salary;
    if (
      !cents(sal.weeklyAverageNZD ?? 0, true) ||
      (sal.updatedAt !== undefined && !Number.isSafeInteger(sal.updatedAt))
    )
      return invalid();
    salary = {
      weeklyAverageNZD: sal.weeklyAverageNZD ?? 0,
      ...(sal.updatedAt !== undefined ? { updatedAt: sal.updatedAt } : {}),
    };
  }

  // Frequent Payments
  const frequentPayments: FrequentPayment[] = [];
  if (Array.isArray(data.frequentPayments)) {
    const validFrequencies: PaymentFrequency[] = ["weekly", "fortnightly", "monthly", "yearly"];
    for (const fp of data.frequentPayments) {
      const categoryMatches =
        typeof fp?.category === "string" &&
        (allowedCategoryNames.has(fp.category.trim().toLowerCase()) ||
          (customCategories.length > 0 && text(fp.category, 100)));
      if (
        !fp ||
        !text(fp.id, 100) ||
        !text(fp.name, 100) ||
        !cents(fp.amount) ||
        !validFrequencies.includes(fp.frequency) ||
        !categoryMatches ||
        (fp.accountId !== "global" && fp.accountId !== "nz") ||
        (fp.nextDueDate !== undefined && !validDate(fp.nextDueDate)) ||
        (fp.note !== undefined && !text(fp.note, 500, true)) ||
        typeof fp.active !== "boolean" ||
        !Number.isSafeInteger(fp.createdAt) ||
        !Number.isSafeInteger(fp.updatedAt)
      )
        return invalid();
      frequentPayments.push({
        id: fp.id,
        name: fp.name.trim(),
        amount: fp.amount,
        frequency: fp.frequency,
        category: fp.category,
        accountId: fp.accountId,
        ...(fp.nextDueDate ? { nextDueDate: fp.nextDueDate } : {}),
        ...(fp.note !== undefined ? { note: fp.note } : {}),
        active: fp.active,
        createdAt: fp.createdAt,
        updatedAt: fp.updatedAt,
      });
    }
    if (!unique(frequentPayments.map((p) => p.id))) return invalid();
  }

  // Savings Records
  const savingsRecords: SavingsRecord[] = [];
  if (Array.isArray(data.savingsRecords)) {
    for (const sr of data.savingsRecords) {
      if (
        !sr ||
        !text(sr.id, 100) ||
        !cents(sr.amount) ||
        !validDate(sr.date) ||
        (sr.note !== undefined && !text(sr.note, 500, true)) ||
        !Number.isSafeInteger(sr.createdAt)
      )
        return invalid();
      savingsRecords.push({
        id: sr.id,
        amount: sr.amount,
        date: sr.date,
        ...(sr.note !== undefined ? { note: sr.note } : {}),
        createdAt: sr.createdAt,
      });
    }
    if (!unique(savingsRecords.map((s) => s.id))) return invalid();
  }

  return {
    version: 4,
    expenses,
    shops,
    limits,
    products,
    weeklyLimit,
    categoryLimits,
    accounts,
    salary,
    frequentPayments,
    savingsRecords,
    ...(data.customCategories !== undefined ? { customCategories } : {}),
  };
}
export function readData(storage: Pick<Storage, "getItem">): AppData {
  const saved = storage.getItem(storageKey);
  return saved ? parseBackup(saved) : emptyData();
}
export function writeData(
  storage: Pick<Storage, "setItem">,
  data: AppData,
): void {
  const validated = parseBackup(JSON.stringify(data));
  storage.setItem(storageKey, JSON.stringify(validated));
}
// Kept for existing data tests and imports; writes always preserve the new schema.
export function readExpenses(storage: Pick<Storage, "getItem">): Expense[] {
  return readData(storage).expenses;
}
export function writeExpenses(
  storage: Pick<Storage, "setItem">,
  expenses: Expense[],
): void {
  writeData(storage, { ...emptyData(), expenses });
}
