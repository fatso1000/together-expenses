<template>
  <div class="space-y-6">
    <DeviceSync />

    <!-- Backup & Restore -->
    <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm space-y-3">
      <h2 class="text-lg font-bold text-text m-0">{{ t("settings.backupRestore") }}</h2>
      <p class="text-sm text-muted m-0">Export a copy of expenses, products, shops, limits, and financial accounts.</p>
      <div class="flex flex-wrap items-center gap-3 pt-1">
        <Button severity="secondary" @click="backup">
          {{ t("settings.exportBackup") }}
        </Button>
        <label class="restore-input inline-flex items-center gap-2 cursor-pointer">
          <span class="text-sm font-medium text-muted">{{ t("settings.restoreBackup") }}</span>
          <input
            type="file"
            accept=".json,application/json"
            class="text-xs"
            @change="restore"
          />
        </label>
      </div>
      <p class="text-xs text-muted m-0">
        Restoring replaces the current database, including connected devices.
      </p>
    </section>

    <!-- Install -->
    <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm space-y-2">
      <h2 class="text-lg font-bold text-text m-0">Install</h2>
      <p class="text-sm text-muted m-0">
        iPhone: Safari → Share → Add to Home Screen. Android: Chrome → Install app.
      </p>
    </section>

    <!-- Danger Zone -->
    <section class="rounded-2xl border border-red-500/20 bg-red-950/10 p-4 md:p-6 shadow-sm flex flex-wrap items-center gap-3">
      <Button
        v-if="store.removedExpenses.length"
        severity="secondary"
        @click="store.undoDelete"
      >
        {{ t("settings.undoDeletion") }}
      </Button>
      <Button severity="danger" variant="text" @click="clear">
        {{ t("settings.deleteAllExpenses") }}
      </Button>
    </section>

    <p v-if="error" class="error-note" role="alert">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import DeviceSync from "@/components/data/DeviceSync.vue";
import { shallowRef } from "vue";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { downloadFile, today } from "@/lib/finance";
import { parseBackup } from "@/lib/storage";
import { t } from "@/lib/i18n";
import Button from "primevue/button";

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
    const parsed = parseBackup(text);
    if (
      !confirm(
        `Replace expenses, products, shops, limits, and accounts with this backup (${parsed.expenses.length} expenses)?`,
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
