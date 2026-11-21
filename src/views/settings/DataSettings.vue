<template>
  <div class="space-y-6">
    <!-- At-a-Glance Database Overview Strip -->
    <section
      class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5 shadow-sm space-y-3"
      :aria-label="t('settings.dataOverviewTitle')"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <Database :size="18" class="text-accent" />
          <h2 class="text-base font-bold text-text m-0">
            {{ t("settings.dataOverviewTitle") }}
          </h2>
        </div>
        <Tag
          :value="
            store.syncConnected ? t('sync.statusSynced') : t('sync.statusLocal')
          "
          :severity="store.syncConnected ? 'success' : 'secondary'"
        />
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <article class="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-3 grid gap-0.5">
          <span class="text-xs text-muted">{{ t("settings.dataOverviewExpenses") }}</span>
          <strong class="text-xl font-bold tabular-nums text-text">
            {{ store.expenses.length }}
          </strong>
        </article>
        <article class="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-3 grid gap-0.5">
          <span class="text-xs text-muted">{{ t("settings.dataOverviewBills") }}</span>
          <strong class="text-xl font-bold tabular-nums text-text">
            {{ store.frequentPayments.length }}
          </strong>
        </article>
        <article class="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-3 grid gap-0.5">
          <span class="text-xs text-muted">{{ t("settings.dataOverviewProducts") }}</span>
          <strong class="text-xl font-bold tabular-nums text-text">
            {{ store.products.length }}
          </strong>
        </article>
        <article class="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-3 grid gap-0.5">
          <span class="text-xs text-muted">{{ t("settings.dataOverviewShops") }}</span>
          <strong class="text-xl font-bold tabular-nums text-text">
            {{ store.shops.length }}
          </strong>
        </article>
      </div>
    </section>

    <!-- Cloud Sync & Device Connection -->
    <DeviceSync />

    <!-- Backup & Restore -->
    <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm space-y-4">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-[var(--pill-bg)] text-accent flex items-center justify-center shrink-0">
          <HardDriveDownload :size="20" />
        </div>
        <div class="space-y-0.5">
          <h2 class="text-lg font-bold text-text m-0">
            {{ t("settings.backupRestore") }}
          </h2>
          <p class="text-xs text-muted m-0 leading-relaxed">
            {{ t("settings.backupDescription") }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Export Backup Card -->
        <div class="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 flex flex-col justify-between gap-4">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 text-sm font-bold text-text">
              <Download :size="16" class="text-accent" />
              <span>{{ t("settings.exportBackup") }}</span>
            </div>
            <p class="text-xs text-muted m-0 leading-relaxed">
              {{ t("settings.exportBackupHint") }}
            </p>
          </div>
          <div>
            <Button
              severity="secondary"
              class="inline-flex items-center gap-2 min-h-11"
              @click="backup"
            >
              <Download :size="16" />
              <span>{{ t("settings.exportBackup") }}</span>
            </Button>
          </div>
        </div>

        <!-- Restore Backup Dropzone Card -->
        <div
          class="rounded-xl border border-dashed p-4 flex flex-col justify-between gap-4 transition-colors duration-150"
          :class="
            draggingBackup
              ? 'border-accent bg-[var(--success-bg)]'
              : 'border-[var(--border)] bg-[var(--surface-card)]'
          "
          @dragover.prevent="draggingBackup = true"
          @dragleave.prevent="draggingBackup = false"
          @drop.prevent="onDropBackup"
        >
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 text-sm font-bold text-text">
              <Upload :size="16" class="text-accent" />
              <span>{{ t("settings.restoreBackup") }}</span>
            </div>
            <p class="text-xs text-muted m-0 leading-relaxed">
              {{ t("settings.restoreBackupHint") }}
            </p>
          </div>
          <div class="space-y-2">
            <Button
              type="button"
              severity="secondary"
              variant="outlined"
              class="inline-flex items-center gap-2 min-h-11"
              @click="restoreInput?.click()"
            >
              <Upload :size="16" />
              <span>{{ t("settings.restoreBackup") }}</span>
            </Button>
            <input
              ref="restoreInput"
              type="file"
              accept=".json,application/json"
              class="sr-only"
              :aria-label="t('settings.restoreBackup')"
              @change="restore"
            />
            <p class="text-[11px] text-muted m-0">
              {{ t("settings.restoreWarning") }}
            </p>
          </div>
        </div>
      </div>

      <!-- Conditional Pre-Sync Recovery Backup Banner -->
      <div
        v-if="recoveryBackupInfo"
        class="rounded-xl border border-[var(--border)] bg-black/20 p-3.5 flex flex-wrap items-center justify-between gap-3"
      >
        <div class="flex items-start gap-2.5 min-w-0">
          <History :size="18" class="text-accent shrink-0 mt-0.5" />
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-semibold text-text m-0">
              {{ t("sync.recoveryBackup") }}
            </p>
            <p class="text-xs text-muted m-0">
              {{ t("sync.recoveryBackupHint", { count: recoveryBackupInfo.expenseCount }) }}
            </p>
          </div>
        </div>
        <Button
          type="button"
          severity="secondary"
          size="small"
          class="inline-flex items-center gap-1.5"
          @click="exportRecoveryBackup"
        >
          <Download :size="14" />
          <span>{{ t("sync.exportBeforeConnect") }}</span>
        </Button>
      </div>
    </section>

    <!-- Install as App -->
    <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm space-y-4">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-[var(--pill-bg)] text-accent flex items-center justify-center shrink-0">
          <Smartphone :size="20" />
        </div>
        <div class="space-y-0.5">
          <h2 class="text-lg font-bold text-text m-0">
            {{ t("settings.installTitle") }}
          </h2>
          <p class="text-xs text-muted m-0 leading-relaxed">
            {{ t("settings.installSubtitle") }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-3.5 space-y-1">
          <strong class="text-xs font-bold text-text flex items-center gap-1.5">
            <Smartphone :size="14" class="text-accent" />
            <span>{{ t("settings.installIosTitle") }}</span>
          </strong>
          <p class="text-xs text-muted m-0 leading-relaxed">
            {{ t("settings.installIosSteps") }}
          </p>
        </div>
        <div class="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-3.5 space-y-1">
          <strong class="text-xs font-bold text-text flex items-center gap-1.5">
            <MonitorSmartphone :size="14" class="text-accent" />
            <span>{{ t("settings.installAndroidTitle") }}</span>
          </strong>
          <p class="text-xs text-muted m-0 leading-relaxed">
            {{ t("settings.installAndroidSteps") }}
          </p>
        </div>
      </div>
    </section>

    <!-- Danger Zone -->
    <section class="rounded-2xl border border-red-500/25 bg-red-950/15 p-4 md:p-6 shadow-sm space-y-4">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-[var(--danger-bg)] text-[var(--danger-colour)] flex items-center justify-center shrink-0">
          <AlertTriangle :size="20" />
        </div>
        <div class="space-y-0.5">
          <h2 class="text-lg font-bold text-text m-0">
            {{ t("settings.dangerZoneTitle") }}
          </h2>
          <p class="text-xs text-muted m-0 leading-relaxed">
            {{ t("settings.dangerZoneDescription") }}
          </p>
        </div>
      </div>

      <!-- Undo Recent Deletion Banner -->
      <div
        v-if="store.removedExpenses.length"
        class="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3.5 flex flex-wrap items-center justify-between gap-3"
      >
        <p class="text-xs text-text m-0 font-medium">
          {{ t("settings.undoDeletionBanner", { count: store.removedExpenses.length }) }}
        </p>
        <Button
          severity="secondary"
          size="small"
          class="inline-flex items-center gap-1.5"
          @click="store.undoDelete"
        >
          <RotateCcw :size="14" />
          <span>{{ t("settings.undoDeletion") }}</span>
        </Button>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <Button
          severity="danger"
          variant="outlined"
          class="inline-flex items-center gap-2 min-h-11"
          @click="clear"
        >
          <Trash2 :size="16" />
          <span>{{ t("settings.deleteAllExpenses") }}</span>
        </Button>
      </div>
    </section>

    <Message v-if="error" severity="error" :closable="false">
      {{ error }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from "vue";
import {
  AlertTriangle,
  Database,
  Download,
  HardDriveDownload,
  History,
  MonitorSmartphone,
  RotateCcw,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-vue-next";
import DeviceSync from "@/components/data/DeviceSync.vue";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { downloadFile, today } from "@/lib/finance";
import { parseBackup } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";
import Button from "primevue/button";
import Message from "primevue/message";
import Tag from "primevue/tag";

const store = useExpenses();
const { t } = useI18n();
const error = shallowRef("");
const draggingBackup = shallowRef(false);
const restoreInput = useTemplateRef<HTMLInputElement>("restoreInput");

const recoveryBackupInfo = computed<{ raw: string; expenseCount: number } | null>(
  () => {
    // Re-evaluate whenever sync state changes
    void store.syncConnected;
    void store.syncKey;
    const saved = localStorage.getItem("expenses-before-sync");
    if (!saved) return null;
    try {
      const parsed = parseBackup(saved);
      return {
        raw: saved,
        expenseCount: parsed.expenses.length,
      };
    } catch {
      return null;
    }
  },
);

function backup() {
  downloadFile(
    `expenses-${today()}.json`,
    JSON.stringify(store.data, null, 2),
    "application/json",
  );
}

function exportRecoveryBackup() {
  if (!recoveryBackupInfo.value) return;
  downloadFile(
    `before-sync-${today()}.json`,
    recoveryBackupInfo.value.raw,
    "application/json",
  );
}

async function restoreFile(file: File) {
  try {
    if (file.size > 10_000_000) {
      throw new Error("Choose a backup smaller than 10 MB.");
    }
    const text = await file.text();
    const parsed = parseBackup(text);
    if (
      !confirm(
        `Replace expenses, products, shops, limits, and accounts with this backup (${parsed.expenses.length} expenses)?`,
      )
    ) {
      return;
    }
    await store.restore(text);
    error.value = "";
  } catch (reason) {
    error.value = friendlyError(reason);
  }
}

async function restore(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    await restoreFile(file);
  } finally {
    input.value = "";
  }
}

async function onDropBackup(event: DragEvent) {
  draggingBackup.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  await restoreFile(file);
}

async function clear() {
  if (
    !confirm(
      "Delete all expenses from this database and connected devices? Export a backup first if you want to keep them.",
    )
  ) {
    return;
  }
  try {
    await store.clearAll();
    error.value = "";
  } catch (reason) {
    error.value = friendlyError(reason);
  }
}
</script>
