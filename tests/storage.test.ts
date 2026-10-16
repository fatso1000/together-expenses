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
