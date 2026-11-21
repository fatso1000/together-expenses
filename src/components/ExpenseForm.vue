<template>
  <Drawer
    v-model:visible="drawerIsOpen"
    position="bottom"
    class="expense-drawer-dialog w-full! max-w-full!"
    style="height: auto; max-height: 94dvh"
    :dismissable="!busy"
    :closeOnEscape="!busy"
    @after-hide="emit('close')"
  >
    <!-- Sticky Drawer Header -->
    <template #header>
      <div class="flex flex-wrap items-center gap-3">
        <h2 class="text-xl font-bold m-0">
          {{ expense ? t("expenses.editExpense") : t("expenses.newExpense") }}
        </h2>
        <Button
          v-if="receipt || receiptImage"
          type="button"
          size="small"
          :severity="dockOpen ? 'primary' : 'secondary'"
          :variant="dockOpen ? undefined : 'outlined'"
          rounded
          class="inline-flex items-center gap-1.5 text-xs"
          @click="toggleDock"
        >
          <FileText :size="14" />
          <span>{{ t("expenses.receiptPreview") }}</span>
          <component :is="dockOpen ? ChevronUp : ChevronDown" :size="14" />
        </Button>
      </div>
    </template>

    <template #closebutton="{ closeCallback }">
      <Button
        class="close-btn"
        variant="text"
        severity="secondary"
        rounded
        :disabled="busy"
        aria-label="Close expense drawer"
        type="button"
        @click="closeCallback"
      >
        <X :size="18" />
      </Button>
    </template>

    <!-- Scrollable Drawer Content -->
    <div class="p-4 sm:px-8 sm:py-5">
      <div class="flex flex-col lg:grid lg:grid-cols-[minmax(460px,1.15fr)_minmax(380px,0.85fr)] gap-6 lg:gap-8 items-start">
        <!-- LEFT COLUMN: Form controls -->
        <div class="flex flex-col gap-4 min-w-0 w-full">
          <!-- Mode Tabs -->
          <div
            class="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--input-bg)] border border-[var(--border)]"
            aria-label="Entry method"
          >
            <Button
              type="button"
              size="small"
              :severity="mode === 'quick' ? 'primary' : 'secondary'"
              :variant="mode === 'quick' ? undefined : 'text'"
              :aria-pressed="mode === 'quick'"
              class="inline-flex items-center justify-center gap-1.5"
              @click="mode = 'quick'"
            >
              <Zap :size="17" />
              <span>{{ t("dashboard.quickAmount") }}</span>
            </Button>
            <Button
              type="button"
              size="small"
              :severity="mode === 'items' ? 'primary' : 'secondary'"
              :variant="mode === 'items' ? undefined : 'text'"
              :aria-pressed="mode === 'items'"
              class="inline-flex items-center justify-center gap-1.5"
              @click="mode = 'items'"
            >
              <ListPlus :size="17" />
              <span>{{ t("dashboard.addItems") }}</span>
            </Button>
            <Button
              type="button"
              size="small"
              :severity="mode === 'receipt' ? 'primary' : 'secondary'"
              :variant="mode === 'receipt' ? undefined : 'text'"
              :aria-pressed="mode === 'receipt'"
              class="inline-flex items-center justify-center gap-1.5"
              @click="mode = 'receipt'"
            >
              <ScanLine :size="17" />
              <span>{{ t("dashboard.scanReceipt") }}</span>
            </Button>
          </div>

          <!-- Mobile Quick Receipt Preview Dock -->
          <section
            v-if="receipt || receiptImage"
            ref="dockRef"
            class="lg:hidden rounded-xl bg-[var(--surface-card)] border border-[var(--border)] overflow-hidden"
          >
            <div class="flex items-center justify-between px-3 py-2 bg-[var(--surface-card-hover)] border-b border-[var(--border)]">
              <div class="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="small"
                  :severity="previewTab === 'transcript' ? 'primary' : 'secondary'"
                  :variant="previewTab === 'transcript' ? undefined : 'text'"
                  class="inline-flex items-center gap-1.5 text-xs"
                  @click="
                    previewTab = 'transcript';
                    dockOpen = true;
                  "
                >
                  <FileText :size="14" />
                  <span>{{ t("expenses.transcriptTab") }}</span>
                </Button>
                <Button
                  v-if="receiptImage"
                  type="button"
                  size="small"
                  :severity="previewTab === 'image' ? 'primary' : 'secondary'"
                  :variant="previewTab === 'image' ? undefined : 'text'"
                  class="inline-flex items-center gap-1.5 text-xs"
                  @click="
                    previewTab = 'image';
                    dockOpen = true;
                  "
                >
                  <ImageIcon :size="14" />
                  <span>{{ t("expenses.photoTab") }}</span>
                </Button>
              </div>
              <div class="flex items-center gap-1.5">
                <Button
                  v-if="previewTab === 'image'"
                  type="button"
                  size="small"
                  severity="secondary"
                  variant="outlined"
                  class="inline-flex items-center gap-1 text-xs"
                  @click="isZoomed = !isZoomed"
                >
                  <component :is="isZoomed ? ZoomOut : ZoomIn" :size="14" />
                  <span>{{ isZoomed ? t("expenses.zoomOut") : t("expenses.zoomIn") }}</span>
                </Button>
                <Button
                  v-if="previewTab === 'transcript'"
                  type="button"
                  size="small"
                  severity="secondary"
                  variant="outlined"
                  class="inline-flex items-center gap-1 text-xs"
                  @click="copyTranscript"
                >
                  <component :is="copySuccess ? Check : Copy" :size="14" />
                  <span>{{ copySuccess ? t("expenses.copied") : t("expenses.copy") }}</span>
                </Button>
                <Button
                  type="button"
                  size="small"
                  variant="text"
                  class="text-xs"
                  @click="dockOpen = !dockOpen"
                >
                  {{ dockOpen ? t("common.close") : t("common.view") }}
                </Button>
              </div>
            </div>

            <div v-if="dockOpen" class="p-3 max-h-60 overflow-y-auto">
              <div
                v-if="previewTab === 'transcript'"
                class="cursor-copy"
                title="Click to copy transcript"
                @click="copyTranscript"
              >
                <pre class="m-0 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">{{
                  receipt?.text || "No transcript available."
                }}</pre>
              </div>
              <div
                v-else-if="previewTab === 'image' && receiptImage"
                class="flex justify-center"
                :class="isZoomed ? 'cursor-zoom-out overflow-auto' : 'cursor-zoom-in overflow-hidden'"
                title="Click image to zoom in/out"
                @click="isZoomed = !isZoomed"
              >
                <img
                  :src="receiptImage"
                  alt="Scanned receipt preview"
                  class="block mx-auto rounded-lg object-contain transition-transform"
                  :class="isZoomed ? 'w-[220%] max-w-none max-h-none cursor-zoom-out' : 'max-w-full max-h-52'"
                />
              </div>
            </div>
          </section>

          <!-- Receipt Reader (Scanner) on small screen when in receipt mode -->
          <div v-if="mode === 'receipt'" class="lg:hidden">
            <ReceiptReader @result="applyReceipt" />
          </div>

          <!-- Form Inputs -->
          <form class="grid gap-4" @submit.prevent="submit">
            <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
              <span>{{ t("expenses.merchant") }}</span>
              <InputText
                v-model="form.merchant"
                list="saved-shops"
                maxlength="100"
                :placeholder="t('shops.placeholder')"
                required
                fluid
              />
            </label>
            <datalist id="saved-shops">
              <option
                v-for="shop in store.shops"
                :key="shop.id"
                :value="shop.name"
              />
            </datalist>

            <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
              <label for="expense-date">{{ t("expenses.date") }}</label>
              <DatePicker
                id="expense-date"
                inputId="expense-date"
                v-model="selectedDate"
                dateFormat="yy-mm-dd"
                :maxDate="maxDate"
                :minDate="minDate"
                showIcon
                iconDisplay="input"
                fluid
                required
              />
            </div>

            <!-- Account Selector (Global vs NZ Savings) -->
            <div class="flex flex-col gap-2">
              <label for="account-select" class="text-xs font-semibold text-text">
                {{ t("bulk.paidFrom") }}
              </label>
              <Select
                id="account-select"
                inputId="account-select"
                v-model="form.accountId"
                :options="accountOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="t('bulk.paidFrom')"
                fluid
              >
                <template #value="slotProps">
                  <div v-if="slotProps.value" class="flex items-center gap-2">
                    <component
                      :is="slotProps.value === 'global' ? Wallet : PiggyBank"
                      :size="16"
                      class="text-accent"
                    />
                    <span>{{
                      slotProps.value === "global"
                        ? t("accounts.globalEveryday")
                        : t("accounts.nzSavings")
                    }}</span>
                  </div>
                </template>
                <template #option="slotProps">
                  <div class="flex items-center gap-2.5">
                    <component
                      :is="slotProps.option.value === 'global' ? Wallet : PiggyBank"
                      :size="16"
                      class="text-accent"
                    />
                    <div class="flex flex-col">
                      <span class="font-medium">{{ slotProps.option.label }}</span>
                      <small class="text-[11px] text-muted">{{ slotProps.option.hint }}</small>
                    </div>
                  </div>
                </template>
              </Select>
            </div>

            <!-- Category Picker with Custom Categories -->
            <fieldset class="border-0 p-0 m-0 grid gap-2.5">
              <div class="flex items-center justify-between gap-2">
                <legend class="text-xs font-semibold text-text m-0">
                  {{ t("expenses.category") }}
                </legend>
                <Button
                  type="button"
                  size="small"
                  severity="secondary"
                  variant="outlined"
                  class="inline-flex items-center gap-1"
                  @click="openCategoryManager(true)"
                >
                  <Plus :size="14" />
                  <span>{{ t("categories.newCategory") }}</span>
                </Button>
              </div>

              <Select
                id="category-select"
                inputId="category-select"
                v-model="form.category"
                :options="categoryOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="t('expenses.category')"
                fluid
              >
                <template #value="slotProps">
                  <div v-if="slotProps.value" class="flex items-center gap-2">
                    <CategoryIcon :category="slotProps.value" :size="18" />
                    <span>{{ categoryLabel(slotProps.value) }}</span>
                  </div>
                  <span v-else>{{ slotProps.placeholder }}</span>
                </template>
                <template #option="slotProps">
                  <div class="flex items-center gap-2">
                    <CategoryIcon :category="slotProps.option.value" :size="18" />
                    <span>{{ slotProps.option.label }}</span>
                  </div>
                </template>
              </Select>

              <div class="grid grid-cols-5 gap-1.5">
                <Button
                  v-for="catDef in store.categoryDefinitions"
                  :key="catDef.id"
                  type="button"
                  severity="secondary"
                  variant="outlined"
                  :aria-pressed="form.category === catDef.name"
                  :style="categorySurfaceStyle(catDef.color, { selected: form.category === catDef.name })"
                  class="flex-col! gap-1.5! py-2! px-1! min-h-[70px]! text-[11px]! text-text! transition-all!"
                  :class="form.category === catDef.name ? 'font-semibold!' : 'font-medium!'"
                  @click="form.category = catDef.name"
                >
                  <CategoryIcon :category="catDef.name" :size="20" bare />
                  <span class="truncate max-w-full">{{ categoryLabel(catDef.name) }}</span>
                </Button>
                <Button
                  type="button"
                  severity="secondary"
                  variant="outlined"
                  class="flex-col! gap-1! py-2! px-1! min-h-[70px]! text-[11px]! border-dashed!"
                  :title="t('categories.newCategory')"
                  @click="openCategoryManager(true)"
                >
                  <Plus :size="20" />
                  <span class="truncate max-w-full">{{ t("categories.newCategory") }}</span>
                </Button>
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
              <div v-if="lines.length" class="my-1">
                <label class="flex flex-col gap-1 text-xs font-medium text-muted">
                  <span>{{ t("expenses.discountFieldLabel") }}</span>
                  <InputText
                    v-model="discount"
                    inputmode="decimal"
                    placeholder="0.00"
                    fluid
                  />
                  <small class="text-[11px] text-muted">
                    {{ t("expenses.discountHint") }}
                  </small>
                </label>
              </div>
            </template>

            <!-- Quick Amount Input -->
            <label
              v-if="!itemized && mode !== 'items'"
              class="flex flex-col gap-1.5 text-xs font-medium text-muted"
            >
              <span>Total · {{ form.currency }}</span>
              <InputText
                v-model="form.amount"
                class="text-3xl! font-bold! h-16! font-heading!"
                inputmode="decimal"
                placeholder="0.00"
                required
                fluid
              />
            </label>

            <!-- Itemized Total Breakdown -->
            <div
              v-else-if="itemized"
              class="grid gap-1.5 p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
            >
              <div v-if="discountCents() > 0" class="flex justify-between text-xs text-muted">
                <span>{{ t("expenses.itemsSubtotal") }}</span>
                <span>{{ money(linesSubtotal, form.currency) }}</span>
              </div>
              <div
                v-if="discountCents() > 0"
                class="flex justify-between text-xs font-medium text-[var(--danger-colour)]"
              >
                <span>{{ t("expenses.receiptDiscount") }}</span>
                <span>-{{ money(discountCents(), form.currency) }}</span>
              </div>
              <div class="flex items-center justify-between pt-1">
                <span class="text-sm text-text">Total</span>
                <strong class="text-xl font-bold tabular-nums font-heading">
                  {{ calculated === null ? "Check items" : money(calculated, form.currency) }}
                </strong>
              </div>
            </div>

            <!-- Receipt Review Section -->
            <div
              v-if="receipt"
              class="p-3 rounded-xl bg-[var(--pill-bg)] border border-[var(--border)] grid gap-2"
            >
              <p v-if="receiptNote" class="text-xs m-0">{{ receiptNote }}</p>
              <p v-if="receipt.amount !== null" class="text-sm m-0">
                {{ t("expenses.receiptTotal") }}
                <strong>{{ money(receipt.amount, form.currency) }}</strong>
              </p>
              <Message v-if="totalMismatch" severity="error" :closable="false">
                {{ t("expenses.itemsMismatch") }}
              </Message>
              <p v-if="!receipt.date" class="text-xs text-muted m-0">
                Date not detected — check the date above.
              </p>
              <div class="flex items-center gap-2">
                <Checkbox v-model="reviewed" binary inputId="reviewed-check" />
                <label for="reviewed-check" class="text-xs text-muted cursor-pointer">
                  {{ t("expenses.checkItemsPrompt") }}
                </label>
              </div>
            </div>

            <details class="grid gap-2">
              <summary class="cursor-pointer text-sm font-medium text-text py-1">
                {{ t("expenses.notes") }}
              </summary>
              <Textarea
                v-model="form.note"
                maxlength="500"
                rows="2"
                :aria-label="t('expenses.notes')"
                fluid
                class="mt-2"
              />
            </details>

            <Message v-if="error" severity="error" :closable="false">
              {{ error }}
            </Message>

            <div class="mt-2">
              <Button class="primary" fluid :disabled="busy" type="submit">
                {{ busy ? t("common.saving") : t("common.save") }}
              </Button>
            </div>
          </form>
        </div>

        <!-- RIGHT COLUMN: Receipt Photo & Transcript Stage (Desktop / Wide Screen) -->
        <aside class="hidden lg:flex flex-col sticky top-0 max-h-[calc(94dvh-120px)] w-full bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
          <!-- When Receipt or Photo Exists -->
          <div v-if="receipt || receiptImage" class="flex flex-col h-full min-h-[500px]">
            <div class="flex items-center justify-between px-3.5 py-2.5 bg-[var(--surface-card-hover)] border-b border-[var(--border)]">
              <div class="flex items-center gap-2">
                <Button
                  v-if="receiptImage"
                  type="button"
                  size="small"
                  :severity="previewTab === 'image' ? 'primary' : 'secondary'"
                  :variant="previewTab === 'image' ? undefined : 'text'"
                  class="inline-flex items-center gap-1.5"
                  @click="previewTab = 'image'"
                >
                  <ImageIcon :size="15" />
                  <span>{{ t("expenses.photoTab") }}</span>
                </Button>
                <Button
                  type="button"
                  size="small"
                  :severity="previewTab === 'transcript' ? 'primary' : 'secondary'"
                  :variant="previewTab === 'transcript' ? undefined : 'text'"
                  class="inline-flex items-center gap-1.5"
                  @click="previewTab = 'transcript'"
                >
                  <FileText :size="15" />
                  <span>{{ t("expenses.transcriptTab") }}</span>
                </Button>
              </div>

              <div class="flex items-center gap-1.5">
                <Button
                  v-if="previewTab === 'image'"
                  type="button"
                  size="small"
                  severity="secondary"
                  variant="outlined"
                  :title="isZoomed ? t('expenses.zoomOut') : t('expenses.zoomIn')"
                  class="inline-flex items-center gap-1"
                  @click="isZoomed = !isZoomed"
                >
                  <component :is="isZoomed ? ZoomOut : ZoomIn" :size="14" />
                  <span>{{ isZoomed ? t("expenses.zoomOut") : t("expenses.zoomIn") }}</span>
                </Button>
                <Button
                  v-if="previewTab === 'transcript'"
                  type="button"
                  size="small"
                  severity="secondary"
                  variant="outlined"
                  title="Copy transcript text to clipboard"
                  class="inline-flex items-center gap-1"
                  @click="copyTranscript"
                >
                  <component :is="copySuccess ? Check : Copy" :size="14" />
                  <span>{{ copySuccess ? t("expenses.copied") : t("expenses.copy") }}</span>
                </Button>
              </div>
            </div>

            <!-- Photo Viewer -->
            <div
              v-if="previewTab === 'image' && receiptImage"
              class="flex-1 overflow-auto p-4 flex flex-col relative bg-[var(--surface-card)] min-h-[440px]"
              :class="isZoomed ? 'cursor-zoom-out items-start justify-start' : 'cursor-zoom-in items-center justify-center'"
              title="Click photo to zoom in or out"
              @click="isZoomed = !isZoomed"
            >
              <img
                :src="receiptImage"
                alt="Scanned receipt photo preview"
                class="block rounded-lg shadow-sm transition-transform"
                :class="
                  isZoomed
                    ? 'w-[220%] max-w-none max-h-none cursor-zoom-out'
                    : 'max-w-full max-h-[calc(94dvh-220px)] object-contain'
                "
              />
              <span class="absolute bottom-3 right-3 bg-black/70 text-white text-[11px] px-2 py-1 rounded pointer-events-none">
                {{ isZoomed ? t("expenses.clickZoomOut") : t("expenses.clickZoomIn") }}
              </span>
            </div>

            <!-- Transcript Viewer -->
            <div
              v-else-if="previewTab === 'transcript'"
              class="flex-1 overflow-y-auto p-4 bg-[var(--surface)] cursor-copy"
              title="Click to copy transcript"
              @click="copyTranscript"
            >
              <pre class="m-0 font-mono text-xs leading-relaxed whitespace-pre-wrap">{{
                receipt?.text || "No transcript available."
              }}</pre>
            </div>
          </div>

          <!-- When in Receipt Scan Mode on Desktop -->
          <div v-else-if="mode === 'receipt'" class="p-5 h-full overflow-y-auto">
            <ReceiptReader @result="applyReceipt" />
          </div>

          <!-- Empty Preview Prompt on Desktop -->
          <div
            v-else
            class="flex flex-col items-center justify-center text-center p-10 gap-3.5 h-full min-h-[440px]"
          >
            <div class="w-18 h-18 rounded-2xl bg-[var(--success-bg)] text-accent flex items-center justify-center">
              <ScanLine :size="38" />
            </div>
            <h3 class="text-lg font-bold m-0 text-text">
              {{ t("expenses.receiptStagePrompt") }}
            </h3>
            <p class="text-xs text-muted m-0 max-w-xs leading-relaxed">
              {{ t("expenses.receiptStageDesc") }}
            </p>
            <Button
              type="button"
              severity="secondary"
              class="inline-flex items-center gap-2 mt-1"
              @click="mode = 'receipt'"
            >
              <ScanLine :size="16" />
              <span>{{ t("expenses.scanReceiptNow") }}</span>
            </Button>
          </div>
        </aside>
      </div>
    </div>

    <!-- Inline Category Manager Bottom Drawer -->
    <Drawer
      v-model:visible="showCategoryManager"
      position="bottom"
      class="w-full! max-w-full!"
      style="height: auto; max-height: 85dvh"
    >
      <template #header>
        <h3 class="text-lg font-bold m-0">{{ t("categories.title") }}</h3>
      </template>
      <template #closebutton="{ closeCallback }">
        <Button
          type="button"
          variant="text"
          severity="secondary"
          rounded
          aria-label="Close category manager"
          @click="closeCallback"
        >
          <X :size="18" />
        </Button>
      </template>
      <CategoryManager
        :start-in-create-mode="categoryCreateMode"
        @close="showCategoryManager = false"
        @created="onCategoryCreated"
      />
    </Drawer>
  </Drawer>
</template>

<script setup lang="ts">
import { reactive, ref, shallowRef, computed, useTemplateRef } from "vue";
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
import {
  parseMoney,
  signedMoney,
  today,
  money,
  parseIsoDate,
  formatIsoDate,
} from "@/lib/finance";
import { itemsTotal, validQuantity } from "@/lib/purchases";
import { findProduct, normalizeUnit } from "@/lib/products";
import { type ReceiptSuggestion } from "@/lib/receipt";
import { t, categoryLabel } from "@/lib/i18n";
import { categorySurfaceStyle } from "@/lib/category-style";
import CategoryIcon from "@/components/CategoryIcon.vue";
import ItemEditor from "@/components/ItemEditor.vue";
import ReceiptReader from "@/components/ReceiptReader.vue";
import CategoryManager from "@/components/CategoryManager.vue";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import DatePicker from "primevue/datepicker";
import Select from "primevue/select";
import Checkbox from "primevue/checkbox";
import Message from "primevue/message";

const props = defineProps<{ expense?: Expense }>();
const emit = defineEmits<{ close: [] }>();
const store = useExpenses();
const source = props.expense ?? store.repeat;
const drawerIsOpen = ref(true);

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

const maxDate = new Date();
const minDate = new Date(2000, 0, 1);

const selectedDate = computed<Date | null>({
  get() {
    return parseIsoDate(form.date);
  },
  set(val: Date | null) {
    form.date = formatIsoDate(val);
  },
});

const categoryOptions = computed(() =>
  store.categoryDefinitions.map((catDef) => ({
    label: categoryLabel(catDef.name),
    value: catDef.name,
  })),
);

const accountOptions = computed(() => [
  {
    value: "global" as AccountId,
    label: t("accounts.globalEveryday"),
    hint: "Everyday capital & weekly limit",
  },
  {
    value: "nz" as AccountId,
    label: t("accounts.nzSavings"),
    hint: t("accounts.salarySavings"),
  },
]);

const lines = ref<ItemInput[]>(
  (source?.items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    price: (item.unitPrice / 100).toFixed(2),
    quantity: String(item.quantity),
    productId: item.productId,
    unit: normalizeUnit(item.unit),
    size: String(item.size ?? 1),
    discount: item.discount ? (item.discount / 100).toFixed(2) : "",
  })),
);

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
      unit: normalizeUnit(item.unit),
      discount: itemDiscount,
      ...(product ? { productId: product.id } : {}),
    };
  });
}

function discountCents(): number {
  try {
    const trimmed = discount.value.trim();
    if (!trimmed || /^0(?:\.0{1,2})?$/.test(trimmed)) return 0;
    return Math.abs(signedMoney(trimmed));
  } catch {
    return 0;
  }
}

const linesSubtotal = computed(() => {
  try {
    return itemsTotal(readLines());
  } catch {
    return 0;
  }
});

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
    unit: normalizeUnit(item.unit),
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
