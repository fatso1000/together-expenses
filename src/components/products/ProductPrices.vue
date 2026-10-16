<script setup lang="ts">
import { computed, shallowRef } from "vue";
import type { Product, Expense } from "@/lib/types";
import { priceHistory } from "@/lib/products";
import { useExpenses } from "@/stores/expenses";
const store = useExpenses();
const props = defineProps<{
  product: Product;
  products: Product[];
  expenses: Expense[];
}>();
const compareId = shallowRef("");
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
<template>
  <div class="product-prices">
    <label
      >Compare with a similar product<select v-model="compareId">
        <option value="">Only {{ product.title }}</option>
        <option
          v-for="other in products.filter((value) => value.id !== product.id)"
          :key="other.id"
          :value="other.id"
        >
          {{ other.title }}
        </option>
      </select></label
    >
    <p v-if="!groups.length" class="small muted">
      Save an itemized purchase to start price history.
    </p>
    <section v-for="group in groups" :key="group.family" class="price-group">
      <div class="price-range">
        <span
          >Lowest
          <strong
            >{{ store.displayMoney(Math.round(group.lowest)) }}/{{
              group.label
            }}</strong
          ></span
        ><span
          >Highest
          <strong
            >{{ store.displayMoney(Math.round(group.highest)) }}/{{
              group.label
            }}</strong
          ></span
        >
      </div>
      <div
        v-for="(row, index) in group.rows"
        :key="`${row.expenseId}-${index}`"
        class="price-observation"
      >
        <div>
          <strong>{{ row.title }}</strong
          ><small>{{ row.shop }} · {{ row.date }}</small
          ><small
            >{{ row.item.quantity }} × {{ row.item.size ?? 1 }}
            {{ row.item.unit ?? "each" }} · paid
            {{ store.displayMoney(row.paid) }}</small
          >
        </div>
        <strong
          :class="{
            cheapest: row.amount === group.lowest,
            expensive: row.amount > group.lowest * 1.05,
          }"
          >{{ store.displayMoney(Math.round(row.amount)) }}/{{
            row.label
          }}</strong
        >
      </div>
    </section>
    <p v-if="groups.length" class="small muted">
      Prices after item discounts. Receipt-wide tax/discounts are excluded. Only
      matching measures are compared.
    </p>
  </div>
</template>
<style scoped>
.product-prices {
  margin-top: 16px;
}
.price-range {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background: #f0f5f1;
  border-radius: 12px;
  font-size: 12px;
}
.price-range strong,
.price-observation small {
  display: block;
}
.price-observation {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #edf0ed;
  font-size: 13px;
}
.price-observation small {
  color: #66766d;
  margin-top: 4px;
}
.cheapest {
  color: #28643c;
}
.expensive {
  color: #a34023;
}
</style>
