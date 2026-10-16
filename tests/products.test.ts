import test from "node:test";
import assert from "node:assert/strict";
import {
  comparePrice,
  normalizedPrice,
  findProduct,
  suggestProducts,
} from "../src/lib/products.ts";
import { signedMoney } from "../src/lib/finance.ts";
import { parseBackup, emptyData } from "../src/lib/storage.ts";
import {
  encrypt,
  decrypt,
  databaseId,
  newSyncKey,
} from "../src/lib/encryption.ts";
import { parseReceipt } from "../src/lib/receipt.ts";
import type { Product, PurchaseItem, Expense } from "../src/lib/types.ts";
const product: Product = {
  id: "milk",
  title: "Anchor Milk",
  aliases: ["ANCH MLK"],
  unit: "L",
};
const item: PurchaseItem = {
  id: "i",
  title: "Anchor Milk",
  productId: "milk",
  quantity: 2,
  unitPrice: 600,
  discount: 200,
  size: 2,
  unit: "L",
};
const expense: Expense = {
  id: "e",
  merchant: "Shop A",
  date: "2026-10-01",
  currency: "NZD",
  category: "Groceries",
  note: "",
  items: [item],
  amount: 1000,
  adjustment: 0,
  createdAt: 1,
  updatedAt: 1,
};
test("unit price includes quantity, pack size and line discount", () => {
  assert.equal(normalizedPrice(item).amount, 250);
  assert.equal(
    normalizedPrice({
      ...item,
      quantity: 1,
      unitPrice: 500,
      discount: 0,
      size: 2000,
      unit: "ml",
    }).amount,
    250,
  );
  assert.equal(
    normalizedPrice({
      ...item,
      quantity: 1,
      unitPrice: 500,
      discount: 0,
      size: 500,
      unit: "g",
    }).amount,
    1000,
  );
});
test("price warnings compare like units and exclude the edited expense", () => {
  const current = {
    ...item,
    quantity: 1,
    unitPrice: 350,
    discount: 0,
    size: 1,
    unit: "L" as const,
  };
  assert.equal(comparePrice(current, product, [expense])?.level, "high");
  assert.equal(
    comparePrice({ ...current, unitPrice: 150 }, product, [expense])?.level,
    "low",
  );
  assert.equal(
    comparePrice({ ...current, unit: "kg" }, product, [expense]),
    null,
  );
  assert.equal(comparePrice(current, product, [expense], "e"), null);
});
test("exact and alias matches reuse identity; similar names require selection", () => {
  assert.equal(findProduct([product], " ANCH MLK ")?.id, "milk");
  assert.equal(findProduct([product], "anchor-milk")?.id, "milk");
  assert.equal(findProduct([product], "Anchor Milk Chocolate"), undefined);
  assert.equal(
    suggestProducts([product], "Anchor Milk Chocolate")[0].id,
    "milk",
  );
});
test("negative tax/discount parses exactly and over-discounted items fail validation", () => {
  assert.equal(signedMoney("-2.45"), -245);
  assert.equal(signedMoney("+1.25"), 125);
  assert.equal(signedMoney("0"), 0);
  const data = emptyData();
  data.expenses = [expense];
  assert.equal(
    parseBackup(JSON.stringify(data)).expenses[0].items![0].discount,
    200,
  );
  data.expenses = [{ ...expense, items: [{ ...item, discount: 1300 }] }];
  assert.throws(() => parseBackup(JSON.stringify(data)));
});
test("v2 migration merges same product across shops and preserves old limits", () => {
  const data = parseBackup(
    JSON.stringify({
      version: 2,
      expenses: [],
      shops: [
        {
          id: "a",
          name: "A",
          items: [{ id: "x", title: "Milk", unitPrice: 400, currency: "NZD" }],
        },
        {
          id: "b",
          name: "B",
          items: [{ id: "y", title: "milk", unitPrice: 500, currency: "NZD" }],
        },
      ],
      limits: [{ month: "2026-10", currency: "NZD", amount: 10000 }],
    }),
  );
  assert.equal(data.products.length, 1);
  assert.equal(data.weeklyLimit, 0);
  assert.equal(data.limits[0].amount, 10000);
});
test("receipt detects pack size without putting it into product identity", () => {
  const receipt = parseReceipt(
    "SHOP\n04/10/2026\n2 x Anchor Milk 2L 12.00\nTOTAL 12.00",
  );
  assert.equal(receipt.items[0].title, "Anchor Milk");
  assert.equal(receipt.items[0].unit, "L");
  assert.equal(receipt.items[0].size, 2);
  assert.equal(receipt.items[0].quantity, 2);
});
test("sync encrypts records and rejects wrong keys, changed ciphertext and swapped record ids", async () => {
  const key = newSyncKey();
  const other = newSyncKey();
  assert.notEqual(await databaseId(key), key);
  const encrypted = await encrypt(key, expense, "expense-e");
  assert.equal(encrypted.includes("Anchor"), false);
  assert.deepEqual(await decrypt(key, encrypted, "expense-e"), expense);
  await assert.rejects(() => decrypt(other, encrypted, "expense-e"));
  await assert.rejects(() => decrypt(key, encrypted, "other-id"));
  const changed =
    encrypted.slice(0, 20) +
    (encrypted[20] === "A" ? "B" : "A") +
    encrypted.slice(21);
  await assert.rejects(() => decrypt(key, changed, "expense-e"));
});

test('shelf label parser recognizes products and separates ambiguous selling prices', async () => {
  const { parsePriceTag } = await import('../src/lib/price-tag.ts');
  const single = parsePriceTag('ANCHOR MILK\n2L\n$6.50\n$3.25/L', [product]);
  assert.equal(single.productId, 'milk');
  assert.deepEqual(single.prices, [650]);
  assert.equal(single.size, 2);
  assert.equal(single.unit, 'L');
  const multiple = parsePriceTag('Anchor Milk\nWas $7.00\nNow $6.00', [product]);
  assert.deepEqual(multiple.prices, [700, 600]);
  assert.deepEqual(parsePriceTag('Anchor Milk\n$4\n99', [product]).prices, [499]);
});
