<template>
  <div class="settings-hub flex flex-col gap-4">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <RouterLink
        v-for="section in settingsSections"
        :key="section.path"
        :to="section.path"
        class="flex items-center gap-4 p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-accent hover:-translate-y-0.5 transition-all text-inherit no-underline group shadow-sm"
      >
        <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-black/20 text-accent shrink-0">
          <component :is="section.icon" :size="24" />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-base font-semibold m-0 mb-1 text-text">{{ section.title }}</h3>
          <p class="text-xs text-muted m-0 leading-relaxed">{{ section.description }}</p>
        </div>
        <ChevronRight class="shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-text" :size="20" />
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
} from "lucide-vue-next";
import { t } from "@/lib/i18n";

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
