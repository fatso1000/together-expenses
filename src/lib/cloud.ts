import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDocsFromServer,
  getFirestore,
  onSnapshot,
  runTransaction,
  writeBatch,
  type Unsubscribe,
  type Firestore,
} from "firebase/firestore";
import type { AppData } from "@/lib/types";
import { emptyData, parseBackup } from "@/lib/storage";
import { databaseId, encrypt, decrypt } from "@/lib/encryption";

const app = initializeApp({
  apiKey: "AIzaSyAh72LBfBpJqjAOZm4zY4wlJ0t7kPwvU2c",
  authDomain: "expenses-tracker-fec08.firebaseapp.com",
  projectId: "expenses-tracker-fec08",
  appId: "1:249381588839:web:be7ba242ccbe4083d429c2",
});
const db = getFirestore(app);
type RecordValue = {
  kind:
    | "expenses"
    | "products"
    | "shops"
    | "frequentPayments"
    | "savingsRecords"
    | "settings";
  value: unknown;
};
type CloudRecord = { revision: string; payload: string };
function canonical(value: unknown): string {
  function ordered(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(ordered);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, child]) => [key, ordered(child)]),
      );
    }
    return value;
  }
  return JSON.stringify(ordered(value));
}
function records(data: AppData): Map<string, RecordValue> {
  const result = new Map<string, RecordValue>();
  for (const kind of [
    "expenses",
    "products",
    "shops",
    "frequentPayments",
    "savingsRecords",
  ] as const) {
    for (const value of data[kind] ?? [])
      result.set(`${kind}_${value.id}`, { kind, value });
  }
  result.set("settings", {
    kind: "settings",
    value: {
      weeklyLimit: data.weeklyLimit,
      limits: data.limits,
      categoryLimits: data.categoryLimits ?? [],
      accounts: data.accounts ?? { globalInitialNZD: 0, nzInitialNZD: 0 },
      salary: data.salary ?? { weeklyAverageNZD: 0 },
      customCategories: data.customCategories ?? [],
    },
  });
  return result;
}
export class CloudDatabase {
  private revisions = new Map<string, string>();
  private values = new Map<string, RecordValue>();
  private stop?: Unsubscribe;
  private sequence = 0;
  private collectionId = "";
  private ready = false;
  constructor(
    private secret: string,
    private changed: (data: AppData) => void,
    private status: (message: string) => void,
    private database: Firestore = db,
  ) {}
  async start(seed?: AppData) {
    this.collectionId = await databaseId(this.secret);
    const target = collection(
      this.database,
      "privateDatabases",
      this.collectionId,
      "records",
    );
    const initial = await getDocsFromServer(target);
    if (initial.empty) {
      if (!seed)
        throw new Error("Database not found. Check your connection link.");
      const entries = [...records(seed)];
      // Keep settings last, so a partially uploaded database never looks complete.
      for (let offset = 0; offset < entries.length; offset += 100) {
        const batch = writeBatch(this.database);
        for (const [id, value] of entries.slice(offset, offset + 100)) {
          batch.set(doc(target, id), {
            revision: crypto.randomUUID(),
            payload: await encrypt(this.secret, value, id),
          });
        }
        await batch.commit();
      }
    }
    await new Promise<void>((resolve, reject) => {
      this.stop = onSnapshot(
        target,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites)
            return;
          const sequence = ++this.sequence;
          void (async () => {
            const next = emptyData();
            const revisions = new Map<string, string>();
            const values = new Map<string, RecordValue>();
            for (const document of snapshot.docs) {
              const record = document.data() as CloudRecord;
              const value = (await decrypt(
                this.secret,
                record.payload,
                document.id,
              )) as RecordValue;
              if (value.kind === "settings") {
                Object.assign(next, value.value);
              } else if (
                [
                  "expenses",
                  "products",
                  "shops",
                  "frequentPayments",
                  "savingsRecords",
                ].includes(value.kind)
              ) {
                (next[value.kind] as unknown[]).push(value.value);
              } else {
                throw new Error("Unexpected database record.");
              }
              revisions.set(document.id, record.revision);
              values.set(document.id, value);
            }
            if (!values.has("settings"))
              throw new Error(
                "Database setup is incomplete. Reconnect from the original device.",
              );
            const validated = parseBackup(JSON.stringify(next));
            if (sequence !== this.sequence) return;
            this.values = values;
            this.revisions = revisions;
            this.ready = true;
            this.changed(validated);
            this.status("Synced");
            resolve();
          })().catch((reason) => {
            this.status("Sync error: " + errorMessage(reason));
            reject(reason);
          });
        },
        (reason) => {
          this.status("Sync error: " + errorMessage(reason));
          reject(reason);
        },
      );
    });
  }
  async save(data: AppData) {
    if (!this.ready) throw new Error("Wait for the database to connect.");
    if (navigator.onLine === false)
      throw new Error(
        "You are offline. Your form is kept open; reconnect to save on all devices.",
      );
    const next = records(data);
    const mutations = [
      ...new Set([...next.keys(), ...this.values.keys()]),
    ].filter(
      (id) => canonical(next.get(id)) !== canonical(this.values.get(id)),
    );
    if (!mutations.length) return;
    if (mutations.length > 450)
      throw new Error(
        "This operation changes too many records at once. Use smaller batches.",
      );
    const expected = new Map(this.revisions);
    const encrypted = new Map<string, CloudRecord>();
    for (const id of mutations) {
      if (next.has(id))
        encrypted.set(id, {
          revision: crypto.randomUUID(),
          payload: await encrypt(this.secret, next.get(id), id),
        });
    }
    this.status("Saving…");
    try {
      await runTransaction(this.database, async (transaction) => {
        const references = mutations.map((id) =>
          doc(
            this.database,
            "privateDatabases",
            this.collectionId,
            "records",
            id,
          ),
        );
        const current = await Promise.all(
          references.map((reference) => transaction.get(reference)),
        );
        current.forEach((document, index) => {
          if (document.data()?.revision !== expected.get(mutations[index]))
            throw new Error(
              "Another device changed this record. Review the latest data and try again.",
            );
        });
        references.forEach((reference, index) => {
          const record = encrypted.get(mutations[index]);
          if (record) transaction.set(reference, record);
          else transaction.delete(reference);
        });
      });
      for (const id of mutations) {
        const value = next.get(id);
        if (value) {
          this.values.set(id, value);
          this.revisions.set(id, encrypted.get(id)!.revision);
        } else {
          this.values.delete(id);
          this.revisions.delete(id);
        }
      }
      const merged = emptyData();
      for (const record of this.values.values()) {
        if (record.kind === "settings") {
          Object.assign(merged, record.value);
        } else if (
          [
            "expenses",
            "products",
            "shops",
            "frequentPayments",
            "savingsRecords",
          ].includes(record.kind)
        ) {
          (merged[record.kind] as unknown[]).push(record.value);
        }
      }
      this.changed(parseBackup(JSON.stringify(merged)));
      this.status("Synced");
    } catch (reason) {
      this.status("Changes not synced");
      throw reason;
    }
  }
  close() {
    this.stop?.();
    this.sequence++;
    this.ready = false;
  }
}
function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : "Please reconnect.";
}
