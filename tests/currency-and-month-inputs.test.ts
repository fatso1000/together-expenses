import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nextTick } from "vue";

const mockLocation = {
  hostname: "localhost",
  protocol: "http:",
  pathname: "/",
  search: "",
  hash: "",
};

if (typeof globalThis.window === "undefined") {
  globalThis.window = {
    location: mockLocation,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Window & typeof globalThis;
} else if (!(globalThis.window as any).location) {
  (globalThis.window as any).location = mockLocation;
}

if (typeof globalThis.location === "undefined") {
  globalThis.location = mockLocation as unknown as Location;
}

if (typeof globalThis.history === "undefined") {
  globalThis.history = { replaceState: () => {} } as unknown as History;
}

const mockStorageStore = new Map<string, string>();
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage?.getItem) {
  globalThis.localStorage = {
    getItem: (key: string) => mockStorageStore.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorageStore.set(key, String(value)),
    removeItem: (key: string) => { mockStorageStore.delete(key); },
    clear: () => { mockStorageStore.clear(); },
    key: (index: number) => Array.from(mockStorageStore.keys())[index] ?? null,
    get length() { return mockStorageStore.size; },
  } as unknown as Storage;
}

import { setActivePinia, createPinia } from "pinia";
import { useExpenses } from "../src/stores/expenses.ts";
import { useRates } from "../src/stores/rates.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appVuePath = path.resolve(__dirname, "../src/App.vue");

test("currencyOptions ref provides NZD and USD options and updates disabled state reactively", async () => {
  mockStorageStore.clear();
  setActivePinia(createPinia());

  const expensesStore = useExpenses();
  const ratesStore = useRates();

  assert.ok(Array.isArray(expensesStore.currencyOptions), "currencyOptions must be an array");
  assert.equal(expensesStore.currencyOptions.length, 2, "currencyOptions must contain 2 items");

  const [nzdOption, usdOption] = expensesStore.currencyOptions;
  assert.equal(nzdOption.value, "NZD");
  assert.equal(nzdOption.disabled, false);
  assert.equal(usdOption.value, "USD");

  // If rate is null, USD should be disabled
  ratesStore.rate = null;
  await nextTick();
  assert.equal(expensesStore.currencyOptions[1].disabled, true, "USD should be disabled when rate is null");

  // When rate is available, USD should be enabled
  ratesStore.rate = 0.62;
  await nextTick();
  assert.equal(expensesStore.currencyOptions[1].disabled, false, "USD should be enabled when rate is available");
});

test("App.vue adapts PrimeVue DatePicker and Select for month and currency and removes legacy elements", () => {
  const content = fs.readFileSync(appVuePath, "utf-8");

  // PrimeVue imports
  assert.match(content, /import\s+DatePicker\s+from\s+["']primevue\/datepicker["']/);
  assert.match(content, /import\s+Select\s+from\s+["']primevue\/select["']/);

  // Month adapter
  assert.match(content, /const\s+selectedMonth\s*=\s*computed/);

  // DatePicker template usage
  assert.match(content, /<DatePicker[^>]*v-model="selectedMonth"/);
  assert.match(content, /inputId="month-input"/);
  assert.match(content, /view="month"/);
  assert.match(content, /dateFormat="mm\/yy"/);

  // Select template usage
  assert.match(content, /<Select[^>]*v-model="store\.currency"/);
  assert.match(content, /inputId="currency-input"/);
  assert.match(content, /:options="store\.currencyOptions"/);
  assert.match(content, /optionDisabled="disabled"/);

  // Labels
  assert.match(content, /<label\s+for="month-input">/);
  assert.match(content, /<label\s+for="currency-input">/);

  // Legacy elements removed
  assert.doesNotMatch(content, /<input\s+type="month"/, "Legacy month input must be removed");
  assert.doesNotMatch(content, /<select\s+v-model="store\.currency"/, "Legacy currency select must be removed");
});
