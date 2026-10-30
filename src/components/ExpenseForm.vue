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
  Wallet,
  PiggyBank,
  ZoomIn,
  ZoomOut,
  Copy,
  Check,
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
import { t, categoryLabel } from "@/lib/i18n";
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
const previewTab = shallowRef<"transcript" | "image">("image");
const dockOpen = shallowRef(false);
const isZoomed = shallowRef(false);
const copySuccess = shallowRef(false);
const dockRef = useTemplateRef<HTMLElement>("dockRef");

function toggleDock() {
  dockOpen.value = !dockOpen.value;
  if (dockOpen.value) {
    setTimeout(() => {
      dockRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }
}

// Inline category creator modal state
const showCategoryManager = shallowRef(false);
const categoryCreateMode = shallowRef(false);

function openCategoryManager(startInCreate = false) {
  categoryCreateMode.value = startInCreate;
  showCategoryManager.value = true;
}

async function copyTranscript() {
  if (!receipt.value?.text) return;
  try {
    await navigator.clipboard.writeText(receipt.value.text);
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } catch {}
}

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
  if (value.category && store.allCategories.includes(value.category)) {
    form.category = value.category;
  }
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
  mode.value = value.items.length ? "items" : "quick";
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
              ? t('expenses.editExpense')
              : t('expenses.newExpense')
          }}
        </h2>
        <!-- Receipt Dock Quick Button -->
        <button
          v-if="receipt || receiptImage"
          type="button"
          class="receipt-quick-pill"
          :class="{ active: dockOpen }"
          @click="toggleDock"
        >
          <FileText :size="14" />
          <span>{{ t('expenses.receiptPreview') }}</span>
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
      <div class="drawer-layout-columns">
        <!-- LEFT COLUMN: Form controls -->
        <div class="drawer-col-form">
          <!-- Mode Tabs -->
          <div class="entry-tabs" aria-label="Entry method">
            <button
              type="button"
              :aria-pressed="mode === 'quick'"
              @click="mode = 'quick'"
            >
              <Zap :size="17" />{{ t('dashboard.quickAmount') }}
            </button>
            <button
              type="button"
              :aria-pressed="mode === 'items'"
              @click="mode = 'items'"
            >
              <ListPlus :size="17" />{{ t('dashboard.addItems') }}
            </button>
            <button
              type="button"
              :aria-pressed="mode === 'receipt'"
              @click="mode = 'receipt'"
            >
              <ScanLine :size="17" />{{ t('dashboard.scanReceipt') }}
            </button>
          </div>

          <!-- Mobile Quick Receipt Preview Dock -->
          <section
            v-if="receipt || receiptImage"
            ref="dockRef"
            class="quick-receipt-dock mobile-only-dock"
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
                  <FileText :size="14" />{{ t('expenses.transcriptTab') }}
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
                  <ImageIcon :size="14" />{{ t('expenses.photoTab') }}
                </button>
              </div>
              <div class="dock-actions">
                <button
                  v-if="previewTab === 'image'"
                  type="button"
                  class="preview-action-btn"
                  @click="isZoomed = !isZoomed"
                >
                  <component :is="isZoomed ? ZoomOut : ZoomIn" :size="14" />
                  <span>{{ isZoomed ? t('expenses.zoomOut') : t('expenses.zoomIn') }}</span>
                </button>
                <button
                  v-if="previewTab === 'transcript'"
                  type="button"
                  class="preview-action-btn"
                  @click="copyTranscript"
                >
                  <component :is="copySuccess ? Check : Copy" :size="14" />
                  <span>{{ copySuccess ? t('expenses.copied') : t('expenses.copy') }}</span>
                </button>
                <button
                  type="button"
                  class="text-button dock-toggle"
                  @click="dockOpen = !dockOpen"
                >
                  {{ dockOpen ? t('common.close') : t('common.view') }}
                </button>
              </div>
            </div>

            <div v-if="dockOpen" class="dock-view">
              <div
                v-if="previewTab === 'transcript'"
                class="dock-text-scroll"
                title="Click to copy transcript"
                @click="copyTranscript"
              >
                <pre>{{ receipt?.text || "No transcript available." }}</pre>
              </div>
              <div
                v-else-if="previewTab === 'image' && receiptImage"
                class="dock-img-stage"
                :class="{ 'is-zoomed': isZoomed }"
                title="Click image to zoom in/out"
                @click="isZoomed = !isZoomed"
              >
                <img
                  :src="receiptImage"
                  alt="Scanned receipt preview"
                  :class="{ zoomed: isZoomed }"
                />
              </div>
            </div>
          </section>

          <!-- Receipt Reader (Scanner) in main column on small screen / when in receipt mode -->
          <ReceiptReader
            v-if="mode === 'receipt'"
            class="mobile-receipt-reader"
            @result="applyReceipt"
          />

          <!-- Form Inputs -->
          <form @submit.prevent="submit">
            <label>
              {{ t('expenses.merchant') }}
              <input
                v-model="form.merchant"
                list="saved-shops"
                maxlength="100"
                :placeholder="t('shops.placeholder')"
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

            <label>
              {{ t('expenses.date') }}
              <input
                v-model="form.date"
                type="date"
                :max="today()"
                min="2000-01-01"
                required
              />
            </label>

            <!-- Prominent Account Selector (Global vs NZ Savings) -->
            <div class="account-selector-group">
              <span class="account-group-label">{{ t('bulk.paidFrom') }}</span>
              <div
                class="account-toggle-grid"
                role="radiogroup"
                aria-label="Paid From Account"
              >
                <button
                  type="button"
                  class="account-toggle-card"
                  :class="{ selected: form.accountId === 'global' }"
                  :aria-checked="form.accountId === 'global'"
                  role="radio"
                  @click="form.accountId = 'global'"
                >
                  <div class="account-toggle-icon global-icon">
                    <Wallet :size="18" />
                  </div>
                  <div class="account-toggle-info">
                    <strong>{{ t('accounts.globalEveryday') }}</strong>
                    <small>Everyday capital & weekly limit</small>
                  </div>
                </button>

                <button
                  type="button"
                  class="account-toggle-card"
                  :class="{ selected: form.accountId === 'nz' }"
                  :aria-checked="form.accountId === 'nz'"
                  role="radio"
                  @click="form.accountId = 'nz'"
                >
                  <div class="account-toggle-icon nz-icon">
                    <PiggyBank :size="18" />
                  </div>
                  <div class="account-toggle-info">
                    <strong>{{ t('accounts.nzSavings') }}</strong>
                    <small>{{ t('accounts.salarySavings') }}</small>
                  </div>
                </button>
              </div>
              <p class="account-badge-hint" :class="form.accountId">
                <span v-if="form.accountId === 'nz'">
                  🏦 {{ t('expenses.nzHint') }}
                </span>
                <span v-else>
                  💳 {{ t('expenses.globalHint') }}
                </span>
              </p>
            </div>

            <!-- Category Picker with Custom Categories -->
            <fieldset class="category-picker">
              <div class="category-picker-header">
                <legend>{{ t('expenses.category') }}</legend>
                <button
                  type="button"
                  class="text-button new-cat-link"
                  @click="openCategoryManager(true)"
                >
                  <Plus :size="14" />{{ t('categories.newCategory') }}
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
                  <span>{{ categoryLabel(catDef.name) }}</span>
                </button>
                <button
                  type="button"
                  class="add-category-btn"
                  :title="t('categories.newCategory')"
                  @click="openCategoryManager(true)"
                >
                  <Plus :size="20" />
                  <span>+ {{ t('categories.newCategory') }}</span>
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
                  {{ t('expenses.discountFieldLabel') }}
                  <input
                    v-model="discount"
                    inputmode="decimal"
                    placeholder="0.00"
                  />
                  <small class="muted">
                    {{ t('expenses.discountHint') }}
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
                <span>{{ t('expenses.itemsSubtotal') }}</span>
                <span>{{ money(itemsTotal(readLines()), form.currency) }}</span>
              </div>
              <div v-if="discountCents() > 0" class="discount-row">
                <span>{{ t('expenses.receiptDiscount') }}</span>
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
                {{ t('expenses.receiptTotal') }}
                <strong>{{ money(receipt.amount, form.currency) }}</strong>
              </p>
              <p v-if="totalMismatch" class="error-note">
                {{ t('expenses.itemsMismatch') }}
              </p>
              <p v-if="!receipt.date" class="small">
                Date not detected — check the date above.
              </p>
              <label class="check">
                <input v-model="reviewed" type="checkbox" />
                {{ t('expenses.checkItemsPrompt') }}
              </label>
            </div>

            <details>
              <summary>{{ t('expenses.notes') }}</summary>
              <textarea
                v-model="form.note"
                maxlength="500"
                rows="2"
                :aria-label="t('expenses.notes')"
              />
            </details>

            <p v-if="error" class="error-note" role="alert">{{ error }}</p>

            <div class="save-bar">
              <button class="primary wide" :disabled="busy">
                {{ busy ? t('common.saving') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>

        <!-- RIGHT COLUMN: Receipt Photo & Transcript Stage (Desktop / Wide Screen) -->
        <aside class="drawer-col-preview desktop-preview-pane">
          <!-- When Receipt or Photo Exists -->
          <div v-if="receipt || receiptImage" class="preview-stage-container">
            <div class="preview-stage-header">
              <div class="preview-stage-tabs">
                <button
                  v-if="receiptImage"
                  type="button"
                  class="preview-tab-btn"
                  :class="{ active: previewTab === 'image' }"
                  @click="previewTab = 'image'"
                >
                  <ImageIcon :size="15" />
                  <span>{{ t('expenses.photoTab') }}</span>
                </button>
                <button
                  type="button"
                  class="preview-tab-btn"
                  :class="{ active: previewTab === 'transcript' }"
                  @click="previewTab = 'transcript'"
                >
                  <FileText :size="15" />
                  <span>{{ t('expenses.transcriptTab') }}</span>
                </button>
              </div>

              <div class="preview-stage-controls">
                <button
                  v-if="previewTab === 'image'"
                  type="button"
                  class="control-pill"
                  :title="isZoomed ? t('expenses.zoomOut') : t('expenses.zoomIn')"
                  @click="isZoomed = !isZoomed"
                >
                  <component :is="isZoomed ? ZoomOut : ZoomIn" :size="14" />
                  <span>{{ isZoomed ? t('expenses.zoomOut') : t('expenses.zoomIn') }}</span>
                </button>
                <button
                  v-if="previewTab === 'transcript'"
                  type="button"
                  class="control-pill"
                  title="Copy transcript text to clipboard"
                  @click="copyTranscript"
                >
                  <component :is="copySuccess ? Check : Copy" :size="14" />
                  <span>{{ copySuccess ? t('expenses.copied') : t('expenses.copy') }}</span>
                </button>
              </div>
            </div>

            <!-- Photo Viewer -->
            <div
              v-if="previewTab === 'image' && receiptImage"
              class="preview-image-scroll"
              :class="{ 'is-zoomed': isZoomed }"
              title="Click photo to zoom in or out"
              @click="isZoomed = !isZoomed"
            >
              <img
                :src="receiptImage"
                alt="Scanned receipt photo preview"
                :class="{ 'zoomed-img': isZoomed }"
              />
              <span class="preview-zoom-tip">
                {{ isZoomed ? t('expenses.clickZoomOut') : t('expenses.clickZoomIn') }}
              </span>
            </div>

            <!-- Transcript Viewer -->
            <div
              v-else-if="previewTab === 'transcript'"
              class="preview-transcript-scroll"
              title="Click to copy transcript"
              @click="copyTranscript"
            >
              <pre>{{ receipt?.text || "No transcript available." }}</pre>
            </div>
          </div>

          <!-- When in Receipt Scan Mode on Desktop -->
          <div v-else-if="mode === 'receipt'" class="preview-reader-card">
            <ReceiptReader @result="applyReceipt" />
          </div>

          <!-- Empty Preview Prompt on Desktop -->
          <div v-else class="preview-placeholder-card">
            <div class="placeholder-icon-wrap">
              <ScanLine :size="38" />
            </div>
            <h3>{{ t('expenses.receiptStagePrompt') }}</h3>
            <p>
              {{ t('expenses.receiptStageDesc') }}
            </p>
            <button
              type="button"
              class="secondary prompt-scan-btn"
              @click="mode = 'receipt'"
            >
              <ScanLine :size="16" />
              <span>{{ t('expenses.scanReceiptNow') }}</span>
            </button>
          </div>
        </aside>
      </div>
    </div>

    <!-- Inline Category Manager Bottom Drawer -->
    <div
      v-if="showCategoryManager"
      class="inline-modal-backdrop"
      @click.self="showCategoryManager = false"
    >
      <div class="inline-modal">
        <div class="drawer-handle-bar" aria-hidden="true">
          <div class="drawer-handle" />
        </div>
        <div class="inline-modal-header">
          <h3>{{ t('categories.title') }}</h3>
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
          :start-in-create-mode="categoryCreateMode"
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
  margin: auto 0 0 0;
  width: 100vw;
  max-width: 100vw;
  height: 94dvh;
  max-height: 94dvh;
  background: var(--surface-drawer, #ffffff);
  border: 1px solid var(--surface-drawer-border, rgba(21, 61, 53, 0.12));
  border-radius: 28px 28px 0 0;
  color: inherit;
  padding: 0;
  box-shadow: var(--surface-drawer-shadow, 0 -12px 40px rgba(13, 36, 30, 0.16));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
  transform: translate3d(0, 0, 0);
}

.expense-drawer-dialog::backdrop {
  background: var(--surface-backdrop, rgba(10, 24, 20, 0.5));
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
  background: rgba(120, 150, 135, 0.45);
  border-radius: 10px;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 22px 14px;
  border-bottom: 1px solid var(--border);
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
  background: var(--pill-bg);
  border: var(--pill-border);
  box-shadow: var(--pill-shadow);
  border-radius: 20px;
  color: var(--green);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.receipt-quick-pill.active {
  background: var(--green);
  color: #ffffff;
  border-color: var(--green);
}

.close-btn {
  width: 36px;
  height: 36px;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 22px calc(24px + env(safe-area-inset-bottom));
}

/* Two-column layout */
.drawer-layout-columns {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.drawer-col-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.mobile-only-dock {
  display: block;
}

.desktop-preview-pane {
  display: none;
}

/* Mobile Quick Receipt Dock */
.quick-receipt-dock {
  background: var(--surface-card, #f8faf8);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.dock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--surface-card-hover, #ffffff);
  border-bottom: 1px solid var(--border);
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
  color: var(--muted);
}

.dock-tab.selected {
  background: var(--green);
  color: #ffffff;
}

.dock-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.preview-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: var(--pill-bg);
  border: var(--pill-border);
  color: inherit;
  cursor: pointer;
}

.dock-toggle {
  font-size: 12px;
}

.dock-view {
  padding: 12px;
  max-height: 240px;
  overflow-y: auto;
}

.dock-text-scroll {
  cursor: copy;
}

.dock-text-scroll pre {
  margin: 0;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.4;
  white-space: pre-wrap;
  color: inherit;
}

.dock-img-stage {
  cursor: zoom-in;
  overflow: hidden;
  display: flex;
  justify-content: center;
}

.dock-img-stage.is-zoomed {
  cursor: zoom-out;
  overflow: auto;
}

.dock-img-stage img {
  display: block;
  max-width: 100%;
  max-height: 200px;
  margin: 0 auto;
  border-radius: 8px;
  object-fit: contain;
  transition: transform 0.2s ease;
}

.dock-img-stage img.zoomed {
  max-width: none;
  max-height: none;
  width: 220%;
  cursor: zoom-out;
}

/* Account Selector */
.account-selector-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 6px 0 10px;
}

.account-group-label {
  font-size: 13px;
  font-weight: 600;
  color: inherit;
}

.account-toggle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.account-toggle-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--surface-card, #f8faf8);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.account-toggle-card:hover {
  background: var(--surface-card-hover, #ffffff);
  border-color: var(--accent);
}

.account-toggle-card.selected {
  background: rgba(42, 194, 148, 0.14);
  border-color: var(--accent);
  box-shadow: 0 2px 8px var(--accent-glow);
}

.account-toggle-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.global-icon {
  background: rgba(42, 194, 148, 0.15);
  color: var(--accent);
}

.nz-icon {
  background: rgba(235, 198, 128, 0.2);
  color: #c48c31;
}

.account-toggle-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.account-toggle-info strong {
  font-size: 13px;
  color: inherit;
}

.account-toggle-info small {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-badge-hint {
  margin: 0;
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--surface);
  color: var(--muted);
  border-left: 3px solid var(--green);
}

.account-badge-hint.nz {
  border-left-color: #c48c31;
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
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 9px 3px;
  min-height: 70px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 11px;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-category-btn:hover {
  background: var(--pill-bg);
  border-color: var(--accent);
  color: inherit;
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
  color: var(--muted);
}

.purchase-total-breakdown {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  background: var(--surface);
  border-radius: 12px;
  border: 1px solid var(--border);
}

.subtotal-row,
.discount-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--muted);
}

.discount-row {
  color: var(--danger);
  font-weight: 500;
}

/* Inline Bottom Drawer for Category Manager */
.inline-modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--surface-backdrop, rgba(10, 24, 20, 0.5));
  z-index: 1100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.inline-modal {
  background: var(--surface-drawer, #ffffff);
  border: 1px solid var(--surface-drawer-border, rgba(21, 61, 53, 0.12));
  border-radius: 28px 28px 0 0;
  padding: 8px 24px calc(24px + env(safe-area-inset-bottom));
  width: 100vw;
  max-width: 100vw;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: var(--surface-drawer-shadow, 0 -12px 40px rgba(13, 36, 30, 0.16));
  animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
  transform: translate3d(0, 0, 0);
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

/* Desktop Dual-Column Layout (>= 900px) */
@media (min-width: 900px) {
  .drawer-body {
    padding: 20px 32px calc(28px + env(safe-area-inset-bottom));
  }

  .drawer-layout-columns {
    display: grid;
    grid-template-columns: minmax(460px, 1.15fr) minmax(380px, 0.85fr);
    gap: 32px;
    align-items: start;
  }

  .mobile-only-dock {
    display: none !important;
  }

  .mobile-receipt-reader {
    display: none !important;
  }

  .desktop-preview-pane {
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    max-height: calc(94dvh - 120px);
    background: var(--surface-card, #f8faf8);
    border: 1px solid var(--border);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 4px 18px rgba(21, 61, 53, 0.05);
  }

  .preview-stage-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 500px;
  }

  .preview-stage-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: var(--surface-card-hover, #ffffff);
    border-bottom: 1px solid var(--border);
  }

  .preview-stage-tabs {
    display: flex;
    gap: 8px;
  }

  .preview-tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    background: transparent;
    color: var(--muted);
    border: 0;
    cursor: pointer;
  }

  .preview-tab-btn.active {
    background: var(--green);
    color: #ffffff;
  }

  .preview-stage-controls {
    display: flex;
    gap: 6px;
  }

  .control-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    background: var(--pill-bg);
    border: var(--pill-border);
    color: inherit;
    cursor: pointer;
  }

  .control-pill:hover {
    background: var(--surface);
  }

  .preview-image-scroll {
    flex: 1;
    overflow: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: zoom-in;
    background: #101915;
    min-height: 440px;
  }

  .preview-image-scroll.is-zoomed {
    cursor: zoom-out;
    align-items: flex-start;
    justify-content: flex-start;
  }

  .preview-image-scroll img {
    display: block;
    max-width: 100%;
    max-height: calc(94dvh - 220px);
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    transition: transform 0.2s ease;
  }

  .preview-image-scroll img.zoomed-img {
    max-width: none;
    max-height: none;
    width: 220%;
    cursor: zoom-out;
  }

  .preview-zoom-tip {
    position: absolute;
    bottom: 12px;
    right: 12px;
    background: rgba(0, 0, 0, 0.75);
    color: #ffffff;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 6px;
    pointer-events: none;
  }

  .preview-transcript-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 18px;
    background: var(--surface);
    cursor: copy;
  }

  .preview-transcript-scroll pre {
    margin: 0;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    color: inherit;
  }

  .preview-placeholder-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 48px 32px;
    gap: 14px;
    height: 100%;
    min-height: 440px;
  }

  .placeholder-icon-wrap {
    width: 72px;
    height: 72px;
    border-radius: 20px;
    background: rgba(42, 194, 148, 0.15);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preview-placeholder-card h3 {
    margin: 0;
    font-size: 18px;
    color: inherit;
  }

  .preview-placeholder-card p {
    margin: 0;
    font-size: 13px;
    color: var(--muted);
    max-width: 300px;
    line-height: 1.4;
  }

  .prompt-scan-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }

  .preview-reader-card {
    padding: 20px;
    height: 100%;
    overflow-y: auto;
  }
}
</style>
