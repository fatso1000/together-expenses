<template>
  <div class="grid gap-2.5">
    <div
      v-for="row in rows"
      :key="row.category"
      class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border"
      :style="categorySurfaceStyle(resolveCategoryColor(row.category, store.categoryDefinitions))"
    >
      <CategoryIcon :category="row.category" :size="19" bare />
      <div class="flex-1 min-w-0">
        <div class="flex justify-between gap-2 text-xs sm:text-sm mb-1.5">
          <strong class="font-medium text-text">{{ categoryLabel(row.category) }}</strong>
          <span class="text-text tabular-nums">{{ store.displayMoney(row.amount) }}</span>
        </div>
        <div class="w-full h-1 rounded bg-[var(--border)] overflow-hidden">
          <span
            class="block h-full rounded"
            :style="{
              width: `${row.percent}%`,
              backgroundColor: resolveCategoryColor(row.category, store.categoryDefinitions),
            }"
          />
        </div>
      </div>
      <span class="text-xs text-muted w-8 text-right tabular-nums">
        {{ Math.round(row.percent) }}%
      </span>
    </div>
    <p v-if="!rows.length" class="text-sm text-muted m-0">
      {{ t("categories.breakdownEmpty") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useExpenses } from "@/stores/expenses";
import { computed } from "vue";
import CategoryIcon from "@/components/CategoryIcon.vue";
import {
  categorySurfaceStyle,
  resolveCategoryColor,
} from "@/lib/category-style";
import { categoryTotals } from "@/lib/finance";
import { useI18n } from "@/lib/i18n";
import type { Expense } from "@/lib/types";

const store = useExpenses();
const { t, categoryLabel } = useI18n();
const props = defineProps<{ expenses: Expense[]; currency: string }>();
const rows = computed(() => categoryTotals(props.expenses));
</script>
