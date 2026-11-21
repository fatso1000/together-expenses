import { defineStore } from "pinia";
import { computed, ref, shallowRef, watch } from "vue";
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
  type DayOfWeek,
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
  nextDateAfterFrequency,
  isDateInWeek,
  getWeekStart,
  getWeekEnd,
  formatWeekdayRange,
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
import { t } from "@/lib/i18n";
import { findProduct, productId } from "@/lib/products";
import { itemsTotal } from "@/lib/purchases";
import { rememberPurchase } from "@/lib/purchases";
import {
  hasAppData,
  onboardingCompletedKey,
  shouldShowInitialOnboarding,
  type OnboardingSetupPayload,
} from "@/lib/onboarding";
import {
  isLocalDesktopApp,
  setOllamaHost,
  setOllamaModel,
} from "@/lib/ollama";

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
  const payDayOfWeek = computed<DayOfWeek>(() => data.value.salary?.payDayOfWeek ?? 1);
  const weekDate = shallowRef(today());
  const weekStart = computed(() => getWeekStart(weekDate.value, payDayOfWeek.value));
  const weekEnd = computed(() => getWeekEnd(weekStart.value));
  const weekWeekdayRange = computed(() =>
    formatWeekdayRange(weekStart.value, weekEnd.value, true),
  );
  const weekWeekdayRangeLong = computed(() =>
    formatWeekdayRange(weekStart.value, weekEnd.value, false),
  );
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
  const weekGlobalExpenses = computed(() =>
    weekExpenses.value.filter((item) => item.accountId !== "nz"),
  );
  const weekNZExpenses = computed(() =>
    weekExpenses.value.filter((item) => item.accountId === "nz"),
  );
  const weekGlobalTotal = computed(() => total(weekGlobalExpenses.value));
  const weekNZTotal = computed(() => total(weekNZExpenses.value));
  const currencyOptions = ref([
    {
      label: "NZD",
      value: "NZD",
      disabled: false,
    },
    {
      label: "USD",
      value: "USD",
      disabled: !rates.rate,
    },
  ]);

  watch(
    () => rates.rate,
    (currentRate) => {
      currencyOptions.value = [
        {
          label: "NZD",
          value: "NZD",
          disabled: false,
        },
        {
          label: "USD",
          value: "USD",
          disabled: !currentRate,
        },
      ];
    },
  );

  function previousWeek() {
    const current = new Date(`${weekDate.value || today()}T12:00:00`);
    current.setDate(current.getDate() - 7);
    weekDate.value = localDate(current);
  }

  function nextWeek() {
    const current = new Date(`${weekDate.value || today()}T12:00:00`);
    current.setDate(current.getDate() + 7);
    weekDate.value = localDate(current);
  }

  function resetToCurrentWeek() {
    weekDate.value = today();
  }

  function isPaymentLoggedForWeek(
    payment: FrequentPayment,
    start = weekStart.value,
    end = weekEnd.value,
  ): boolean {
    if (
      payment.lastLoggedDate &&
      payment.lastLoggedDate >= start &&
      payment.lastLoggedDate <= end
    ) {
      return true;
    }
    return weekExpenses.value.some(
      (e) =>
        e.merchant.toLowerCase() === payment.name.toLowerCase() &&
        e.category === payment.category &&
        e.amount === payment.amount,
    );
  }

  function isPaymentSkippedForWeek(
    payment: FrequentPayment,
    start = weekStart.value,
    end = weekEnd.value,
  ): boolean {
    return Boolean(
      payment.lastSkippedDate &&
        payment.lastSkippedDate >= start &&
        payment.lastSkippedDate <= end,
    );
  }

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
    compareSpendWithInitial(balances.value.globalSpent, initialGlobalNZD.value),
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
    return getWeekStart(value, payDayOfWeek.value);
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
  const hasLocalData = computed(() => hasAppData(data.value));
  const showOnboarding = shallowRef<boolean>(
    shouldShowInitialOnboarding({
      data: data.value,
      syncKey: syncKey.value,
      syncConnected: syncConnected.value,
      completedFlag: localStorage.getItem(onboardingCompletedKey) === "true",
    }),
  );
  if (pendingConnection.value) {
    const targetHash = showOnboarding.value ? "#/" : "#/settings/data";
    history.replaceState(
      null,
      "",
      location.pathname + location.search + targetHash,
    );
  }
  window.addEventListener("storage", (event) => {
    if (event.key === "expenses-sync-key" && event.newValue !== syncKey.value) {
      cloud?.close();
      cloud = null;
      syncConnected.value = false;
      syncKey.value = event.newValue ?? "";
      if (syncKey.value) {
        showOnboarding.value = false;
        void connectDatabase(syncKey.value).catch(() => {});
      }
    }
    if (event.key === onboardingCompletedKey && event.newValue === "true") {
      showOnboarding.value = false;
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
      localStorage.setItem(onboardingCompletedKey, "true");
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
  function disconnectDatabase() {
    cloud?.close();
    cloud = null;
    localStorage.removeItem("expenses-sync-key");
    syncKey.value = "";
    syncConnected.value = false;
    pendingConnection.value = "";
    syncStatus.value = "This device only";
    error.value = "";
    message.value = t("sync.disconnectedToast");
  }
  function markOnboardingCompleted() {
    localStorage.setItem(onboardingCompletedKey, "true");
  }
  function closeOnboarding() {
    markOnboardingCompleted();
    showOnboarding.value = false;
  }
  function skipOnboarding() {
    closeOnboarding();
  }
  async function completeOnboardingSetup(
    payload: OnboardingSetupPayload,
  ): Promise<{ syncEnabled: boolean; syncKey: string }> {
    const now = Date.now();
    await change((current) => {
      current.accounts = {
        globalInitialNZD: payload.accounts.globalInitialNZD,
        nzInitialNZD: payload.accounts.nzInitialNZD,
        ...(payload.accounts.globalInitialUSD !== undefined
          ? { globalInitialUSD: payload.accounts.globalInitialUSD }
          : {}),
        ...(payload.accounts.globalManualNZD !== undefined
          ? { globalManualNZD: payload.accounts.globalManualNZD }
          : {}),
        updatedAt: now,
      };
      current.salary = {
        weeklyAverageNZD: payload.weeklySalaryNZD,
        payDayOfWeek: payload.payDayOfWeek,
        ...(payload.payDate ? { payDate: payload.payDate } : {}),
        updatedAt: now,
      };
      current.weeklyLimit = payload.weeklyLimit;
      current.categoryLimits = payload.categoryLimits.map((limit) => ({
        category: limit.category.trim(),
        amount: limit.amount,
      }));

      if (payload.customCategories.length > 0) {
        const existingCustom = current.customCategories ?? [];
        const seenNames = new Set(
          existingCustom.map((cat) => cat.name.toLowerCase()),
        );
        const mergedCustom = [...existingCustom];
        for (const cat of payload.customCategories) {
          const trimmedName = cat.name.trim();
          if (!trimmedName || seenNames.has(trimmedName.toLowerCase())) continue;
          seenNames.add(trimmedName.toLowerCase());
          mergedCustom.push({
            id: cat.id || crypto.randomUUID(),
            name: trimmedName,
            icon: cat.icon,
            color: cat.color,
          });
        }
        current.customCategories = mergedCustom;
      }

      if (payload.frequentPayments.length > 0) {
        const existingPayments = current.frequentPayments ?? [];
        const newPayments = payload.frequentPayments.map((payment) => ({
          ...payment,
          id: payment.id || crypto.randomUUID(),
          name: payment.name.trim(),
          createdAt: payment.createdAt || now,
          updatedAt: now,
        }));
        current.frequentPayments = [...existingPayments, ...newPayments];
      }
    });

    if (payload.ollama && isLocalDesktopApp()) {
      setOllamaHost(payload.ollama.host);
      setOllamaModel(payload.ollama.model);
    }

    markOnboardingCompleted();

    if (payload.enableCloudSync) {
      await connectDatabase();
      return {
        syncEnabled: true,
        syncKey: syncKey.value,
      };
    }

    showOnboarding.value = false;
    message.value = t("onboarding.setupCompleteToast");
    return {
      syncEnabled: false,
      syncKey: "",
    };
  }
  async function restore(source: string) {
    const backup = parseBackup(source);
    await change((current) => Object.assign(current, backup));
    removedExpenses.value = [];
    closeOnboarding();
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
    markOnboardingCompleted();
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

  async function saveSalary(
    weeklyAverageNZD: number,
    payDayOfWeek?: DayOfWeek,
    payDate?: string,
  ) {
    await change((current) => {
      current.salary = {
        weeklyAverageNZD,
        payDayOfWeek: payDayOfWeek ?? current.salary?.payDayOfWeek ?? 1,
        ...(payDate !== undefined
          ? { payDate }
          : current.salary?.payDate
            ? { payDate: current.salary.payDate }
            : {}),
        updatedAt: Date.now(),
      };
    });
    message.value = "Weekly salary updated";
  }

  async function saveAccountsAndSalary(
    config: FinancialAccounts,
    weeklySalaryNZD: number,
    payDayOfWeek?: DayOfWeek,
    payDate?: string,
  ) {
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
      current.salary = {
        weeklyAverageNZD: weeklySalaryNZD,
        payDayOfWeek: payDayOfWeek ?? current.salary?.payDayOfWeek ?? 1,
        ...(payDate !== undefined
          ? { payDate }
          : current.salary?.payDate
            ? { payDate: current.salary.payDate }
            : {}),
        updatedAt: Date.now(),
      };
    });
    message.value = "Accounts and salary saved";
  }

  async function saveWeeklyBudgetAndSalary(
    weeklySalaryNZD: number,
    weeklyLimit: number,
    categoryLimits?: CategoryLimit[],
    payDayOfWeek?: DayOfWeek,
    payDate?: string,
  ) {
    await change((current) => {
      current.salary = {
        weeklyAverageNZD: weeklySalaryNZD,
        payDayOfWeek: payDayOfWeek ?? current.salary?.payDayOfWeek ?? 1,
        ...(payDate !== undefined
          ? { payDate }
          : current.salary?.payDate
            ? { payDate: current.salary.payDate }
            : {}),
        updatedAt: Date.now(),
      };
      current.weeklyLimit = weeklyLimit;
      if (categoryLimits !== undefined) {
        current.categoryLimits = categoryLimits;
      }
    });
    message.value = "Weekly budget and salary saved";
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
    const targetDate = logDate || today();

    await change((current) => {
      const draft: ExpenseDraft = {
        amount: item.amount,
        currency: "NZD",
        category: item.category,
        merchant: item.name,
        note: `Recurring payment (${item.frequency})`,
        date: targetDate,
        accountId: item.accountId,
      };
      rememberPurchase(current, draft, () => crypto.randomUUID());
      const now = Date.now();
      current.expenses = [
        {
          ...draft,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        },
        ...current.expenses,
      ];

      const currentItem = (current.frequentPayments ?? []).find(
        (p) => p.id === id,
      );
      if (currentItem) {
        currentItem.lastLoggedDate = targetDate;
        if (currentItem.nextDueDate) {
          currentItem.nextDueDate = nextDateAfterFrequency(
            currentItem.nextDueDate,
            currentItem.frequency,
          );
        }
        currentItem.updatedAt = now;
      }
    });
    message.value = t("frequent.logSuccess", {
      amount: displayMoney(item.amount),
      name: item.name,
    });
  }

  async function skipFrequentPayment(id: string) {
    const item = frequentPayments.value.find((p) => p.id === id);
    if (!item) throw new Error("Frequent payment not found");

    let updatedDueDate = item.nextDueDate;
    await change((current) => {
      const currentItem = (current.frequentPayments ?? []).find(
        (p) => p.id === id,
      );
      if (currentItem) {
        const now = Date.now();
        currentItem.lastSkippedDate = today();
        if (currentItem.nextDueDate) {
          currentItem.nextDueDate = nextDateAfterFrequency(
            currentItem.nextDueDate,
            currentItem.frequency,
          );
          updatedDueDate = currentItem.nextDueDate;
        }
        currentItem.updatedAt = now;
      }
    });
    message.value = t("frequent.skipSuccess", {
      name: item.name,
      date: updatedDueDate || today(),
    });
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

  async function toggleExpenseAccount(expenseId: string) {
    await change((current) => {
      const item = current.expenses.find((e) => e.id === expenseId);
      if (item) {
        item.accountId = item.accountId === "nz" ? "global" : "nz";
        item.updatedAt = Date.now();
      }
    });
    const updated = data.value.expenses.find((e) => e.id === expenseId);
    message.value =
      updated?.accountId === "nz"
        ? "Moved to NZ Account (Savings)"
        : "Moved to Global Account";
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
    payDayOfWeek,
    weekDate,
    weekStart,
    weekEnd,
    weekWeekdayRange,
    weekWeekdayRangeLong,
    weekTotal,
    weekExpenses,
    weekGlobalExpenses,
    weekNZExpenses,
    weekGlobalTotal,
    weekNZTotal,
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
    disconnectDatabase,
    hasLocalData,
    showOnboarding,
    closeOnboarding,
    skipOnboarding,
    completeOnboardingSetup,
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
    toggleExpenseAccount,
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
    balances,
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
    saveAccountsAndSalary,
    saveWeeklyBudgetAndSalary,
    saveCategoryLimits,
    saveFrequentPayment,
    removeFrequentPayment,
    toggleFrequentPayment,
    logFrequentPaymentAsExpense,
    skipFrequentPayment,
    isPaymentLoggedForWeek,
    isPaymentSkippedForWeek,
    previousWeek,
    nextWeek,
    resetToCurrentWeek,
    saveSavingsRecord,
    removeSavingsRecord,
    currencyOptions
  };
});
export function friendlyError(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Please try again.";
}
