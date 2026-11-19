<template>
  <div
    v-if="comparison"
    class="flex items-start gap-2.5 p-3 rounded-xl text-xs"
    :class="
      comparison.level === 'high'
        ? 'bg-[var(--danger-bg)] text-[var(--danger-colour)]'
        : comparison.level === 'low'
          ? 'bg-[var(--success-bg)] text-[var(--success-colour)]'
          : 'bg-[var(--surface)] text-muted'
    "
    :data-level="comparison.level"
    role="status"
  >
    <TrendingUp v-if="comparison.level === 'high'" :size="18" class="shrink-0" />
    <TrendingDown v-else-if="comparison.level === 'low'" :size="18" class="shrink-0" />
    <Minus v-else :size="18" class="shrink-0" />
    <div>
      <strong class="block">{{ label }}</strong>
      <small class="block mt-1">
        {{ money(Math.round(comparison.amount)) }}/{{ comparison.label }} ·
        average {{ money(Math.round(comparison.average)) }}/{{ comparison.label }}
        · {{ comparison.count }} past purchases
      </small>
    </div>
  </div>
  <p v-else-if="product" class="text-xs text-muted m-0">
    No comparable purchases yet for this measure.
  </p>
</template>

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
