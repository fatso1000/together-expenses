import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";
import {
  type Expense,
  type ExpenseDraft,
  type Currency,
  type AppData,
  type Shop,
  type Product,
  type CategoryDefinition,
  type FinancialAccounts,
  type SalaryConfig,
  type CategoryLimit,
  type FrequentPayment,
  type SavingsRecord,
  type AccountId,
  categories,
} from "@/lib/types";
import {
  today,
  total,
  money,
  totalFrequentWeekly,
  totalFrequentMonthly,
  calculateAccountBalances,
  compareSpendWithInitial,
  calculateCategoryBudgetStatus,
} from "@/lib/finance";
import {
  storageKey,
  readData,
  writeData,
  parseBackup,
  emptyData,
} from "@/lib/storage";
import type { CloudDatabase } from "@/lib/cloud";
import { newSyncKey, validSyncKey } from "@/lib/encryption";
import { useRates } from "@/stores/rates";
import { findProduct, productId } from "@/lib/products";
import { itemsTotal } from "@/lib/purchases";
import { rememberPurchase } from "@/lib/purchases";

export const defaultCategoryDefinitions: CategoryDefinition[] = [
  { id: "groceries", name: "Groceries", icon: "ShoppingBasket", color: "#75974e", isDefault: true },
  { id: "petrol", name: "Petrol", icon: "Fuel", color: "#6b8caf", isDefault: true },
  { id: "shopping", name: "Shopping", icon: "ShoppingBag", color: "#b18b60", isDefault: true },
  { id: "rent", name: "Rent", icon: "House", color: "#547d61", isDefault: true },
  { id: "bills", name: "Bills", icon: "Zap", color: "#b49c4c", isDefault: true },
  { id: "taxes", name: "Taxes", icon: "Landmark", color: "#8b7ba9", isDefault: true },
  { id: "eating-out", name: "Eating out", icon: "Utensils", color: "#b6816b", isDefault: true },
  { id: "health", name: "Health", icon: "HeartPulse", color: "#c0392b", isDefault: true },
  { id: "travel", name: "Travel", icon: "Plane", color: "#298d85", isDefault: true },
  { id: "entertainment", name: "Entertainment", icon: "Film", color: "#8e44ad", isDefault: true },
  { id: "education", name: "Education", icon: "BookOpen", color: "#2980b9", isDefault: true },
  { id: "subscriptions", name: "Subscriptions", icon: "Tv", color: "#d35400", isDefault: true },
  { id: "personal-care", name: "Personal Care", icon: "Sparkles", color: "#e84393", isDefault: true },
  { id: "other", name: "Other", icon: "Ellipsis", color: "#718469", isDefault: true },
];

export const useExpenses = defineStore("expenses", () => {
  const data = ref<AppData>(emptyData());
  const rates = useRates();
  const syncStatus = shallowRef("This device only");
  const syncBusy = shallowRef(false);
  const syncConnected = shallowRef(false);
  const syncKey = shallowRef(localStorage.getItem("expenses-sync-key") ?? "");
  const pendingConnection = shallowRef(
    new URLSearchParams(location.hash.split("?")[1] ?? "").get("connect") ?? "",
  );
  if (pendingConnection.value)
    history.replaceState(
      null,
      "",
      location.pathname + location.search + "#/settings",
    );
  let cloud: CloudDatabase | null = null;
  const products = computed(() => data.value.products);
  const expenses = computed(() => data.value.expenses);
  const shops = computed(() => data.value.shops);
  const limits = computed(() => data.value.limits);
  const customCategories = computed(() => data.value.customCategories ?? []);
  const allCategories = computed(() => [
    ...categories,
    ...customCategories.value.map((c) => c.name),
  ]);
  const categoryDefinitions = computed<CategoryDefinition[]>(() => [
    ...defaultCategoryDefinitions,
    ...customCategories.value,
  ]);
  const message = shallowRef("");
  const removedExpenses = ref<Expense[]>([]);
  const error = shallowRef("");
  const month = shallowRef(today().slice(0, 7));
  const currency = shallowRef<Currency>("NZD");
  const editor = shallowRef<Expense | "new" | null>(null);
  const prefillShop = shallowRef("");
  const repeat = shallowRef<Expense | null>(null);
  const entryMode = shallowRef<"quick" | "items" | "receipt">("quick");
  const currencyExpenses = computed(() =>
    expenses.value.filter((item) => item.currency === "NZD"),
  );
  const monthExpenses = computed(() =>
    currencyExpenses.value.filter((item) => item.date.startsWith(month.value)),
  );
  const monthTotal = computed(() => total(monthExpenses.value));
  const weeklyLimit = computed(() => data.value.weeklyLimit);
  const weekDate = shallowRef(today());
  const weekStart = computed(() => monday(weekDate.value));
  const weekEnd = computed(() => {
    const end = new Date(`${weekStart.value}T12:00:00`);
    end.setDate(end.getDate() + 6);
    return localDate(end);
  });
  const weekTotal = computed(() =>
    total(
      currencyExpenses.value.filter(
        (item) => item.date >= weekStart.value && item.date <= weekEnd.value,
      ),
    ),
  );
  const weekExpenses = computed(() =>
    currencyExpenses.value.filter(
      (item) => item.date >= weekStart.value && item.date <= weekEnd.value,
    ),
  );

  // Financial Accounts & Balances
  const accounts = computed<FinancialAccounts>(
    () =>
      data.value.accounts ?? {
        globalInitialNZD: 0,
        nzInitialNZD: 0,
      },
  );
  const salary = computed<SalaryConfig>(
    () =>
      data.value.salary ?? {
        weeklyAverageNZD: 0,
      },
  );
  const categoryLimits = computed<CategoryLimit[]>(
    () => data.value.categoryLimits ?? [],
  );
  const frequentPayments = computed<FrequentPayment[]>(
    () => data.value.frequentPayments ?? [],
  );
  const savingsRecords = computed<SavingsRecord[]>(
    () => data.value.savingsRecords ?? [],
  );

  const balances = computed(() =>
    calculateAccountBalances(
      accounts.value,
      currencyExpenses.value,
      savingsRecords.value,
    ),
  );
  const globalBalance = computed(() => balances.value.globalBalance);
  const nzBalance = computed(() => balances.value.nzBalance);
  const totalMoney = computed(() => balances.value.totalMoney);
  const allTimeTotal = computed(() => total(currencyExpenses.value));

  const frequentWeeklyCommitment = computed(() =>
    totalFrequentWeekly(frequentPayments.value),
  );
  const frequentMonthlyCommitment = computed(() =>
    totalFrequentMonthly(frequentPayments.value),
  );

  const categoryBudgetProgress = computed(() =>
    calculateCategoryBudgetStatus(categoryLimits.value, weekExpenses.value),
  );

  const initialGlobalNZD = computed(
    () => accounts.value.globalInitialNZD ?? 0,
  );
  const initialGlobalUSD = computed(
    () => accounts.value.globalInitialUSD ?? 0,
  );

  const allTimeBaselineComparison = computed(() =>
    compareSpendWithInitial(allTimeTotal.value, initialGlobalNZD.value),
  );
  const monthBaselineComparison = computed(() =>
    compareSpendWithInitial(monthTotal.value, initialGlobalNZD.value),
  );

  function displayMoney(amount: number) {
    if (currency.value === "USD") {
      return rates.rate
        ? money(Math.round(amount * rates.rate), "USD")
        : "USD unavailable";
    }
    return money(amount, "NZD");
  }
  function monday(value: string) {
    const date = new Date(`${value || today()}T12:00:00`);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return localDate(date);
  }
  function localDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function load() {
    try {
      const saved = readData(localStorage);
      saved.expenses.sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
      );
      data.value = saved;
      error.value = "";
    } catch {
      error.value =
        "Could not read saved data. Export a backup before clearing browser storage.";
    }
  }
  load();
  window.addEventListener("storage", (event) => {
    if (event.key === "expenses-sync-key" && event.newValue !== syncKey.value) {
      cloud?.close();
      cloud = null;
      syncConnected.value = false;
      syncKey.value = event.newValue ?? "";
      if (syncKey.value) void connectDatabase(syncKey.value).catch(() => {});
    }
    if (event.key === storageKey || event.key === null) load();
  });
  async function connectDatabase(key?: string) {
    if (syncBusy.value) return;
    syncBusy.value = true;
    error.value = "";
    const existingKey = key ?? syncKey.value;
    const secret = existingKey || newSyncKey();
    if (!validSyncKey(secret)) {
      syncBusy.value = false;
      throw new Error("Paste the complete private connection link.");
    }
    cloud?.close();
    cloud = null;
    syncConnected.value = false;
    const backup = JSON.stringify(data.value);
    if (secret !== syncKey.value || !existingKey)
      localStorage.setItem("expenses-before-sync", backup);
    const { CloudDatabase } = await import("@/lib/cloud");
    const candidate = new CloudDatabase(
      secret,
      (next) => {
        writeData(localStorage, next);
        load();
      },
      (value) => {
        syncStatus.value = value;
      },
    );
    try {
      syncStatus.value = "Connecting…";
      await candidate.start(existingKey ? undefined : data.value);
      cloud = candidate;
      syncKey.value = secret;
      localStorage.setItem("expenses-sync-key", secret);
      pendingConnection.value = "";
      syncConnected.value = true;
      await migrateUSD();
    } catch (reason) {
      candidate.close();
      syncStatus.value = "Could not connect";
      error.value = friendlyError(reason);
      throw reason;
    } finally {
      syncBusy.value = false;
    }
  }
  let writes: Promise<void> = Promise.resolve();
  async function change(
    update: (current: AppData) => void,
    allowConnecting = false,
  ) {
    const commit = async () => {
      if (syncBusy.value && !allowConnecting)
        throw new Error("Wait for devices to connect.");
      if (syncKey.value && !cloud)
        throw new Error("Reconnect to your database in Data before saving.");
      const next = readData(localStorage);
      update(next);
      const validated = parseBackup(JSON.stringify(next));
      if (cloud) await cloud.save(validated);
      else {
        writeData(localStorage, validated);
        load();
      }
    };
    const result = writes.then(async () => {
      try {
        if (navigator.locks) await navigator.locks.request(storageKey, commit);
        else await commit();
      } catch (reason) {
        throw new Error(`Changes were not saved. ${friendlyError(reason)}`);
      }
    });
    writes = result.catch(() => {});
    return result;
  }
  async function migrateUSD() {
    if (!data.value.expenses.some((item) => item.currency === "USD")) return;
    await rates.refresh();
    if (!rates.rate) {
      error.value =
        "Existing USD expenses need an exchange rate before conversion. Reconnect when online.";
      return;
    }
    const rate = rates.rate;
    await change((current) => {
      for (const expense of current.expenses) {
        if (expense.currency !== "USD") continue;
        expense.originalUSD = {
          amount: expense.amount,
          rate,
          date: rates.date,
        };
        const convertedTotal = Math.round(expense.amount / rate);
        for (const item of expense.items ?? []) {
          item.unitPrice = Math.round(item.unitPrice / rate);
          item.discount = Math.round((item.discount ?? 0) / rate);
        }
        if (expense.items?.length)
          expense.adjustment = convertedTotal - itemsTotal(expense.items);
        expense.amount = convertedTotal;
        expense.currency = "NZD";
      }
    }, true);
    message.value =
      "Existing USD expenses converted to NZD; originals kept in backup data.";
  }
  if (syncKey.value && !pendingConnection.value)
    void connectDatabase(syncKey.value).catch(() => {});
  else
    void migrateUSD().catch((reason) => {
      error.value = friendlyError(reason);
    });
  async function saveExpense(draft: ExpenseDraft, existing?: Expense) {
    await savePurchases([draft], existing);
  }
  async function savePurchases(drafts: ExpenseDraft[], existing?: Expense) {
    if (!drafts.length || drafts.length > 200)
      throw new Error("Add between 1 and 200 expenses.");
    await change((current) => {
      if (existing && !current.expenses.some((item) => item.id === existing.id))
        throw new Error("This expense was removed in another tab.");
      for (const draft of drafts) {
        if (draft.currency !== "NZD")
          throw new Error(
            "Enter expenses in NZD. USD is a display conversion.",
          );
        rememberPurchase(current, draft, () => crypto.randomUUID());
      }
      const now = Date.now();
      const records = drafts.map((draft) => ({
        ...draft,
        id: existing?.id ?? crypto.randomUUID(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }));
      current.expenses = [
        ...records,
        ...current.expenses.filter((item) => item.id !== existing?.id),
      ];
    });
    message.value =
      drafts.length === 1 ? "Saved" : `${drafts.length} expenses saved`;
  }
  async function removeExpense(expense: Expense) {
    let removed: Expense[] = [];
    await change((current) => {
      removed = current.expenses.filter((item) => item.id === expense.id);
      current.expenses = current.expenses.filter(
        (item) => item.id !== expense.id,
      );
    });
    removedExpenses.value = removed;
    message.value = "Deleted · Undo in Data";
  }
  async function restore(source: string) {
    const backup = parseBackup(source);
    await change((current) => Object.assign(current, backup));
    removedExpenses.value = [];
    message.value = "Backup restored";
  }
  async function clearAll() {
    let removed: Expense[] = [];
    await change((current) => {
      removed = current.expenses;
      current.expenses = [];
    });
    removedExpenses.value = removed;
    editor.value = null;
    message.value = "All expenses cleared";
  }
  async function undoDelete() {
    await change((current) => {
      const ids = new Set(current.expenses.map((item) => item.id));
      current.expenses.push(
        ...removedExpenses.value.filter((item) => !ids.has(item.id)),
      );
    });
    removedExpenses.value = [];
    message.value = "Restored";
  }
  async function saveShop(name: string, existing?: Shop) {
    await change((current) => {
      const shop = existing
        ? current.shops.find((item) => item.id === existing.id)
        : undefined;
      if (existing && !shop) throw new Error("Shop no longer exists.");
      if (shop) shop.name = name.trim();
      else
        current.shops.push({
          id: crypto.randomUUID(),
          name: name.trim(),
          items: [],
        });
    });
    message.value = "Shop saved";
  }
  async function removeShop(id: string) {
    await change((current) => {
      current.shops = current.shops.filter((shop) => shop.id !== id);
    });
  }
  async function saveLimit(amount: number | null) {
    await change((current) => {
      current.weeklyLimit = amount ?? 0;
    });
    message.value =
      amount === null ? "Weekly limit removed" : "Weekly limit saved";
  }
  async function saveProduct(product: Product) {
    await change((current) => {
      const duplicate = findProduct(
        current.products.filter((value) => value.id !== product.id),
        product.title,
      );
      if (duplicate)
        throw new Error("This product already exists. Use Merge instead.");
      const existing = current.products.find(
        (value) => value.id === product.id,
      );
      if (existing) {
        const aliases = [
          ...new Set([...existing.aliases, existing.title, ...product.aliases]),
        ];
        Object.assign(existing, product, { aliases });
      } else
        current.products.push({ ...product, id: productId(product.title) });
    });
  }
  async function removeProduct(id: string) {
    await change((current) => {
      current.products = current.products.filter(
        (product) => product.id !== id,
      );
    });
  }
  async function mergeProducts(sourceId: string, targetId: string) {
    if (sourceId === targetId) throw new Error("Choose a different product.");
    await change((current) => {
      const source = current.products.find(
        (product) => product.id === sourceId,
      );
      const target = current.products.find(
        (product) => product.id === targetId,
      );
      if (!source || !target) throw new Error("Product no longer exists.");
      target.aliases = [
        ...new Set([...target.aliases, source.title, ...source.aliases]),
      ];
      for (const expense of current.expenses)
        for (const item of expense.items ?? []) {
          if (item.productId === sourceId) item.productId = targetId;
        }
      current.products = current.products.filter(
        (product) => product.id !== sourceId,
      );
    });
  }
  async function saveCategory(category: CategoryDefinition) {
    await change((current) => {
      current.customCategories = current.customCategories ?? [];
      const trimmedName = category.name.trim();
      const existing = current.customCategories.find(
        (c) =>
          c.id === category.id ||
          c.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (existing) {
        existing.name = trimmedName;
        existing.icon = category.icon;
        existing.color = category.color;
      } else {
        current.customCategories.push({
          id: category.id || crypto.randomUUID(),
          name: trimmedName,
          icon: category.icon,
          color: category.color,
        });
      }
    });
    message.value = "Category saved";
  }
  async function removeCategory(id: string) {
    await change((current) => {
      current.customCategories = (current.customCategories ?? []).filter(
        (c) => c.id !== id,
      );
    });
    message.value = "Category removed";
  }
  async function saveAccounts(config: FinancialAccounts) {
    await change((current) => {
      current.accounts = {
        globalInitialNZD: config.globalInitialNZD,
        nzInitialNZD: config.nzInitialNZD,
        ...(config.globalInitialUSD !== undefined
          ? { globalInitialUSD: config.globalInitialUSD }
          : {}),
        ...(config.globalManualNZD !== undefined
          ? { globalManualNZD: config.globalManualNZD }
          : {}),
        updatedAt: Date.now(),
      };
    });
    message.value = "Accounts updated";
  }

  async function saveSalary(weeklyAverageNZD: number) {
    await change((current) => {
      current.salary = {
        weeklyAverageNZD,
        updatedAt: Date.now(),
      };
    });
    message.value = "Weekly salary updated";
  }

  async function saveCategoryLimits(
    limits: CategoryLimit[],
    syncTotalWeeklyLimit = true,
  ) {
    await change((current) => {
      current.categoryLimits = limits;
      if (syncTotalWeeklyLimit) {
        const sum = limits.reduce((acc, l) => acc + l.amount, 0);
        if (sum > 0) current.weeklyLimit = sum;
      }
    });
    message.value = "Structured weekly budget saved";
  }

  async function saveFrequentPayment(payment: FrequentPayment) {
    await change((current) => {
      current.frequentPayments = current.frequentPayments ?? [];
      const index = current.frequentPayments.findIndex(
        (p) => p.id === payment.id,
      );
      const now = Date.now();
      const item: FrequentPayment = {
        ...payment,
        id: payment.id || crypto.randomUUID(),
        createdAt: payment.createdAt || now,
        updatedAt: now,
      };
      if (index >= 0) {
        current.frequentPayments[index] = item;
      } else {
        current.frequentPayments.push(item);
      }
    });
    message.value = "Frequent payment saved";
  }

  async function removeFrequentPayment(id: string) {
    await change((current) => {
      current.frequentPayments = (current.frequentPayments ?? []).filter(
        (p) => p.id !== id,
      );
    });
    message.value = "Frequent payment removed";
  }

  async function toggleFrequentPayment(id: string) {
    await change((current) => {
      const item = (current.frequentPayments ?? []).find((p) => p.id === id);
      if (item) {
        item.active = !item.active;
        item.updatedAt = Date.now();
      }
    });
  }

  async function logFrequentPaymentAsExpense(id: string, logDate?: string) {
    const item = frequentPayments.value.find((p) => p.id === id);
    if (!item) throw new Error("Frequent payment not found");
    await savePurchases([
      {
        amount: item.amount,
        currency: "NZD",
        category: item.category,
        merchant: item.name,
        note: `Recurring payment (${item.frequency})`,
        date: logDate || today(),
        accountId: item.accountId,
      },
    ]);
    message.value = `Logged ${item.name} as expense`;
  }

  async function saveSavingsRecord(record: SavingsRecord) {
    await change((current) => {
      current.savingsRecords = current.savingsRecords ?? [];
      const index = current.savingsRecords.findIndex((s) => s.id === record.id);
      const now = Date.now();
      const item: SavingsRecord = {
        ...record,
        id: record.id || crypto.randomUUID(),
        createdAt: record.createdAt || now,
      };
      if (index >= 0) {
        current.savingsRecords[index] = item;
      } else {
        current.savingsRecords.push(item);
      }
    });
    message.value = "Savings deposit recorded";
  }

  async function removeSavingsRecord(id: string) {
    await change((current) => {
      current.savingsRecords = (current.savingsRecords ?? []).filter(
        (s) => s.id !== id,
      );
    });
    message.value = "Savings record removed";
  }

  function openExpense(
    mode: "quick" | "items" | "receipt" = "quick",
    source?: Expense,
  ) {
    prefillShop.value = "";
    entryMode.value = mode;
    repeat.value = source ?? null;
    editor.value = "new";
  }
  return {
    data,
    expenses,
    shops,
    limits,
    customCategories,
    allCategories,
    categoryDefinitions,
    currencyExpenses,
    monthExpenses,
    monthTotal,
    weeklyLimit,
    weekDate,
    weekStart,
    weekEnd,
    weekTotal,
    weekExpenses,
    displayMoney,
    rates,
    products,
    saveProduct,
    removeProduct,
    mergeProducts,
    saveCategory,
    removeCategory,
    migrateUSD,
    syncStatus,
    syncBusy,
    syncConnected,
    syncKey,
    pendingConnection,
    connectDatabase,
    month,
    currency,
    editor,
    repeat,
    prefillShop,
    entryMode,
    message,
    error,
    removedExpenses,
    openExpense,
    saveExpense,
    savePurchases,
    removeExpense,
    restore,
    clearAll,
    undoDelete,
    saveShop,
    removeShop,
    saveLimit,
    accounts,
    salary,
    categoryLimits,
    frequentPayments,
    savingsRecords,
    globalBalance,
    nzBalance,
    totalMoney,
    allTimeTotal,
    frequentWeeklyCommitment,
    frequentMonthlyCommitment,
    categoryBudgetProgress,
    initialGlobalNZD,
    initialGlobalUSD,
    allTimeBaselineComparison,
    monthBaselineComparison,
    saveAccounts,
    saveSalary,
    saveCategoryLimits,
    saveFrequentPayment,
    removeFrequentPayment,
    toggleFrequentPayment,
    logFrequentPaymentAsExpense,
    saveSavingsRecord,
    removeSavingsRecord,
  };
});
export function friendlyError(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Please try again.";
}
