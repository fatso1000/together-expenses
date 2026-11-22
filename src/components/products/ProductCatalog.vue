<template>
  <div class="grid gap-4">
    <Button
      type="button"
      severity="primary"
      fluid
      class="inline-flex items-center justify-center gap-2"
      @click="comparing = true"
    >
      <Scale :size="18" />
      <span>Check a price · camera or type</span>
    </Button>
    <QuickCompare v-if="comparing" @close="comparing = false" />

    <!-- Dedicated, Separated Header Section -->
    <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm grid gap-3.5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="flex items-center gap-2 text-lg font-bold text-text m-0">
            <Scale :size="20" class="text-accent" />
            <span>Product Catalog</span>
          </h2>
          <p class="text-xs text-muted m-0 mt-1">
            {{ store.products.length }} products recorded across past purchases
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            severity="secondary"
            size="small"
            class="inline-flex items-center gap-1.5"
            @click="add"
          >
            <Plus :size="16" />
            <span>{{ t("products.newProduct") }}</span>
          </Button>
          <RouterLink class="text-xs font-semibold text-accent no-underline hover:underline" to="/shops">
            {{ t("products.manageShops") }}
          </RouterLink>
        </div>
      </div>

      <!-- Compact Search Toolbar -->
      <div class="grid gap-2.5">
        <div class="relative flex items-center gap-2">
          <IconField class="flex-1">
            <InputIcon>
              <Search :size="16" />
            </InputIcon>
            <InputText
              v-model="query"
              type="search"
              :placeholder="t('products.searchPlaceholder')"
              :aria-label="t('products.searchPlaceholder')"
              fluid
            />
          </IconField>
          <Button
            v-if="query"
            type="button"
            variant="text"
            severity="secondary"
            rounded
            size="small"
            aria-label="Clear search"
            @click="query = ''"
          >
            <X :size="14" />
          </Button>
        </div>

        <!-- Quick Measure Unit Filter Pills -->
        <div class="flex flex-nowrap sm:flex-wrap overflow-x-auto pb-1 gap-1.5" aria-label="Filter by unit">
          <Button
            type="button"
            size="small"
            rounded
            class="shrink-0"
            :severity="selectedUnit === 'all' ? 'primary' : 'secondary'"
            :variant="selectedUnit === 'all' ? undefined : 'outlined'"
            @click="selectedUnit = 'all'"
          >
            {{ t("common.all") }}
          </Button>
          <Button
            v-for="u in units.slice(0, 5)"
            :key="u.value"
            type="button"
            size="small"
            rounded
            class="shrink-0"
            :severity="selectedUnit === u.value ? 'primary' : 'secondary'"
            :variant="selectedUnit === u.value ? undefined : 'outlined'"
            @click="selectedUnit = u.value"
          >
            {{ u.label }}
          </Button>
        </div>

        <!-- Live Count Status -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">
            {{ t("products.showingCount", { count: filtered.length, total: store.products.length }) }}
          </span>
        </div>
      </div>
    </section>

    <!-- Product Edit/New Form -->
    <form
      v-if="editing"
      class="rounded-2xl border-2 border-accent bg-[var(--surface)] p-4 md:p-6 shadow-sm grid gap-4"
      @submit.prevent="save"
    >
      <h3 class="text-base font-bold text-text m-0">
        {{ editing.id ? t("products.editProduct") : t("products.newProduct") }}
      </h3>
      <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
        <span>{{ t("products.productName") }}</span>
        <InputText v-model="editing.title" maxlength="100" required autofocus fluid />
      </label>
      <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
        <label for="product-unit-select">{{ t("products.usualMeasure") }}</label>
        <Select
          v-model="editing.unit"
          inputId="product-unit-select"
          :options="units"
          optionLabel="label"
          optionValue="value"
          fluid
        />
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <Button type="submit" severity="primary" :disabled="busy">
          {{ t("products.saveProduct") }}
        </Button>
        <Button type="button" severity="secondary" variant="outlined" @click="editing = null">
          {{ t("common.cancel") }}
        </Button>
      </div>

      <details
        v-if="store.products.some((product) => product.id === editing?.id)"
        class="grid gap-3 pt-2"
      >
        <summary class="cursor-pointer text-sm font-medium text-text">
          {{ t("products.mergeDuplicate") }}
        </summary>
        <div class="grid gap-3 pt-2">
          <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
            <label for="merge-product-select">{{ t("products.keepExisting") }}</label>
            <Select
              v-model="merging"
              inputId="merge-product-select"
              :options="mergeOptions"
              optionLabel="label"
              optionValue="value"
              fluid
            />
          </div>
          <p class="text-xs text-muted m-0">
            Combines price history and remembered receipt names. Purchase amounts stay the same.
          </p>
          <div>
            <Button
              type="button"
              severity="secondary"
              :disabled="!merging || busy"
              @click="merge"
            >
              {{ t("products.mergeProducts") }}
            </Button>
          </div>
        </div>
      </details>
    </form>

    <Message v-if="failure" severity="error" :closable="false">
      {{ failure }}
    </Message>

    <!-- Compact Product List Container -->
    <section
      v-if="filtered.length"
      class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 shadow-sm"
    >
      <div class="grid divide-y divide-[var(--border)]">
        <article
          v-for="product in filtered"
          :key="product.id"
          class="py-3 px-1.5 transition-colors"
          :class="expanded === product.id ? 'bg-[var(--surface-card)] rounded-xl px-3 my-1' : ''"
        >
          <div class="flex flex-wrap items-center justify-between gap-2.5">
            <div class="flex flex-wrap items-center gap-2">
              <strong class="text-sm font-bold text-text">{{ product.title }}</strong>
              <Tag :value="product.unit" severity="secondary" />
              <div v-if="product.aliases.length" class="flex flex-wrap items-center gap-1">
                <Tag
                  v-for="alias in product.aliases.slice(0, 3)"
                  :key="alias"
                  :value="alias"
                  severity="secondary"
                />
                <span v-if="product.aliases.length > 3" class="text-xs text-muted">
                  +{{ product.aliases.length - 3 }} more
                </span>
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <Button
                severity="secondary"
                variant="outlined"
                size="small"
                type="button"
                class="inline-flex items-center gap-1"
                @click="expanded = expanded === product.id ? '' : product.id"
              >
                <span>
                  {{ expanded === product.id ? t("products.hidePrices") : t("products.showPrices") }}
                </span>
                <component
                  :is="expanded === product.id ? ChevronUp : ChevronDown"
                  :size="14"
                />
              </Button>
              <Button
                variant="text"
                severity="secondary"
                rounded
                size="small"
                :aria-label="`Edit product ${product.title}`"
                type="button"
                @click="editing = { ...product, aliases: [...product.aliases] }"
              >
                <Pencil :size="16" />
              </Button>
              <Button
                variant="text"
                severity="danger"
                rounded
                size="small"
                :aria-label="`Remove product ${product.title}`"
                type="button"
                @click="removing = product.id"
              >
                <Trash2 :size="16" />
              </Button>
            </div>
          </div>

          <!-- Inline Delete Confirmation -->
          <div
            v-if="removing === product.id"
            class="mt-2.5 p-3 rounded-xl bg-[var(--pill-bg)] border border-[var(--border)] grid gap-2"
          >
            <p class="text-xs text-text m-0">
              {{ t("products.confirmDeleteProduct", { name: product.title }) }}
            </p>
            <div class="flex items-center gap-2">
              <Button type="button" severity="secondary" size="small" @click="removing = ''">
                {{ t("common.cancel") }}
              </Button>
              <Button
                type="button"
                severity="danger"
                size="small"
                :disabled="busy"
                @click="
                  run(async () => {
                    await store.removeProduct(product.id);
                    removing = '';
                  })
                "
              >
                {{ t("common.delete") }}
              </Button>
            </div>
          </div>

          <!-- Expandable Price History Subpanel -->
          <div
            v-if="expanded === product.id"
            class="mt-3 pt-3 border-t border-[var(--border)]"
          >
            <ProductPrices
              :product="product"
              :products="store.products"
              :expenses="store.expenses"
            />
          </div>
        </article>
      </div>
    </section>

    <!-- Empty state -->
    <p
      v-else
      class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-xs text-muted m-0"
    >
      {{
        query
          ? "No matching products found. Try another search or create one above."
          : "Products appear when you save purchases. You can also add one above."
      }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  Plus,
  Pencil,
  Trash2,
  Scale,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-vue-next";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import Select from "primevue/select";
import Tag from "primevue/tag";
import Message from "primevue/message";
import { useExpenses, friendlyError } from "@/stores/expenses";
import type { Product } from "@/lib/types";
import { units, productId, normalizeName } from "@/lib/products";
import { t } from "@/lib/i18n";
import QuickCompare from "@/components/products/QuickCompare.vue";
import ProductPrices from "@/components/products/ProductPrices.vue";

const store = useExpenses();
const comparing = shallowRef(false);
const query = shallowRef("");
const selectedUnit = shallowRef<string>("all");
const editing = ref<Product | null>(null);
const failure = shallowRef("");
const busy = shallowRef(false);
const expanded = shallowRef("");
const removing = shallowRef("");
const merging = shallowRef("");

const indexedProducts = computed(() => {
  return store.products.map((product) => ({
    product,
    searchString: normalizeName(`${product.title} ${product.aliases.join(" ")}`),
  }));
});

const filtered = computed(() => {
  const q = normalizeName(query.value);
  const unit = selectedUnit.value;

  const result = indexedProducts.value
    .filter(({ product, searchString }) => {
      const matchesUnit = unit === "all" || product.unit === unit;
      if (!matchesUnit) return false;

      if (!q) return true;
      return searchString.includes(q);
    })
    .map(({ product }) => product);

  return [...result].sort((a, b) => a.title.localeCompare(b.title));
});

const mergeOptions = computed(() => [
  { value: "", label: t("products.chooseProduct") },
  ...store.products
    .filter((product) => product.id !== editing.value?.id)
    .map((product) => ({ value: product.id, label: product.title })),
]);

function add() {
  editing.value = { id: "", title: "", aliases: [], unit: "each" };
}

async function run(action: () => Promise<void>) {
  busy.value = true;
  failure.value = "";
  try {
    await action();
  } catch (reason) {
    failure.value = friendlyError(reason);
  } finally {
    busy.value = false;
  }
}

async function save() {
  const product = editing.value;
  if (!product) return;
  await run(async () => {
    await store.saveProduct({
      ...product,
      title: product.title.trim(),
      id: product.id || productId(product.title),
    });
    editing.value = null;
  });
}

async function merge() {
  if (!editing.value || !merging.value) return;
  await run(async () => {
    await store.mergeProducts(editing.value!.id, merging.value);
    editing.value = null;
    merging.value = "";
  });
}
</script>
