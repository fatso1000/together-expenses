import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "@/App.vue";
import Dashboard from "@/views/Dashboard.vue";
import Expenses from "@/views/Expenses.vue";
import Reports from "@/views/Reports.vue";
import AiChat from "@/views/AiChat.vue";
import Products from "@/views/Products.vue";
import Shops from "@/views/Shops.vue";
import Settings from "@/views/Settings.vue";
import AccountsSettings from "@/views/settings/AccountsSettings.vue";
import CategoriesSettings from "@/views/settings/CategoriesSettings.vue";
import FrequentPaymentsSettings from "@/views/settings/FrequentPaymentsSettings.vue";
import AiSettings from "@/views/settings/AiSettings.vue";
import DataSettings from "@/views/settings/DataSettings.vue";
import { i18nPlugin } from "@/lib/i18n";
import "@/styles.css";
import PrimeVue from "primevue/config";
import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";
import { DrawerPreset } from "@/theme";

const ExpensesTheme = definePreset(Aura, {
  ...DrawerPreset,
  semantic: {
    typography: {
      fontFamily: "'Meiryo UI', Meiryo, sans-serif",
    },
  },
});

export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior() {
    return { top: 0, left: 0 };
  },
  routes: [
    {
      path: "/",
      component: Dashboard,
      meta: { titleKey: "nav.overview", title: "Overview" },
    },
    {
      path: "/expenses",
      component: Expenses,
      meta: { titleKey: "nav.expenses", title: "Expenses" },
    },
    {
      path: "/reports",
      component: Reports,
      meta: { titleKey: "nav.reports", title: "Reports" },
    },
    {
      path: "/chat",
      component: AiChat,
      meta: { titleKey: "nav.aiChat", title: "AI Chat" },
    },
    {
      path: "/products",
      component: Products,
      meta: { titleKey: "nav.products", title: "Products" },
    },
    {
      path: "/shops",
      component: Shops,
      meta: { titleKey: "nav.shops", title: "Shops" },
    },
    {
      path: "/settings",
      component: Settings,
      meta: { titleKey: "settings.title", title: "Settings" },
    },
    {
      path: "/settings/accounts",
      component: AccountsSettings,
      meta: { titleKey: "nav.settingsAccounts", title: "Accounts & Salary" },
    },
    {
      path: "/settings/categories",
      component: CategoriesSettings,
      meta: { titleKey: "nav.settingsCategories", title: "Categories" },
    },
    {
      path: "/settings/frequent",
      component: FrequentPaymentsSettings,
      meta: { titleKey: "nav.settingsFrequent", title: "Frequent Payments" },
    },
    {
      path: "/settings/ai",
      component: AiSettings,
      meta: { titleKey: "nav.settingsAi", title: "AI Settings" },
    },
    {
      path: "/settings/data",
      component: DataSettings,
      meta: { titleKey: "nav.settingsData", title: "Data & Backup" },
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
router.afterEach((to) => {
  document.title = `${to.meta.title} · Expenses`;
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
});
const app = createApp(App);

app.use(PrimeVue, {
  theme: {
    preset: ExpensesTheme,
    options: {
      darkModeSelector: ".p-dark",
    },
  },
  license: import.meta.env.VITE_PRIMEVUE_LICENSE,
});
app.use(createPinia());
app.use(router);
app.use(i18nPlugin);
app.mount("#app");
