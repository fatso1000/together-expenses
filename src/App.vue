<script setup lang="ts">
import { watch, computed } from "vue";
import { useRoute } from "vue-router";
import { useRegisterSW } from "virtual:pwa-register/vue";
import {
  LayoutDashboard,
  Receipt,
  ChartNoAxesCombined,
  Settings,
  Plus,
  Store,
  Scale,
  X,
  Languages,
  Sparkles,
} from "lucide-vue-next";
import ExpenseForm from "@/components/ExpenseForm.vue";
import { useExpenses } from "@/stores/expenses";
import { useI18n } from "@/lib/i18n";
import DatePicker from "primevue/datepicker";
import Select from 'primevue/select';

const store = useExpenses();
const route = useRoute();
const { locale, t, toggleLocale } = useI18n();

const navigation = computed(() => [
  { path: "/", label: t("nav.overview"), icon: LayoutDashboard },
  { path: "/expenses", label: t("nav.expenses"), icon: Receipt },
  { path: "/reports", label: t("nav.reports"), icon: ChartNoAxesCombined },
  { path: "/chat", label: t("nav.aiChat"), icon: Sparkles },
  { path: "/products", label: t("nav.products"), icon: Scale },
  { path: "/shops", label: t("nav.shops"), icon: Store },
  { path: "/settings", label: t("nav.settings"), icon: Settings },
]);

const pageHeading = computed(() => {
  const key = route.meta.titleKey as string | undefined;
  if (key) return t(key);
  return (route.meta.title as string) || t("nav.overview");
});

function onToggleLocale() {
  toggleLocale();
  store.message = t("common.languageChanged");
}

watch(
  () => route.path,
  () => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
    if (typeof document !== "undefined") {
      const workspace = document.querySelector(".workspace");
      if (workspace) {
        workspace.scrollTop = 0;
        workspace.scrollLeft = 0;
      }
    }
  },
);

const { needRefresh, updateServiceWorker } = useRegisterSW();
watch(
  () => store.message,
  (value, _, cleanup) => {
    if (!value) return;
    const timer = setTimeout(() => {
      store.message = "";
    }, 3500);
    cleanup(() => clearTimeout(timer));
  },
);

const selectedMonth = computed<Date | null>({
  get() {
    if (!store.month) return null;
    const parts = store.month.split("-");
    if (parts.length < 2) return null;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null;
    return new Date(year, month - 1, 1);
  },
  set(val: Date | null) {
    if (val instanceof Date && !isNaN(val.getTime())) {
      const year = val.getFullYear();
      const monthNumber = val.getMonth() + 1;
      const formattedMonth = String(monthNumber).padStart(2, "0");
      store.month = `${year}-${formattedMonth}`;
    } else {
      store.month = new Date().toLocaleDateString("en-CA").slice(0, 7);
    }
  },
});
</script>

<template>
  <div class="app-layout">
    <aside class="sidebar">
      <RouterLink class="brand pb-4" to="/">{{ t("nav.brand") }}</RouterLink>
      <nav aria-label="Main navigation">
        <RouterLink
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          :aria-label="item.label"
          :class="{ active: route.path === item.path }"
        >
          <component :is="item.icon" :size="20" /><span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>
    <main class="workspace">
      <div class="page-heading">
        <h1>{{ pageHeading }}</h1>
        <div class="header-actions">
          <button
            type="button"
            class="quick-action-pill lang-toggle-btn"
            :title="t('common.toggleLanguage')"
            :aria-label="t('common.toggleLanguage')"
            @click="onToggleLocale"
          >
            <Languages :size="15" />
            <span class="lang-code">{{ locale.toUpperCase() }}</span>
          </button>

          <button class="primary add-expense" @click="store.openExpense()">
            <Plus :size="19" />{{ t("common.addExpense") }}
          </button>
        </div>
      </div>
      <div
        v-if="
          !['/settings', '/shops', '/products', '/chat'].includes(route.path)
        "
        class="period-toolbar"
      >
        <div>
          <label for="month-input">{{ t("common.month") }}</label>
          <DatePicker
            v-model="selectedMonth"
            view="month"
            inputId="month-input"
            dateFormat="mm/yy"
            :manualInput="false"
          />
        </div>
        <div>
          <label for="currency-input">{{ t("common.display") }}</label>
          <Select
            v-model="store.currency"
            inputId="currency-input"
            :options="store.currencyOptions"
            optionLabel="label"
            optionValue="value"
            optionDisabled="disabled"
            aria-label="View currency"
          />
        </div>
      </div>
      <p v-if="store.currency === 'USD'" class="small rate-note">
        {{ store.rates.status }} · {{ store.rates.date }} · 1 NZD =
        {{ store.rates.rate }} USD
        <button class="text-button" @click="store.rates.refresh">
          {{ t("common.refreshRate") }}
        </button>
      </p>
      <RouterLink
        v-if="!store.syncConnected"
        class="small sync-link"
        to="/settings"
        >{{
          store.syncKey ? store.syncStatus : t("common.connectDevices")
        }}</RouterLink
      >
      <div v-if="store.error" class="error-note" role="alert">
        {{ store.error }}
      </div>
      <p
        v-if="store.expenses.some((expense) => expense.currency === 'USD')"
        class="error-note"
      >
        {{ t("common.currencyExcludedNotice") }}
        <button class="text-button" @click="store.migrateUSD">
          {{ t("common.convertWithRate") }}
        </button>
      </p>
      <RouterView />
    </main>
    <ExpenseForm
      v-if="store.editor"
      :key="store.editor === 'new' ? 'new' : store.editor.id"
      :expense="store.editor === 'new' ? undefined : store.editor"
      @close="
        store.editor = null;
        store.repeat = null;
      "
    />
    <div v-if="store.message" class="toast" role="status">
      {{ store.message }}
      <button
        class="icon-button"
        aria-label="Dismiss notification"
        @click="store.message = ''"
      >
        <X :size="16" />
      </button>
    </div>
    <div v-if="needRefresh" class="update-prompt" role="status">
      {{ t("common.updateAvailable") }}
      <button
        class="secondary"
        :disabled="!!store.editor"
        @click="updateServiceWorker()"
      >
        {{ t("common.update") }}
      </button>
    </div>
  </div>
</template>
