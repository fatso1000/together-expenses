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

  <!-- Compact Weekly Limit Alert when Exceeded -->
  <div v-if="isOverWeeklyLimit" class="compact-limit-alert" role="alert">
    <AlertCircle :size="16" class="alert-icon" />
    <span>
      Weekly limit exceeded by <strong>{{ store.displayMoney(store.weekTotal - store.weeklyLimit) }}</strong>
    </span>
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
.compact-limit-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #fdf2f0;
  border: 1px solid #f0a89d;
  border-radius: 10px;
  color: #9a2b1c;
  font-size: 13px;
}

.compact-limit-alert .alert-icon {
  flex-shrink: 0;
  color: #bf3f2e;
}

.compact-limit-alert strong {
  font-weight: 700;
  color: #832012;
}
</style>
