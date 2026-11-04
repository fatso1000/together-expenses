import test from "node:test";
import assert from "node:assert/strict";

const mockLocation = {
  hostname: "localhost",
  protocol: "http:",
  pathname: "/",
  search: "",
  hash: "",
};

// Mock browser globals for Node test environment
if (typeof globalThis.window === "undefined") {
  globalThis.window = {
    location: mockLocation,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Window & typeof globalThis;
} else if (!(globalThis.window as any).location) {
  (globalThis.window as any).location = mockLocation;
}

if (typeof globalThis.location === "undefined") {
  globalThis.location = mockLocation as unknown as Location;
}

if (typeof globalThis.history === "undefined") {
  globalThis.history = { replaceState: () => {} } as unknown as History;
}

const mockStorageStore = new Map<string, string>();
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage?.getItem) {
  globalThis.localStorage = {
    getItem: (key: string) => mockStorageStore.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorageStore.set(key, String(value)),
    removeItem: (key: string) => { mockStorageStore.delete(key); },
    clear: () => { mockStorageStore.clear(); },
    key: (index: number) => Array.from(mockStorageStore.keys())[index] ?? null,
    get length() { return mockStorageStore.size; },
  } as unknown as Storage;
}

import { setActivePinia, createPinia } from "pinia";
import { useExpenses } from "../src/stores/expenses.ts";
import { emptyData } from "../src/lib/storage.ts";

test("useExpenses dynamically shifts week calculations to Thursday payday", async () => {
  mockStorageStore.clear();
  setActivePinia(createPinia());
  const store = useExpenses();

  // Defaults to Monday (1)
  assert.equal(store.payDayOfWeek, 1);

  // Set weekDate to 2026-11-03 (Tuesday)
  store.weekDate = "2026-11-03";
  assert.equal(store.weekStart, "2026-11-02"); // Monday
  assert.equal(store.weekEnd, "2026-11-08");   // Sunday
  assert.equal(store.weekWeekdayRange, "Mon–Sun");
  assert.equal(store.weekWeekdayRangeLong, "Monday–Sunday");

  // User changes payment day to Thursday (4)
  await store.saveSalary(150000, 4, "2026-10-29");
  assert.equal(store.payDayOfWeek, 4);
  assert.equal(store.salary.payDayOfWeek, 4);
  assert.equal(store.salary.payDate, "2026-10-29");

  // For 2026-11-03 (Tuesday), the week started on Thursday 2026-10-29 and ends Wednesday 2026-11-04
  assert.equal(store.weekStart, "2026-10-29");
  assert.equal(store.weekEnd, "2026-11-04");
  assert.equal(store.weekWeekdayRange, "Thu–Wed");
  assert.equal(store.weekWeekdayRangeLong, "Thursday–Wednesday");

  // Add expenses across week boundaries:
  // Expense 1: 2026-10-28 (Wednesday, previous week) -> excluded
  // Expense 2: 2026-10-29 (Thursday, payday) -> included
  // Expense 3: 2026-11-03 (Tuesday) -> included
  // Expense 4: 2026-11-04 (Wednesday, last day of cycle) -> included
  // Expense 5: 2026-11-05 (Thursday, next payday / new week) -> excluded from current week
  await store.saveExpense({ amount: 1000, date: "2026-10-28", merchant: "Before cycle", category: "Groceries", currency: "NZD", note: "" });
  await store.saveExpense({ amount: 2000, date: "2026-10-29", merchant: "Payday treat", category: "Eating out", currency: "NZD", note: "" });
  await store.saveExpense({ amount: 3000, date: "2026-11-03", merchant: "Midweek fuel", category: "Petrol", currency: "NZD", note: "" });
  await store.saveExpense({ amount: 4000, date: "2026-11-04", merchant: "End of week", category: "Groceries", currency: "NZD", note: "" });
  await store.saveExpense({ amount: 5000, date: "2026-11-05", merchant: "Next payday", category: "Shopping", currency: "NZD", note: "" });

  // Only Expenses 2, 3, 4 are in the current week (2000 + 3000 + 4000 = 9000 cents)
  assert.equal(store.weekExpenses.length, 3);
  assert.equal(store.weekTotal, 9000);

  // Navigate to next week
  store.nextWeek();
  assert.equal(store.weekStart, "2026-11-05");
  assert.equal(store.weekEnd, "2026-11-11");
  assert.equal(store.weekExpenses.length, 1);
  assert.equal(store.weekTotal, 5000);

  // Navigate back to previous week
  store.previousWeek();
  assert.equal(store.weekStart, "2026-10-29");
  assert.equal(store.weekEnd, "2026-11-04");
  assert.equal(store.weekExpenses.length, 3);
  assert.equal(store.weekTotal, 9000);
});

test("saveWeeklyBudgetAndSalary and saveAccountsAndSalary persist payDayOfWeek correctly", async () => {
  mockStorageStore.clear();
  setActivePinia(createPinia());
  const store = useExpenses();

  // Save via saveWeeklyBudgetAndSalary
  await store.saveWeeklyBudgetAndSalary(120000, 60000, [], 5, "2026-10-30"); // Friday = 5
  assert.equal(store.payDayOfWeek, 5);
  assert.equal(store.salary.payDayOfWeek, 5);
  assert.equal(store.salary.payDate, "2026-10-30");

  store.weekDate = "2026-11-03";
  assert.equal(store.weekStart, "2026-10-30"); // Friday
  assert.equal(store.weekEnd, "2026-11-05");   // Thursday
  assert.equal(store.weekWeekdayRange, "Fri–Thu");

  // Save via saveAccountsAndSalary
  await store.saveAccountsAndSalary(
    { globalInitialNZD: 100000, nzInitialNZD: 50000 },
    130000,
    2, // Tuesday = 2
    "2026-10-27",
  );
  assert.equal(store.payDayOfWeek, 2);
  assert.equal(store.salary.payDayOfWeek, 2);
  assert.equal(store.salary.payDate, "2026-10-27");
  assert.equal(store.weekStart, "2026-11-03"); // Tuesday
  assert.equal(store.weekEnd, "2026-11-09");   // Monday
  assert.equal(store.weekWeekdayRange, "Tue–Mon");
});
