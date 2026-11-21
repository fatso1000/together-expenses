import { computed, reactive, ref, shallowRef } from "vue";
import { useExpenses, friendlyError } from "@/stores/expenses";
import {
  parseOptionalMoney,
  totalFrequentMonthly,
  totalFrequentWeekly,
} from "@/lib/finance";
import {
  getOllamaHost,
  getOllamaModel,
  isLocalDesktopApp,
} from "@/lib/ollama";
import {
  categories as defaultCategories,
  type CategoryDefinition,
  type CategoryLimit,
  type DayOfWeek,
  type FrequentPayment,
} from "@/lib/types";
import type { OnboardingSetupPayload } from "@/lib/onboarding";

export type OnboardingStepId =
  | "accounts"
  | "budget"
  | "categories"
  | "frequent"
  | "review";

export interface OnboardingBudgetRow {
  id: string;
  category: string;
  amountText: string;
}

export const ONBOARDING_STEPS: OnboardingStepId[] = [
  "accounts",
  "budget",
  "categories",
  "frequent",
  "review",
];

function safeParseCents(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  try {
    return parseOptionalMoney(trimmed);
  } catch {
    return 0;
  }
}

export function useOnboardingSetup() {
  const store = useExpenses();

  const currentStepIndex = shallowRef(0);
  const submitting = shallowRef(false);
  const submitError = shallowRef("");

  // Step 1: Accounts & Salary
  const accountsForm = reactive({
    usdInitial: "",
    nzdInitial: "",
    nzSavingsInitial: "",
    weeklySalary: "",
    payDayOfWeek: 1 as DayOfWeek,
    payDate: "",
  });

  // Step 2: Weekly Spending Limit
  const budgetMode = shallowRef<"structured" | "quick">("structured");
  const singleWeeklyLimit = shallowRef("");
  const categoryLimitRows = ref<OnboardingBudgetRow[]>([
    { id: "starter-rent", category: "Rent", amountText: "" },
    { id: "starter-groceries", category: "Groceries", amountText: "" },
    { id: "starter-bills", category: "Bills", amountText: "" },
    { id: "starter-shopping", category: "Shopping", amountText: "" },
  ]);

  // Step 3: Custom Categories
  const customCategories = ref<CategoryDefinition[]>([]);

  // Step 4: Frequent Payments
  const frequentPayments = ref<FrequentPayment[]>([]);

  // Step 5: Local AI (desktop only) & Cloud Sync
  const isDesktop = isLocalDesktopApp();
  const ollamaHost = shallowRef(getOllamaHost());
  const ollamaModel = shallowRef(getOllamaModel());
  const enableCloudSync = shallowRef(false);

  const currentStepId = computed<OnboardingStepId>(
    () => ONBOARDING_STEPS[currentStepIndex.value] ?? "accounts",
  );

  const isFirstStep = computed(() => currentStepIndex.value === 0);
  const isLastStep = computed(
    () => currentStepIndex.value === ONBOARDING_STEPS.length - 1,
  );

  // Combined categories (14 presets + any custom categories added in Step 3)
  const availableCategories = computed<string[]>(() => [
    ...defaultCategories,
    ...customCategories.value.map((cat) => cat.name),
  ]);

  // Derived numeric cents for live previews
  const globalInitialNzdCents = computed(() =>
    safeParseCents(accountsForm.nzdInitial),
  );
  const globalInitialUsdCents = computed(() =>
    accountsForm.usdInitial.trim()
      ? safeParseCents(accountsForm.usdInitial)
      : undefined,
  );
  const nzInitialNzdCents = computed(() =>
    safeParseCents(accountsForm.nzSavingsInitial),
  );
  const weeklySalaryCents = computed(() =>
    safeParseCents(accountsForm.weeklySalary),
  );

  const validCategoryLimits = computed<CategoryLimit[]>(() => {
    const seen = new Set<string>();
    const limits: CategoryLimit[] = [];
    for (const row of categoryLimitRows.value) {
      const name = row.category.trim();
      const amount = safeParseCents(row.amountText);
      if (!name || amount <= 0) continue;
      const lower = name.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      limits.push({ category: name, amount });
    }
    return limits;
  });

  const structuredWeeklyTotalCents = computed(() =>
    validCategoryLimits.value.reduce((sum, item) => sum + item.amount, 0),
  );

  const effectiveWeeklyLimitCents = computed(() =>
    budgetMode.value === "structured"
      ? structuredWeeklyTotalCents.value
      : safeParseCents(singleWeeklyLimit.value),
  );

  const dailyAllowanceCents = computed(() =>
    effectiveWeeklyLimitCents.value > 0
      ? Math.round(effectiveWeeklyLimitCents.value / 7)
      : 0,
  );

  const targetWeeklySavingsCents = computed(() =>
    weeklySalaryCents.value > effectiveWeeklyLimitCents.value
      ? weeklySalaryCents.value - effectiveWeeklyLimitCents.value
      : 0,
  );

  const savingsRatePercent = computed(() => {
    if (weeklySalaryCents.value <= 0 || effectiveWeeklyLimitCents.value <= 0) {
      return 0;
    }
    return Math.round(
      (targetWeeklySavingsCents.value / weeklySalaryCents.value) * 100,
    );
  });

  const frequentWeeklyCommitmentCents = computed(() =>
    totalFrequentWeekly(frequentPayments.value),
  );
  const frequentMonthlyCommitmentCents = computed(() =>
    totalFrequentMonthly(frequentPayments.value),
  );

  function convertUsdToNzd() {
    if (!accountsForm.usdInitial.trim() || !store.rates.rate) return;
    try {
      const usdCents = parseOptionalMoney(accountsForm.usdInitial);
      if (!usdCents) return;
      const nzdCents = Math.round(usdCents / store.rates.rate);
      accountsForm.nzdInitial = (nzdCents / 100).toFixed(2);
    } catch {
      // Wait for complete decimal input
    }
  }

  async function refreshRatesAndConvert() {
    await store.rates.refresh();
    convertUsdToNzd();
  }

  function addBudgetCategoryRow(preferredCategory?: string) {
    const used = new Set(
      categoryLimitRows.value.map((row) => row.category.toLowerCase()),
    );
    const chosen =
      preferredCategory && !used.has(preferredCategory.toLowerCase())
        ? preferredCategory
        : availableCategories.value.find(
            (cat) => !used.has(cat.toLowerCase()),
          ) ?? "Other";

    categoryLimitRows.value.push({
      id: crypto.randomUUID(),
      category: chosen,
      amountText: "",
    });
  }

  function removeBudgetCategoryRow(id: string) {
    categoryLimitRows.value = categoryLimitRows.value.filter(
      (row) => row.id !== id,
    );
  }

  function saveCustomCategory(category: CategoryDefinition) {
    const trimmed = category.name.trim();
    const existingIndex = customCategories.value.findIndex(
      (item) => item.id === category.id,
    );
    const next: CategoryDefinition = {
      id: category.id || crypto.randomUUID(),
      name: trimmed,
      icon: category.icon,
      color: category.color,
    };
    if (existingIndex >= 0) {
      customCategories.value[existingIndex] = next;
    } else {
      customCategories.value.push(next);
    }
  }

  function removeCustomCategory(id: string) {
    customCategories.value = customCategories.value.filter(
      (item) => item.id !== id,
    );
  }

  function saveFrequentPayment(payment: FrequentPayment) {
    const existingIndex = frequentPayments.value.findIndex(
      (item) => item.id === payment.id,
    );
    if (existingIndex >= 0) {
      frequentPayments.value[existingIndex] = payment;
    } else {
      frequentPayments.value.push(payment);
    }
  }

  function removeFrequentPayment(id: string) {
    frequentPayments.value = frequentPayments.value.filter(
      (item) => item.id !== id,
    );
  }

  function nextStep() {
    if (currentStepIndex.value < ONBOARDING_STEPS.length - 1) {
      currentStepIndex.value += 1;
    }
  }

  function prevStep() {
    if (currentStepIndex.value > 0) {
      currentStepIndex.value -= 1;
    }
  }

  function goToStep(stepId: OnboardingStepId) {
    const index = ONBOARDING_STEPS.indexOf(stepId);
    if (index >= 0) {
      currentStepIndex.value = index;
    }
  }

  async function submitSetup(): Promise<{
    syncEnabled: boolean;
    syncKey: string;
  } | null> {
    submitting.value = true;
    submitError.value = "";
    try {
      const globalNZD = parseOptionalMoney(accountsForm.nzdInitial);
      const globalUSD = accountsForm.usdInitial.trim()
        ? parseOptionalMoney(accountsForm.usdInitial)
        : undefined;
      const nzNZD = parseOptionalMoney(accountsForm.nzSavingsInitial);
      const salaryNZD = parseOptionalMoney(accountsForm.weeklySalary);

      const categoryLimitsToSave =
        budgetMode.value === "structured" ? validCategoryLimits.value : [];
      const weeklyLimitCents =
        budgetMode.value === "structured"
          ? structuredWeeklyTotalCents.value
          : parseOptionalMoney(singleWeeklyLimit.value);

      const payload: OnboardingSetupPayload = {
        accounts: {
          globalInitialNZD: globalNZD,
          ...(globalUSD !== undefined ? { globalInitialUSD: globalUSD } : {}),
          nzInitialNZD: nzNZD,
          globalManualNZD: true,
        },
        weeklySalaryNZD: salaryNZD,
        payDayOfWeek: accountsForm.payDayOfWeek,
        ...(accountsForm.payDate.trim()
          ? { payDate: accountsForm.payDate.trim() }
          : {}),
        weeklyLimit: weeklyLimitCents,
        categoryLimits: categoryLimitsToSave,
        customCategories: [...customCategories.value],
        frequentPayments: [...frequentPayments.value],
        ...(isDesktop
          ? {
              ollama: {
                host: ollamaHost.value,
                model: ollamaModel.value,
              },
            }
          : {}),
        enableCloudSync: enableCloudSync.value,
      };

      return await store.completeOnboardingSetup(payload);
    } catch (reason) {
      submitError.value = friendlyError(reason);
      return null;
    } finally {
      submitting.value = false;
    }
  }

  return {
    steps: ONBOARDING_STEPS,
    currentStepIndex,
    currentStepId,
    isFirstStep,
    isLastStep,
    submitting,
    submitError,
    accountsForm,
    budgetMode,
    singleWeeklyLimit,
    categoryLimitRows,
    customCategories,
    frequentPayments,
    availableCategories,
    isDesktop,
    ollamaHost,
    ollamaModel,
    enableCloudSync,
    globalInitialNzdCents,
    globalInitialUsdCents,
    nzInitialNzdCents,
    weeklySalaryCents,
    validCategoryLimits,
    structuredWeeklyTotalCents,
    effectiveWeeklyLimitCents,
    dailyAllowanceCents,
    targetWeeklySavingsCents,
    savingsRatePercent,
    frequentWeeklyCommitmentCents,
    frequentMonthlyCommitmentCents,
    convertUsdToNzd,
    refreshRatesAndConvert,
    addBudgetCategoryRow,
    removeBudgetCategoryRow,
    saveCustomCategory,
    removeCustomCategory,
    saveFrequentPayment,
    removeFrequentPayment,
    nextStep,
    prevStep,
    goToStep,
    submitSetup,
  };
}

export type OnboardingSetupContext = ReturnType<typeof useOnboardingSetup>;
