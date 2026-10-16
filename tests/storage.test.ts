import test from "node:test";
import assert from "node:assert/strict";
import {
  parseBackup,
  readExpenses,
  writeExpenses,
} from "../src/lib/storage.ts";
const expense = {
  id: "one",
  amount: 1234,
  currency: "NZD",
  category: "Petrol",
  merchant: "Station",
  note: "",
  date: "2026-10-03",
  createdAt: 1,
  updatedAt: 1,
};
test("empty install has no data and saved expenses survive reload", () => {
  let saved: string | null = null;
  const storage = {
    getItem: () => saved,
    setItem: (_: string, value: string) => {
      saved = value;
    },
  };
  assert.deepEqual(readExpenses(storage), []);
  const backup = parseBackup(
    JSON.stringify({ version: 1, expenses: [expense] }),
  );
  writeExpenses(storage, backup.expenses);
  assert.deepEqual(readExpenses(storage), backup.expenses);
  writeExpenses(storage, []);
  assert.deepEqual(readExpenses(storage), []);
});
test("invalid backups and duplicate ids are rejected", () => {
  for (const bad of [
    { ...expense, amount: -1 },
    { ...expense, currency: "EUR" },
    { ...expense, date: "2026-02-30" },
  ]) {
    assert.throws(() =>
      parseBackup(JSON.stringify({ version: 1, expenses: [bad] })),
    );
  }
  assert.throws(() =>
    parseBackup(JSON.stringify({ version: 1, expenses: [expense, expense] })),
  );
  assert.throws(() => parseBackup("{broken"));
});
test("failed persistence leaves existing storage intact", () => {
  const storage = {
    setItem: () => {
      throw new Error("Quota exceeded");
    },
  };
  assert.throws(() => writeExpenses(storage, []), /Quota exceeded/);
});

test("custom categories parse cleanly and expenses with custom categories are accepted", () => {
  const customCat = {
    id: "gym-membership",
    name: "Fitness",
    icon: "Dumbbell",
    color: "#27ae60",
  };
  const customExpense = {
    ...expense,
    id: "gym-1",
    category: "Fitness",
  };
  const backup = parseBackup(
    JSON.stringify({
      version: 3,
      expenses: [customExpense],
      shops: [],
      limits: [],
      products: [],
      weeklyLimit: 50000,
      customCategories: [customCat],
    }),
  );
  assert.equal(backup.customCategories?.length, 1);
  assert.equal(backup.customCategories?.[0].name, "Fitness");
  assert.equal(backup.expenses[0].category, "Fitness");

  // Reject duplicate category ids or names
  assert.throws(() =>
    parseBackup(
      JSON.stringify({
        version: 3,
        expenses: [],
        shops: [],
        limits: [],
        products: [],
        weeklyLimit: 0,
        customCategories: [customCat, customCat],
      }),
    ),
  );
});

test("v4 backups support accounts, salary, category limits, frequent payments, and savings records", () => {
  const fp = {
    id: "fp-1",
    name: "Electricity",
    amount: 15000,
    frequency: "monthly" as const,
    category: "Bills",
    accountId: "global" as const,
    nextDueDate: "2026-11-01",
    note: "Power bill",
    active: true,
    createdAt: 100,
    updatedAt: 100,
  };
  const savings = {
    id: "sav-1",
    amount: 50000,
    date: "2026-10-15",
    note: "Weekly salary transfer",
    createdAt: 100,
  };
  const rawV4 = {
    version: 4,
    expenses: [
      {
        ...expense,
        accountId: "global",
      },
    ],
    shops: [],
    limits: [],
    products: [],
    weeklyLimit: 80000,
    categoryLimits: [
      { category: "Rent", amount: 40000 },
      { category: "Groceries", amount: 20000 },
    ],
    accounts: {
      globalInitialUSD: 500000,
      globalInitialNZD: 820000,
      globalManualNZD: false,
      nzInitialNZD: 250000,
    },
    salary: {
      weeklyAverageNZD: 120000,
    },
    frequentPayments: [fp],
    savingsRecords: [savings],
  };

  const parsed = parseBackup(JSON.stringify(rawV4));
  assert.equal(parsed.version, 4);
  assert.equal(parsed.accounts?.globalInitialUSD, 500000);
  assert.equal(parsed.accounts?.globalInitialNZD, 820000);
  assert.equal(parsed.accounts?.nzInitialNZD, 250000);
  assert.equal(parsed.salary?.weeklyAverageNZD, 120000);
  assert.equal(parsed.categoryLimits?.length, 2);
  assert.equal(parsed.categoryLimits?.[0].category, "Rent");
  assert.equal(parsed.frequentPayments?.length, 1);
  assert.equal(parsed.frequentPayments?.[0].name, "Electricity");
  assert.equal(parsed.savingsRecords?.length, 1);
  assert.equal(parsed.savingsRecords?.[0].amount, 50000);
  assert.equal(parsed.expenses[0].accountId, "global");

  // Invalid frequent payment frequency
  assert.throws(() =>
    parseBackup(
      JSON.stringify({
        ...rawV4,
        frequentPayments: [{ ...fp, frequency: "daily" }],
      }),
    ),
  );
  // Duplicate category limits
  assert.throws(() =>
    parseBackup(
      JSON.stringify({
        ...rawV4,
        categoryLimits: [
          { category: "Rent", amount: 40000 },
          { category: "rent", amount: 50000 },
        ],
      }),
    ),
  );
});

