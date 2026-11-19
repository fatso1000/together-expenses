<template>
  <div class="grid gap-3">
    <div v-if="products.length" class="flex items-end gap-2.5">
      <div class="flex-1 min-w-0 flex flex-col gap-1.5 text-xs font-medium text-muted">
        <label for="saved-product-select">{{ t("products.savedProduct") }}</label>
        <Select
          id="saved-product-select"
          inputId="saved-product-select"
          v-model="selected"
          :options="products"
          optionLabel="title"
          optionValue="id"
          :placeholder="t('products.chooseProduct')"
          fluid
        />
      </div>
      <Button
        type="button"
        severity="secondary"
        :disabled="!selected || items.length >= 200"
        class="inline-flex items-center gap-1.5"
        @click="useSaved"
      >
        <Plus :size="18" />
        <span>{{ t("common.add") }}</span>
      </Button>
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

    <div>
      <Button
        type="button"
        severity="secondary"
        variant="outlined"
        :disabled="items.length >= 200"
        class="inline-flex items-center gap-1.5"
        @click="add()"
      >
        <Plus :size="18" />
        <span>{{ t("expenses.addItem") }}</span>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from "vue";
import { Plus } from "lucide-vue-next";
import Button from "primevue/button";
import Select from "primevue/select";
import type { ItemInput, Product, Expense } from "@/lib/types";
import { normalizeUnit, priceHistory } from "@/lib/products";
import PurchaseItemRow from "@/components/products/PurchaseItemRow.vue";
import { t } from "@/lib/i18n";

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
      unit: normalizeUnit(last?.unit ?? product?.unit),
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
