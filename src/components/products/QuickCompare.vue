<template>
  <Drawer
    v-model:visible="drawerIsOpen"
    position="bottom"
    class="w-full! max-w-full!"
    style="height: auto; max-height: 92dvh"
    @after-hide="emit('close')"
  >
    <template #header>
      <h2 class="text-lg font-bold m-0">{{ t("products.checkPrice") }}</h2>
    </template>

    <template #closebutton="{ closeCallback }">
      <Button
        type="button"
        variant="text"
        severity="secondary"
        rounded
        aria-label="Close price comparison"
        @click="closeCallback"
      >
        <X :size="18" />
      </Button>
    </template>

    <div class="grid gap-4 pb-2">
      <div class="flex flex-wrap items-center gap-2.5">
        <Button
          type="button"
          severity="secondary"
          :disabled="busy"
          class="inline-flex items-center gap-2"
          @click="live = !live"
        >
          <Camera :size="18" />
          <span>{{ live ? "Pause camera" : "Live camera" }}</span>
        </Button>

        <Button
          type="button"
          severity="secondary"
          variant="outlined"
          :disabled="busy"
          class="inline-flex items-center gap-2"
          @click="photoInput?.click()"
        >
          <ImagePlus :size="18" />
          <span>Photo</span>
        </Button>
        <input
          ref="photoInput"
          class="sr-only"
          type="file"
          accept="image/*"
          :disabled="busy"
          aria-label="Upload shelf label photo"
          @change="photo"
        />
      </div>

      <LivePriceCamera v-if="live" @text="apply" @close="live = false">
        <div
          class="grid gap-1.5 p-2.5 rounded-xl bg-[var(--surface)] text-text border border-[var(--border)] shadow-sm"
          role="status"
        >
          <strong>{{ matched?.title || item.title || "Aim at one shelf label" }}</strong>
          <b class="text-xl">{{ parsed ? money(parsed.unitPrice) : "Price not confirmed" }}</b>
          <PriceWarning
            :item="parsed"
            :product="matched"
            :expenses="store.expenses"
          />
          <small v-if="!matched" class="text-xs text-muted">
            No saved match · confirm below to add
          </small>
        </div>
      </LivePriceCamera>

      <template v-if="preview && !live">
        <p class="text-xs text-muted m-0">Tap the shelf label to isolate its name and price.</p>
        <div class="relative w-fit max-w-full mx-auto mb-2">
          <div
            role="button"
            tabindex="0"
            class="relative block w-full overflow-hidden rounded-xl bg-[var(--surface-card)] cursor-crosshair focus-visible:outline-2 focus-visible:outline-accent"
            aria-label="Select shelf label in photo"
            @click="targetPhoto"
            @keydown.enter.prevent="targetPhotoCenter"
          >
            <img :src="preview" alt="Product shelf photo" class="block w-auto max-w-full max-h-[380px]" />
            <span
              class="absolute border-3 border-accent pointer-events-none"
              :style="{
                left: focus.left + '%',
                top: focus.top + '%',
                width: focus.right - focus.left + '%',
                height: focus.bottom - focus.top + '%',
              }"
            />
          </div>
          <div
            class="absolute bottom-2 left-2 right-2 pointer-events-none grid gap-1.5 p-2.5 rounded-xl bg-[var(--surface)] text-text border border-[var(--border)] shadow-sm"
            role="status"
          >
            <strong>{{ matched?.title || item.title || "Select a label" }}</strong>
            <b class="text-xl">{{ parsed ? money(parsed.unitPrice) : "Price not confirmed" }}</b>
            <PriceWarning
              :item="parsed"
              :product="matched"
              :expenses="store.expenses"
            />
          </div>
        </div>
      </template>

      <div v-if="busy" class="flex items-center gap-2 text-sm text-text" role="status">
        <span>{{ status }}</span>
        <Button type="button" variant="link" size="small" @click="controller?.abort()">
          Cancel
        </Button>
      </div>

      <Message v-if="failure" severity="error" :closable="false">
        {{ failure }}
      </Message>

      <p class="text-xs text-muted m-0">
        Confirm the product, price and pack size. Scans do not create expenses.
      </p>

      <div v-if="prices.length > 1" class="grid gap-2">
        <p class="text-sm m-0">More than one price found. Which applies?</p>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="price in prices"
            :key="price"
            type="button"
            severity="secondary"
            @click="
              live = false;
              item.price = (price / 100).toFixed(2);
            "
          >
            {{ money(price) }}
          </Button>
        </div>
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

      <div v-if="item.title.trim() && !matched">
        <Button
          type="button"
          severity="primary"
          :disabled="busy || store.syncBusy"
          @click="addProduct"
        >
          {{ t("products.addProduct") }}
        </Button>
      </div>

      <p v-if="!busy && status" class="text-xs text-muted m-0" role="status">
        {{ status }}
      </p>

      <details v-if="recognized" class="grid gap-2">
        <summary class="cursor-pointer text-sm font-medium text-text">
          {{ t("products.readText") }}
        </summary>
        <pre class="whitespace-pre-wrap break-words text-xs font-mono m-0 pt-2">{{
          recognized
        }}</pre>
      </details>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import {
  computed,
  shallowRef,
  ref,
  onUnmounted,
  useTemplateRef,
} from "vue";
import { X, Camera, ImagePlus } from "lucide-vue-next";
import Drawer from "primevue/drawer";
import Button from "primevue/button";
import Message from "primevue/message";
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
const drawerIsOpen = ref(true);
const photoInput = useTemplateRef<HTMLInputElement>("photoInput");
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

function targetPhotoCenter() {
  if (busy.value) return;
  focus.value = { left: 25, top: 40, right: 75, bottom: 60 };
  void readPhoto();
}

let controller: AbortController | undefined;

onUnmounted(() => {
  controller?.abort();
  if (preview.value) URL.revokeObjectURL(preview.value);
});

function apply(text: string) {
  const result = parsePriceTag(text, store.products);
  recognized.value = text;
  prices.value = result.prices;
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
