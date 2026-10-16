<script setup lang="ts">
import { shallowRef, computed, onMounted, useTemplateRef } from "vue";
import { X, ClipboardList } from "lucide-vue-next";
import { categories, type Currency, type ExpenseDraft, type AccountId } from "@/lib/types";
import { parseBulk } from "@/lib/bulk";
import { money, today } from "@/lib/finance";
import { useExpenses, friendlyError } from "@/stores/expenses";
const emit = defineEmits<{ close: [] }>();
const store = useExpenses();
const dialog = useTemplateRef<HTMLDialogElement>("dialog");
const text = shallowRef("");
const currency = shallowRef<Currency>("NZD");
const accountId = shallowRef<AccountId>("global");
const rows = shallowRef<ExpenseDraft[]>([]);
const failure = shallowRef("");
const busy = shallowRef(false);
const confirmed = shallowRef(false);
const sum = computed(() =>
  rows.value.reduce((amount, row) => amount + row.amount, 0),
);
onMounted(() => dialog.value?.showModal());
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
<template>
  <dialog
    ref="dialog"
    class="expense-dialog purchase-dialog"
    @cancel.prevent="!busy && emit('close')"
  >
    <div class="drawer-handle-bar" aria-hidden="true">
      <div class="drawer-handle" />
    </div>
    <div class="section-heading">
      <h2><ClipboardList :size="20" />Add several expenses</h2>
      <button
        class="icon-button"
        aria-label="Close bulk entry"
        :disabled="busy"
        @click="emit('close')"
      >
        <X />
      </button>
    </div>
    <template v-if="!rows.length">
      <label>
        Paid From Account
        <select v-model="accountId" :disabled="busy">
          <option value="global">Global Account (Everyday)</option>
          <option value="nz">NZ Account (Savings · e.g. petrol, rent)</option>
        </select>
      </label>
      <label
        >One expense per line<textarea
          v-model="text"
          rows="7"
          :placeholder="`${today()} | New World | 32.50 | Groceries\n${today()} | Petrol station | 60 | Petrol`"
        />
      </label>
      <p class="small muted">
        Date | Shop / title | Amount | Category (optional). Pasting spreadsheet
        columns also works.
      </p>
      <details>
        <summary>Categories</summary>
        <p>{{ categories.join(", ") }}</p>
      </details>
      <button class="primary wide" @click="preview">
        Preview expenses
      </button></template
    >
    <template v-else
      ><div class="bulk-preview">
        <div v-for="(row, index) in rows" :key="index">
          <span
            >{{ row.date }} · {{ row.merchant
            }}<small>{{ row.category }}</small></span
          ><strong>{{ money(row.amount, row.currency) }}</strong>
        </div>
      </div>
      <div class="purchase-total">
        <span>{{ rows.length }} expenses</span
        ><strong>{{ money(sum, currency) }}</strong>
      </div>
      <label class="check"
        ><input v-model="confirmed" type="checkbox" />I checked these rows,
        including possible duplicates</label
      >
      <div class="entry-actions">
        <button class="secondary" :disabled="busy" @click="rows = []">
          Edit rows</button
        ><button class="primary" :disabled="busy || !confirmed" @click="submit">
          {{ busy ? "Saving…" : "Save all" }}
        </button>
      </div></template
    >
    <p v-if="failure" role="alert" class="error-note">{{ failure }}</p>
  </dialog>
</template>
