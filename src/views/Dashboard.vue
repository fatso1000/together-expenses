<template>
  <div
    class="grid grid-cols-3 gap-2 sm:gap-2.5 mb-5"
    data-testid="quick-entry-actions"
  >
    <RectangleButton
      :icon="Bolt"
      :label="t('dashboard.quickAmount')"
      iconPos="top"
      fluid
      severity="secondary"
      variant="outlined"
      @click="store.openExpense('quick')"
    />
    <RectangleButton
      :icon="Plus"
      :label="t('dashboard.addItems')"
      iconPos="top"
      fluid
      severity="secondary"
      variant="outlined"
      @click="store.openExpense('items')"
    />
    <RectangleButton
      :icon="Receipt"
      :label="t('dashboard.scanReceipt')"
      iconPos="top"
      fluid
      severity="primary"
      @click="store.openExpense('receipt')"
    />
  </div>

  <!-- Compact Weekly Limit Alert when Exceeded -->
  <div
    v-if="isOverWeeklyLimit"
    class="flex items-center gap-2 px-3.5 py-2.5 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-300 mb-3"
    role="alert"
  >
    <AlertCircle :size="16" class="shrink-0 text-red-400" />
    <span>
      {{
        t("dashboard.overWeeklyLimit", {
          amount: store.displayMoney(store.weekTotal - store.weeklyLimit),
        })
      }}
    </span>
  </div>

  <!-- Weekly limit & structured budgets prominent position -->
  <WeeklyLimit />

  <!-- Accounts & Total Money Overview (Positioned below Weekly Spending Limit) -->
  <AccountsOverview />

  <!-- Frequent Payments & Bills -->
  <FrequentPayments />

  <!-- AI Money Advisor (Local Gemma Intelligence - Available only in Local Desktop App) -->
  <AiMoneyAdvisor v-if="isLocalDesktopApp()" />

  <section
    class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 mb-5"
    :aria-label="t('dashboard.monthlySummary')"
  >
    <Card class="highlighted col-span-2 sm:col-span-1">
      <template #subtitle>
        {{ t("dashboard.thisMonthSimple") }} · {{ store.currency }}
      </template>
      <template #content>
        <span class="text-3xl sm:text-4xl font-bold font-heading">
          {{ store.displayMoney(store.monthTotal) }}
        </span>
      </template>
    </Card>
    <Card>
      <template #subtitle>
        {{ t("dashboard.expensesCount") }}
      </template>
      <template #content>
        <span class="text-xl sm:text-2xl font-bold font-heading">
          {{ store.monthExpenses.length }}
        </span>
      </template>
    </Card>
    <Card>
      <template #subtitle>
        {{ t("dashboard.previousMonth") }}
      </template>
      <template #content>
        <span class="text-xl sm:text-2xl font-bold font-heading">
          {{ store.displayMoney(lastTotal) }}
        </span>
      </template>
    </Card>
  </section>

  <div class="space-y-3.5 sm:space-y-4">
    <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-5 md:p-6 shadow-sm space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base font-bold text-text m-0">{{ t("dashboard.recentExpenses") }}</h2>
        <RouterLink
          to="/expenses"
          class="inline-flex items-center gap-0.5 text-xs font-semibold text-accent no-underline hover:underline"
        >
          <span>{{ t("dashboard.viewAllExpenses") }}</span>
          <ChevronRight :size="14" />
        </RouterLink>
      </div>
      <ExpenseList :expenses="store.monthExpenses.slice(0, 5)" compact />
    </section>

    <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-5 md:p-6 shadow-sm space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base font-bold text-text m-0">{{ t("dashboard.byCategory") }}</h2>
        <RouterLink
          to="/reports"
          class="inline-flex items-center gap-0.5 text-xs font-semibold text-accent no-underline hover:underline"
        >
          <span>{{ t("nav.reports") }}</span>
          <ChevronRight :size="14" />
        </RouterLink>
      </div>
      <CategoryBreakdown
        :expenses="store.monthExpenses"
        :currency="store.currency"
      />
    </section>

    <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-5 md:p-6 shadow-sm space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base font-bold text-text m-0">{{ t("dashboard.weeklySpending") }}</h2>
        <RouterLink
          to="/reports"
          class="inline-flex items-center gap-0.5 text-xs font-semibold text-accent no-underline hover:underline"
        >
          <span>{{ t("nav.reports") }}</span>
          <ChevronRight :size="14" />
        </RouterLink>
      </div>
      <TrendChart
        :expenses="store.monthExpenses"
        :month="store.month"
        :currency="store.currency"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useExpenses } from "@/stores/expenses";
import { total, previousMonth } from "@/lib/finance";
import { isLocalDesktopApp } from "@/lib/ollama";
import { t } from "@/lib/i18n";
import ExpenseList from "@/components/ExpenseList.vue";
import CategoryBreakdown from "@/components/CategoryBreakdown.vue";
import WeeklyLimit from "@/components/WeeklyLimit.vue";
import AccountsOverview from "@/components/AccountsOverview.vue";
import FrequentPayments from "@/components/FrequentPayments.vue";
import AiMoneyAdvisor from "@/components/AiMoneyAdvisor.vue";
import { AlertCircle, ChevronRight } from "lucide-vue-next";
import TrendChart from "@/components/TrendChart.vue";
import Plus from "@primeicons/vue/plus";
import Receipt from "@primeicons/vue/receipt";
import Bolt from "@primeicons/vue/bolt";
import RectangleButton from "@/components/inputs/RectangleButton.vue";
import Card from "primevue/card";

const store = useExpenses();
const lastTotal = computed(() =>
  total(
    store.currencyExpenses.filter((item) =>
      item.date.startsWith(previousMonth(store.month)),
    ),
  ),
);

const isOverWeeklyLimit = computed(
  () => store.weeklyLimit > 0 && store.weekTotal >= store.weeklyLimit,
);
</script>
