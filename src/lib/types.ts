export const defaultCategories = [
  "Groceries",
  "Petrol",
  "Shopping",
  "Rent",
  "Bills",
  "Taxes",
  "Eating out",
  "Health",
  "Travel",
  "Entertainment",
  "Education",
  "Subscriptions",
  "Personal Care",
  "Other",
] as const;

export const categories = defaultCategories;
export type DefaultCategory = (typeof defaultCategories)[number];
export type Category = DefaultCategory | (string & {});

export interface CategoryDefinition {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault?: boolean;
}
export type Currency = "NZD" | "USD";
export type AccountId = "global" | "nz";

export interface AccountDefinition {
  id: AccountId;
  name: string;
  currency: Currency;
  type: "spending" | "savings";
  description: string;
}

export interface FinancialAccounts {
  globalInitialUSD?: number;
  globalInitialNZD: number;
  globalManualNZD?: boolean;
  nzInitialNZD: number;
  updatedAt?: number;
}

export interface SalaryConfig {
  weeklyAverageNZD: number;
  updatedAt?: number;
}

export interface CategoryLimit {
  category: string;
  amount: number;
}

export type PaymentFrequency = "weekly" | "fortnightly" | "monthly" | "yearly";

export interface FrequentPayment {
  id: string;
  name: string;
  amount: number;
  frequency: PaymentFrequency;
  category: Category;
  accountId: AccountId;
  nextDueDate?: string;
  lastLoggedDate?: string;
  lastSkippedDate?: string;
  note?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SavingsRecord {
  id: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: number;
}

export interface ExpenseDraft {
  items?: PurchaseItem[];
  adjustment?: number;
  amount: number;
  currency: Currency;
  category: Category;
  merchant: string;
  note: string;
  date: string;
  accountId?: AccountId;
}
export interface Expense extends ExpenseDraft {
  id: string;
  createdAt: number;
  updatedAt: number;
  originalUSD?: { amount: number; rate: number; date: string };
}

export type Unit = "each" | "kg" | "g" | "lb" | "oz" | "L" | "ml" | "m" | "cm";
export interface Product {
  id: string;
  title: string;
  aliases: string[];
  unit: Unit;
}
export interface PurchaseItem {
  productId?: string;
  unit?: Unit;
  size?: number;
  discount?: number;
  id: string;
  title: string;
  unitPrice: number;
  quantity: number;
}
export interface SavedItem {
  id: string;
  title: string;
  unitPrice: number;
  currency: Currency;
}
export interface Shop {
  id: string;
  name: string;
  items: SavedItem[];
}
export interface MonthlyLimit {
  month: string;
  currency: Currency;
  amount: number;
}
export interface AppData {
  version: 4;
  products: Product[];
  weeklyLimit: number;
  categoryLimits?: CategoryLimit[];
  expenses: Expense[];
  shops: Shop[];
  limits: MonthlyLimit[];
  customCategories?: CategoryDefinition[];
  accounts?: FinancialAccounts;
  salary?: SalaryConfig;
  frequentPayments?: FrequentPayment[];
  savingsRecords?: SavingsRecord[];
}
export interface ItemInput {
  productId?: string;
  unit?: Unit;
  size?: string;
  discount?: string;
  id: string;
  title: string;
  price: string;
  quantity: string;
}

