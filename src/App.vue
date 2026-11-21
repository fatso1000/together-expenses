<template>
  <OnboardingFlow
    v-if="store.showOnboarding"
    :background-style="appBackgroundStyle"
  />
  <SidebarLayout v-else class="max-h-svh relative!" :style="appBackgroundStyle">
    <Sidebar
      id="menu-demo"
      :variant="isMobile ? 'sidebar' : 'inset'"
      :collapsible="isMobile ? 'offcanvas' : 'icon'"
      :overlay="isMobile"
      v-model:open="open"
    >
      <SidebarSpacer />
      <SidebarAside>
        <SidebarPanel
          :class="isMobile ? 'bg-[var(--surface-drawer)]!' : 'bg-transparent!'"
        >
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
                        class="inline-flex w-full items-center gap-2 overflow-hidden whitespace-nowrap"
                      >
                        <component :is="item.icon" :size="20" class="shrink-0" />
                        <span class="truncate">{{ item.label }}</span>
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
                        class="inline-flex w-full items-center gap-2 overflow-hidden whitespace-nowrap"
                      >
                        <component :is="item.icon" :size="20" class="shrink-0" />
                        <span class="truncate">{{ item.label }}</span>
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

    <SidebarMain class="overflow-hidden bg-black/40! border border-white/8">
      <div class="workspace-scroll flex-1 overflow-y-auto flex flex-col px-4 pb-4 gap-4">
        <div
          class="page-heading sticky top-0 z-10 -mx-4 px-4 py-3.5 backdrop-blur-md bg-[var(--p-sidebar-main-inset-background)]/90 border-b border-[var(--border)] flex items-center justify-between gap-4"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <SidebarTrigger
              target="menu-demo"
              variant="text"
              severity="secondary"
              :aria-label="sidebarToggleLabel"
              :title="sidebarToggleLabel"
              class="shrink-0"
            >
              <PanelLeftClose v-if="open" :size="20" />
              <PanelLeftOpen v-else :size="20" />
            </SidebarTrigger>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight m-0 truncate">
              {{ pageHeading }}
            </h1>
          </div>
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
import { useRoute, useRouter, RouterLink } from "vue-router";
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-vue-next";
import ExpenseForm from "@/components/ExpenseForm.vue";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow.vue";
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
import SidebarTrigger from "primevue/sidebartrigger";

const store = useExpenses();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const isMobile = ref(false);
const open = ref(true);

const GRAIN_SVG_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='0.075'/%3E%3C/svg%3E";

const appBackgroundStyle: Record<string, string> = {
  "--p-sidebar-layout-background": "transparent",
  "--p-sidebar-main-inset-background": "#16201d",
  backgroundColor: "#1c2220",
  backgroundImage: [
    `url("${GRAIN_SVG_DATA_URI}")`,
    "radial-gradient(circle at 14% 12%, rgba(216, 224, 220, 0.16) 0%, transparent 46%)",
    "radial-gradient(circle at 86% 16%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 52%)",
    "radial-gradient(circle at 76% 88%, color-mix(in srgb, var(--green) 18%, transparent) 0%, transparent 56%)",
    "radial-gradient(circle at 24% 82%, rgba(164, 176, 170, 0.13) 0%, transparent 50%)",
    "linear-gradient(135deg, #28302d 0%, #1f2724 38%, #182420 72%, #141a18 100%)",
  ].join(", "),
  backgroundRepeat: "repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat",
  backgroundSize: "160px 160px, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%",
};

const sidebarToggleLabel = computed(() =>
  open.value ? t("nav.collapseSidebar") : t("nav.expandSidebar"),
);
let mql: MediaQueryList | null = null;
let onMqlChange: ((event: MediaQueryListEvent) => void) | null = null;

onMounted(() => {
  if (
    store.pendingConnection &&
    !store.showOnboarding &&
    route.path !== "/settings/data"
  ) {
    void router.replace("/settings/data");
  }
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
