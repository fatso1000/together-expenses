<template>
  <div class="w-full">
    <div v-if="varianceRows.length" class="grid gap-3">
      <div
        v-for="row in varianceRows"
        :key="row.category"
        class="p-3.5 rounded-xl border grid gap-2"
        :class="
          row.isOver
            ? 'bg-[var(--danger-bg)] border-[var(--danger-border)]'
            : ''
        "
        :style="
          row.isOver
            ? undefined
            : categorySurfaceStyle(resolveCategoryColor(row.category, store.categoryDefinitions))
        "
      >
        <div class="flex items-center justify-between gap-2.5">
          <div class="flex items-center gap-2 text-sm text-text">
            <CategoryIcon :category="row.category" :size="18" bare />
            <strong>{{ categoryLabel(row.category) }}</strong>
          </div>
          <Tag
            :value="
              row.isOver
                ? `+${store.displayMoney(row.diff)} ${t('weeklyLimit.overBudget', { amount: '' }).trim()}`
                : `${store.displayMoney(row.diff)} ${t('weeklyLimit.leftBudget', { amount: '' }).trim()}`
            "
            :severity="row.isOver ? 'danger' : 'success'"
          />
        </div>

        <div class="w-full h-2.5 rounded-md bg-[var(--border)] overflow-hidden">
          <div
            class="h-full rounded-md transition-[width] duration-300 ease-out"
            :class="row.isOver ? 'bg-[var(--danger-colour)]' : 'bg-[var(--success-colour)]'"
            :style="{ width: `${row.percent}%` }"
          />
        </div>

        <div class="flex justify-between text-xs text-muted">
          <span>
            {{ t("weeklyLimit.spent") }}: <strong class="text-text">{{ store.displayMoney(row.spent) }}</strong>
          </span>
          <span>
            {{ t("weeklyLimit.limit") }}: <strong class="text-text">{{ store.displayMoney(row.allocated) }}</strong>
          </span>
        </div>
      </div>
    </div>

    <div v-else class="p-6 text-center">
      <p class="text-xs text-muted m-0">
        {{ t("reports.configureLimitsPrompt") }} <strong>{{ t("weeklyLimit.title") }}</strong>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Tag from "primevue/tag";
import { useExpenses } from "@/stores/expenses";
import { total } from "@/lib/finance";
import type { Expense } from "@/lib/types";
import {
  categorySurfaceStyle,
  resolveCategoryColor,
} from "@/lib/category-style";
import CategoryIcon from "@/components/CategoryIcon.vue";
import { useI18n } from "@/lib/i18n";

const props = defineProps<{
  expenses: Expense[];
  multiplier?: number;
  periodTitle?: string;
}>();

const store = useExpenses();
const { t, categoryLabel } = useI18n();

const varianceRows = computed(() => {
  const mult = props.multiplier ?? 1;
  const limits = store.categoryLimits;
  if (!limits.length) return [];

  return limits.map((lim) => {
    const allocated = Math.round(lim.amount * mult);
    const spent = total(
      props.expenses.filter(
        (e) =>
          e.currency === "NZD" &&
          e.category.toLowerCase() === lim.category.toLowerCase(),
      ),
    );
    const diff = allocated - spent;
    const isOver = spent > allocated;
    const percent = allocated > 0 ? (spent / allocated) * 100 : 0;

    return {
      category: lim.category,
      allocated,
      spent,
      diff: Math.abs(diff),
      isOver,
      percent: Math.min(100, percent),
      rawPercent: percent,
    };
  });
});
</script>
