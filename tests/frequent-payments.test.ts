import test from "node:test";
import assert from "node:assert/strict";
import {
  nextDateAfterFrequency,
  isDateInWeek,
  frequencyToWeekly,
  frequencyToMonthly,
} from "../src/lib/finance.ts";
import type { FrequentPayment, AppData } from "../src/lib/types.ts";
import { parseBackup } from "../src/lib/storage.ts";

test("nextDateAfterFrequency advances dates accurately across frequencies", () => {
  // Weekly: exactly +7 days
  assert.equal(nextDateAfterFrequency("2026-10-27", "weekly"), "2026-11-03");
  assert.equal(nextDateAfterFrequency("2026-12-28", "weekly"), "2027-01-04");

  // Fortnightly: exactly +14 days
  assert.equal(nextDateAfterFrequency("2026-10-27", "fortnightly"), "2026-11-10");
  assert.equal(nextDateAfterFrequency("2026-12-25", "fortnightly"), "2027-01-08");

  // Monthly: advances 1 calendar month
  assert.equal(nextDateAfterFrequency("2026-10-15", "monthly"), "2026-11-15");
  // Clamp month-end overflow: Jan 31 -> Feb 28 (non-leap)
  assert.equal(nextDateAfterFrequency("2025-01-31", "monthly"), "2025-02-28");
  // Leap year: Jan 31 -> Feb 29 (2028 is leap year)
  assert.equal(nextDateAfterFrequency("2028-01-31", "monthly"), "2028-02-29");

  // Yearly: exactly +1 year
  assert.equal(nextDateAfterFrequency("2026-10-27", "yearly"), "2027-10-27");
});

test("isDateInWeek verifies whether a payment date falls inside a target week", () => {
  const weekStart = "2026-10-26";
  const weekEnd = "2026-11-01";

  assert.equal(isDateInWeek("2026-10-26", weekStart, weekEnd), true);
  assert.equal(isDateInWeek("2026-10-28", weekStart, weekEnd), true);
  assert.equal(isDateInWeek("2026-11-01", weekStart, weekEnd), true);
  assert.equal(isDateInWeek("2026-10-25", weekStart, weekEnd), false);
  assert.equal(isDateInWeek("2026-11-02", weekStart, weekEnd), false);
  assert.equal(isDateInWeek("", weekStart, weekEnd), false);
});

test("FrequentPayment accepts and preserves lastLoggedDate and lastSkippedDate in storage", () => {
  const sampleBackup = {
    version: 4,
    products: [],
    weeklyLimit: 50000,
    expenses: [],
    shops: [],
    limits: [],
    frequentPayments: [
      {
        id: "fp-1",
        name: "Power Bill",
        amount: 14500,
        frequency: "monthly",
        category: "Bills",
        accountId: "global",
        nextDueDate: "2026-11-01",
        lastLoggedDate: "2026-10-01",
        lastSkippedDate: "2026-09-01",
        active: true,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
    ],
  };

  const parsed = parseBackup(JSON.stringify(sampleBackup));
  assert.equal(parsed.frequentPayments?.length, 1);
  const payment = parsed.frequentPayments![0];
  assert.equal(payment.name, "Power Bill");
  assert.equal(payment.lastLoggedDate, "2026-10-01");
  assert.equal(payment.lastSkippedDate, "2026-09-01");
  assert.equal(payment.nextDueDate, "2026-11-01");
});
