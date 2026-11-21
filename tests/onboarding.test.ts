import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emptyData } from "../src/lib/storage.ts";
import {
  hasAppData,
  shouldShowInitialOnboarding,
} from "../src/lib/onboarding.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("hasAppData returns false for completely empty install", () => {
  assert.equal(hasAppData(emptyData()), false);
});

test("hasAppData returns true when any user record or configuration is present", () => {
  assert.equal(
    hasAppData({
      ...emptyData(),
      expenses: [
        {
          id: "e1",
          amount: 1500,
          currency: "NZD",
          category: "Groceries",
          merchant: "Market",
          note: "",
          date: "2026-11-20",
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    }),
    true,
  );

  assert.equal(
    hasAppData({
      ...emptyData(),
      weeklyLimit: 50000,
    }),
    true,
  );

  assert.equal(
    hasAppData({
      ...emptyData(),
      accounts: {
        globalInitialNZD: 100000,
        nzInitialNZD: 0,
      },
    }),
    true,
  );

  assert.equal(
    hasAppData({
      ...emptyData(),
      salary: {
        weeklyAverageNZD: 120000,
        payDayOfWeek: 1,
      },
    }),
    true,
  );

  assert.equal(
    hasAppData({
      ...emptyData(),
      customCategories: [
        { id: "c1", name: "Fitness", icon: "Dumbbell", color: "#3b7a57" },
      ],
    }),
    true,
  );

  assert.equal(
    hasAppData({
      ...emptyData(),
      frequentPayments: [
        {
          id: "fp1",
          name: "Rent",
          amount: 35000,
          frequency: "weekly",
          category: "Rent",
          accountId: "global",
          active: true,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    }),
    true,
  );
});

test("shouldShowInitialOnboarding shows only on fresh, unconnected, uncompleted install", () => {
  const blank = emptyData();

  // Brand-new install -> show onboarding
  assert.equal(
    shouldShowInitialOnboarding({
      data: blank,
      syncKey: "",
      syncConnected: false,
      completedFlag: false,
    }),
    true,
  );

  // Already connected via stored syncKey (even with empty local data) -> never show
  assert.equal(
    shouldShowInitialOnboarding({
      data: blank,
      syncKey: "a".repeat(64),
      syncConnected: false,
      completedFlag: false,
    }),
    false,
  );

  // Actively syncConnected -> never show
  assert.equal(
    shouldShowInitialOnboarding({
      data: blank,
      syncKey: "",
      syncConnected: true,
      completedFlag: false,
    }),
    false,
  );

  // Existing local data -> never show
  assert.equal(
    shouldShowInitialOnboarding({
      data: { ...blank, weeklyLimit: 40000 },
      syncKey: "",
      syncConnected: false,
      completedFlag: false,
    }),
    false,
  );

  // Previously completed/skipped onboarding -> never show
  assert.equal(
    shouldShowInitialOnboarding({
      data: blank,
      syncKey: "",
      syncConnected: false,
      completedFlag: true,
    }),
    false,
  );
});

test("en.json and es.json maintain full parity for onboarding and sync keys", () => {
  const en = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../src/locales/en.json"), "utf-8"),
  );
  const es = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../src/locales/es.json"), "utf-8"),
  );

  assert.ok(en.onboarding, "en.onboarding must exist");
  assert.ok(es.onboarding, "es.onboarding must exist");

  function collectLeafKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    const keys: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      const next = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        keys.push(...collectLeafKeys(v as Record<string, unknown>, next));
      } else {
        keys.push(next);
      }
    }
    return keys.sort();
  }

  assert.deepEqual(
    collectLeafKeys(es.onboarding),
    collectLeafKeys(en.onboarding),
    "es.onboarding and en.onboarding must have identical key sets",
  );

  assert.deepEqual(
    collectLeafKeys(es.sync),
    collectLeafKeys(en.sync),
    "es.sync and en.sync must have identical key sets",
  );
});

test("App.vue mounts OnboardingFlow and DeviceSync uses DatabaseConnectCard & canonical /settings/data link", () => {
  const appContent = fs.readFileSync(
    path.resolve(__dirname, "../src/App.vue"),
    "utf-8",
  );
  const deviceSyncContent = fs.readFileSync(
    path.resolve(__dirname, "../src/components/data/DeviceSync.vue"),
    "utf-8",
  );

  assert.match(appContent, /import\s+OnboardingFlow\s+from/);
  assert.match(appContent, /<OnboardingFlow\b[^>]*v-if="store\.showOnboarding"/);
  assert.match(deviceSyncContent, /import\s+DatabaseConnectCard\s+from/);
  assert.match(deviceSyncContent, /buildPrivateSyncLink/);
});
