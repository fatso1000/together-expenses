import test from "node:test";
import assert from "node:assert/strict";
import {
  parseMoney,
  parseOptionalMoney,
  total,
  categoryTotals,
  previousMonth,
  csv,
  expensesInCurrency,
  frequencyToWeekly,
  frequencyToMonthly,
  totalFrequentWeekly,
  calculateAccountBalances,
  compareSpendWithInitial,
  calculateCategoryBudgetStatus,
} from "../src/lib/finance.ts";
import type { Expense } from "../src/lib/types.ts";
const expense = (
  amount: number,
  category: Expense["category"] = "Groceries",
): Expense => ({
  id: "1",
  amount,
  currency: "NZD",
  category,
  merchant: "Test",
  note: "",
  date: "2026-09-01",
  createdAt: 1,
  updatedAt: 1,
});
test("amounts use integer cents with exact decimal parsing", () => {
  assert.equal(parseMoney("0.29"), 29);
  assert.equal(parseMoney("12.5"), 1250);
  assert.equal(parseMoney("10"), 1000);
  assert.equal(total([expense(29), expense(71)]), 100);
});
test("rejects invalid, negative, zero and over-precise amounts", () => {
  for (const value of ["0", "-2", "NaN", "1e5", "1.999", "10,20", "10000000"])
    assert.throws(() => parseMoney(value));
});
test("parseOptionalMoney permits zero and empty while enforcing positive decimal formatting", () => {
  assert.equal(parseOptionalMoney(""), 0);
  assert.equal(parseOptionalMoney("0"), 0);
  assert.equal(parseOptionalMoney("0.00"), 0);
  assert.equal(parseOptionalMoney("   "), 0);
  assert.equal(parseOptionalMoney("12.50"), 1250);
  assert.throws(() => parseOptionalMoney("-5"));
  assert.throws(() => parseOptionalMoney("abc"));
});
test("category reporting totals exactly match transaction totals", () => {
  const rows = [expense(1250), expense(725, "Petrol"), expense(750)];
  const groups = categoryTotals(rows);
  assert.equal(total(rows), 2725);
  assert.equal(groups[0].amount, 2000);
  assert.equal(
    groups.reduce((sum, row) => sum + row.amount, 0),
    2725,
  );
});
test("previous month crosses year and handles leap year", () => {
  assert.equal(previousMonth("2026-01"), "2025-12");
  assert.equal(previousMonth("2024-03"), "2024-02");
});
test("CSV preserves commas and quotes and neutralizes formulas", () => {
  const output = csv([
    { ...expense(1234), merchant: "=SUM(1,2)", note: '"quoted", text' },
  ]);
  assert.match(output, /'=SUM/);
  assert.match(output, /"12.34"/);
  assert.match(output, /""quoted""/);
});

test("currency filters never combine NZD and USD and CSV preserves each currency", () => {
  const rows: Expense[] = [expense(1200), { ...expense(500), currency: "USD" }];
  assert.equal(total(expensesInCurrency(rows, "NZD")), 1200);
  assert.equal(total(expensesInCurrency(rows, "USD")), 500);
  const output = csv(rows);
  assert.match(output, /"12.00","NZD"/);
  assert.match(output, /"5.00","USD"/);
});

test("categoryTotals seamlessly incorporates custom categories", () => {
  const rows = [
    expense(1500, "Groceries"),
    expense(2000, "Fitness"),
  ];
  const groups = categoryTotals(rows);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].category, "Fitness");
  assert.equal(groups[0].amount, 2000);
  assert.equal(groups[1].category, "Groceries");
  assert.equal(groups[1].amount, 1500);
});

test("csv formats receipt discount as a dedicated column and includes account", () => {
  const output = csv([
    {
      ...expense(2500),
      adjustment: -500, // $5.00 discount
      accountId: "nz",
    },
  ]);
  assert.match(output, /"Discount"/);
  assert.match(output, /"5.00"/);
  assert.match(output, /"NZ Account"/);
});

test("frequency conversions correctly calculate weekly and monthly equivalents", () => {
  // Weekly: exactly same
  assert.equal(frequencyToWeekly(7000, "weekly"), 7000);
  // Fortnightly: half
  assert.equal(frequencyToWeekly(10000, "fortnightly"), 5000);
  // Monthly: (amount * 12) / 52
  assert.equal(frequencyToWeekly(13000, "monthly"), Math.round((13000 * 12) / 52));
  // Yearly: amount / 52
  assert.equal(frequencyToWeekly(52000, "yearly"), 1000);

  // Monthly conversions
  assert.equal(frequencyToMonthly(10000, "monthly"), 10000);
  assert.equal(frequencyToMonthly(120000, "yearly"), 10000);

  // Total active frequent payments
  const payments = [
    {
      id: "1",
      name: "Power",
      amount: 12000, // $120/mo
      frequency: "monthly" as const,
      category: "Bills",
      accountId: "global" as const,
      active: true,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: "2",
      name: "Gym",
      amount: 2500, // $25/wk
      frequency: "weekly" as const,
      category: "Health",
      accountId: "global" as const,
      active: true,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: "3",
      name: "Old Subscription",
      amount: 5000,
      frequency: "monthly" as const,
      category: "Subscriptions",
      accountId: "global" as const,
      active: false, // inactive, should not count
      createdAt: 1,
      updatedAt: 1,
    },
  ];

  const expectedWeekly = Math.round((12000 * 12) / 52) + 2500;
  assert.equal(totalFrequentWeekly(payments), expectedWeekly);
});

test("calculateAccountBalances tracks global spend and nz salary savings", () => {
  const accounts = {
    globalInitialNZD: 1000000, // $10,000.00
    nzInitialNZD: 200000,      // $2,000.00
  };
  const expenses = [
    { ...expense(15000), accountId: "global" as const }, // $150 global
    { ...expense(5000), accountId: "global" as const },  // $50 global
    { ...expense(2500), accountId: "nz" as const },      // $25 nz
  ];
  const savings = [
    { id: "s1", amount: 120000, date: "2026-10-10", createdAt: 1 }, // $1,200 salary deposit
  ];

  const result = calculateAccountBalances(accounts, expenses, savings);
  assert.equal(result.globalSpent, 20000);
  assert.equal(result.nzSpent, 2500);
  assert.equal(result.totalSavings, 120000);
  assert.equal(result.globalBalance, 980000); // 1,000,000 - 20,000
  assert.equal(result.nzBalance, 317500);     // 200,000 + 120,000 - 2,500
  assert.equal(result.totalMoney, 1297500);   // 980,000 + 317,500
});

test("compareSpendWithInitial detects if user spent more or less than initial global money", () => {
  const initial = 500000; // $5,000.00

  // Spent less
  const under = compareSpendWithInitial(350000, initial);
  assert.equal(under.isOverInitial, false);
  assert.equal(under.remaining, 150000);
  assert.equal(under.spentPercent, 70);

  // Spent more
  const over = compareSpendWithInitial(600000, initial);
  assert.equal(over.isOverInitial, true);
  assert.equal(over.difference, 100000);
  assert.equal(over.spentPercent, 120);
});

test("calculateCategoryBudgetStatus computes category-by-category limit progress", () => {
  const limits = [
    { category: "Rent", amount: 40000 },
    { category: "Groceries", amount: 15000 },
  ];
  const expenses = [
    expense(40000, "Rent"),
    expense(12000, "Groceries"),
    expense(3000, "Other"),
  ];

  const status = calculateCategoryBudgetStatus(limits, expenses);
  assert.equal(status.length, 2);

  // Rent: 40000/40000 = 100% -> over
  assert.equal(status[0].category, "Rent");
  assert.equal(status[0].spent, 40000);
  assert.equal(status[0].status, "over");

  // Groceries: 12000/15000 = 80% -> near
  assert.equal(status[1].category, "Groceries");
  assert.equal(status[1].spent, 12000);
  assert.equal(status[1].status, "near");
});

test("expenses attached to NZ account discount exclusively from nz savings without affecting global capital baseline", () => {
  const accounts = {
    globalInitialNZD: 500000, // $5,000 initial global
    nzInitialNZD: 100000,      // $1,000 initial nz
  };
  const savings = [
    { id: "s1", amount: 150000, date: "2026-10-10", note: "Salary", createdAt: 1 }, // $1,500 deposited
  ];
  // $400 Rent and $80 Petrol paid from NZ savings
  const expenses = [
    { ...expense(40000, "Rent"), accountId: "nz" as const },
    { ...expense(8000, "Petrol"), accountId: "nz" as const },
    { ...expense(12000, "Groceries"), accountId: "global" as const }, // $120 global spend
  ];

  const balances = calculateAccountBalances(accounts, expenses, savings);
  assert.equal(balances.globalSpent, 12000); // only $120
  assert.equal(balances.nzSpent, 48000);     // $480 ($400 + $80)
  assert.equal(balances.globalBalance, 488000); // 500,000 - 12,000
  assert.equal(balances.nzBalance, 202000);     // 100,000 + 150,000 - 48,000

  // Baseline comparison for global capital should use globalSpent ($120), NOT all-time spend ($600)
  const comparison = compareSpendWithInitial(balances.globalSpent, accounts.globalInitialNZD);
  assert.equal(comparison.isOverInitial, false);
  assert.equal(comparison.remaining, 488000);
  assert.equal(comparison.spentPercent, 2.4);
});

