<template>
  <div class="grid gap-4">
    <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm">
      <form class="grid gap-4" @submit.prevent="saveShop">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ editingShop ? t("shops.editShop") : t("shops.newShop") }}</span>
          <InputText
            v-model="name"
            maxlength="100"
            :placeholder="t('shops.placeholder')"
            required
            fluid
          />
        </label>
        <div class="flex flex-wrap items-center gap-2.5">
          <Button
            type="submit"
            severity="primary"
            :disabled="busy"
            class="inline-flex items-center gap-1.5"
          >
            <Plus :size="18" />
            <span>{{ editingShop ? t("shops.saveName") : t("shops.addShop") }}</span>
          </Button>
          <Button
            v-if="editingShop"
            severity="secondary"
            variant="outlined"
            type="button"
            @click="
              editingShop = undefined;
              name = '';
            "
          >
            {{ t("common.cancel") }}
          </Button>
        </div>
      </form>
    </section>

    <div v-if="store.shops.length > 3" class="flex flex-col gap-1.5 text-xs font-medium text-muted">
      <label for="shop-search-input">{{ t("common.search") }}</label>
      <IconField>
        <InputIcon>
          <Search :size="16" />
        </InputIcon>
        <InputText
          v-model="query"
          inputId="shop-search-input"
          type="search"
          :placeholder="t('common.search')"
          fluid
        />
      </IconField>
    </div>

    <Message v-if="failure" severity="error" :closable="false">
      {{ failure }}
    </Message>

    <section
      v-for="shop in filtered"
      :key="shop.id"
      class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm grid gap-3"
    >
      <div class="flex items-start justify-between gap-3">
        <h2 class="flex items-center gap-2.5 text-lg font-bold text-text m-0">
          <Store :size="20" class="text-accent" />
          <span>{{ shop.name }}</span>
        </h2>
        <div class="flex items-center gap-1">
          <Button
            type="button"
            variant="text"
            severity="secondary"
            rounded
            size="small"
            :aria-label="`Edit shop ${shop.name}`"
            @click="
              editingShop = shop;
              name = shop.name;
            "
          >
            <Pencil :size="18" />
          </Button>
          <Button
            type="button"
            variant="text"
            severity="danger"
            rounded
            size="small"
            :aria-label="`Remove shop ${shop.name}`"
            @click="removing = shop.id"
          >
            <Trash2 :size="18" />
          </Button>
        </div>
      </div>

      <div
        v-if="removing === shop.id"
        class="p-3 rounded-xl bg-[var(--pill-bg)] border border-[var(--border)] grid gap-2"
      >
        <p class="text-xs text-text m-0">
          {{ t("shops.confirmDeleteShop", { name: shop.name }) }}
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
                await store.removeShop(shop.id);
                removing = '';
              })
            "
          >
            {{ t("common.delete") }}
          </Button>
        </div>
      </div>

      <div>
        <Button
          type="button"
          severity="secondary"
          class="inline-flex items-center gap-1.5"
          @click="startPurchase(shop)"
        >
          <Plus :size="18" />
          <span>{{ t("shops.startPurchase") }}</span>
        </Button>
      </div>
    </section>

    <section
      v-if="!store.shops.length"
      class="flex flex-col items-center justify-center text-center py-9 px-4 gap-3 text-muted"
    >
      <Store :size="32" />
      <h2 class="text-lg font-bold text-text m-0">{{ t("shops.title") }}</h2>
      <p class="text-sm m-0">{{ t("common.addExpense") }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { Store, Plus, Pencil, Trash2, Search } from "lucide-vue-next";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import Message from "primevue/message";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { t } from "@/lib/i18n";
import type { Shop } from "@/lib/types";

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
