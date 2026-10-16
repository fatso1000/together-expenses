<script setup lang="ts">
import {
  reactive,
  ref,
  shallowRef,
  computed,
  onMounted,
  useTemplateRef,
} from "vue";
import {
  X,
  Zap,
  ListPlus,
  ScanLine,
  FileText,
  Image as ImageIcon,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-vue-next";
import {
  type Expense,
  type ItemInput,
  type PurchaseItem,
  type AccountId,
} from "@/lib/types";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { parseMoney, signedMoney, today, money } from "@/lib/finance";
import { itemsTotal, validQuantity } from "@/lib/purchases";
import { findProduct } from "@/lib/products";
import { type ReceiptSuggestion } from "@/lib/receipt";
import CategoryIcon from "@/components/CategoryIcon.vue";
import ItemEditor from "@/components/ItemEditor.vue";
import ReceiptReader from "@/components/ReceiptReader.vue";
import CategoryManager from "@/components/CategoryManager.vue";

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
  accountId: (source?.accountId ?? "global") as AccountId,
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

// Streamlined discount input (strictly positive deduction)
const discount = shallowRef(
  source?.adjustment && source.adjustment < 0
    ? (Math.abs(source.adjustment) / 100).toFixed(2)
    : "",
);

const busy = shallowRef(false);
const error = shallowRef("");
const receipt = shallowRef<ReceiptSuggestion | null>(null);
const receiptImage = shallowRef<string>("");
const reviewed = shallowRef(false);
const receiptNote = shallowRef("");

// Quick receipt preview dock state
const previewTab = shallowRef<"transcript" | "image">("transcript");
const dockOpen = shallowRef(false);

// Inline category creator modal state
const showCategoryManager = shallowRef(false);

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
    const itemDiscount = Math.abs(signedMoney(item.discount ?? ""));
    if (itemDiscount > Math.round(unitPrice * quantity))
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
      discount: itemDiscount,
      ...(product ? { productId: product.id } : {}),
    };
  });
}

function discountCents(): number {
  const trimmed = discount.value.trim();
  if (!trimmed || /^0(?:\.0{1,2})?$/.test(trimmed)) return 0;
  return Math.abs(signedMoney(trimmed));
}

const calculated = computed(() => {
  try {
    const subtotal = itemsTotal(readLines());
    const deduction = discountCents();
    if (deduction > subtotal) return null;
    return subtotal - deduction;
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

function applyReceipt(value: ReceiptSuggestion, imageUrl?: string) {
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
  if (imageUrl) {
    receiptImage.value = imageUrl;
    previewTab.value = "image";
  } else {
    previewTab.value = "transcript";
  }
  dockOpen.value = true;
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
  discount.value = "";
}

function onCategoryCreated(categoryName: string) {
  form.category = categoryName;
  showCategoryManager.value = false;
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
    const discountAmount = items.length ? discountCents() : 0;
    const itemsSubtotal = items.length ? itemsTotal(items) : 0;

    if (items.length && discountAmount > itemsSubtotal) {
      throw new Error("Receipt discount cannot exceed the item subtotal.");
    }

    const change = items.length ? -discountAmount : 0;
    const amount = items.length
      ? itemsSubtotal + change
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
    class="expense-drawer-dialog"
    @cancel.prevent="!busy && emit('close')"
  >
    <!-- Drawer Drag Handle Indicator -->
    <div class="drawer-handle-bar" aria-hidden="true">
      <div class="drawer-handle" />
    </div>

    <!-- Sticky Drawer Header -->
    <header class="drawer-header">
      <div class="drawer-title-area">
        <h2>
          {{
            expense
              ? "Edit expense"
              : store.repeat
                ? "Repeat purchase"
                : "Add expense"
          }}
        </h2>
        <!-- Receipt Dock Quick Button -->
        <button
          v-if="receipt || receiptImage"
          type="button"
          class="receipt-quick-pill"
          :class="{ active: dockOpen }"
          @click="dockOpen = !dockOpen"
        >
          <FileText :size="14" />
          <span>Receipt preview</span>
          <component :is="dockOpen ? ChevronUp : ChevronDown" :size="14" />
        </button>
      </div>

      <button
        class="icon-button close-btn"
        :disabled="busy"
        aria-label="Close expense drawer"
        type="button"
        @click="emit('close')"
      >
        <X />
      </button>
    </header>

    <!-- Scrollable Drawer Content -->
    <div class="drawer-body">
      <!-- Mode Tabs -->
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

      <!-- Quick Receipt Preview Dock (Sticky / Collapsible) -->
      <section
        v-if="receipt || receiptImage"
        class="quick-receipt-dock"
        :class="{ expanded: dockOpen }"
      >
        <div class="dock-header">
          <div class="dock-tabs">
            <button
              type="button"
              class="dock-tab"
              :class="{ selected: previewTab === 'transcript' }"
              @click="
                previewTab = 'transcript';
                dockOpen = true;
              "
            >
              <FileText :size="14" />Transcript
            </button>
            <button
              v-if="receiptImage"
              type="button"
              class="dock-tab"
              :class="{ selected: previewTab === 'image' }"
              @click="
                previewTab = 'image';
                dockOpen = true;
              "
            >
              <ImageIcon :size="14" />Receipt Photo
            </button>
          </div>
          <button
            type="button"
            class="text-button dock-toggle"
            @click="dockOpen = !dockOpen"
          >
            {{ dockOpen ? "Hide preview" : "Show preview" }}
          </button>
        </div>

        <div v-if="dockOpen" class="dock-view">
          <div v-if="previewTab === 'transcript'" class="dock-text-scroll">
            <pre>{{ receipt?.text || "No transcript available." }}</pre>
          </div>
          <div v-else-if="previewTab === 'image' && receiptImage" class="dock-img-stage">
            <img :src="receiptImage" alt="Scanned receipt preview" />
          </div>
        </div>
      </section>

      <!-- Receipt Reader (Scanner) -->
      <ReceiptReader v-if="mode === 'receipt'" @result="applyReceipt" />

      <!-- Form Inputs -->
      <form @submit.prevent="submit">
        <label>
          Shop / title
          <input
            v-model="form.merchant"
            list="saved-shops"
            maxlength="100"
            placeholder="e.g. New World"
            required
          />
        </label>
        <datalist id="saved-shops">
          <option
            v-for="shop in store.shops"
            :key="shop.id"
            :value="shop.name"
          />
        </datalist>

        <div class="form-pair">
          <label>
            Date
            <input
              v-model="form.date"
              type="date"
              :max="today()"
              min="2000-01-01"
              required
            />
          </label>
          <label>
            Paid From Account
            <select v-model="form.accountId">
              <option value="global">Global Account (Everyday)</option>
              <option value="nz">NZ Account (Savings)</option>
            </select>
          </label>
        </div>

        <!-- Category Picker with Custom Categories -->
        <fieldset class="category-picker">
          <div class="category-picker-header">
            <legend>Category</legend>
            <button
              type="button"
              class="text-button new-cat-link"
              @click="showCategoryManager = true"
            >
              <Plus :size="14" />Manage categories
            </button>
          </div>

          <div class="category-options">
            <button
              v-for="catDef in store.categoryDefinitions"
              :key="catDef.id"
              type="button"
              :aria-pressed="form.category === catDef.name"
              @click="form.category = catDef.name"
            >
              <CategoryIcon :category="catDef.name" :size="20" />
              <span>{{ catDef.name }}</span>
            </button>
            <button
              type="button"
              class="add-category-btn"
              title="Add custom category"
              @click="showCategoryManager = true"
            >
              <Plus :size="20" />
              <span>Custom</span>
            </button>
          </div>
        </fieldset>

        <!-- Itemized Items Editor -->
        <template v-if="mode !== 'quick'">
          <ItemEditor
            v-model:items="lines"
            :products="store.products"
            :expenses="store.expenses"
            :exclude-expense-id="expense?.id"
          />

          <!-- Streamlined Receipt Discount Input -->
          <div v-if="lines.length" class="discount-container">
            <label class="discount-field">
              Receipt discount · NZD (optional)
              <input
                v-model="discount"
                inputmode="decimal"
                placeholder="0.00"
              />
              <small class="muted">
                Subtracted from the item total (e.g. 5.00 saves $5).
              </small>
            </label>
          </div>
        </template>

        <!-- Quick Amount Input -->
        <label v-if="!itemized && mode !== 'items'">
          Total · {{ form.currency }}
          <input
            v-model="form.amount"
            class="amount-input"
            inputmode="decimal"
            placeholder="0.00"
            required
          />
        </label>

        <!-- Itemized Total Breakdown -->
        <div v-else-if="itemized" class="purchase-total-breakdown">
          <div v-if="discountCents() > 0" class="subtotal-row">
            <span>Items subtotal</span>
            <span>{{ money(itemsTotal(readLines()), form.currency) }}</span>
          </div>
          <div v-if="discountCents() > 0" class="discount-row">
            <span>Receipt discount</span>
            <span>-{{ money(discountCents(), form.currency) }}</span>
          </div>
          <div class="purchase-total">
            <span>Total</span>
            <strong>{{
              calculated === null
                ? "Check items"
                : money(calculated, form.currency)
            }}</strong>
          </div>
        </div>

        <!-- Receipt Review Section -->
        <div v-if="receipt" class="receipt-review">
          <p v-if="receiptNote" class="small">{{ receiptNote }}</p>
          <p v-if="receipt.amount !== null">
            Receipt total:
            <strong>{{ money(receipt.amount, form.currency) }}</strong>
          </p>
          <p v-if="totalMismatch" class="error-note">
            Items do not match the receipt total. Check missing items or discount.
          </p>
          <p v-if="!receipt.date" class="small">
            Date not detected — check the date above.
          </p>
          <label class="check">
            <input v-model="reviewed" type="checkbox" />
            I checked the shop, date, items and total
          </label>
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
    </div>

    <!-- Inline Category Manager Modal/Overlay -->
    <div
      v-if="showCategoryManager"
      class="inline-modal-backdrop"
      @click.self="showCategoryManager = false"
    >
      <div class="inline-modal">
        <div class="inline-modal-header">
          <h3>Custom Categories</h3>
          <button
            type="button"
            class="icon-button"
            aria-label="Close category manager"
            @click="showCategoryManager = false"
          >
            <X />
          </button>
        </div>
        <CategoryManager
          @close="showCategoryManager = false"
          @created="onCategoryCreated"
        />
      </div>
    </div>
  </dialog>
</template>

<style scoped>
/* Bottom Drawer Layout */
.expense-drawer-dialog {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  margin: auto auto 0 auto;
  width: min(800px, 100vw);
  max-width: 100vw;
  height: 94dvh;
  max-height: 94dvh;
  background: #ffffff;
  border: 0;
  border-radius: 26px 26px 0 0;
  padding: 0;
  box-shadow: 0 -16px 64px rgba(13, 36, 30, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.expense-drawer-dialog::backdrop {
  background: rgba(13, 36, 30, 0.55);
  backdrop-filter: blur(4px);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.drawer-handle-bar {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
  cursor: grab;
}

.drawer-handle {
  width: 44px;
  height: 5px;
  background: #d2ded7;
  border-radius: 10px;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 22px 14px;
  border-bottom: 1px solid #edf2ef;
}

.drawer-title-area {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.drawer-header h2 {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
}

.receipt-quick-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: #edf5ee;
  border: 1px solid #b7ccbf;
  border-radius: 20px;
  color: #1e5239;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.receipt-quick-pill.active {
  background: #153d35;
  color: #ffffff;
  border-color: #153d35;
}

.close-btn {
  width: 36px;
  height: 36px;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 22px calc(24px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Quick Receipt Dock */
.quick-receipt-dock {
  background: #f4f8f5;
  border: 1px solid #dbe6de;
  border-radius: 14px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.dock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #eaf1ec;
  border-bottom: 1px solid #dce7df;
}

.dock-tabs {
  display: flex;
  gap: 6px;
}

.dock-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  background: transparent;
  color: #4b6058;
}

.dock-tab.selected {
  background: #153d35;
  color: #ffffff;
}

.dock-toggle {
  font-size: 12px;
}

.dock-view {
  padding: 12px;
  max-height: 220px;
  overflow-y: auto;
}

.dock-text-scroll pre {
  margin: 0;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.4;
  white-space: pre-wrap;
  color: #243d36;
}

.dock-img-stage img {
  display: block;
  max-width: 100%;
  max-height: 200px;
  margin: 0 auto;
  border-radius: 8px;
  object-fit: contain;
}

/* Categories & Custom Button */
.category-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.new-cat-link {
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.add-category-btn {
  background: #f0f4f1;
  border: 1px dashed #9cb5a6;
  border-radius: 12px;
  padding: 9px 3px;
  min-height: 70px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 11px;
  color: #386450;
  cursor: pointer;
}

.add-category-btn:hover {
  background: #e4eee7;
}

/* Discount Field & Total Breakdown */
.discount-container {
  margin: 8px 0;
}

.discount-field {
  display: grid;
  gap: 4px;
}

.discount-field small {
  font-size: 11px;
  color: #667871;
}

.purchase-total-breakdown {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  background: #f6faf7;
  border-radius: 12px;
  border: 1px solid #e1ebe3;
}

.subtotal-row,
.discount-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #556c62;
}

.discount-row {
  color: #a03e30;
  font-weight: 500;
}

.currency-hint {
  display: flex;
  align-items: flex-end;
  padding-bottom: 8px;
}

/* Inline Modal for Category Manager */
.inline-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(13, 36, 30, 0.6);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.inline-modal {
  background: #ffffff;
  border-radius: 20px;
  padding: 20px;
  width: min(540px, 100%);
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 16px 64px rgba(0, 0, 0, 0.3);
}

.inline-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.inline-modal-header h3 {
  margin: 0;
  font-size: 18px;
}
</style>
