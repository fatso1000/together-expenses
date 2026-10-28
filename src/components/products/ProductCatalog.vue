<script setup lang="ts">
import { computed, shallowRef, ref } from "vue";
import {
  Plus,
  Pencil,
  Trash2,
  Scale,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
} from "lucide-vue-next";
import { useExpenses, friendlyError } from "@/stores/expenses";
import type { Product, Unit } from "@/lib/types";
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

// Pre-normalize product search index for high-performance filtering
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

<template>
  <button class="primary compare-launch" @click="comparing = true">
    <Scale :size="18" />Check a price · camera or type
  </button>
  <QuickCompare v-if="comparing" @close="comparing = false" />

  <!-- Dedicated, Separated Header Section -->
  <section class="panel catalog-header-panel">
    <div class="section-heading">
      <div>
        <h2><Scale :size="20" />Product Catalog</h2>
        <p class="small muted">
          {{ store.products.length }} products recorded across past purchases
        </p>
      </div>
      <div class="header-actions">
        <button class="secondary compact-btn" @click="add">
          <Plus :size="16" />{{ t('products.newProduct') }}
        </button>
        <RouterLink class="text-button" to="/shops">{{ t('products.manageShops') }}</RouterLink>
      </div>
    </div>

    <!-- Compact Search Toolbar -->
    <div class="search-toolbar">
      <div class="search-input-wrap">
        <Search :size="16" class="search-icon" />
        <input
          v-model="query"
          type="search"
          :placeholder="t('products.searchPlaceholder')"
          class="compact-search-input"
        />
        <button
          v-if="query"
          type="button"
          class="clear-btn"
          aria-label="Clear search"
          @click="query = ''"
        >
          <X :size="14" />
        </button>
      </div>

      <!-- Quick Measure Unit Filter Pills -->
      <div class="unit-pills" aria-label="Filter by unit">
        <button
          type="button"
          class="unit-pill"
          :class="{ selected: selectedUnit === 'all' }"
          @click="selectedUnit = 'all'"
        >
          {{ t('common.all') }}
        </button>
        <button
          v-for="u in units.slice(0, 5)"
          :key="u.value"
          type="button"
          class="unit-pill"
          :class="{ selected: selectedUnit === u.value }"
          @click="selectedUnit = u.value"
        >
          {{ u.label }}
        </button>
      </div>

      <!-- Live Count Status -->
      <div class="search-status-bar">
        <span class="small muted">
          {{ t('products.showingCount', { count: filtered.length, total: store.products.length }) }}
        </span>
      </div>
    </div>
  </section>

  <!-- Product Edit/New Form Modal or Drawer -->
  <form v-if="editing" class="panel edit-product-form" @submit.prevent="save">
    <h3>{{ editing.id ? t('products.editProduct') : t('products.newProduct') }}</h3>
    <label>
      {{ t('products.productName') }}
      <input v-model="editing.title" maxlength="100" required autofocus />
    </label>
    <label>
      {{ t('products.usualMeasure') }}
      <select v-model="editing.unit">
        <option v-for="unit in units" :key="unit.value" :value="unit.value">
          {{ unit.label }}
        </option>
      </select>
    </label>
    <div class="entry-actions">
      <button class="primary" :disabled="busy">{{ t('products.saveProduct') }}</button>
      <button type="button" class="secondary" @click="editing = null">
        {{ t('common.cancel') }}
      </button>
    </div>

    <details v-if="store.products.some((product) => product.id === editing?.id)">
      <summary>{{ t('products.mergeDuplicate') }}</summary>
      <label>
        {{ t('products.keepExisting') }}
        <select v-model="merging">
          <option value="">{{ t('products.chooseProduct') }}</option>
          <option
            v-for="product in store.products.filter(
              (product) => product.id !== editing?.id,
            )"
            :key="product.id"
            :value="product.id"
          >
            {{ product.title }}
          </option>
        </select>
      </label>
      <p class="small muted">
        Combines price history and remembered receipt names. Purchase amounts stay the same.
      </p>
      <button
        type="button"
        class="secondary"
        :disabled="!merging || busy"
        @click="merge"
      >
        {{ t('products.mergeProducts') }}
      </button>
    </details>
  </form>

  <p v-if="failure" class="error-note" role="alert">{{ failure }}</p>

  <!-- Compact Product List Container -->
  <section v-if="filtered.length" class="panel compact-catalog-panel">
    <div class="compact-product-list">
      <article
        v-for="product in filtered"
        :key="product.id"
        class="compact-product-row"
        :class="{ expanded: expanded === product.id }"
      >
        <div class="row-main">
          <div class="product-identity">
            <strong class="product-title">{{ product.title }}</strong>
            <span class="unit-tag">{{ product.unit }}</span>
            <div v-if="product.aliases.length" class="alias-tags">
              <span
                v-for="alias in product.aliases.slice(0, 3)"
                :key="alias"
                class="alias-pill"
              >
                {{ alias }}
              </span>
              <span v-if="product.aliases.length > 3" class="small muted">
                +{{ product.aliases.length - 3 }} more
              </span>
            </div>
          </div>

          <div class="row-controls">
            <button
              class="secondary compact-btn price-toggle-btn"
              type="button"
              @click="expanded = expanded === product.id ? '' : product.id"
            >
              {{ expanded === product.id ? t('products.hidePrices') : t('products.showPrices') }}
              <component
                :is="expanded === product.id ? ChevronUp : ChevronDown"
                :size="14"
              />
            </button>
            <button
              class="icon-button"
              :aria-label="`Edit product ${product.title}`"
              type="button"
              @click="editing = { ...product, aliases: [...product.aliases] }"
            >
              <Pencil :size="16" />
            </button>
            <button
              class="icon-button"
              :aria-label="`Remove product ${product.title}`"
              type="button"
              @click="removing = product.id"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </div>

        <!-- Inline Delete Confirmation -->
        <div v-if="removing === product.id" class="inline-confirm compact-confirm">
          <p class="small">{{ t('products.confirmDeleteProduct', { name: product.title }) }}</p>
          <div class="confirm-btns">
            <button class="secondary compact-btn" @click="removing = ''">{{ t('common.cancel') }}</button>
            <button
              class="secondary danger compact-btn"
              :disabled="busy"
              @click="
                run(async () => {
                  await store.removeProduct(product.id);
                  removing = '';
                })
              "
            >
              {{ t('common.delete') }}
            </button>
          </div>
        </div>

        <!-- Expandable Price History Subpanel -->
        <div v-if="expanded === product.id" class="product-prices-wrapper">
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
  <p v-else class="panel empty-note small muted">
    {{ query ? "No matching products found. Try another search or create one above." : "Products appear when you save purchases. You can also add one above." }}
  </p>
</template>

<style scoped>
.compare-launch {
  width: 100%;
  margin-bottom: 16px;
}

.catalog-header-panel {
  display: grid;
  gap: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.compact-btn {
  padding: 6px 12px;
  font-size: 13px;
  min-height: auto;
}

/* Compact Search Bar */
.search-toolbar {
  display: grid;
  gap: 10px;
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #6b7f76;
  pointer-events: none;
}

.compact-search-input {
  padding-left: 36px;
  padding-right: 36px;
  min-height: 42px;
  font-size: 14px;
}

.clear-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  color: #6b7f76;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.unit-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.unit-pill {
  padding: 4px 10px;
  border-radius: 14px;
  background: #f0f4f1;
  border: 1px solid #d4ded8;
  font-size: 12px;
  font-weight: 500;
  color: #3f554c;
  cursor: pointer;
  transition: all 0.15s ease;
}

.unit-pill.selected {
  background: #153d35;
  color: #ffffff;
  border-color: #153d35;
}

.search-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Compact Product List */
.compact-catalog-panel {
  padding: 8px 14px;
}

.compact-product-list {
  display: grid;
  gap: 0;
}

.compact-product-row {
  padding: 12px 6px;
  border-bottom: 1px solid #edf1ee;
  transition: background 0.15s ease;
}

.compact-product-row:last-child {
  border-bottom: 0;
}

.compact-product-row.expanded {
  background: #fafcfa;
  border-radius: 10px;
  padding: 12px;
}

.row-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.product-identity {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.product-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e382f;
}

.unit-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  background: #eaf1ec;
  color: #2b5643;
  border-radius: 8px;
}

.alias-tags {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.alias-pill {
  font-size: 11px;
  padding: 2px 6px;
  background: #f4f6f5;
  border: 1px solid #e1e7e4;
  border-radius: 6px;
  color: #66766f;
}

.row-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.price-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.compact-confirm {
  margin-top: 10px;
  padding: 10px;
}

.confirm-btns {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.product-prices-wrapper {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2ece5;
}

.edit-product-form {
  border: 2px solid #b7d6c5;
}

.empty-note {
  text-align: center;
  padding: 24px;
}
</style>
