import test from "node:test";
import assert from "node:assert/strict";
import {
  itemsTotal,
  rememberPurchase,
  validQuantity,
  validDate,
} from "../src/lib/purchases.ts";
import { emptyData, parseBackup, writeData } from "../src/lib/storage.ts";
import { parseBulk } from "../src/lib/bulk.ts";
import { parseReceipt, receiptDifference } from "../src/lib/receipt.ts";
import type { ExpenseDraft } from "../src/lib/types.ts";
const draft: ExpenseDraft = {
  merchant: "Market",
  amount: 725,
  currency: "NZD",
  date: "2026-10-01",
  category: "Groceries",
  note: "",
  items: [
    { id: "milk", title: "Milk", unitPrice: 350, quantity: 2 },
    { id: "bag", title: "Bag", unitPrice: 25, quantity: 1 },
  ],
  adjustment: 0,
};
test("item totals use integer cents including fractional quantities", () => {
  assert.equal(itemsTotal(draft.items!), 725);
  assert.equal(
    itemsTotal([
      { id: "fruit", title: "Fruit", unitPrice: 399, quantity: 0.125 },
    ]),
    50,
  );
  assert.equal(validQuantity(0), false);
  assert.equal(validQuantity(0.1234), false);
  assert.equal(validDate("2026-13-01"), false);
});
test("catalog shares products across shops without changing expense snapshots", () => {
  const data = emptyData();
  let next = 0;
  data.expenses.push({
    ...structuredClone(draft),
    id: "expense",
    createdAt: 1,
    updatedAt: 1,
  });
  rememberPurchase(data, draft, () => String(++next));
  rememberPurchase(
    data,
    {
      ...draft,
      merchant: "market",
      items: [{ id: "milk2", title: "MILK", unitPrice: 375, quantity: 1 }],
    },
    () => String(++next),
  );
  assert.equal(data.shops.length, 1);
  assert.equal(data.products.length, 2);
  assert.equal(data.shops[0].items.length, 0);
  assert.equal(data.expenses[0].items![0].unitPrice, 350);
  assert.equal(parseBackup(JSON.stringify(data)).expenses[0].amount, 725);
});
test("v1 backups migrate and v2 backs up shops, items, and monthly currency limits", () => {
  const legacy = parseBackup(
    JSON.stringify({
      version: 1,
      expenses: [
        {
          ...draft,
          items: undefined,
          adjustment: undefined,
          id: "old",
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    }),
  );
  assert.deepEqual(legacy.shops, []);
  assert.equal(legacy.expenses[0].amount, 725);
  legacy.limits = [
    { month: "2026-10", currency: "NZD", amount: 100000 },
    { month: "2026-10", currency: "USD", amount: 20000 },
  ];
  rememberPurchase(legacy, draft, () => crypto.randomUUID());
  assert.deepEqual(parseBackup(JSON.stringify(legacy)), legacy);
});
test("mismatched totals and invalid catalog cannot partially overwrite storage", () => {
  const data = emptyData();
  let writes = 0;
  data.expenses = [
    { ...draft, amount: 999, id: "bad", createdAt: 1, updatedAt: 1 },
  ];
  assert.throws(() =>
    writeData(
      {
        setItem: () => {
          writes++;
        },
      },
      data,
    ),
  );
  assert.equal(writes, 0);
  data.expenses = [];
  data.shops = [
    {
      id: "s",
      name: "Shop",
      items: [{ id: "x", title: "Bad", unitPrice: -1, currency: "NZD" }],
    },
  ];
  assert.throws(() => parseBackup(JSON.stringify(data)));
});
test("bulk entry validates every row before saving", () => {
  const rows = parseBulk(
    "2026-09-01 | Market | 12.34 | Groceries\n2026-09-02\tFuel\t40\tPetrol",
    "USD",
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[1].currency, "USD");
  assert.equal(rows[0].amount, 1234);
  assert.throws(
    () => parseBulk("2026-09-01 | Good | 5\n2026-09-02 | Bad | -2", "NZD"),
    /Row 2/,
  );
  assert.throws(() => parseBulk("2026-02-30 | Market | 4", "NZD"), /Row 1/);
});
test("receipt separates totals and tender from item lines and flags differences", () => {
  const receipt = parseReceipt(
    "FRESH MARKET\n04/10/2026\n2 x Milk 7.00\nBread 3.50\nSUBTOTAL 10.50\nGST 1.37\nTOTAL NZD 10.50\nEFTPOS 10.50",
  );
  assert.equal(receipt.merchant, "FRESH MARKET");
  assert.equal(receipt.date, "2026-10-04");
  assert.equal(receipt.amount, 1050);
  assert.equal(receipt.items.length, 2);
  assert.equal(receipt.items[0].quantity, 2);
  assert.equal(receipt.items[0].unitPrice, 350);
  assert.equal(receiptDifference(receipt), 0);
  assert.equal(receiptDifference({ ...receipt, amount: 1200 }), 150);
  assert.equal(parseReceipt("Unreadable photo").amount, null);
});
