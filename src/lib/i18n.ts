import { ref, computed, type App } from "vue";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

export type Locale = "en" | "es";

export const SUPPORTED_LOCALES: Locale[] = ["en", "es"];
export const DEFAULT_LOCALE: Locale = "en";
const STORAGE_KEY = "expenses-locale";

type TranslationTree = Record<string, any>;

const translations: Record<Locale, TranslationTree> = {
  en,
  es,
};

function detectInitialLocale(): Locale {
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && SUPPORTED_LOCALES.includes(stored)) {
        return stored;
      }
    }
    if (typeof navigator !== "undefined" && navigator.language) {
      if (navigator.language.toLowerCase().startsWith("es")) {
        return "es";
      }
    }
  } catch {
    // Fall back to default
  }
  return DEFAULT_LOCALE;
}

const currentLocale = ref<Locale>(detectInitialLocale());

function resolveKey(tree: TranslationTree, path: string): string | undefined {
  const parts = path.split(".");
  let current: any = tree;
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== "object") {
      return undefined;
    }
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function t(path: string, params?: Record<string, string | number>): string {
  const activeTree = translations[currentLocale.value];
  let text = resolveKey(activeTree, path);

  if (text === undefined && currentLocale.value !== "en") {
    // Fallback to English
    text = resolveKey(translations.en, path);
  }

  if (text === undefined) {
    return path;
  }

  if (params) {
    return text.replace(/\{(\w+)\}/g, (_, key) => {
      return key in params ? String(params[key]) : `{${key}}`;
    });
  }

  return text;
}

export function setLocale(locale: Locale): void {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  currentLocale.value = locale;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, locale);
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  } catch {}
}

export function toggleLocale(): Locale {
  const next = currentLocale.value === "en" ? "es" : "en";
  setLocale(next);
  return next;
}

export function useI18n() {
  return {
    locale: currentLocale,
    t,
    setLocale,
    toggleLocale,
  };
}

export const i18nPlugin = {
  install(app: App) {
    app.config.globalProperties.$t = t;
    app.config.globalProperties.$locale = currentLocale;
  },
};
