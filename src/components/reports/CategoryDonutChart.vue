<template>
  <div class="w-full">
    <div
      v-if="rows.length"
      class="grid grid-cols-1 md:grid-cols-[minmax(220px,280px)_1fr] items-center justify-items-center md:justify-items-stretch gap-4 md:gap-7"
    >
      <div class="relative w-full max-w-[240px] aspect-square">
        <svg viewBox="0 0 200 200" class="w-full h-full" aria-hidden="true">
          <circle
            cx="100"
            cy="100"
            :r="radius"
            fill="transparent"
            stroke="var(--border)"
            stroke-width="26"
          />

          <circle
            v-for="slice in slices"
            :key="slice.category"
            cx="100"
            cy="100"
            :r="radius"
            fill="transparent"
            :stroke="slice.color"
            :stroke-width="hoveredCategory === slice.category ? 32 : 26"
            :stroke-dasharray="slice.strokeDasharray"
            :stroke-dashoffset="slice.strokeDashoffset"
            class="cursor-pointer transition-all duration-200"
            transform="rotate(-90 100 100)"
            @mouseenter="hoveredCategory = slice.category"
            @mouseleave="hoveredCategory = null"
          />
        </svg>

        <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2.5">
          <span class="text-xs font-semibold text-muted max-w-[110px] truncate">
            {{ activeCategory ? activeCategory.category : "Total" }}
          </span>
          <strong class="text-lg font-extrabold text-text tabular-nums my-0.5">
            {{ store.displayMoney(activeCategory ? activeCategory.amount : sum) }}
          </strong>
          <span class="text-[11px] text-muted">
            {{ activeCategory ? `${Math.round(activeCategory.percent)}% of total` : "" }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2.5 w-full">
        <div
          v-for="row in rows"
          :key="row.category"
          class="flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all"
          :style="categorySurfaceStyle(categoryColor(row.category), { selected: hoveredCategory === row.category })"
          @mouseenter="hoveredCategory = row.category"
          @mouseleave="hoveredCategory = null"
        >
          <CategoryIcon :category="row.category" :size="18" bare />
          <div class="flex-1 min-w-0 grid gap-0.5">
            <div class="flex items-baseline justify-between gap-1.5">
              <span class="text-xs font-semibold text-text truncate">{{ row.category }}</span>
              <span class="text-[11px] font-bold text-muted">{{ Math.round(row.percent) }}%</span>
            </div>
            <span class="text-xs text-text tabular-nums">{{ store.displayMoney(row.amount) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="p-8 text-center">
      <p class="text-sm text-muted m-0">No expenses recorded for this period.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useExpenses } from "@/stores/expenses";
import { categoryTotals } from "@/lib/finance";
import {
  categorySurfaceStyle,
  resolveCategoryColor,
} from "@/lib/category-style";
import CategoryIcon from "@/components/CategoryIcon.vue";
import type { Expense } from "@/lib/types";

const props = defineProps<{
  expenses: Expense[];
  currency?: string;
}>();

const store = useExpenses();
const hoveredCategory = shallowRef<string | null>(null);

const rows = computed(() => categoryTotals(props.expenses));
const sum = computed(() => rows.value.reduce((acc, r) => acc + r.amount, 0));

function categoryColor(catName: string): string {
  return resolveCategoryColor(catName, store.categoryDefinitions);
}

const radius = 70;
const circumference = 2 * Math.PI * radius;

const slices = computed(() => {
  let accumulatedPercent = 0;
  return rows.value.map((row) => {
    const strokeDasharray = `${(row.percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += row.percent;
    return {
      category: row.category,
      amount: row.amount,
      percent: row.percent,
      color: categoryColor(row.category),
      strokeDasharray,
      strokeDashoffset,
    };
  });
});

const activeCategory = computed(() => {
  if (hoveredCategory.value) {
    const found = rows.value.find((r) => r.category === hoveredCategory.value);
    if (found) return found;
  }
  return rows.value[0] ?? null;
});
</script>
