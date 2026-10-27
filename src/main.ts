import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "@/App.vue";
import Dashboard from "@/views/Dashboard.vue";
import Expenses from "@/views/Expenses.vue";
import Reports from "@/views/Reports.vue";
import Products from "@/views/Products.vue";
import Shops from "@/views/Shops.vue";
import Settings from "@/views/Settings.vue";
import { i18nPlugin } from "@/lib/i18n";
import "@/styles.css";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: Dashboard, meta: { titleKey: "nav.overview", title: "Overview" } },
    { path: "/expenses", component: Expenses, meta: { titleKey: "nav.expenses", title: "Expenses" } },
    { path: "/reports", component: Reports, meta: { titleKey: "nav.reports", title: "Reports" } },
    { path: "/products", component: Products, meta: { titleKey: "nav.products", title: "Products" } },
    { path: "/shops", component: Shops, meta: { titleKey: "nav.shops", title: "Shops" } },
    { path: "/settings", component: Settings, meta: { titleKey: "nav.settings", title: "Data" } },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
router.afterEach((to) => {
  document.title = `${to.meta.title} · Expenses`;
});
createApp(App).use(createPinia()).use(router).use(i18nPlugin).mount("#app");
