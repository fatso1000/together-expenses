import test from "node:test";
import assert from "node:assert/strict";
import type { Expense } from "../src/lib/types.ts";
import {
  isSpendingRelatedQuery,
  indexRegularPurchases,
  findRelevantPurchases,
  buildCompactFinancialSummary,
  formatKnowledgeForPrompt,
} from "../src/lib/spending-knowledge.ts";

test("isSpendingRelatedQuery accepts financial and purchase queries", () => {
  const allowedQueries = [
    "should I remove milk?",
    "what can I cut from my shopping cart?",
    "how can I earn the most money?",
    "is my grocery spending too high?",
    "audit my recurring subscriptions",
    "can I afford eating out tonight?",
  ];

  for (const q of allowedQueries) {
    const res = isSpendingRelatedQuery(q);
    assert.equal(res.isAllowed, true, `Query "${q}" should be allowed`);
  }
});

test("isSpendingRelatedQuery rejects programming, trivia, and off-topic absurdities", () => {
  const rejectedQueries = [
    "generate a json with the numbers from 1 to 10",
    "how can I center a div",
    "how can I use my expenses to become a king",
    "write a python script to parse csv",
    "what is the capital of France?",
    "write a poem about dragons",
  ];

  for (const q of rejectedQueries) {
    const res = isSpendingRelatedQuery(q);
    assert.equal(res.isAllowed, false, `Query "${q}" should be rejected`);
  }
});

test("indexRegularPurchases calculates frequency, avg price, and shop comparisons", () => {
  const sampleExpenses: Expense[] = [
    {
      id: "e1",
      amount: 840,
      currency: "NZD",
      category: "Groceries",
      merchant: "PaknSave",
      note: "Weekly groceries",
      date: "2026-10-10",
      createdAt: 1,
      updatedAt: 1,
      items: [
        { id: "i1", title: "Standard Milk 2L", unitPrice: 420, quantity: 1, unit: "L" },
        { id: "i2", title: "Toast Bread 700g", unitPrice: 280, quantity: 1, unit: "each" },
      ],
    },
    {
      id: "e2",
      amount: 450,
      currency: "NZD",
      category: "Groceries",
      merchant: "Countdown",
      note: "Top up",
      date: "2026-10-15",
      createdAt: 2,
      updatedAt: 2,
      items: [
        { id: "i3", title: "Standard Milk 2L", unitPrice: 450, quantity: 1, unit: "L" },
      ],
    },
  ];

  const index = indexRegularPurchases(sampleExpenses);
  const milk = index.find((i) => i.normalizedTitle.includes("milk"));
  assert.ok(milk, "Milk should be indexed");
  assert.equal(milk.purchaseCount, 2);
  assert.equal(milk.totalSpentCents, 870);
  assert.equal(milk.averageUnitPriceCents, 435);
  assert.equal(milk.shopPrices["PaknSave"], 420);
  assert.equal(milk.shopPrices["Countdown"], 450);
});

test("findRelevantPurchases extracts matching items by keyword", () => {
  const sampleExpenses: Expense[] = [
    {
      id: "e1",
      amount: 800,
      currency: "NZD",
      category: "Groceries",
      merchant: "Supermarket",
      note: "",
      date: "2026-10-10",
      createdAt: 1,
      updatedAt: 1,
      items: [
        { id: "i1", title: "Organic Whole Milk 2L", unitPrice: 520, quantity: 1 },
        { id: "i2", title: "Eggs 12pk", unitPrice: 750, quantity: 1 },
      ],
    },
  ];

  const index = indexRegularPurchases(sampleExpenses);
  const matches = findRelevantPurchases(index, "should I cut milk from my breakfast?");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].displayTitle, "Organic Whole Milk 2L");
});

test("buildCompactFinancialSummary formats figures under budget", () => {
  const summary = buildCompactFinancialSummary({
    weekTotalCents: 15000,
    weeklyLimitCents: 30000,
    daysRemaining: 4,
    monthTotalCents: 65000,
    salaryWeeklyCents: 120000,
    frequentWeeklyCommitmentCents: 10000,
    topCategories: [{ category: "Groceries", amountCents: 10000 }],
    globalCapitalCents: 500000,
    nzSavingsCents: 250000,
  });

  assert.equal(summary.pacingStatus, "under_budget");
  assert.equal(summary.dailyAllowanceNZD, 37.5);
  assert.equal(summary.weekTotalNZD, 150);

  const prompt = formatKnowledgeForPrompt(summary, [
    {
      normalizedTitle: "organic whole milk 2l",
      displayTitle: "Organic Whole Milk 2L",
      purchaseCount: 3,
      totalSpentCents: 1560,
      averageUnitPriceCents: 520,
      latestPriceCents: 520,
      latestShop: "Supermarket",
      latestDate: "2026-10-20",
      shopPrices: { Supermarket: 520 },
    },
  ]);
  assert.ok(prompt.includes("Pacing: spent $150/$300 NZD"));
  assert.ok(prompt.includes("daily allowance $37.5"));
  assert.ok(prompt.includes("Organic Whole Milk 2L (3x bought, avg $5.20"));
});
