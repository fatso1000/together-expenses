<template>
  <Drawer
    v-model:visible="drawerIsOpen"
    position="bottom"
    class="w-full! max-w-full!"
    style="height: auto; max-height: 92dvh"
    :dismissable="!busy"
    :closeOnEscape="!busy"
    @after-hide="emit('close')"
  >
    <template #header>
      <h2 class="flex items-center gap-2 text-lg font-bold m-0">
        <ClipboardList :size="20" class="text-accent" />
        <span>{{ t("bulk.title") }}</span>
      </h2>
    </template>

    <template #closebutton="{ closeCallback }">
      <Button
        type="button"
        variant="text"
        severity="secondary"
        rounded
        aria-label="Close bulk entry"
        :disabled="busy"
        @click="closeCallback"
      >
        <X :size="18" />
      </Button>
    </template>

    <div class="grid gap-4 pb-2">
      <template v-if="!rows.length">
        <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <label for="bulk-account-select">{{ t("bulk.paidFrom") }}</label>
          <Select
            v-model="accountId"
            inputId="bulk-account-select"
            :options="accountOptions"
            optionLabel="label"
            optionValue="value"
            :disabled="busy"
            fluid
          />
        </div>

        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("bulk.onePerLine") }}</span>
          <Textarea
            v-model="text"
            rows="7"
            :placeholder="`${today()} | New World | 32.50 | Groceries\n${today()} | Petrol station | 60 | Petrol`"
            fluid
          />
        </label>

        <p class="text-xs text-muted m-0">
          Date | Shop / title | Amount | Category (optional). Pasting spreadsheet
          columns also works.
        </p>

        <details class="grid gap-1.5">
          <summary class="cursor-pointer text-sm font-medium text-text">
            {{ t("categories.title") }}
          </summary>
          <p class="text-xs text-muted m-0 pt-1">
            {{ categories.map((c) => categoryLabel(c)).join(", ") }}
          </p>
        </details>

        <Button type="button" severity="primary" fluid @click="preview">
          {{ t("bulk.previewExpenses") }}
        </Button>
      </template>

      <template v-else>
        <div class="max-h-[50dvh] overflow-auto divide-y divide-[var(--border)]">
          <div
            v-for="(row, index) in rows"
            :key="index"
            class="flex items-center justify-between gap-3 py-3"
          >
            <div class="grid gap-0.5 text-sm">
              <span>{{ row.date }} · {{ row.merchant }}</span>
              <small class="text-xs text-muted">{{ categoryLabel(row.category) }}</small>
            </div>
            <strong class="text-sm font-bold tabular-nums">
              {{ money(row.amount, row.currency) }}
            </strong>
          </div>
        </div>

        <div class="flex items-center justify-between py-2 border-t border-[var(--border)]">
          <span class="text-sm text-muted">
            {{ rows.length }} {{ t("nav.expenses").toLowerCase() }}
          </span>
          <strong class="text-xl font-bold tabular-nums font-heading">
            {{ money(sum, currency) }}
          </strong>
        </div>

        <div class="flex items-center gap-2.5">
          <Checkbox v-model="confirmed" binary inputId="bulk-confirm-check" />
          <label for="bulk-confirm-check" class="text-xs text-muted cursor-pointer">
            {{ t("common.confirm") }}
          </label>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            severity="secondary"
            :disabled="busy"
            @click="rows = []"
          >
            {{ t("common.edit") }}
          </Button>
          <Button
            type="button"
            severity="primary"
            :disabled="busy || !confirmed"
            @click="submit"
          >
            {{ busy ? t("common.saving") : t("bulk.saveAll") }}
          </Button>
        </div>
      </template>

      <Message v-if="failure" severity="error" :closable="false">
        {{ failure }}
      </Message>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed } from "vue";
import { X, ClipboardList } from "lucide-vue-next";
import Drawer from "primevue/drawer";
import Button from "primevue/button";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import Checkbox from "primevue/checkbox";
import Message from "primevue/message";
import { categories, type Currency, type ExpenseDraft, type AccountId } from "@/lib/types";
import { parseBulk } from "@/lib/bulk";
import { money, today } from "@/lib/finance";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { t, categoryLabel } from "@/lib/i18n";

const emit = defineEmits<{ close: [] }>();
const store = useExpenses();
const drawerIsOpen = ref(true);
const text = shallowRef("");
const currency = shallowRef<Currency>("NZD");
const accountId = shallowRef<AccountId>("global");
const rows = shallowRef<ExpenseDraft[]>([]);
const failure = shallowRef("");
const busy = shallowRef(false);
const confirmed = shallowRef(false);

const accountOptions = computed(() => [
  { value: "global" as AccountId, label: t("bulk.globalAccount") },
  { value: "nz" as AccountId, label: t("bulk.nzAccount") },
]);

const sum = computed(() =>
  rows.value.reduce((amount, row) => amount + row.amount, 0),
);

function preview() {
  failure.value = "";
  confirmed.value = false;
  try {
    const parsed = parseBulk(text.value, currency.value);
    rows.value = parsed.map((item) => ({ ...item, accountId: accountId.value }));
  } catch (reason) {
    failure.value = friendlyError(reason);
  }
}

async function submit() {
  busy.value = true;
  try {
    await store.savePurchases(rows.value);
    emit("close");
  } catch (reason) {
    failure.value = friendlyError(reason);
  } finally {
    busy.value = false;
  }
}
</script>
