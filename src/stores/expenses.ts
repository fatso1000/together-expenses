import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";
import type {
  Expense,
  ExpenseDraft,
  Currency,
  AppData,
  Shop,
  Product,
} from "@/lib/types";
import { today, total, money } from "@/lib/finance";
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
    currencyExpenses,
    monthExpenses,
    monthTotal,
    weeklyLimit,
    weekDate,
    weekStart,
    weekEnd,
    weekTotal,
    displayMoney,
    rates,
    products,
    saveProduct,
    removeProduct,
    mergeProducts,
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
  };
});
export function friendlyError(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Please try again.";
}
