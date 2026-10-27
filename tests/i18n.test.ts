import test from "node:test";
import assert from "node:assert/strict";

// Mock localStorage and document for Node.js test environment
const mockStorage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    mockStorage.set(key, String(value));
  },
  removeItem: (key: string) => {
    mockStorage.delete(key);
  },
  clear: () => {
    mockStorage.clear();
  },
};

(globalThis as any).document = {
  documentElement: {
    lang: "en",
  },
};

import { t, setLocale, toggleLocale, useI18n, type Locale } from "../src/lib/i18n.js";
import { isLocalDesktopApp, checkOllamaStatus } from "../src/lib/ollama.js";

test("i18n: translates English strings correctly by default", () => {
  setLocale("en");
  assert.equal(t("nav.overview"), "Overview");
  assert.equal(t("nav.expenses"), "Expenses");
  assert.equal(t("common.addExpense"), "Add expense");
  assert.equal(t("frequent.logPayment"), "Log payment");
  assert.equal(t("frequent.skipPayment"), "Skip payment");
  assert.equal(t("categories_list.Petrol"), "Petrol");
});

test("i18n: switches to Argentinian Spanish and translates authentic vocab", () => {
  setLocale("es");
  const { locale } = useI18n();
  assert.equal(locale.value, "es");

  assert.equal(t("nav.overview"), "Resumen");
  assert.equal(t("nav.expenses"), "Gastos");
  assert.equal(t("common.addExpense"), "Cargar gasto");
  assert.equal(t("frequent.logPayment"), "Registrar pago");
  assert.equal(t("frequent.skipPayment"), "Saltear pago");
  assert.equal(t("accounts.netWorth"), "Total Plata");
  assert.equal(t("categories_list.Petrol"), "Nafta");
  assert.equal(t("categories_list.Groceries"), "Supermercado");
  assert.equal(t("common.darkModeComingSoon"), "¡Modo oscuro próximamente!");
});

test("i18n: interpolates parameters dynamically", () => {
  setLocale("es");
  const skippedMsg = t("frequent.skipSuccess", {
    name: "Edenor Luz",
    date: "2026-11-15",
  });
  assert.equal(skippedMsg, "Se salteó el pago de Edenor Luz. Próximo vencimiento: 2026-11-15");

  setLocale("en");
  const enSkipped = t("frequent.skipSuccess", {
    name: "Gym",
    date: "2026-11-20",
  });
  assert.equal(enSkipped, "Skipped payment for Gym. Next due: 2026-11-20");
});

test("i18n: toggles locale back and forth", () => {
  setLocale("en");
  const next1 = toggleLocale();
  assert.equal(next1, "es");
  assert.equal(t("nav.brand"), "Gastos");

  const next2 = toggleLocale();
  assert.equal(next2, "en");
  assert.equal(t("nav.brand"), "Expenses");
});

test("i18n: fallback to English if key missing in translation", () => {
  setLocale("es");
  // Non-existent key returns key path
  assert.equal(t("non.existent.nested.key"), "non.existent.nested.key");
});

test("ollama: isLocalDesktopApp detects local environment vs hosted app", () => {
  // In Node environment without window, should default to true for tests
  assert.equal(isLocalDesktopApp(), true);

  // Simulate hosted environment on Firebase Hosting
  (globalThis as any).window = {
    location: {
      hostname: "expenses-tracker-fec08.web.app",
      protocol: "https:",
    },
  };

  assert.equal(isLocalDesktopApp(), false);

  // Simulate localhost environment
  (globalThis as any).window = {
    location: {
      hostname: "localhost",
      protocol: "http:",
    },
  };
  assert.equal(isLocalDesktopApp(), true);

  // Clean up window mock
  delete (globalThis as any).window;
});
