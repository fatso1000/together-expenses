<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import { Store, Plus, Pencil, Trash2, Check, X } from "lucide-vue-next";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { money, parseMoney } from "@/lib/finance";
import { t } from "@/lib/i18n";
import type { Shop, SavedItem } from "@/lib/types";
const store = useExpenses();
const query = shallowRef("");
const name = shallowRef("");
const editingShop = shallowRef<Shop | undefined>();
const failure = shallowRef("");
const busy = shallowRef(false);
const removing = shallowRef("");
const filtered = computed(() =>
  store.shops.filter((shop) =>
    shop.name.toLowerCase().includes(query.value.toLowerCase()),
  ),
);
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
async function saveShop() {
  await run(async () => {
    await store.saveShop(name.value, editingShop.value);
    name.value = "";
    editingShop.value = undefined;
  });
}
function startPurchase(shop: Shop) {
  store.openExpense("items");
  store.prefillShop = shop.name;
}
</script>
<template>
  <section class="panel">
    <form @submit.prevent="saveShop">
      <label
        >{{ editingShop ? t('shops.editShop') : t('shops.newShop')
        }}<input
          v-model="name"
          maxlength="100"
          :placeholder="t('shops.placeholder')"
          required
      /></label>
      <div class="entry-actions">
        <button class="primary" :disabled="busy">
          <Plus :size="18" />{{
            editingShop ? t('shops.saveName') : t('shops.addShop')
          }}</button
        ><button
          v-if="editingShop"
          class="secondary"
          type="button"
          @click="
            editingShop = undefined;
            name = '';
          "
        >
          {{ t('common.cancel') }}
        </button>
      </div>
    </form>
  </section>
  <label v-if="store.shops.length > 3"
    >{{ t('common.search') }}<input v-model="query" type="search"
  /></label>
  <p v-if="failure" role="alert" class="error-note">{{ failure }}</p>
  <section v-for="shop in filtered" :key="shop.id" class="panel shop-card">
    <div class="section-heading">
      <h2><Store :size="20" />{{ shop.name }}</h2>
      <div class="row-actions">
        <button
          class="icon-button"
          :aria-label="`Edit shop ${shop.name}`"
          @click="
            editingShop = shop;
            name = shop.name;
          "
        >
          <Pencil :size="18" /></button
        ><button
          class="icon-button"
          :aria-label="`Remove shop ${shop.name}`"
          @click="removing = shop.id"
        >
          <Trash2 :size="18" />
        </button>
      </div>
    </div>
    <div v-if="removing === shop.id" class="inline-confirm">
      <p>{{ t('shops.confirmDeleteShop', { name: shop.name }) }}</p>
      <button class="secondary" @click="removing = ''">{{ t('common.cancel') }}</button
      ><button
        class="secondary danger"
        :disabled="busy"
        @click="
          run(async () => {
            await store.removeShop(shop.id);
            removing = '';
          })
        "
      >
        {{ t('common.delete') }}
      </button>
    </div>
    <button class="secondary" @click="startPurchase(shop)">
      <Plus :size="18" />{{ t('shops.startPurchase') }}
    </button>
  </section>
  <section v-if="!store.shops.length" class="empty-state">
    <Store :size="32" />
    <h2>{{ t('shops.title') }}</h2>
    <p>{{ t('common.addExpense') }}</p>
  </section>
</template>
