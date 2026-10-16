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
import "@/styles.css";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: Dashboard, meta: { title: "Overview" } },
    { path: "/expenses", component: Expenses, meta: { title: "Expenses" } },
    { path: "/reports", component: Reports, meta: { title: "Reports" } },
    { path: "/products", component: Products, meta: { title: "Products" } },
    { path: "/shops", component: Shops, meta: { title: "Shops" } },
    { path: "/settings", component: Settings, meta: { title: "Data" } },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
router.afterEach((to) => {
  document.title = `${to.meta.title} · Expenses`;
});
createApp(App).use(createPinia()).use(router).mount("#app");
