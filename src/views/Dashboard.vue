<script setup lang="ts">
import { computed } from "vue";
import { useExpenses } from "@/stores/expenses";
import { money, total, previousMonth } from "@/lib/finance";
import ExpenseList from "@/components/ExpenseList.vue";
import CategoryBreakdown from "@/components/CategoryBreakdown.vue";
import WeeklyLimit from "@/components/WeeklyLimit.vue";
import AccountsOverview from "@/components/AccountsOverview.vue";
import FrequentPayments from "@/components/FrequentPayments.vue";
import { Zap, ListPlus, ScanLine, AlertCircle } from "lucide-vue-next";
import TrendChart from "@/components/TrendChart.vue";

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

<template>
  <div class="quick-entry-actions">
    <button class="secondary" @click="store.openExpense('quick')">
      <Zap :size="20" />Quick amount
    </button>
    <button class="secondary" @click="store.openExpense('items')">
      <ListPlus :size="20" />Add items
    </button>
    <button class="secondary" @click="store.openExpense('receipt')">
      <ScanLine :size="20" />Scan receipt
    </button>
  </div>

  <!-- Accounts & Total Money Overview -->
  <AccountsOverview />

  <!-- Prominent Top Limit Alert when Exceeded -->
  <div v-if="isOverWeeklyLimit" class="top-limit-alert" role="alert">
    <AlertCircle :size="22" class="alert-icon" />
    <div class="alert-body">
      <strong>Weekly limit exceeded by {{ store.displayMoney(store.weekTotal - store.weeklyLimit) }}</strong>
      <p class="small">
        You've spent {{ store.displayMoney(store.weekTotal) }} of your {{ store.displayMoney(store.weeklyLimit) }} weekly limit for {{ store.weekStart }}–{{ store.weekEnd }}.
      </p>
    </div>
  </div>

  <!-- Weekly limit & structured budgets prominent position -->
  <WeeklyLimit />

  <!-- Frequent Payments & Bills -->
  <FrequentPayments />

  <section class="report-stats" aria-label="Monthly summary">
    <article class="total-card">
      <span>This month · {{ store.currency }}</span>
      <strong class="hero-number">{{
        store.displayMoney(store.monthTotal)
      }}</strong>
    </article>
    <article class="panel">
      <span class="muted">Expenses</span>
      <strong>{{ store.monthExpenses.length }}</strong>
    </article>
    <article class="panel">
      <span class="muted">Previous month</span>
      <strong>{{ store.displayMoney(lastTotal) }}</strong>
    </article>
  </section>

  <section class="panel">
    <h2>Recent expenses</h2>
    <ExpenseList :expenses="store.monthExpenses.slice(0, 5)" compact />
  </section>

  <section class="panel">
    <h2>By category</h2>
    <CategoryBreakdown
      :expenses="store.monthExpenses"
      :currency="store.currency"
    />
  </section>

  <section class="panel">
    <h2>Weekly spending</h2>
    <TrendChart
      :expenses="store.monthExpenses"
      :month="store.month"
      :currency="store.currency"
    />
  </section>
</template>

<style scoped>
.top-limit-alert {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: #fdf0ee;
  border: 2px solid #ea7e6f;
  border-radius: 16px;
  color: #8c2a1c;
  box-shadow: 0 4px 16px rgba(160, 62, 48, 0.15);
}

.top-limit-alert .alert-icon {
  flex-shrink: 0;
  color: #a03e30;
}

.alert-body {
  display: grid;
  gap: 2px;
}

.alert-body strong {
  font-size: 15px;
}

.alert-body p {
  color: #7d3326;
  margin: 0;
}
</style>
