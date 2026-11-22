<template>
  <div class="grid gap-4">
    <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm">
      <form class="grid gap-4" @submit.prevent="saveShop">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ editingShop ? t("shops.editShop") : t("shops.newShop") }}</span>
          <InputText
            id="shop-name-input"
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
      v-if="filtered.length"
      class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)] overflow-hidden shadow-sm"
    >
      <div
        v-for="shop in filtered"
        :key="shop.id"
        class="p-3.5 sm:p-5 grid gap-2.5"
      >
        <div class="flex items-center justify-between gap-3 min-w-0">
          <h2 class="flex items-center gap-2.5 text-base sm:text-lg font-bold text-text m-0 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-[var(--success-bg)] text-accent flex items-center justify-center shrink-0">
              <Store :size="18" />
            </div>
            <span class="truncate min-w-0">{{ shop.name }}</span>
          </h2>
          <div class="flex items-center gap-1 shrink-0">
            <!-- Label collapses to an icon on phones so the shop name stays readable -->
            <Button
              type="button"
              severity="secondary"
              size="small"
              rounded
              class="inline-flex items-center gap-1 text-xs!"
              :aria-label="`${t('shops.startPurchase')} · ${shop.name}`"
              :title="t('shops.startPurchase')"
              @click="startPurchase(shop)"
            >
              <Plus :size="15" />
              <span class="hidden sm:inline">{{ t("shops.startPurchase") }}</span>
            </Button>
            <Button
              type="button"
              variant="text"
              severity="secondary"
              rounded
              size="small"
              :aria-label="`Edit shop ${shop.name}`"
              @click="startEditing(shop)"
            >
              <Pencil :size="16" />
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
              <Trash2 :size="16" />
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
      </div>
    </section>

    <p
      v-if="store.shops.length && !filtered.length"
      class="text-sm text-muted text-center m-0 py-6"
      role="status"
    >
      {{ t("shops.noMatches", { query: query.trim() }) }}
    </p>

    <section
      v-if="!store.shops.length"
      class="flex flex-col items-center justify-center text-center py-9 px-4 gap-3 text-muted"
    >
      <Store :size="32" />
      <h2 class="text-lg font-bold text-text m-0">{{ t("shops.title") }}</h2>
      <p class="text-sm m-0">{{ t("shops.emptyHint") }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowRef } from "vue";
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

// The rename form lives at the top of the page; on long lists (and on phones)
// it is offscreen, so bring it into view and focus it when editing starts.
async function startEditing(shop: Shop) {
  editingShop.value = shop;
  name.value = shop.name;
  await nextTick();

  const inputElement = document.getElementById("shop-name-input");
  if (!(inputElement instanceof HTMLInputElement)) {
    return;
  }
  inputElement.scrollIntoView({ behavior: "smooth", block: "center" });
  inputElement.focus({ preventScroll: true });
  inputElement.select();
}
</script>
