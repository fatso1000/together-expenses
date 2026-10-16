<script setup lang="ts">
import { useExpenses } from "@/stores/expenses";
import { computed } from "vue";
import { money, total } from "@/lib/finance";
import type { Expense } from "@/lib/types";
const store = useExpenses();
const props = defineProps<{
  expenses: Expense[];
  month: string;
  currency: string;
}>();
const weeks = computed(() =>
  [0, 1, 2, 3, 4]
    .map((index) => {
      const start = index * 7 + 1;
      const [year, month] = props.month.split("-").map(Number);
      const end = Math.min(start + 6, new Date(year, month, 0).getDate());
      const amount = total(
        props.expenses.filter((expense) => {
          const day = Number(expense.date.slice(-2));
          return (
            expense.date.startsWith(props.month) && day >= start && day <= end
          );
        }),
      );
      return { label: `${start}–${end}`, amount, valid: start <= end };
    })
    .filter((week) => week.valid),
);
const maximum = computed(() =>
  Math.max(1, ...weeks.value.map((week) => week.amount)),
);
</script>
<template>
  <div
    class="trend-chart"
    role="img"
    :aria-label="
      weeks
        .map((week) => `Days ${week.label}: ${store.displayMoney(week.amount)}`)
        .join('; ')
    "
  >
    <div v-for="week in weeks" :key="week.label" class="chart-column">
      <span class="bar-value">{{ store.displayMoney(week.amount) }}</span>
      <div class="bar-space">
        <div
          class="chart-bar"
          :style="{
            height: `${Math.max(week.amount ? 3 : 0, (week.amount / maximum) * 100)}%`,
          }"
        />
      </div>
      <span class="bar-label">{{ week.label }}</span>
    </div>
  </div>
  <p class="small muted chart-caption">Day of month · {{ currency }}</p>
</template>
