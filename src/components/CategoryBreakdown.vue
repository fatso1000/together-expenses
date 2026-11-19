<template>
  <div class="grid gap-4">
    <div v-for="row in rows" :key="row.category" class="flex items-center gap-3">
      <CategoryIcon :category="row.category" />
      <div class="flex-1 min-w-0">
        <div class="flex justify-between gap-2 text-xs sm:text-sm mb-1.5">
          <strong class="font-medium text-text">{{ categoryLabel(row.category) }}</strong>
          <span class="text-text tabular-nums">{{ store.displayMoney(row.amount) }}</span>
        </div>
        <div class="w-full h-1 rounded bg-[var(--surface-card)] overflow-hidden">
          <span
            class="block h-full rounded bg-[var(--success-colour)]"
            :style="{ width: `${row.percent}%` }"
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
import { categoryTotals } from "@/lib/finance";
import { useI18n } from "@/lib/i18n";
import type { Expense } from "@/lib/types";

const store = useExpenses();
const { t, categoryLabel } = useI18n();
const props = defineProps<{ expenses: Expense[]; currency: string }>();
const rows = computed(() => categoryTotals(props.expenses));
</script>
