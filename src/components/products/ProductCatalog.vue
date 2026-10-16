<script setup lang="ts">
import { computed, shallowRef, ref } from "vue";
import { Plus, Pencil, Trash2, Scale } from "lucide-vue-next";
import { useExpenses, friendlyError } from "@/stores/expenses";
import type { Product } from "@/lib/types";
import { units, productId } from "@/lib/products";
import QuickCompare from "@/components/products/QuickCompare.vue";
import ProductPrices from "@/components/products/ProductPrices.vue";
const store = useExpenses();
const comparing = shallowRef(false);
const query = shallowRef("");
const editing = ref<Product | null>(null);
const failure = shallowRef("");
const busy = shallowRef(false);
const expanded = shallowRef("");
const removing = shallowRef("");
const merging = shallowRef("");
const filtered = computed(() =>
  store.products
    .filter((product) =>
      [product.title, ...product.aliases]
        .join(" ")
        .toLowerCase()
        .includes(query.value.toLowerCase()),
    )
    .sort((a, b) => a.title.localeCompare(b.title)),
);
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
  <section class="panel">
    <div class="section-heading">
      <h2><Scale :size="20" />Products & prices</h2>
      <button class="secondary" @click="add"><Plus :size="18" />Product</button>
    </div>
    <label
      >Find a product<input
        v-model="query"
        type="search"
        placeholder="Name or receipt label"
    /></label>
    <RouterLink class="text-button" to="/shops">Manage shops</RouterLink>
  </section>
  <form v-if="editing" class="panel" @submit.prevent="save">
    <label
      >Product name<input v-model="editing.title" maxlength="100" required
    /></label>
    <label
      >Usual measure<select v-model="editing.unit">
        <option v-for="unit in units" :key="unit.value" :value="unit.value">
          {{ unit.label }}
        </option>
      </select></label
    >
    <div class="entry-actions">
      <button class="primary" :disabled="busy">Save product</button
      ><button type="button" class="secondary" @click="editing = null">
        Cancel
      </button>
    </div>
    <details
      v-if="store.products.some((product) => product.id === editing?.id)"
    >
      <summary>Merge a duplicate</summary>
      <label
        >Keep this existing product<select v-model="merging">
          <option value="">Choose product</option>
          <option
            v-for="product in store.products.filter(
              (product) => product.id !== editing?.id,
            )"
            :key="product.id"
            :value="product.id"
          >
            {{ product.title }}
          </option>
        </select></label
      >
      <p class="small muted">
        Combines price history and remembered receipt names. Purchase amounts
        stay the same.
      </p>
      <button
        type="button"
        class="secondary"
        :disabled="!merging || busy"
        @click="merge"
      >
        Merge products
      </button>
    </details>
  </form>
  <p v-if="failure" class="error-note" role="alert">{{ failure }}</p>
  <section v-for="product in filtered" :key="product.id" class="panel">
    <div class="section-heading">
      <h2>{{ product.title }}</h2>
      <div class="row-actions">
        <button
          class="icon-button"
          :aria-label="`Edit product ${product.title}`"
          @click="editing = { ...product, aliases: [...product.aliases] }"
        >
          <Pencil :size="18" /></button
        ><button
          class="icon-button"
          :aria-label="`Remove product ${product.title}`"
          @click="removing = product.id"
        >
          <Trash2 :size="18" />
        </button>
      </div>
    </div>
    <div v-if="removing === product.id" class="inline-confirm">
      <p>Remove from saved products? Past purchases remain.</p>
      <button class="secondary" @click="removing = ''">Cancel</button
      ><button
        class="secondary danger"
        :disabled="busy"
        @click="
          run(async () => {
            await store.removeProduct(product.id);
            removing = '';
          })
        "
      >
        Remove product
      </button>
    </div>
    <button
      class="secondary"
      @click="expanded = expanded === product.id ? '' : product.id"
    >
      {{ expanded === product.id ? "Hide prices" : "Compare prices" }}
    </button>
    <ProductPrices
      v-if="expanded === product.id"
      :product="product"
      :products="store.products"
      :expenses="store.expenses"
    />
  </section>
  <p v-if="!filtered.length" class="small muted">
    Products appear when you save purchases. You can also add one above.
  </p>
</template>
<style scoped>
.compare-launch {
  width: 100%;
  margin-bottom: 16px;
}
details {
  margin-top: 20px;
}
summary {
  cursor: pointer;
}
h2 {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
