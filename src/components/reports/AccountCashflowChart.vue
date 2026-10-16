<script setup lang="ts">
import { computed } from "vue";
import { useExpenses } from "@/stores/expenses";
import { total } from "@/lib/finance";
import type { Expense } from "@/lib/types";

const props = defineProps<{
  expenses: Expense[];
}>();

const store = useExpenses();

const globalSpent = computed(() =>
  total(props.expenses.filter((e) => e.currency === "NZD" && e.accountId !== "nz")),
);

const nzSpent = computed(() =>
  total(props.expenses.filter((e) => e.currency === "NZD" && e.accountId === "nz")),
);

const totalPeriodSpent = computed(() => globalSpent.value + nzSpent.value);

const periodSavings = computed(() => {
  // Filter savings records within dates of current expenses if custom range, or all-time
  return store.savingsRecords.reduce((acc, s) => acc + s.amount, 0);
});

const netPosition = computed(() => periodSavings.value - totalPeriodSpent.value);
const isNetPositive = computed(() => netPosition.value >= 0);

const maxVal = computed(() =>
  Math.max(1, globalSpent.value, periodSavings.value),
);
</script>

<template>
  <div class="cashflow-chart-wrap">
    <!-- Visual Comparison Bars -->
    <div class="cashflow-grid">
      <!-- Outflow / Everyday Global Spend -->
      <article class="flow-card outflow-card">
        <div class="flow-header">
          <span class="flow-title">Global Everyday Outflow</span>
          <strong class="flow-amount">{{ store.displayMoney(globalSpent) }}</strong>
        </div>
        <div class="flow-bar-track">
          <div
            class="flow-bar-fill outflow-fill"
            :style="{ width: `${Math.min(100, (globalSpent / maxVal) * 100)}%` }"
          />
        </div>
        <span class="small muted">Deducted from Global Account</span>
      </article>

      <!-- Inflow / NZ Salary Savings Deposits -->
      <article class="flow-card inflow-card">
        <div class="flow-header">
          <span class="flow-title">NZ Salary Savings Deposits</span>
          <strong class="flow-amount nz-color">{{ store.displayMoney(periodSavings) }}</strong>
        </div>
        <div class="flow-bar-track">
          <div
            class="flow-bar-fill inflow-fill"
            :style="{ width: `${Math.min(100, (periodSavings / maxVal) * 100)}%` }"
          />
        </div>
        <span class="small muted">{{ store.savingsRecords.length }} deposits in NZ Account</span>
      </article>
    </div>

    <!-- Net Cashflow Banner -->
    <div
      class="net-cashflow-banner"
      :class="{ 'pos-banner': isNetPositive, 'neg-banner': !isNetPositive }"
    >
      <div class="banner-content">
        <span class="small">Net Cashflow Position (Savings vs Everyday Spend)</span>
        <strong>
          {{ isNetPositive ? `+${store.displayMoney(netPosition)} Net Savings` : `-${store.displayMoney(Math.abs(netPosition))} Net Drawdown` }}
        </strong>
      </div>
      <span class="flow-subtext small">
        {{
          isNetPositive
            ? "Salary savings are outpacing everyday expenditures."
            : "Everyday purchases exceed current salary savings deposits."
        }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.cashflow-chart-wrap {
  display: grid;
  gap: 14px;
  width: 100%;
}

.cashflow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.flow-card {
  padding: 14px 16px;
  background: #f8faf9;
  border: 1px solid #e1e8e4;
  border-radius: 14px;
  display: grid;
  gap: 8px;
}

.flow-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.flow-title {
  font-size: 13px;
  font-weight: 600;
  color: #556c62;
}

.flow-amount {
  font-size: 18px;
  font-weight: 750;
  color: #153d35;
  font-variant-numeric: tabular-nums;
}

.flow-amount.nz-color {
  color: #1e5239;
}

.flow-bar-track {
  width: 100%;
  height: 10px;
  background: #e1e9e4;
  border-radius: 6px;
  overflow: hidden;
}

.flow-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s ease;
}

.outflow-fill {
  background: #9abfb2;
}

.inflow-fill {
  background: #27ae60;
}

.net-cashflow-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
}

.net-cashflow-banner.pos-banner {
  background: #e8f5ec;
  border: 1px solid #c2e5cf;
  color: #1a5637;
}

.net-cashflow-banner.neg-banner {
  background: #fdf5f4;
  border: 1px solid #f6c8c2;
  color: #8c2a1c;
}

.banner-content {
  display: grid;
  gap: 2px;
}

.banner-content strong {
  font-size: 16px;
}

.flow-subtext {
  font-weight: 500;
}
</style>
