<script setup lang="ts">
import DeviceSync from "@/components/data/DeviceSync.vue";
import CategoryManager from "@/components/CategoryManager.vue";
import { shallowRef } from "vue";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { downloadFile, today } from "@/lib/finance";
import { parseBackup } from "@/lib/storage";
const store = useExpenses();
const error = shallowRef("");
function backup() {
  downloadFile(
    `expenses-${today()}.json`,
    JSON.stringify(store.data, null, 2),
    "application/json",
  );
}
async function restore(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 10_000_000)
      throw new Error("Choose a backup smaller than 10 MB.");
    const text = await file.text();
    const backup = parseBackup(text);
    if (
      !confirm(
        `Replace expenses, products, shops and limits with this backup (${backup.expenses.length} expenses)?`,
      )
    )
      return;
    await store.restore(text);
    error.value = "";
  } catch (reason) {
    error.value = friendlyError(reason);
  } finally {
    input.value = "";
  }
}
async function clear() {
  if (
    !confirm(
      "Delete all expenses from this database and connected devices? Export a backup first if you want to keep them.",
    )
  )
    return;
  try {
    await store.clearAll();
    error.value = "";
  } catch (reason) {
    error.value = friendlyError(reason);
  }
}
</script>
<template>
  <DeviceSync />
  <section class="panel">
    <CategoryManager />
  </section>
  <section class="panel">
    <h2>Backup</h2>
    <p>Export a copy of expenses, products, shops, and limits.</p>
    <button class="secondary" @click="backup">Export backup</button>
    <label class="restore-input"
      >Restore backup<input
        type="file"
        accept=".json,application/json"
        @change="restore"
    /></label>
    <p class="small muted">
      Restoring replaces the current database, including connected devices.
    </p>
  </section>
  <section class="panel">
    <h2>Install</h2>
    <p>
      iPhone: Safari → Share → Add to Home Screen. Android: Chrome → Install
      app.
    </p>
  </section>
  <section class="panel">
    <button
      v-if="store.removedExpenses.length"
      class="secondary"
      @click="store.undoDelete"
    >
      Undo deletion
    </button>
    <button class="text-button danger" @click="clear">
      Delete all expenses
    </button>
  </section>
  <p v-if="error" class="error-note" role="alert">{{ error }}</p>
</template>
