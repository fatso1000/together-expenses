import test from "node:test";
import assert from "node:assert/strict";
import { parseReceipt, receiptDifference } from "../src/lib/receipt.ts";

test("grocery continuations retain multipacks, weighed produce and product discounts", () => {
  const result = parseReceipt(
    `Market\n04Oct26 15:58\nCORN 410G\n2 @ $1.15 $2.30\nBANANAS\n0.816 Kg @ $3.69/Kg $3.01\nBROCCOLI\n2 $1.29 $2.58\nPF_BROCCOLI -$0.58\n4 BALANCE DUE $7.31\nEFTPOS $7.31\nSUB TOTAL $6.36\nTOTAL GST $0.95\nTOTAL $7.31`,
  );
  assert.equal(result.date, "2026-10-04");
  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].quantity, 2);
  assert.equal(result.items[0].size, 410);
  assert.equal(result.items[1].size, 0.816);
  assert.equal(result.items[1].unit, "kg");
  assert.equal(result.items[2].discount, 58);
  assert.equal(receiptDifference(result), 0);
});
test("fuel preserves fractional-cent unit rates via measured line total and excludes preauthorization", () => {
  const result = parseReceipt(
    `Fuel shop\n02/10/2026\nGST INCLUSIVE\n2 UNLEADED 91 $68.95\n19.950 ltr @ $3.456/ltr\nVoucher ID 123\nof 8c/l -$1.60\nTOTAL $67.35\nTax amount $8.78\nAUTH TO NZ$200.00\nTOTAL NZ$67 . 35`,
  );
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].size, 19.95);
  assert.equal(result.items[0].unit, "L");
  assert.equal(result.amount, 6735);
  assert.equal(result.items[0].discount, 160);
  assert.equal(receiptDifference(result), 0);
});
test("clothing table uses descriptive continuation and does not add included GST", () => {
  const result = parseReceipt(
    `Kathmandu\nStore: Kathmandu - Gisborne\n4/10/2026\nITEM QTY PRICE TOTAL\nB0983 /B88 /L/XL 1 19.99 19.99\nEVRY-Day Kids Sun Hat\nB88 - Hike\nSubtotal: 17.38\nGST Total: 2.61\nTotal inc. GST: 19.99\nEFTPOS/CC 19.99`,
  );
  assert.equal(result.merchant, "Kathmandu - Gisborne");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].title, "EVRY-Day Kids Sun Hat");
  assert.equal(receiptDifference(result), 0);
});
test("a later damaged total cannot replace the clear balance due", () => {
  const result = parseReceipt(
    "Shop\nMilk 3.50\n1 BALANCE DUE $3.50\nTOTAL GST $0.46\nTOTAL $0.46",
  );
  assert.equal(result.amount, 350);
  assert.equal(receiptDifference(result), 0);
});

import { parsePriceTag } from "../src/lib/price-tag.ts";
test("shelf labels distinguish split cents, pack count and unit-price advertising", () => {
  const tissue = parsePriceTag(
    "Kiwi Soft\n18 roll Value Pack\n$6 29\n19c per 100 sheets",
    [],
  );
  assert.deepEqual(tissue.prices, [629]);
  assert.equal(tissue.size, 18);
  const milk = parsePriceTag("Meadow Fresh Lite 1L\n$3 70\n$3.70 per L", []);
  assert.deepEqual(milk.prices, [370]);
  assert.equal(milk.unit, "L");
  const spread = parsePriceTag(
    "Natural Smooth Peanut Butter 375G\n$4.99\n$1.31 per 100g\nSave $1.51",
    [],
  );
  assert.deepEqual(spread.prices, [499]);
  assert.equal(spread.size, 375);
});

test("flattened superscript cents require explicit price selection", () => {
  const label = parsePriceTag("Milk\n$370", []);
  assert.deepEqual(label.prices, [370, 37000]);
  assert.equal(parsePriceTag("Milk 0L\n$3.70", []).size, 1);
});
