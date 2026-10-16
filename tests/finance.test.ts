import test from "node:test";
import assert from "node:assert/strict";
import {
  parseMoney,
  total,
  categoryTotals,
  previousMonth,
  csv,
  expensesInCurrency,
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
