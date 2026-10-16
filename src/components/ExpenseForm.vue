<script setup lang="ts">
import {
  reactive,
  ref,
  shallowRef,
  computed,
  onMounted,
  useTemplateRef,
} from "vue";
import { X, Zap, ListPlus, ScanLine } from "lucide-vue-next";
import {
  categories,
  type Expense,
  type ItemInput,
  type PurchaseItem,
} from "@/lib/types";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { parseMoney, signedMoney, today, money } from "@/lib/finance";
import { itemsTotal, validQuantity } from "@/lib/purchases";
import { findProduct } from "@/lib/products";
import { type ReceiptSuggestion } from "@/lib/receipt";
import CategoryIcon from "@/components/CategoryIcon.vue";
import ItemEditor from "@/components/ItemEditor.vue";
import ReceiptReader from "@/components/ReceiptReader.vue";
const props = defineProps<{ expense?: Expense }>();
const emit = defineEmits<{ close: [] }>();
const store = useExpenses();
const source = props.expense ?? store.repeat;
const dialog = useTemplateRef<HTMLDialogElement>("dialog");
const mode = shallowRef<"quick" | "items" | "receipt">(
  source?.items?.length ? "items" : props.expense ? "quick" : store.entryMode,
);
const form = reactive({
  amount: source ? (source.amount / 100).toFixed(2) : "",
  currency: "NZD" as const,
  merchant: source?.merchant ?? store.prefillShop,
  category: source?.category ?? "Groceries",
  date: props.expense?.date ?? today(),
  note: source?.note ?? "",
});
const lines = ref<ItemInput[]>(
  (source?.items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    price: (item.unitPrice / 100).toFixed(2),
    quantity: String(item.quantity),
    productId: item.productId,
    unit: item.unit ?? "each",
    size: String(item.size ?? 1),
    discount: item.discount ? (item.discount / 100).toFixed(2) : "",
  })),
);
const adjustment = shallowRef(
  source?.adjustment ? (source.adjustment / 100).toFixed(2) : "",
);
const busy = shallowRef(false);
const error = shallowRef("");
const receipt = shallowRef<ReceiptSuggestion | null>(null);
const reviewed = shallowRef(false);
const receiptNote = shallowRef("");
function readLines(): PurchaseItem[] {
  return lines.value.map((item) => {
    if (!item.title.trim()) throw new Error("Give each item a name.");
    const price = item.price.trim();
    const unitPrice = /^0(?:\.0{1,2})?$/.test(price) ? 0 : parseMoney(price);
    if (!/^\d+(?:\.\d{1,3})?$/.test(item.quantity))
      throw new Error("Quantity needs up to three decimal places.");
    const quantity = Number(item.quantity);
    if (!validQuantity(quantity))
      throw new Error("Quantity must be between 0.001 and 10,000.");
    const size = Number(item.size ?? "1");
    if (!validQuantity(size))
      throw new Error("Size needs a number from 0.001 to 10,000.");
    const discount = Math.abs(signedMoney(item.discount ?? ""));
    if (discount > Math.round(unitPrice * quantity))
      throw new Error("An item discount cannot exceed its line price.");
    const product =
      store.products.find((product) => product.id === item.productId) ??
      findProduct(store.products, item.title);
    return {
      id: item.id,
      title: item.title.trim(),
      unitPrice,
      quantity,
      size,
      unit: item.unit ?? "each",
      discount,
      ...(product ? { productId: product.id } : {}),
    };
  });
}
function adjustmentCents() {
  return signedMoney(adjustment.value);
}
function toggleAdjustment() {
  const value = adjustment.value.trim();
  adjustment.value = value.startsWith("-")
    ? value.slice(1)
    : "-" + value.replace(/^\+/, "");
}
const calculated = computed(() => {
  try {
    return itemsTotal(readLines()) + adjustmentCents();
  } catch {
    return null;
  }
});
const itemized = computed(
  () => mode.value !== "quick" && lines.value.length > 0,
);
const totalMismatch = computed(
  () =>
    receipt.value?.amount != null &&
    itemized.value &&
    calculated.value !== receipt.value.amount,
);
function applyReceipt(value: ReceiptSuggestion) {
  receiptNote.value = "";
  if (value.currency === "USD") {
    if (!store.rates.rate) {
      error.value =
        "USD receipt needs an exchange rate. Reconnect and scan again.";
      return;
    }
    const rate = store.rates.rate;
    value = {
      ...value,
      currency: "NZD",
      amount: value.amount === null ? null : Math.round(value.amount / rate),
      items: value.items.map((item) => ({
        ...item,
        unitPrice: Math.round(item.unitPrice / rate),
        discount: Math.round((item.discount ?? 0) / rate),
      })),
    };
    receiptNote.value = `USD receipt converted to NZD using the ${store.rates.date} rate. Check the actual NZD amount paid.`;
  }
  receipt.value = value;
  reviewed.value = false;
  if (value.merchant) form.merchant = value.merchant;
  if (value.date) form.date = value.date;
  form.amount = value.amount === null ? "" : (value.amount / 100).toFixed(2);
  lines.value = value.items.map((item) => ({
    id: crypto.randomUUID(),
    title: item.title,
    price: (item.unitPrice / 100).toFixed(2),
    quantity: String(item.quantity),
    productId: item.productId,
    unit: item.unit ?? "each",
    size: String(item.size ?? 1),
    discount: item.discount ? (item.discount / 100).toFixed(2) : "",
  }));
  adjustment.value = "";
}
onMounted(() => dialog.value?.showModal());
async function submit() {
  busy.value = true;
  error.value = "";
  try {
    if (receipt.value && !reviewed.value)
      throw new Error("Review the receipt suggestions before saving.");
    if (form.date > today())
      throw new Error("Choose today or an earlier date.");
    if (mode.value === "items" && !lines.value.length)
      throw new Error("Add an item or choose Quick amount.");
    const items = itemized.value ? readLines() : [];
    const change = items.length ? adjustmentCents() : 0;
    const amount = items.length
      ? itemsTotal(items) + change
      : parseMoney(form.amount);
    if (amount <= 0 || amount > 999999999)
      throw new Error("Total must be greater than zero and below 10 million.");
    await store.saveExpense(
      {
        ...form,
        merchant: form.merchant.trim(),
        amount,
        items,
        adjustment: change,
      },
      props.expense,
    );
    store.repeat = null;
    emit("close");
  } catch (reason) {
    error.value = friendlyError(reason);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <dialog
    ref="dialog"
    class="expense-dialog purchase-dialog"
    @cancel.prevent="!busy && emit('close')"
  >
    <div class="section-heading">
      <h2>
        {{
          expense
            ? "Edit expense"
            : store.repeat
              ? "Repeat purchase"
              : "Add expense"
        }}
      </h2>
      <button
        class="icon-button"
        :disabled="busy"
        aria-label="Close expense form"
        @click="emit('close')"
      >
        <X />
      </button>
    </div>
    <div class="entry-tabs" aria-label="Entry method">
      <button
        type="button"
        :aria-pressed="mode === 'quick'"
        @click="mode = 'quick'"
      >
        <Zap :size="17" />Quick
      </button>
      <button
        type="button"
        :aria-pressed="mode === 'items'"
        @click="mode = 'items'"
      >
        <ListPlus :size="17" />Items
      </button>
      <button
        type="button"
        :aria-pressed="mode === 'receipt'"
        @click="mode = 'receipt'"
      >
        <ScanLine :size="17" />Receipt
      </button>
    </div>
    <ReceiptReader v-if="mode === 'receipt'" @result="applyReceipt" />
    <form @submit.prevent="submit">
      <label
        >Shop / title<input
          v-model="form.merchant"
          list="saved-shops"
          maxlength="100"
          placeholder="e.g. New World"
          required
      /></label>
      <datalist id="saved-shops">
        <option v-for="shop in store.shops" :key="shop.id" :value="shop.name" />
      </datalist>
      <div class="form-pair">
        <label
          >Date<input
            v-model="form.date"
            type="date"
            :max="today()"
            min="2000-01-01"
            required
        /></label>
        <p class="small muted">All amounts in NZD</p>
      </div>
      <fieldset class="category-picker">
        <legend>Category</legend>
        <div class="category-options">
          <button
            v-for="category in categories"
            :key="category"
            type="button"
            :aria-pressed="form.category === category"
            @click="form.category = category"
          >
            <CategoryIcon :category="category" /><span>{{ category }}</span>
          </button>
        </div>
      </fieldset>
      <template v-if="mode !== 'quick'">
        <ItemEditor
          v-model:items="lines"
          :products="store.products"
          :expenses="store.expenses"
          :exclude-expense-id="expense?.id"
        />
        <label v-if="lines.length" class="small"
          >Tax / discount (optional)<input
            v-model="adjustment"
            inputmode="decimal"
            placeholder="e.g. -2.00 discount"
        /></label>
        <button
          v-if="lines.length"
          type="button"
          class="text-button"
          @click="toggleAdjustment"
        >
          ± Switch tax / discount sign
        </button>
        <p v-if="lines.length" class="small muted">
          Item prices include tax unless you add it here. Saved when you submit.
        </p>
      </template>
      <label v-if="!itemized && mode !== 'items'"
        >Total · {{ form.currency
        }}<input
          v-model="form.amount"
          class="amount-input"
          inputmode="decimal"
          placeholder="0.00"
          required
      /></label>
      <div v-else-if="itemized" class="purchase-total">
        <span>Total</span
        ><strong>{{
          calculated === null ? "Check items" : money(calculated, form.currency)
        }}</strong>
      </div>
      <div v-if="receipt" class="receipt-review">
        <p v-if="receiptNote" class="small">{{ receiptNote }}</p>
        <p v-if="receipt.amount !== null">
          Receipt total:
          <strong>{{ money(receipt.amount, form.currency) }}</strong>
        </p>
        <p v-if="totalMismatch" class="error-note">
          Items do not match the receipt total. Check missing items, tax, or
          discounts.
        </p>
        <p v-if="!receipt.date" class="small">
          Date not detected — check the date above.
        </p>
        <details>
          <summary>Recognized text</summary>
          <pre>{{ receipt.text }}</pre>
        </details>
        <label class="check"
          ><input v-model="reviewed" type="checkbox" />I checked the shop, date,
          items and total</label
        >
      </div>
      <details>
        <summary>Note</summary>
        <textarea
          v-model="form.note"
          maxlength="500"
          rows="2"
          aria-label="Note"
        />
      </details>
      <p v-if="error" class="error-note" role="alert">{{ error }}</p>
      <div class="save-bar">
        <button class="primary wide" :disabled="busy">
          {{ busy ? "Saving…" : expense ? "Save changes" : "Save expense" }}
        </button>
      </div>
    </form>
  </dialog>
</template>
