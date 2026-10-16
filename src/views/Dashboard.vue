<script setup lang="ts">
import { computed } from "vue";
import { useExpenses } from "@/stores/expenses";
import { money, total, previousMonth } from "@/lib/finance";
import ExpenseList from "@/components/ExpenseList.vue";
import CategoryBreakdown from "@/components/CategoryBreakdown.vue";
import WeeklyLimit from "@/components/WeeklyLimit.vue";
import { Zap, ListPlus, ScanLine } from "lucide-vue-next";
import TrendChart from "@/components/TrendChart.vue";
const store = useExpenses();
const lastTotal = computed(() =>
  total(
    store.currencyExpenses.filter((item) =>
      item.date.startsWith(previousMonth(store.month)),
    ),
  ),
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
  <section class="report-stats" aria-label="Monthly summary">
    <article class="total-card">
      <span>This month · {{ store.currency }}</span
      ><strong class="hero-number">{{
        store.displayMoney(store.monthTotal)
      }}</strong>
    </article>
    <article class="panel">
      <span class="muted">Expenses</span
      ><strong>{{ store.monthExpenses.length }}</strong>
    </article>
    <article class="panel">
      <span class="muted">Previous month</span
      ><strong>{{ store.displayMoney(lastTotal) }}</strong>
    </article>
  </section>
  <WeeklyLimit />
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
