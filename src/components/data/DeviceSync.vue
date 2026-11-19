<template>
  <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm space-y-4">
    <h2 class="flex items-center gap-2 text-lg font-bold text-text m-0">
      <Cloud :size="20" class="text-accent" />
      <span>{{ t("sync.title") }}</span>
    </h2>
    <p class="text-sm text-text m-0" role="status">{{ store.syncStatus }}</p>

    <template v-if="store.syncConnected">
      <Button
        type="button"
        severity="secondary"
        class="inline-flex items-center gap-2"
        @click="copy"
      >
        <Copy :size="18" />
        <span>{{ t("sync.copyLink") }}</span>
      </Button>
      <p class="text-xs text-muted m-0">
        {{ t("sync.linkNotice") }}
      </p>
      <label v-if="showLink" class="flex flex-col gap-1.5 text-xs font-medium text-muted">
        <span>{{ t("sync.privateLink") }}</span>
        <InputText :modelValue="privateLink" readonly fluid />
      </label>
    </template>

    <Button
      v-else
      type="button"
      severity="primary"
      :disabled="store.syncBusy"
      class="inline-flex items-center gap-2"
      @click="create"
    >
      <Cloud :size="18" />
      <span>
        {{
          store.syncBusy
            ? "Connecting…"
            : store.syncKey
              ? "Reconnect"
              : "Sync this database"
        }}
      </span>
    </Button>

    <details :open="!!store.pendingConnection" class="space-y-3 pt-2">
      <summary class="flex items-center gap-2 cursor-pointer text-sm font-semibold text-text">
        <Link :size="16" />
        <span>{{ t("sync.connectExisting") }}</span>
      </summary>
      <div class="space-y-3 pt-2">
        <label
          v-if="!store.pendingConnection"
          class="flex flex-col gap-1.5 text-xs font-medium text-muted"
        >
          <span>{{ t("sync.privateLink") }}</span>
          <InputText
            v-model="connection"
            autocomplete="off"
            placeholder="Paste the link from your other device"
            fluid
          />
        </label>
        <p class="text-xs text-muted m-0">
          This device will show the connected database. Its current data is saved
          as a local recovery backup; records are not automatically merged.
        </p>
        <div class="flex items-start gap-2.5">
          <Checkbox
            v-model="acknowledged"
            binary
            inputId="sync-acknowledged"
          />
          <label for="sync-acknowledged" class="text-xs text-muted cursor-pointer">
            {{ t("sync.useConnected") }}
          </label>
        </div>
        <Button
          type="button"
          severity="primary"
          :disabled="!acknowledged || store.syncBusy"
          @click="connect"
        >
          {{ t("sync.connectDevice") }}
        </Button>
      </div>
    </details>

    <details class="space-y-3">
      <summary class="flex items-center gap-2 cursor-pointer text-sm font-semibold text-text">
        {{ t("sync.recoveryBackup") }}
      </summary>
      <div class="pt-2">
        <Button
          type="button"
          severity="secondary"
          @click="exportPrevious"
        >
          {{ t("sync.exportBeforeConnect") }}
        </Button>
      </div>
    </details>

    <Message v-if="failure" severity="error" :closable="false">
      {{ failure }}
    </Message>

    <p class="text-xs text-muted m-0">
      Records are encrypted before syncing. An internet connection is needed to
      save changes across devices.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { Cloud, Link, Copy } from "lucide-vue-next";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Checkbox from "primevue/checkbox";
import Message from "primevue/message";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { validSyncKey } from "@/lib/encryption";
import { downloadFile, today } from "@/lib/finance";
import { t } from "@/lib/i18n";

const store = useExpenses();
const connection = shallowRef("");
const failure = shallowRef("");
const showLink = shallowRef(false);
const acknowledged = shallowRef(false);
const privateLink = computed(
  () =>
    `${location.origin}${location.pathname}#/settings?connect=${store.syncKey}`,
);

async function create() {
  failure.value = "";
  try {
    await store.connectDatabase();
  } catch (reason) {
    failure.value = friendlyError(reason);
  }
}

async function connect() {
  failure.value = "";
  try {
    let key = store.pendingConnection || connection.value.trim();
    if (key.includes("?"))
      key = new URLSearchParams(key.split("?").pop()).get("connect") ?? "";
    if (!validSyncKey(key))
      throw new Error(
        "Paste your private connection link from the other device.",
      );
    await store.connectDatabase(key);
    connection.value = "";
    acknowledged.value = false;
  } catch (reason) {
    failure.value = friendlyError(reason);
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(privateLink.value);
    store.message = t("sync.linkCopied");
  } catch {
    showLink.value = true;
  }
}

function exportPrevious() {
  const saved = localStorage.getItem("expenses-before-sync");
  if (saved)
    downloadFile(`before-sync-${today()}.json`, saved, "application/json");
}
</script>
