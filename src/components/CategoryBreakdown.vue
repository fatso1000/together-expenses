<script setup lang="ts">
import { useExpenses } from "@/stores/expenses";
import { computed } from "vue";
import CategoryIcon from "@/components/CategoryIcon.vue";
import { categoryTotals, money } from "@/lib/finance";
import { useI18n } from "@/lib/i18n";
import type { Expense } from "@/lib/types";

const store = useExpenses();
const { t, categoryLabel } = useI18n();
const props = defineProps<{ expenses: Expense[]; currency: string }>();
const rows = computed(() => categoryTotals(props.expenses));
</script>
<template>
  <div class="category-breakdown">
    <div v-for="row in rows" :key="row.category" class="category-row">
      <CategoryIcon :category="row.category" />
      <div class="category-detail">
        <div>
          <strong>{{ categoryLabel(row.category) }}</strong
          ><span>{{ store.displayMoney(row.amount) }}</span>
        </div>
        <div class="track"><span :style="{ width: `${row.percent}%` }" /></div>
      </div>
      <span class="category-percent">{{ Math.round(row.percent) }}%</span>
    </div>
    <p v-if="!rows.length" class="muted">
      {{ t('categories.breakdownEmpty') }}
    </p>
  </div>
</template>
