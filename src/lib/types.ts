export const categories = [
  "Groceries",
  "Petrol",
  "Shopping",
  "Rent",
  "Bills",
  "Taxes",
  "Eating out",
  "Health",
  "Travel",
  "Other",
] as const;
export type Category = (typeof categories)[number];
export type Currency = "NZD" | "USD";
export interface ExpenseDraft {
  items?: PurchaseItem[];
  adjustment?: number;
  amount: number;
  currency: Currency;
  category: Category;
  merchant: string;
  note: string;
  date: string;
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
  version: 3;
  products: Product[];
  weeklyLimit: number;
  expenses: Expense[];
  shops: Shop[];
  limits: MonthlyLimit[];
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
