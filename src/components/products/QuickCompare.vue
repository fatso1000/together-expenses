<script setup lang="ts">
import {
  computed,
  shallowRef,
  ref,
  onMounted,
  onUnmounted,
  useTemplateRef,
} from "vue";
import { X, Camera, ImagePlus } from "lucide-vue-next";
import type { ItemInput } from "@/lib/types";
import { useExpenses } from "@/stores/expenses";
import { parsePriceTag } from "@/lib/price-tag";
import { findProduct, productId } from "@/lib/products";
import PriceWarning from "@/components/products/PriceWarning.vue";
import { validQuantity, lineTotal } from "@/lib/purchases";
import { money } from "@/lib/finance";
import PurchaseItemRow from "@/components/products/PurchaseItemRow.vue";
import LivePriceCamera from "@/components/products/LivePriceCamera.vue";
import { t } from "@/lib/i18n";
const emit = defineEmits<{ close: [] }>();
const store = useExpenses();
const dialog = useTemplateRef<HTMLDialogElement>("dialog");
const live = shallowRef(false);
const busy = shallowRef(false);
const status = shallowRef("");
const failure = shallowRef("");
const prices = ref<number[]>([]);
const recognized = shallowRef("");
const item = ref<ItemInput>({
  id: "comparison",
  title: "",
  price: "",
  quantity: "1",
  size: "1",
  unit: "each",
  discount: "",
});
const preview = shallowRef("");
const selectedFile = shallowRef<File | null>(null);
const focus = ref({ left: 0, top: 0, right: 100, bottom: 100 });
const matched = computed(
  () =>
    store.products.find((p) => p.id === item.value.productId) ??
    findProduct(store.products, item.value.title),
);
const parsed = computed(() => {
  const price = Number(item.value.price);
  const size = Number(item.value.size);
  if (
    !item.value.price ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(size) ||
    size <= 0
  )
    return null;
  const candidate = {
    id: "comparison",
    title: item.value.title,
    productId: matched.value?.id,
    unitPrice: Math.round(price * 100),
    quantity: Number(item.value.quantity) || 1,
    discount: Math.abs(Math.round(Number(item.value.discount || 0) * 100)),
    size,
    unit: item.value.unit,
  };
  if (
    !validQuantity(candidate.quantity) ||
    !validQuantity(size) ||
    !Number.isFinite(candidate.discount) ||
    lineTotal(candidate) < 0
  )
    return null;
  return candidate;
});
async function addProduct() {
  live.value = false;
  try {
    const title = item.value.title.trim();
    if (!title || matched.value) return;
    const id = productId(title);
    await store.saveProduct({
      id,
      title,
      aliases: [],
      unit: item.value.unit ?? "each",
    });
    item.value.productId = id;
    status.value =
      "Product added. Price history starts when you save a purchase.";
  } catch (reason) {
    failure.value =
      reason instanceof Error ? reason.message : "Could not add product.";
  }
}
function targetPhoto(event: MouseEvent) {
  if (busy.value) return;
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const x =
    event.detail === 0 ? 50 : ((event.clientX - rect.left) / rect.width) * 100;
  const y =
    event.detail === 0 ? 50 : ((event.clientY - rect.top) / rect.height) * 100;
  const left = Math.max(0, Math.min(50, x - 25));
  const top = Math.max(0, Math.min(80, y - 10));
  focus.value = { left, top, right: left + 50, bottom: top + 20 };
  void readPhoto();
}
let controller: AbortController | undefined;
onMounted(() => dialog.value?.showModal());
onUnmounted(() => {
  controller?.abort();
  if (preview.value) URL.revokeObjectURL(preview.value);
});
function apply(text: string) {
  const result = parsePriceTag(text, store.products);
  recognized.value = text;
  prices.value = result.prices;
  // Multiple shelf prices can be regular/member/multibuy prices; require a choice.
  item.value = {
    ...item.value,
    title: result.title,
    productId: result.productId,
    unit: result.unit,
    size: String(result.size),
    price:
      result.prices.length === 1 ? (result.prices[0] / 100).toFixed(2) : "",
    discount: "",
  };
}
async function photo(event: Event) {
  live.value = false;
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (preview.value) URL.revokeObjectURL(preview.value);
  selectedFile.value = file;
  preview.value = URL.createObjectURL(file);
  focus.value = { left: 0, top: 0, right: 100, bottom: 100 };
  input.value = "";
  await readPhoto();
}
async function readPhoto() {
  const file = selectedFile.value;
  if (!file) return;
  controller?.abort();
  controller = new AbortController();
  busy.value = true;
  failure.value = "";
  apply("");
  try {
    const { readReceipt } = await import("@/lib/ocr");
    apply(
      await readReceipt(
        file,
        controller.signal,
        (value) => (status.value = value),
        focus.value,
        "label",
      ),
    );
  } catch (reason) {
    if (!controller.signal.aborted)
      failure.value =
        reason instanceof Error ? reason.message : "Could not read photo.";
  } finally {
    busy.value = false;
  }
}
function reset() {
  live.value = false;
  item.value = {
    id: "comparison",
    title: "",
    price: "",
    quantity: "1",
    unit: "each",
    size: "1",
    discount: "",
  };
  prices.value = [];
}
</script>
<template>
  <dialog
    ref="dialog"
    class="expense-dialog purchase-dialog"
    @cancel.prevent="emit('close')"
  >
    <div class="drawer-handle-bar" aria-hidden="true">
      <div class="drawer-handle" />
    </div>
    <div class="section-heading">
      <h2>{{ t('products.checkPrice') }}</h2>
      <button
        class="icon-button"
        aria-label="Close price comparison"
        @click="emit('close')"
      >
        <X />
      </button>
    </div>
    <div class="entry-actions">
      <button
        type="button"
        class="secondary"
        :disabled="busy"
        @click="live = !live"
      >
        <Camera :size="18" />{{ live ? "Pause camera" : "Live camera" }}</button
      ><label class="secondary upload-button"
        ><ImagePlus :size="18" />Photo<input
          class="sr-only"
          type="file"
          accept="image/*"
          :disabled="busy"
          @change="photo"
      /></label>
    </div>
    <LivePriceCamera v-if="live" @text="apply" @close="live = false">
      <div class="result-overlay" role="status">
        <strong>{{
          matched?.title || item.title || "Aim at one shelf label"
        }}</strong
        ><b>{{ parsed ? money(parsed.unitPrice) : "Price not confirmed" }}</b
        ><PriceWarning
          :item="parsed"
          :product="matched"
          :expenses="store.expenses"
        /><small v-if="!matched">No saved match · confirm below to add</small>
      </div>
    </LivePriceCamera>
    <template v-if="preview && !live">
      <p class="small">Tap the shelf label to isolate its name and price.</p>
      <div class="photo-wrapper">
        <button
          type="button"
          class="photo-stage"
          aria-label="Select shelf label in photo"
          @click="targetPhoto"
        >
          <img :src="preview" alt="Product shelf photo" />
          <span
            class="photo-target"
            :style="{
              left: focus.left + '%',
              top: focus.top + '%',
              width: focus.right - focus.left + '%',
              height: focus.bottom - focus.top + '%',
            }"
          ></span>
        </button>
        <div class="result-overlay static-overlay" role="status">
          <strong>{{ matched?.title || item.title || "Select a label" }}</strong
          ><b>{{ parsed ? money(parsed.unitPrice) : "Price not confirmed" }}</b
          ><PriceWarning
            :item="parsed"
            :product="matched"
            :expenses="store.expenses"
          />
        </div></div
    ></template>
    <p v-if="busy" role="status">
      {{ status }}
      <button class="text-button" @click="controller?.abort()">Cancel</button>
    </p>
    <p v-if="failure" class="error-note" role="alert">{{ failure }}</p>
    <p class="small muted">
      Confirm the product, price and pack size. Scans do not create expenses.
    </p>
    <div v-if="prices.length > 1" class="price-choices">
      <p>More than one price found. Which applies?</p>
      <button
        v-for="price in prices"
        :key="price"
        class="secondary"
        @click="
          live = false;
          item.price = (price / 100).toFixed(2);
        "
      >
        {{ money(price) }}
      </button>
    </div>
    <div @focusin="live = false">
      <PurchaseItemRow
        :item="item"
        :index="0"
        :products="store.products"
        :expenses="store.expenses"
        @change="item = $event"
        @remove="reset"
      />
    </div>
    <button
      v-if="item.title.trim() && !matched"
      type="button"
      :disabled="busy || store.syncBusy"
      @click="addProduct"
    >
      {{ t('products.addProduct') }}
    </button>
    <p v-if="!busy && status" class="small" role="status">{{ status }}</p>
    <details v-if="recognized">
      <summary>{{ t('products.readText') }}</summary>
      <pre>{{ recognized }}</pre>
    </details>
  </dialog>
</template>
<style scoped>
.price-choices {
  margin: 12px 0;
}
.price-choices button {
  margin: 4px;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>

<style scoped>
.result-overlay {
  display: grid;
  gap: 5px;
  padding: 10px;
  background: #fffffff2;
  color: #153d35;
  border-radius: 10px;
  box-shadow: 0 2px 12px #0003;
}
.result-overlay b {
  font-size: 1.25rem;
}
.photo-stage {
  display: block;
  position: relative;
  width: 100%;
  padding: 0;
  overflow: hidden;
  background: #15241d;
}
.photo-stage img {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: 380px;
}
.photo-target {
  position: absolute;
  border: 3px solid #16a36a;
  pointer-events: none;
}
.photo-wrapper {
  width: fit-content;
  max-width: 100%;
  margin-inline: auto;
  position: relative;
  margin-bottom: 16px;
}
.static-overlay {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  pointer-events: none;
}
</style>
