<script setup lang="ts">
import { computed } from "vue";
import { Trash2, Link } from "lucide-vue-next";
import type { ItemInput, Product, Expense, PurchaseItem } from "@/lib/types";
import { units, findProduct, suggestProducts } from "@/lib/products";
import { lineTotal, validQuantity } from "@/lib/purchases";
import { money, signedMoney } from "@/lib/finance";
import PriceWarning from "@/components/products/PriceWarning.vue";
import { t } from "@/lib/i18n";
const props = defineProps<{
  item: ItemInput;
  index: number;
  products: Product[];
  expenses: Expense[];
  excludeExpenseId?: string;
}>();
const emit = defineEmits<{ change: [item: ItemInput]; remove: [] }>();
const product = computed(
  () =>
    props.products.find((product) => product.id === props.item.productId) ??
    findProduct(props.products, props.item.title),
);
const suggestions = computed(() =>
  product.value ? [] : suggestProducts(props.products, props.item.title),
);
function change(field: keyof ItemInput, event: Event) {
  const next = {
    ...props.item,
    [field]: (event.target as HTMLInputElement).value,
  };
  if (field === "title")
    next.productId = findProduct(props.products, next.title)?.id;
  emit("change", next);
}
function select(product: Product) {
  emit("change", {
    ...props.item,
    productId: product.id,
  });
}
const parsed = computed<PurchaseItem | null>(() => {
  try {
    if (!props.item.price.trim()) return null;
    const unitPrice = signedMoney(props.item.price);
    const quantity = Number(props.item.quantity);
    const size = Number(props.item.size ?? "1");
    const discount = Math.abs(signedMoney(props.item.discount ?? ""));
    if (unitPrice < 0 || !validQuantity(quantity) || !validQuantity(size))
      return null;
    const item = {
      id: props.item.id,
      title: props.item.title,
      unitPrice,
      quantity,
      size,
      discount,
      unit: props.item.unit ?? "each",
      productId: product.value?.id,
    };
    if (lineTotal(item) < 0) return null;
    return item;
  } catch {
    return null;
  }
});
</script>
<template>
  <div class="purchase-row product-entry">
    <label class="item-title"
      >Product {{ index + 1
      }}<input
        :value="item.title"
        :aria-label="`Item ${index + 1} name`"
        maxlength="100"
        placeholder="e.g. Milk"
        required
        @input="change('title', $event)"
    /></label>
    <button
      type="button"
      class="icon-button item-remove"
      :aria-label="`Remove item ${index + 1}`"
      @click="emit('remove')"
    >
      <Trash2 :size="18" />
    </button>
    <div class="product-match">
      <small v-if="product"
        ><Link :size="13" /> Using {{ product.title }}</small
      >
      <template v-else-if="suggestions.length"
        ><span class="small muted">Same product?</span
        ><button
          v-for="candidate in suggestions"
          :key="candidate.id"
          type="button"
          class="match-option"
          @click="select(candidate)"
        >
          {{ candidate.title }}
        </button></template
      >
      <small v-else-if="item.title.trim()" class="muted"
        >New product · saved with this expense</small
      >
    </div>
    <label
      >{{ t('expenses.itemUnitPrice') }} · NZD<input
        :value="item.price"
        :aria-label="`Item ${index + 1} price`"
        inputmode="decimal"
        required
        placeholder="0.00"
        @input="change('price', $event)"
    /></label>
    <label
      >{{ t('products.qtyBought') }}<input
        :value="item.quantity"
        :aria-label="`Item ${index + 1} quantity`"
        inputmode="decimal"
        required
        @input="change('quantity', $event)"
    /></label>
    <label
      >{{ t('products.sizeOne') }}<input
        :value="item.size ?? '1'"
        :aria-label="`Item ${index + 1} size`"
        inputmode="decimal"
        required
        @input="change('size', $event)"
    /></label>
    <label
      >{{ t('products.usualMeasure') }}<select
        :value="item.unit ?? 'each'"
        :aria-label="`Item ${index + 1} measure`"
        @change="change('unit', $event)"
      >
        <option v-for="unit in units" :key="unit.value" :value="unit.value">
          {{ unit.label }}
        </option>
      </select></label
    >
    <label class="item-discount"
      >{{ t('expenses.itemDiscount') }} · NZD<input
        :value="item.discount ?? ''"
        :aria-label="`Item ${index + 1} discount`"
        inputmode="decimal"
        placeholder="0.00"
        @input="change('discount', $event)"
      /><small
        >Discount for this entire line. Either 2 or −2 takes $2 off.</small
      ></label
    >
    <div class="line-summary" v-if="parsed">
      <span
        >{{ item.quantity }} × {{ item.size ?? 1 }}
        {{ item.unit ?? "each" }}</span
      ><strong>{{ money(lineTotal(parsed)) }}</strong>
    </div>
    <div class="row-comparison">
      <PriceWarning
        :item="parsed"
        :product="product"
        :expenses="expenses"
        :exclude-expense-id="excludeExpenseId"
      />
    </div>
  </div>
</template>
<style scoped>
.product-entry {
  position: relative;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
.product-entry .item-title {
  grid-column: 1 / -1;
  padding-right: 36px;
}
.product-entry .item-remove {
  position: absolute;
  top: 34px;
  right: 10px;
  grid-column: auto;
  width: 32px;
  min-width: 32px;
}
.product-entry > * {
  min-width: 0;
}
.product-match,
.item-discount,
.line-summary,
.row-comparison {
  grid-column: 1 / -1;
}
.product-match {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.product-match small {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #426752;
}
.match-option {
  padding: 8px 12px;
  border: 1px solid #b7ccbf;
  background: #edf5ee;
  border-radius: 20px;
  color: #264d37;
}
.item-discount small {
  font-size: 11px;
  font-weight: 400;
  color: #69736e;
}
.line-summary {
  display: flex;
  justify-content: space-between;
}
</style>
