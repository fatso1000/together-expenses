<template>
  <div class="grid gap-3.5 w-full">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <!-- Outflow / Everyday Global Spend -->
      <article class="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border)] grid gap-2">
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-xs font-semibold text-muted">Global Everyday Outflow</span>
          <strong class="text-lg font-bold tabular-nums text-text">
            {{ store.displayMoney(globalSpent) }}
          </strong>
        </div>
        <div class="w-full h-2.5 rounded-md bg-[var(--border)] overflow-hidden">
          <div
            class="h-full rounded-md bg-muted transition-[width] duration-300"
            :style="{ width: `${Math.min(100, (globalSpent / maxVal) * 100)}%` }"
          />
        </div>
        <span class="text-xs text-muted">Deducted from Global Account</span>
      </article>

      <!-- Inflow / NZ Salary Savings Deposits -->
      <article class="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border)] grid gap-2">
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-xs font-semibold text-muted">NZ Salary Savings Deposits</span>
          <strong class="text-lg font-bold tabular-nums text-accent">
            {{ store.displayMoney(periodSavings) }}
          </strong>
        </div>
        <div class="w-full h-2.5 rounded-md bg-[var(--border)] overflow-hidden">
          <div
            class="h-full rounded-md bg-[var(--success-colour)] transition-[width] duration-300"
            :style="{ width: `${Math.min(100, (periodSavings / maxVal) * 100)}%` }"
          />
        </div>
        <span class="text-xs text-muted">{{ store.savingsRecords.length }} deposits in NZ Account</span>
      </article>
    </div>

    <!-- Net Cashflow Banner -->
    <div
      class="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 rounded-xl border"
      :class="
        isNetPositive
          ? 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-colour)]'
          : 'bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger-colour)]'
      "
    >
      <div class="grid gap-0.5">
        <span class="text-xs">Net Cashflow Position (Savings vs Everyday Spend)</span>
        <strong class="text-base font-bold">
          {{
            isNetPositive
              ? `+${store.displayMoney(netPosition)} Net Savings`
              : `-${store.displayMoney(Math.abs(netPosition))} Net Drawdown`
          }}
        </strong>
      </div>
      <span class="text-xs font-medium">
        {{
          isNetPositive
            ? "Salary savings are outpacing everyday expenditures."
            : "Everyday purchases exceed current salary savings deposits."
        }}
      </span>
    </div>
  </div>
</template>

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

const periodSavings = computed(() =>
  store.savingsRecords.reduce((acc, s) => acc + s.amount, 0),
);

const netPosition = computed(() => periodSavings.value - totalPeriodSpent.value);
const isNetPositive = computed(() => netPosition.value >= 0);

const maxVal = computed(() =>
  Math.max(1, globalSpent.value, periodSavings.value),
);
</script>
