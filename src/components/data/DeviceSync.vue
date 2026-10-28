<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { Cloud, Link, Copy } from "lucide-vue-next";
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
<template>
  <section class="panel device-sync">
    <h2><Cloud :size="20" />{{ t('sync.title') }}</h2>
    <p role="status">{{ store.syncStatus }}</p>
    <template v-if="store.syncConnected">
      <button class="secondary" @click="copy">
        <Copy :size="18" />{{ t('sync.copyLink') }}
      </button>
      <p class="small muted">
        {{ t('sync.linkNotice') }}
      </p>
      <label v-if="showLink"
        >{{ t('sync.privateLink') }}<input :value="privateLink" readonly
      /></label>
    </template>
    <button v-else class="primary" :disabled="store.syncBusy" @click="create">
      <Cloud :size="18" />{{
        store.syncBusy
          ? "Connecting…"
          : store.syncKey
            ? "Reconnect"
            : "Sync this database"
      }}
    </button>
    <details :open="!!store.pendingConnection">
      <summary><Link :size="16" />{{ t('sync.connectExisting') }}</summary>
      <label v-if="!store.pendingConnection"
        >{{ t('sync.privateLink') }}<input
          v-model="connection"
          type="text"
          autocomplete="off"
          placeholder="Paste the link from your other device"
      /></label>
      <p class="small">
        This device will show the connected database. Its current data is saved
        as a local recovery backup; records are not automatically merged.
      </p>
      <label class="check"
        ><input v-model="acknowledged" type="checkbox" />{{ t('sync.useConnected') }}</label
      >
      <button
        class="primary"
        :disabled="!acknowledged || store.syncBusy"
        @click="connect"
      >
        {{ t('sync.connectDevice') }}
      </button>
    </details>
    <details>
      <summary>{{ t('sync.recoveryBackup') }}</summary>
      <button class="secondary" @click="exportPrevious">
        {{ t('sync.exportBeforeConnect') }}
      </button>
    </details>
    <p v-if="failure" class="error-note" role="alert">{{ failure }}</p>
    <p class="small muted">
      Records are encrypted before syncing. An internet connection is needed to
      save changes across devices.
    </p>
  </section>
</template>
<style scoped>
h2,
summary {
  display: flex;
  align-items: center;
  gap: 8px;
}
details {
  margin-top: 20px;
}
summary {
  cursor: pointer;
}
</style>
