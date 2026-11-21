import type {
  AppData,
  CategoryDefinition,
  CategoryLimit,
  DayOfWeek,
  FinancialAccounts,
  FrequentPayment,
} from "@/lib/types";

export const onboardingCompletedKey = "expenses-onboarding-completed";

export interface OnboardingVisibilityInput {
  data: AppData;
  syncKey: string;
  syncConnected: boolean;
  completedFlag: boolean;
}

export interface OnboardingSetupPayload {
  accounts: FinancialAccounts;
  weeklySalaryNZD: number;
  payDayOfWeek: DayOfWeek;
  payDate?: string;
  weeklyLimit: number;
  categoryLimits: CategoryLimit[];
  customCategories: CategoryDefinition[];
  frequentPayments: FrequentPayment[];
  ollama?: {
    host: string;
    model: string;
  };
  enableCloudSync: boolean;
}

/**
 * Returns true if the local AppData contains any user records or non-default configuration.
 */
export function hasAppData(data: AppData): boolean {
  if (data.expenses.length > 0) return true;
  if (data.shops.length > 0) return true;
  if (data.products.length > 0) return true;
  if (data.limits.length > 0) return true;
  if (data.weeklyLimit > 0) return true;
  if ((data.categoryLimits?.length ?? 0) > 0) return true;
  if ((data.customCategories?.length ?? 0) > 0) return true;
  if ((data.frequentPayments?.length ?? 0) > 0) return true;
  if ((data.savingsRecords?.length ?? 0) > 0) return true;

  const accounts = data.accounts;
  if (accounts) {
    if ((accounts.globalInitialNZD ?? 0) > 0) return true;
    if ((accounts.globalInitialUSD ?? 0) > 0) return true;
    if ((accounts.nzInitialNZD ?? 0) > 0) return true;
  }

  const salary = data.salary;
  if (salary && (salary.weeklyAverageNZD ?? 0) > 0) {
    return true;
  }

  return false;
}

/**
 * Determines whether the first-run onboarding screen should be displayed on startup.
 * Never shows if the user is already connected to an existing database or has existing data.
 */
export function shouldShowInitialOnboarding(
  input: OnboardingVisibilityInput,
): boolean {
  if (input.syncConnected || input.syncKey.trim().length > 0) {
    return false;
  }

  if (hasAppData(input.data)) {
    return false;
  }

  if (input.completedFlag) {
    return false;
  }

  return true;
}
