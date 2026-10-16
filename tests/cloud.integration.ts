import test from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  getDocs,
  doc,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { CloudDatabase } from "../src/lib/cloud.ts";
import { newSyncKey, databaseId } from "../src/lib/encryption.ts";
import { emptyData } from "../src/lib/storage.ts";
import type { AppData, Expense } from "../src/lib/types.ts";
const live = process.env.LIVE_SYNC_TEST === "1";
const config = live
  ? {
      projectId: "expenses-tracker-fec08",
      apiKey: "AIzaSyAh72LBfBpJqjAOZm4zY4wlJ0t7kPwvU2c",
      appId: "1:249381588839:web:be7ba242ccbe4083d429c2",
    }
  : {
      projectId: "demo-expenses",
      apiKey: "demo-key",
      appId: "demo-app",
    };
const appA = initializeApp(config, "test-a");
const appB = initializeApp(config, "test-b");
const dbA = getFirestore(appA);
const dbB = getFirestore(appB);
if (!live) {
  connectFirestoreEmulator(dbA, "127.0.0.1", 8187);
  connectFirestoreEmulator(dbB, "127.0.0.1", 8187);
}
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function eventually(predicate: () => boolean) {
  const deadline = Date.now() + 8000;
  while (!predicate()) {
    if (Date.now() > deadline)
      throw new Error("Realtime update did not arrive");
    await pause(25);
  }
}
test("two devices share encrypted records, preserve independent edits and reject stale same-record edits", async () => {
  const key = newSyncKey();
  let stateA: AppData = emptyData();
  let stateB: AppData = emptyData();
  const a = new CloudDatabase(
    key,
    (data) => (stateA = data),
    () => {},
    dbA,
  );
  const b = new CloudDatabase(
    key,
    (data) => (stateB = data),
    () => {},
    dbB,
  );
  try {
    await a.start(emptyData());
    await b.start();
    const expense: Expense = {
      id: "test",
      amount: 500,
      currency: "NZD",
      category: "Groceries",
      merchant: "Synthetic market",
      date: "2026-10-04",
      note: "",
      createdAt: 1,
      updatedAt: 1,
    };
    await a.save({ ...stateA, expenses: [expense] });
    await eventually(() => stateB.expenses.length === 1);
    assert.equal(stateB.expenses[0].amount, 500);
    const snapshots = await getDocs(
      collection(dbA, "privateDatabases", await databaseId(key), "records"),
    );
    assert.equal(
      JSON.stringify(snapshots.docs.map((doc) => doc.data())).includes(
        "Synthetic market",
      ),
      false,
    );
    const nextA = structuredClone(stateA);
    const nextB = structuredClone(stateB);
    nextA.expenses[0].amount = 600;
    nextB.weeklyLimit = 10000;
    await Promise.all([a.save(nextA), b.save(nextB)]);
    await eventually(
      () => stateA.weeklyLimit === 10000 && stateB.expenses[0].amount === 600,
    );
    const editA = structuredClone(stateA);
    const editB = structuredClone(stateB);
    editA.expenses[0].amount = 700;
    editB.expenses[0].amount = 800;
    const results = await Promise.allSettled([a.save(editA), b.save(editB)]);
    assert.equal(
      results.filter((result) => result.status === "rejected").length,
      1,
    );
    await assert.rejects(() => getDocs(collection(dbA, "privateDatabases")));
    await assert.rejects(() =>
      setDoc(doc(dbA, "privateDatabases", "public", "records", "x"), {
        revision: "1",
        payload: "plain",
      }),
    );
    await assert.rejects(() =>
      setDoc(
        doc(dbA, "privateDatabases", awaitKeyPlaceholder, "records", "x"),
        { merchant: "plaintext" },
      ),
    );
  } finally {
    a.close();
    b.close();
    const remaining = await getDocs(
      collection(dbA, "privateDatabases", await databaseId(key), "records"),
    );
    const cleanup = writeBatch(dbA);
    remaining.docs.forEach((document) => cleanup.delete(document.ref));
    await cleanup.commit();
    await Promise.all([deleteApp(appA), deleteApp(appB)]);
  }
});
const awaitKeyPlaceholder = "a".repeat(64);
