import { test as base, expect, type Page } from "@playwright/test";
import { createMockAppData } from "./test-data";
import type { AppData } from "@/lib/types";

export const STORAGE_KEY = "daily-expenses-v1";
export const THEME_KEY = "expenses-theme";
export const LOCALE_KEY = "expenses-locale";
export const RATE_KEY = "nzd-usd-rate";

export interface AppFixture {
  page: Page;
  seedStorage: (data?: AppData) => Promise<void>;
  getStoredData: () => Promise<AppData | null>;
  clearStorage: () => Promise<void>;
  setTheme: (theme: "light" | "dark") => Promise<void>;
  setLocale: (locale: "en" | "es") => Promise<void>;
  goto: (path?: string) => Promise<void>;
}

export const test = base.extend<{
  app: AppFixture;
}>({
  app: async ({ page }, use) => {
    // Intercept currency rates API to ensure fast, deterministic tests
    await page.route("**/api.frankfurter.dev/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rate: 0.62,
          date: "2026-10-28",
        }),
      });
    });

    // Intercept local Ollama calls
    await page.route("**/11434/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/api/tags")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            models: [{ name: "gemma4:e4b", size: 4000000000 }],
          }),
        });
      } else if (url.includes("/api/generate")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            response: JSON.stringify({
              merchant: "Mock Mart",
              date: "2026-10-28",
              total: 25.5,
              items: [{ title: "Apple", price: 2.5, quantity: 1 }],
            }),
            done: true,
          }),
        });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
      }
    });

    const seedStorage = async (data?: AppData) => {
      const initial = data ?? createMockAppData();
      try {
        await page.evaluate(
          ({ storageKey, dataJson, rateKey }) => {
            window.sessionStorage.setItem("__seeded__", "true");
            window.localStorage.setItem(storageKey, dataJson);
            window.localStorage.setItem(
              rateKey,
              JSON.stringify({ rate: 0.62, date: "2026-10-28" }),
            );
          },
          {
            storageKey: STORAGE_KEY,
            dataJson: JSON.stringify(initial),
            rateKey: RATE_KEY,
          },
        );
      } catch {
        // Page has not navigated yet
      }

      await page.addInitScript(
        ({ storageKey, dataJson, rateKey }) => {
          if (!window.sessionStorage.getItem("__seeded__")) {
            window.sessionStorage.setItem("__seeded__", "true");
            window.localStorage.setItem(storageKey, dataJson);
            window.localStorage.setItem(
              rateKey,
              JSON.stringify({ rate: 0.62, date: "2026-10-28" }),
            );
          }
        },
        {
          storageKey: STORAGE_KEY,
          dataJson: JSON.stringify(initial),
          rateKey: RATE_KEY,
        },
      );
    };

    const getStoredData = async (): Promise<AppData | null> => {
      return await page.evaluate((key) => {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      }, STORAGE_KEY);
    };

    const clearStorage = async () => {
      await page.evaluate(() => window.localStorage.clear());
    };

    const setTheme = async (theme: "light" | "dark") => {
      await page.addInitScript(
        ({ themeKey, value }) => {
          window.localStorage.setItem(themeKey, value);
          document.documentElement.setAttribute("data-theme", value);
        },
        { themeKey: THEME_KEY, value: theme },
      );
    };

    const setLocale = async (locale: "en" | "es") => {
      await page.addInitScript(
        ({ localeKey, value }) => {
          window.localStorage.setItem(localeKey, value);
        },
        { localeKey: LOCALE_KEY, value: locale },
      );
    };

    const goto = async (path = "/") => {
      let cleanPath = path;
      if (cleanPath.startsWith("/#")) {
        cleanPath = cleanPath.slice(2);
      } else if (cleanPath.startsWith("#")) {
        cleanPath = cleanPath.slice(1);
      }
      const routePath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
      await page.goto(`/#${routePath}`);
      await page.waitForLoadState("domcontentloaded");
    };

    await use({
      page,
      seedStorage,
      getStoredData,
      clearStorage,
      setTheme,
      setLocale,
      goto,
    });
  },
});

export { expect };
