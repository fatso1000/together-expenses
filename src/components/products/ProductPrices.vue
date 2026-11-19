<template>
  <div class="mt-4 grid gap-3">
    <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
      <label :for="`compare-${product.id}`">{{ t("products.compareSimilar") }}</label>
      <Select
        v-model="compareId"
        :inputId="`compare-${product.id}`"
        :options="compareOptions"
        optionLabel="label"
        optionValue="value"
        fluid
      />
    </div>

    <p v-if="!groups.length" class="text-xs text-muted m-0">
      Save an itemized purchase to start price history.
    </p>

    <section v-for="group in groups" :key="group.family" class="grid gap-2">
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs">
        <span>
          {{ t("products.lowest") }}
          <strong class="block text-sm text-text">
            {{ store.displayMoney(Math.round(group.lowest)) }}/{{ group.label }}
          </strong>
        </span>
        <span>
          {{ t("products.highest") }}
          <strong class="block text-sm text-text">
            {{ store.displayMoney(Math.round(group.highest)) }}/{{ group.label }}
          </strong>
        </span>
      </div>

      <div
        v-for="(row, index) in group.rows"
        :key="`${row.expenseId}-${index}`"
        class="flex items-center justify-between gap-3 py-3 border-b border-[var(--border)] text-xs"
      >
        <div>
          <strong class="text-sm text-text">{{ row.title }}</strong>
          <small class="block text-muted mt-1">{{ row.shop }} · {{ row.date }}</small>
          <small class="block text-muted mt-0.5">
            {{ row.item.quantity }} × {{ row.item.size ?? 1 }} {{ row.item.unit ?? "each" }} · paid
            {{ store.displayMoney(row.paid) }}
          </small>
        </div>
        <strong
          class="text-sm tabular-nums"
          :class="
            row.amount === group.lowest
              ? 'text-[var(--success-colour)]'
              : row.amount > group.lowest * 1.05
                ? 'text-[var(--danger-colour)]'
                : 'text-text'
          "
        >
          {{ store.displayMoney(Math.round(row.amount)) }}/{{ row.label }}
        </strong>
      </div>
    </section>

    <p v-if="groups.length" class="text-xs text-muted m-0">
      Prices after item discounts. Receipt-wide tax/discounts are excluded. Only
      matching measures are compared.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from "vue";
import Select from "primevue/select";
import type { Product, Expense } from "@/lib/types";
import { priceHistory } from "@/lib/products";
import { useExpenses } from "@/stores/expenses";
import { t } from "@/lib/i18n";

const store = useExpenses();
const props = defineProps<{
  product: Product;
  products: Product[];
  expenses: Expense[];
}>();

const compareId = shallowRef("");

const compareOptions = computed(() => [
  { value: "", label: `Only ${props.product.title}` },
  ...props.products
    .filter((value) => value.id !== props.product.id)
    .map((other) => ({ value: other.id, label: other.title })),
]);

const comparisonProduct = computed(() =>
  props.products.find((product) => product.id === compareId.value),
);

const history = computed(() => {
  const primary = priceHistory(props.product, props.expenses).map((row) => ({
    ...row,
    title: props.product.title,
  }));
  const secondary = comparisonProduct.value
    ? priceHistory(comparisonProduct.value, props.expenses).map((row) => ({
        ...row,
        title: comparisonProduct.value!.title,
      }))
    : [];
  return [...primary, ...secondary].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
});

const groups = computed(() => {
  const families = [...new Set(history.value.map((row) => row.family))];
  return families.map((family) => {
    const rows = history.value.filter((row) => row.family === family);
    const lowest = Math.min(...rows.map((row) => row.amount));
    const highest = Math.max(...rows.map((row) => row.amount));
    return { family, label: rows[0].label, lowest, highest, rows };
  });
});
</script>
