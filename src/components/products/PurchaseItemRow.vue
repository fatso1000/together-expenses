<template>
  <div class="relative grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)]">
    <label class="col-span-full flex flex-col gap-1 text-xs font-medium text-muted min-w-0">
      <span>Product {{ index + 1 }}</span>
      <InputText
        :modelValue="item.title"
        :aria-label="`Item ${index + 1} name`"
        maxlength="100"
        placeholder="e.g. Milk"
        required
        fluid
        @update:modelValue="onFieldChange('title', $event)"
        @input="onInputEvent('title', $event)"
      />
    </label>

    <Button
      type="button"
      class="item-remove absolute! top-2.5! right-2.5! w-8! h-8! p-0!"
      variant="text"
      rounded
      severity="danger"
      :aria-label="`Remove item ${index + 1}`"
      @click="emit('remove')"
    >
      <Trash2 :size="18" />
    </Button>

    <div class="col-span-full flex flex-wrap items-center gap-2 min-w-0">
      <small v-if="product" class="inline-flex items-center gap-1 text-xs text-muted">
        <Link :size="13" />
        <span>Using {{ product.title }}</span>
      </small>
      <template v-else-if="suggestions.length">
        <span class="text-xs text-muted">Same product?</span>
        <Button
          v-for="candidate in suggestions"
          :key="candidate.id"
          type="button"
          size="small"
          variant="outlined"
          severity="secondary"
          rounded
          @click="select(candidate)"
        >
          {{ candidate.title }}
        </Button>
      </template>
      <small v-else-if="item.title.trim()" class="text-xs text-muted">
        New product · saved with this expense
      </small>
    </div>

    <label class="flex flex-col gap-1 text-xs font-medium text-muted min-w-0">
      <span>{{ t("expenses.itemUnitPrice") }}</span>
      <InputText
        :modelValue="item.price"
        :aria-label="`Item ${index + 1} price`"
        inputmode="decimal"
        required
        placeholder="0.00"
        fluid
        @update:modelValue="onFieldChange('price', $event)"
        @input="onInputEvent('price', $event)"
      />
    </label>

    <label class="flex flex-col gap-1 text-xs font-medium text-muted min-w-0">
      <span>{{ t("products.qtyBought") }}</span>
      <InputText
        :modelValue="item.quantity"
        :aria-label="`Item ${index + 1} quantity`"
        inputmode="decimal"
        required
        fluid
        @update:modelValue="onFieldChange('quantity', $event)"
        @input="onInputEvent('quantity', $event)"
      />
    </label>

    <label class="flex flex-col gap-1 text-xs font-medium text-muted min-w-0">
      <span>{{ t("products.sizeOne") }}</span>
      <InputText
        :modelValue="item.size ?? '1'"
        :aria-label="`Item ${index + 1} size`"
        inputmode="decimal"
        required
        fluid
        @update:modelValue="onFieldChange('size', $event)"
        @input="onInputEvent('size', $event)"
      />
    </label>

    <label class="flex flex-col gap-1 text-xs font-medium text-muted min-w-0">
      <span>{{ t("products.usualMeasure") }}</span>
      <Select
        :modelValue="item.unit ?? 'each'"
        :options="units"
        optionLabel="label"
        optionValue="value"
        :aria-label="`Item ${index + 1} measure`"
        fluid
        @update:modelValue="onFieldChange('unit', $event)"
      />
    </label>

    <label class="col-span-full flex flex-col gap-1 text-xs font-medium text-muted min-w-0">
      <span>{{ t("expenses.itemDiscount") }}</span>
      <InputText
        :modelValue="item.discount ?? ''"
        :aria-label="`Item ${index + 1} discount`"
        inputmode="decimal"
        placeholder="0.00"
        fluid
        @update:modelValue="onFieldChange('discount', $event)"
        @input="onInputEvent('discount', $event)"
      />
      <small class="text-[11px] font-normal text-muted">
        Discount for this entire line. Either 2 or −2 takes $2 off.
      </small>
    </label>

    <div v-if="parsed" class="col-span-full flex items-center justify-between text-sm pt-1">
      <span class="text-muted">
        {{ item.quantity }} × {{ item.size ?? 1 }} {{ item.unit ?? "each" }}
      </span>
      <strong class="font-bold tabular-nums">{{ money(lineTotal(parsed)) }}</strong>
    </div>

    <div class="col-span-full min-w-0">
      <PriceWarning
        :item="parsed"
        :product="product"
        :expenses="expenses"
        :exclude-expense-id="excludeExpenseId"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Trash2, Link } from "lucide-vue-next";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Button from "primevue/button";
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

function onFieldChange(
  field: keyof ItemInput,
  value: string | undefined | null,
) {
  const val = value ?? "";
  const next = {
    ...props.item,
    [field]: val,
  };
  if (field === "title")
    next.productId = findProduct(props.products, next.title)?.id;
  emit("change", next);
}

function onInputEvent(field: keyof ItemInput, event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (target) {
    onFieldChange(field, target.value);
  }
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
