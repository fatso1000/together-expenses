<script setup lang="ts">
import { watch } from "vue";
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
} from "lucide-vue-next";
import ExpenseForm from "@/components/ExpenseForm.vue";
import { useExpenses } from "@/stores/expenses";
const store = useExpenses();
const route = useRoute();
const navigation = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/expenses", label: "Expenses", icon: Receipt },
  { path: "/reports", label: "Reports", icon: ChartNoAxesCombined },
  { path: "/products", label: "Products", icon: Scale },
  { path: "/settings", label: "Data", icon: Settings },
];
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
</script>
<template>
  <div class="app-layout">
    <aside class="sidebar">
      <RouterLink class="brand" to="/">Expenses</RouterLink>
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
        <h1>{{ route.meta.title }}</h1>
        <button class="primary add-expense" @click="store.openExpense()">
          <Plus :size="19" />Add expense
        </button>
      </div>
      <div
        v-if="!['/settings', '/shops', '/products'].includes(route.path)"
        class="period-toolbar"
      >
        <label
          >Month<input
            type="month"
            v-model="store.month"
            required
            @change="
              !store.month &&
              (store.month = new Date().toLocaleDateString('en-CA').slice(0, 7))
            "
        /></label>
        <label
          >Display<select v-model="store.currency" aria-label="View currency">
            <option value="NZD">NZD</option>
            <option value="USD" :disabled="!store.rates.rate">USD</option>
          </select></label
        >
      </div>
      <p v-if="store.currency === 'USD'" class="small rate-note">
        {{ store.rates.status }} · {{ store.rates.date }} · 1 NZD =
        {{ store.rates.rate }} USD
        <button class="text-button" @click="store.rates.refresh">
          Refresh rate
        </button>
      </p>
      <RouterLink
        v-if="!store.syncConnected"
        class="small sync-link"
        to="/settings"
        >{{
          store.syncKey ? store.syncStatus : "Connect your devices"
        }}</RouterLink
      >
      <div v-if="store.error" class="error-note" role="alert">
        {{ store.error }}
      </div>
      <p
        v-if="store.expenses.some((expense) => expense.currency === 'USD')"
        class="error-note"
      >
        Some older USD records await conversion and are excluded from NZD
        totals.
        <button class="text-button" @click="store.migrateUSD">
          Convert with latest rate
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
      Update available
      <button
        class="secondary"
        :disabled="!!store.editor"
        @click="updateServiceWorker()"
      >
        Update
      </button>
    </div>
  </div>
</template>
