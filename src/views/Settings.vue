<template>
  <div class="settings-hub flex flex-col gap-3.5 sm:gap-4">
    <div class="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm">
      <div class="flex items-center gap-3 min-w-0">
        <div class="flex items-center justify-center w-9 h-9 rounded-xl bg-black/25 border border-white/6 text-accent shrink-0">
          <Languages :size="18" />
        </div>
        <div class="min-w-0">
          <span class="block text-sm font-semibold text-text truncate">{{ t("common.toggleLanguage") }}</span>
          <span class="block text-xs text-muted">{{ locale === "en" ? "English" : "Español (Argentina)" }}</span>
        </div>
      </div>
      <Button
        type="button"
        severity="secondary"
        variant="outlined"
        size="small"
        rounded
        class="inline-flex items-center gap-1.5 shrink-0"
        @click="switchLanguage"
      >
        <span class="uppercase font-semibold">{{ locale }}</span>
      </Button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
      <RouterLink
        v-for="section in settingsSections"
        :key="section.path"
        :to="section.path"
        class="flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-accent hover:-translate-y-0.5 transition-all text-inherit no-underline group shadow-sm"
      >
        <div class="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-black/25 border border-white/6 text-accent shrink-0">
          <component :is="section.icon" :size="22" />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm sm:text-base font-semibold m-0 mb-0.5 text-text">{{ section.title }}</h3>
          <p class="text-xs text-muted m-0 leading-relaxed line-clamp-2">{{ section.description }}</p>
        </div>
        <ChevronRight class="shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-text" :size="18" />
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import {
  Wallet,
  Tags,
  CalendarClock,
  Sparkles,
  Database,
  ChevronRight,
  Languages,
} from "lucide-vue-next";
import Button from "primevue/button";
import { useExpenses } from "@/stores/expenses";
import { useI18n } from "@/lib/i18n";

const store = useExpenses();
const { t, locale, toggleLocale } = useI18n();

function switchLanguage() {
  toggleLocale();
  store.message = t("common.languageChanged");
}

interface SettingsCard {
  title: string;
  description: string;
  path: string;
  icon: any;
}

const settingsSections = computed<SettingsCard[]>(() => [
  {
    title: t("settings.accountsSetup"),
    description: t("settings.accountsDescription"),
    path: "/settings/accounts",
    icon: Wallet,
  },
  {
    title: t("settings.categories"),
    description: "Manage categories, icons, colors, and transaction associations.",
    path: "/settings/categories",
    icon: Tags,
  },
  {
    title: t("frequent.title"),
    description: t("frequent.subtitle"),
    path: "/settings/frequent",
    icon: CalendarClock,
  },
  {
    title: t("ollama.title"),
    description: t("ollama.description"),
    path: "/settings/ai",
    icon: Sparkles,
  },
  {
    title: t("nav.settingsData"),
    description: "Cloud sync across devices, JSON backup exports, imports, and reset options.",
    path: "/settings/data",
    icon: Database,
  },
]);
</script>
