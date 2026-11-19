<template>
  <div>
    <div
      class="h-48 flex items-stretch gap-3 sm:gap-4 px-1 pt-1.5 border-b border-[var(--border)] bg-[repeating-linear-gradient(to_top,transparent_0,transparent_44px,var(--border)_44px,var(--border)_45px)]"
      role="img"
      :aria-label="
        weeks
          .map((week) => `Days ${week.label}: ${store.displayMoney(week.amount)}`)
          .join('; ')
      "
    >
      <div
        v-for="(week, idx) in weeks"
        :key="week.label"
        class="flex flex-col flex-1 text-center min-w-0"
      >
        <span class="text-[10px] sm:text-xs text-muted h-6 truncate">
          {{ store.displayMoney(week.amount) }}
        </span>
        <div class="flex-1 flex items-end justify-center">
          <div
            class="w-[65%] min-w-3 rounded-t-md transition-[height] duration-200"
            :class="idx % 2 === 1 ? 'bg-[var(--green)]' : 'bg-accent'"
            :style="{
              height: `${Math.max(week.amount ? 3 : 0, (week.amount / maximum) * 100)}%`,
            }"
          />
        </div>
        <span class="text-[11px] sm:text-xs text-muted mt-2">
          {{ week.label }}
        </span>
      </div>
    </div>
    <p class="text-center text-xs text-muted mt-2 m-0">Day of month · {{ currency }}</p>
  </div>
</template>

<script setup lang="ts">
import { useExpenses } from "@/stores/expenses";
import { computed } from "vue";
import { total } from "@/lib/finance";
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
