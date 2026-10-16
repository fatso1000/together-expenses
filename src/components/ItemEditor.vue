<script setup lang="ts">
import { shallowRef } from "vue";
import { Plus } from "lucide-vue-next";
import type { ItemInput, Product, Expense } from "@/lib/types";
import { priceHistory } from "@/lib/products";
import PurchaseItemRow from "@/components/products/PurchaseItemRow.vue";
const props = defineProps<{
  items: ItemInput[];
  products: Product[];
  expenses: Expense[];
  excludeExpenseId?: string;
}>();
const emit = defineEmits<{ "update:items": [items: ItemInput[]] }>();
const selected = shallowRef("");
function update(item: ItemInput) {
  emit(
    "update:items",
    props.items.map((value) => (value.id === item.id ? item : value)),
  );
}
function remove(id: string) {
  emit(
    "update:items",
    props.items.filter((item) => item.id !== id),
  );
}
function add(product?: Product) {
  const last = product
    ? priceHistory(product, props.expenses)[0]?.item
    : undefined;
  emit("update:items", [
    ...props.items,
    {
      id: crypto.randomUUID(),
      title: product?.title ?? "",
      productId: product?.id,
      price: last ? (last.unitPrice / 100).toFixed(2) : "",
      quantity: "1",
      size: String(last?.size ?? 1),
      unit: last?.unit ?? product?.unit ?? "each",
      discount: "",
    },
  ]);
  selected.value = "";
}
function useSaved() {
  const product = props.products.find(
    (product) => product.id === selected.value,
  );
  if (product) add(product);
}
</script>
<template>
  <div class="items-editor">
    <div v-if="products.length" class="saved-picker">
      <label
        >Saved product<select v-model="selected">
          <option value="">Choose a product</option>
          <option
            v-for="product in products"
            :key="product.id"
            :value="product.id"
          >
            {{ product.title }}
          </option>
        </select></label
      >
      <button
        type="button"
        class="secondary"
        :disabled="!selected || items.length >= 200"
        @click="useSaved"
      >
        <Plus :size="18" />Add
      </button>
    </div>
    <PurchaseItemRow
      v-for="(item, index) in items"
      :key="item.id"
      :item="item"
      :index="index"
      :products="products"
      :expenses="expenses"
      :exclude-expense-id="excludeExpenseId"
      @change="update"
      @remove="remove(item.id)"
    />
    <button
      type="button"
      class="secondary wide"
      :disabled="items.length >= 200"
      @click="add()"
    >
      <Plus :size="18" />Add item
    </button>
  </div>
</template>
