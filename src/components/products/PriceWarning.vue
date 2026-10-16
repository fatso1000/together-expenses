<script setup lang="ts">
import { computed } from "vue";
import { TrendingDown, TrendingUp, Minus } from "lucide-vue-next";
import type { PurchaseItem, Product, Expense } from "@/lib/types";
import { comparePrice } from "@/lib/products";
import { money } from "@/lib/finance";
const props = defineProps<{
  item: PurchaseItem | null;
  product?: Product;
  expenses: Expense[];
  excludeExpenseId?: string;
}>();
const comparison = computed(() =>
  props.item
    ? comparePrice(
        props.item,
        props.product,
        props.expenses,
        props.excludeExpenseId,
      )
    : null,
);
const label = computed(() => {
  if (!comparison.value) return "";
  if (comparison.value.level === "high")
    return `Higher price · ${Math.round(comparison.value.percent)}% above your average`;
  if (comparison.value.level === "low")
    return `Cheaper · ${Math.round(Math.abs(comparison.value.percent))}% below your average`;
  return "Typical price · within 5% of your average";
});
</script>
<template>
  <div
    v-if="comparison"
    class="comparison-warning"
    :data-level="comparison.level"
    role="status"
  >
    <TrendingUp v-if="comparison.level === 'high'" :size="18" /><TrendingDown
      v-else-if="comparison.level === 'low'"
      :size="18"
    /><Minus v-else :size="18" />
    <div>
      <strong>{{ label }}</strong
      ><small
        >{{ money(Math.round(comparison.amount)) }}/{{ comparison.label }} ·
        average {{ money(Math.round(comparison.average)) }}/{{
          comparison.label
        }}
        · {{ comparison.count }} past purchases</small
      >
    </div>
  </div>
  <p v-else-if="product" class="small muted">
    No comparable purchases yet for this measure.
  </p>
</template>
<style scoped>
.comparison-warning {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: #f0f3f1;
  color: #43584d;
}
.comparison-warning[data-level="high"] {
  background: #fff0e8;
  color: #a34023;
}
.comparison-warning[data-level="low"] {
  background: #e8f5eb;
  color: #28643c;
}
.comparison-warning small {
  display: block;
  margin-top: 5px;
}
.comparison-warning svg {
  flex-shrink: 0;
}
</style>
