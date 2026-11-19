<template>
  <SidebarLayout class="max-h-svh relative!">
    <Sidebar
      id="menu-demo"
      variant="inset"
      :collapsible="isMobile ? 'offcanvas' : 'icon'"
      :overlay="isMobile"
      v-model:open="open"
    >
      <SidebarSpacer />
      <SidebarAside>
        <SidebarPanel>
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <img
                  src="/icon.svg"
                  class="h-full w-full max-w-16"
                  alt="App Icon"
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem v-for="item in navigation" :key="item.path">
                    <SidebarMenuButton :is-active="currentTab === item.path">
                      <RouterLink
                        :to="item.path"
                        :aria-label="item.label"
                        :class="{ active: currentTab === item.path }"
                        class="inline-flex w-full items-center gap-2"
                      >
                        <component :is="item.icon" :size="20" />
                        <span>{{ item.label }}</span>
                      </RouterLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup class="mt-3">
              <SidebarGroupLabel>
                <span>{{ t("nav.settingsGroup") }}</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem
                    v-for="item in settingsNavigation"
                    :key="item.path"
                  >
                    <SidebarMenuButton :is-active="currentTab === item.path">
                      <RouterLink
                        :to="item.path"
                        :aria-label="item.label"
                        :class="{ active: currentTab === item.path }"
                        class="inline-flex w-full items-center gap-2"
                      >
                        <component :is="item.icon" :size="20" />
                        <span>{{ item.label }}</span>
                      </RouterLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </SidebarPanel>
      </SidebarAside>
    </Sidebar>

    <SidebarMain class="overflow-hidden">
      <div class="workspace-scroll flex-1 overflow-y-auto flex flex-col px-4 pb-4 gap-4">
        <div
          class="page-heading sticky top-0 z-10 -mx-4 px-4 py-3.5 backdrop-blur-md bg-[var(--p-sidebar-main-inset-background)]/90 border-b border-[var(--border)] flex items-center justify-between gap-4"
        >
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight m-0">
            {{ pageHeading }}
          </h1>
          <div class="flex items-center gap-2">
            <Button class="add-expense" @click="store.openExpense()">
              <Plus :size="19" />
              <span>{{ t("common.addExpense") }}</span>
            </Button>
          </div>
        </div>

        <div
          v-if="
            !route.path.startsWith('/settings') &&
            !['/shops', '/products', '/chat'].includes(route.path)
          "
          class="inline-flex flex-wrap gap-3"
        >
          <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
            <label for="month-input">{{ t("common.month") }}</label>
            <DatePicker
              v-model="selectedMonth"
              view="month"
              inputId="month-input"
              dateFormat="mm/yy"
              :manualInput="false"
            />
          </div>
          <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
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

        <p
          v-if="store.currency === 'USD'"
          class="text-xs text-muted flex flex-wrap items-center gap-2 m-0"
        >
          <span>
            {{ store.rates.status }} · {{ store.rates.date }} · 1 NZD =
            {{ store.rates.rate }} USD
          </span>
          <Button
            type="button"
            variant="link"
            size="small"
            class="p-0! h-auto!"
            @click="store.rates.refresh"
          >
            {{ t("common.refreshRate") }}
          </Button>
        </p>

        <RouterLink
          v-if="!store.syncConnected"
          class="inline-flex w-fit items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--success-bg)] border border-[var(--success-border)] text-accent text-xs font-semibold no-underline"
          to="/settings/data"
        >
          {{ store.syncKey ? store.syncStatus : t("common.connectDevices") }}
        </RouterLink>

        <Message v-if="store.error" severity="error" :closable="false">
          {{ store.error }}
        </Message>

        <Message
          v-if="store.expenses.some((expense) => expense.currency === 'USD')"
          severity="warn"
          :closable="false"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span>{{ t("common.currencyExcludedNotice") }}</span>
            <Button
              type="button"
              variant="link"
              size="small"
              class="p-0! h-auto!"
              @click="store.migrateUSD"
            >
              {{ t("common.convertWithRate") }}
            </Button>
          </div>
        </Message>

        <RouterView />
      </div>

      <ExpenseForm
        v-if="store.editor"
        :key="store.editor === 'new' ? 'new' : store.editor.id"
        :expense="store.editor === 'new' ? undefined : store.editor"
        @close="
          store.editor = null;
          store.repeat = null;
        "
      />

      <div
        v-if="store.message"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border)] shadow-lg text-sm max-w-[calc(100%-30px)]"
        role="status"
      >
        <span>{{ store.message }}</span>
        <Button
          type="button"
          variant="text"
          severity="secondary"
          rounded
          size="small"
          aria-label="Dismiss notification"
          @click="store.message = ''"
        >
          <X :size="16" />
        </Button>
      </div>

      <div
        v-if="needRefresh"
        class="fixed bottom-5 right-5 z-20 grid gap-2.5 p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border)] shadow-lg text-sm"
        role="status"
      >
        <span>{{ t("common.updateAvailable") }}</span>
        <Button
          type="button"
          severity="secondary"
          size="small"
          :disabled="!!store.editor"
          @click="updateServiceWorker()"
        >
          {{ t("common.update") }}
        </Button>
      </div>
    </SidebarMain>
  </SidebarLayout>
</template>

<script setup lang="ts">
import { watch, computed, ref, onMounted, onBeforeUnmount } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { useRegisterSW } from "virtual:pwa-register/vue";
import {
  LayoutDashboard,
  Receipt,
  ChartNoAxesCombined,
  Plus,
  Store,
  Scale,
  X,
  Sparkles,
  Wallet,
  Tags,
  CalendarClock,
  Bot,
  Database,
} from "lucide-vue-next";
import ExpenseForm from "@/components/ExpenseForm.vue";
import { useExpenses } from "@/stores/expenses";
import { useI18n } from "@/lib/i18n";
import DatePicker from "primevue/datepicker";
import Select from "primevue/select";
import Button from "primevue/button";
import Message from "primevue/message";
import SidebarLayout from "primevue/sidebarlayout";
import SidebarMain from "primevue/sidebarmain";
import Sidebar from "primevue/sidebar";
import SidebarSpacer from "primevue/sidebarspacer";
import SidebarAside from "primevue/sidebaraside";
import SidebarPanel from "primevue/sidebarpanel";
import SidebarHeader from "primevue/sidebarheader";
import SidebarContent from "primevue/sidebarcontent";
import SidebarGroup from "primevue/sidebargroup";
import SidebarGroupLabel from "primevue/sidebargrouplabel";
import SidebarGroupContent from "primevue/sidebargroupcontent";
import SidebarMenu from "primevue/sidebarmenu";
import SidebarMenuItem from "primevue/sidebarmenuitem";
import SidebarMenuButton from "primevue/sidebarmenubutton";
import SidebarRail from "primevue/sidebarrail";

const store = useExpenses();
const route = useRoute();
const { t } = useI18n();

const isMobile = ref(false);
const open = ref(true);
let mql: MediaQueryList | null = null;
let onMqlChange: ((event: MediaQueryListEvent) => void) | null = null;

onMounted(() => {
  if (typeof window === "undefined" || !window.matchMedia) return;
  mql = window.matchMedia("(max-width: 1023px)");
  isMobile.value = mql.matches;
  open.value = !isMobile.value;
  onMqlChange = (event: MediaQueryListEvent) => {
    isMobile.value = event.matches;
    open.value = !event.matches;
  };
  mql.addEventListener("change", onMqlChange);
});

onBeforeUnmount(() => {
  if (mql && onMqlChange) {
    mql.removeEventListener("change", onMqlChange);
  }
});

const currentTab = computed(() => route.path);

const navigation = computed(() => [
  { path: "/", label: t("nav.overview"), icon: LayoutDashboard },
  { path: "/expenses", label: t("nav.expenses"), icon: Receipt },
  { path: "/reports", label: t("nav.reports"), icon: ChartNoAxesCombined },
  { path: "/chat", label: t("nav.aiChat"), icon: Sparkles },
  { path: "/products", label: t("nav.products"), icon: Scale },
  { path: "/shops", label: t("nav.shops"), icon: Store },
]);

const settingsNavigation = computed(() => [
  { path: "/settings/accounts", label: t("nav.settingsAccounts"), icon: Wallet },
  { path: "/settings/categories", label: t("nav.settingsCategories"), icon: Tags },
  { path: "/settings/frequent", label: t("nav.settingsFrequent"), icon: CalendarClock },
  { path: "/settings/ai", label: t("nav.settingsAi"), icon: Bot },
  { path: "/settings/data", label: t("nav.settingsData"), icon: Database },
]);

const pageHeading = computed(() => {
  const key = route.meta.titleKey as string | undefined;
  if (key) return t(key);
  return (route.meta.title as string) || t("nav.overview");
});

watch(
  () => route.path,
  () => {
    if (isMobile.value) {
      open.value = false;
    }
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
    if (typeof document !== "undefined") {
      const workspace = document.querySelector(".workspace-scroll, .workspace");
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
