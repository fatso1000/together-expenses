<template>
  <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm space-y-5">
    <!-- Header with Live Sync Status Badge -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-start gap-3 min-w-0">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          :class="
            store.syncConnected
              ? 'bg-[var(--success-bg)] text-accent'
              : 'bg-[var(--pill-bg)] text-muted'
          "
        >
          <Cloud :size="20" />
        </div>
        <div class="space-y-0.5 min-w-0">
          <h2 class="text-lg font-bold text-text m-0">{{ t("sync.title") }}</h2>
          <p class="text-xs text-muted m-0 leading-relaxed">
            {{ t("sync.subtitle") }}
          </p>
        </div>
      </div>

      <Tag
        :value="statusBadge.label"
        :severity="statusBadge.severity"
        role="status"
      />
    </div>

    <!-- CONNECTED STATE -->
    <template v-if="store.syncConnected">
      <!-- Pending incoming link while already connected -->
      <div
        v-if="store.pendingConnection"
        class="rounded-2xl border border-[var(--accent)] bg-[var(--surface-card)] p-4 space-y-3"
      >
        <h3 class="text-sm font-bold text-text m-0">
          {{ t("sync.switchDatabase") }}
        </h3>
        <DatabaseConnectCard
          mode="settings"
          :has-existing-local-data="true"
          @connected="showSwitchPanel = false"
        />
      </div>

      <!-- Pair Another Device Card -->
      <div class="rounded-2xl border border-[var(--success-border)] bg-[var(--surface-card)] p-4 md:p-5 space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <h3 class="text-base font-bold text-text m-0 flex items-center gap-2">
              <Smartphone :size="18" class="text-accent" />
              <span>{{ t("sync.pairAnotherTitle") }}</span>
            </h3>
            <p class="text-xs text-muted m-0 leading-relaxed">
              {{ t("sync.pairAnotherSubtitle") }}
            </p>
          </div>
          <span class="text-xs font-mono px-2.5 py-1 rounded-lg bg-black/25 border border-[var(--border)] text-muted">
            {{ maskedActiveKey }}
          </span>
        </div>

        <!-- Primary Share / Copy Actions -->
        <div class="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            severity="primary"
            class="inline-flex items-center gap-2 min-h-11"
            @click="copy"
          >
            <Check v-if="justCopied" :size="17" />
            <Copy v-else :size="17" />
            <span>{{ justCopied ? t("sync.copied") : t("sync.copyLink") }}</span>
          </Button>

          <Button
            v-if="canShare"
            type="button"
            severity="secondary"
            class="inline-flex items-center gap-2 min-h-11"
            @click="share"
          >
            <Share2 :size="16" />
            <span>{{ t("sync.shareLink") }}</span>
          </Button>

          <Button
            type="button"
            severity="secondary"
            variant="outlined"
            class="inline-flex items-center gap-2 min-h-11"
            @click="showLink = !showLink"
          >
            <EyeOff v-if="showLink" :size="16" />
            <Eye v-else :size="16" />
            <span>{{ showLink ? t("sync.hideLink") : t("sync.showLink") }}</span>
          </Button>
        </div>

        <!-- Revealable Readonly Link Input -->
        <div v-if="showLink" class="space-y-1.5">
          <label for="active-private-link" class="block text-xs font-medium text-muted">
            {{ t("sync.privateLink") }}
          </label>
          <InputText
            id="active-private-link"
            :modelValue="privateLink"
            readonly
            class="font-mono text-xs"
            fluid
          />
        </div>

        <!-- Compact 3-Step Pairing Guide -->
        <ol class="m-0 p-3 rounded-xl bg-black/20 border border-[var(--border)] list-none grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <li class="flex items-start gap-2 text-xs text-text">
            <span class="w-5 h-5 rounded-full bg-[var(--success-bg)] text-accent font-bold text-[11px] flex items-center justify-center shrink-0">
              1
            </span>
            <span>{{ t("sync.pairStep1") }}</span>
          </li>
          <li class="flex items-start gap-2 text-xs text-text">
            <span class="w-5 h-5 rounded-full bg-[var(--success-bg)] text-accent font-bold text-[11px] flex items-center justify-center shrink-0">
              2
            </span>
            <span>{{ t("sync.pairStep2") }}</span>
          </li>
          <li class="flex items-start gap-2 text-xs text-text">
            <span class="w-5 h-5 rounded-full bg-[var(--success-bg)] text-accent font-bold text-[11px] flex items-center justify-center shrink-0">
              3
            </span>
            <span>{{ t("sync.pairStep3") }}</span>
          </li>
        </ol>

        <p class="text-xs text-muted m-0">
          {{ t("sync.linkNotice") }}
        </p>
      </div>

      <!-- Secondary Actions: Switch Database / Disconnect -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button
          type="button"
          severity="secondary"
          variant="text"
          size="small"
          class="inline-flex items-center gap-1.5"
          @click="showSwitchPanel = !showSwitchPanel"
        >
          <ArrowLeftRight :size="15" />
          <span>{{ t("sync.switchDatabase") }}</span>
        </Button>

        <Button
          type="button"
          severity="danger"
          variant="text"
          size="small"
          class="inline-flex items-center gap-1.5"
          @click="confirmDisconnectVisible = true"
        >
          <Unlink :size="15" />
          <span>{{ t("sync.disconnectButton") }}</span>
        </Button>
      </div>

      <!-- Expandable Switch Database Panel -->
      <div
        v-if="showSwitchPanel && !store.pendingConnection"
        class="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-4 space-y-3"
      >
        <h3 class="text-sm font-bold text-text m-0">
          {{ t("sync.connectExisting") }}
        </h3>
        <DatabaseConnectCard
          mode="settings"
          :has-existing-local-data="true"
          @connected="showSwitchPanel = false"
        />
      </div>
    </template>

    <!-- DISCONNECTED / LOCAL-ONLY STATE -->
    <template v-else>
      <!-- Priority Pending Connection Banner -->
      <div
        v-if="store.pendingConnection"
        class="rounded-2xl border border-[var(--accent)] bg-[var(--surface-card)] p-4 md:p-5 space-y-3"
      >
        <h3 class="text-base font-bold text-text m-0 flex items-center gap-2">
          <Link2 :size="18" class="text-accent" />
          <span>{{ t("sync.connectExisting") }}</span>
        </h3>
        <DatabaseConnectCard
          mode="settings"
          :has-existing-local-data="store.hasLocalData"
        />
      </div>

      <!-- Reconnect Card (when syncKey exists but offline/disconnected) -->
      <div
        v-if="store.syncKey"
        class="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4 space-y-3"
      >
        <div class="space-y-1">
          <h3 class="text-sm font-bold text-text m-0">
            {{ t("sync.reconnectTitle") }}
          </h3>
          <p class="text-xs text-text/90 m-0">
            {{ t("sync.reconnectSubtitle", { key: maskedActiveKey }) }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            severity="primary"
            :disabled="store.syncBusy"
            class="inline-flex items-center gap-2 min-h-11"
            @click="createOrReconnect"
          >
            <RefreshCw :size="16" :class="{ 'animate-spin': store.syncBusy }" />
            <span>
              {{ store.syncBusy ? t("sync.statusConnecting") : t("sync.reconnectButton") }}
            </span>
          </Button>
          <Button
            type="button"
            severity="danger"
            variant="text"
            size="small"
            class="inline-flex items-center gap-1.5"
            @click="confirmDisconnectVisible = true"
          >
            <Unlink :size="15" />
            <span>{{ t("sync.disconnectButton") }}</span>
          </Button>
        </div>
      </div>

      <!-- Two Intuitive Side-by-Side Paths -->
      <div
        v-if="!store.pendingConnection"
        class="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        <!-- Path 1: Enable Cloud Sync for This Device -->
        <div class="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-4 md:p-5 flex flex-col justify-between gap-4">
          <div class="space-y-2.5">
            <div class="w-10 h-10 rounded-xl bg-[var(--success-bg)] text-accent flex items-center justify-center">
              <CloudUpload :size="20" />
            </div>
            <h3 class="text-base font-bold text-text m-0">
              {{ t("sync.startSyncTitle") }}
            </h3>
            <p class="text-xs text-muted m-0 leading-relaxed">
              {{ t("sync.startSyncSubtitle") }}
            </p>
          </div>

          <div class="space-y-3">
            <Button
              type="button"
              severity="primary"
              :disabled="store.syncBusy"
              class="inline-flex items-center justify-center gap-2 min-h-11 w-full sm:w-auto"
              @click="createOrReconnect"
            >
              <Cloud :size="17" />
              <span>
                {{
                  store.syncBusy
                    ? t("sync.statusConnecting")
                    : t("sync.createButton")
                }}
              </span>
            </Button>
            <p class="text-xs text-muted m-0 leading-relaxed">
              {{ t("sync.encryptionNote") }}
            </p>
          </div>
        </div>

        <!-- Path 2: Connect to an Existing Database -->
        <div class="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-4 md:p-5 space-y-3">
          <div class="space-y-1">
            <h3 class="text-base font-bold text-text m-0 flex items-center gap-2">
              <Link2 :size="18" class="text-accent" />
              <span>{{ t("sync.connectExisting") }}</span>
            </h3>
            <p class="text-xs text-muted m-0 leading-relaxed">
              {{ t("sync.connectExistingSubtitle") }}
            </p>
          </div>

          <DatabaseConnectCard
            mode="settings"
            :has-existing-local-data="store.hasLocalData"
          />
        </div>
      </div>
    </template>

    <Message v-if="failure" severity="error" :closable="false">
      {{ failure }}
    </Message>

    <!-- Safe Disconnect Confirmation Dialog -->
    <Dialog
      v-model:visible="confirmDisconnectVisible"
      modal
      :header="t('sync.disconnectTitle')"
      class="w-full max-w-md mx-4"
    >
      <p class="text-sm text-muted m-0 leading-relaxed">
        {{ t("sync.disconnectBody") }}
      </p>
      <template #footer>
        <div class="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            severity="secondary"
            variant="outlined"
            @click="confirmDisconnectVisible = false"
          >
            {{ t("common.cancel") }}
          </Button>
          <Button
            type="button"
            severity="danger"
            @click="confirmDisconnect"
          >
            {{ t("sync.disconnectConfirm") }}
          </Button>
        </div>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from "vue";
import {
  ArrowLeftRight,
  Check,
  Cloud,
  CloudUpload,
  Copy,
  Eye,
  EyeOff,
  Link2,
  RefreshCw,
  Share2,
  Smartphone,
  Unlink,
} from "lucide-vue-next";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Tag from "primevue/tag";
import DatabaseConnectCard from "@/components/data/DatabaseConnectCard.vue";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { buildPrivateSyncLink, maskSyncKey } from "@/lib/sync-link";
import { useI18n } from "@/lib/i18n";

const store = useExpenses();
const { t } = useI18n();

const failure = shallowRef("");
const showLink = shallowRef(false);
const justCopied = shallowRef(false);
const showSwitchPanel = shallowRef(false);
const confirmDisconnectVisible = shallowRef(false);

const canShare = computed(
  () => typeof navigator !== "undefined" && typeof navigator.share === "function",
);

const privateLink = computed(() =>
  buildPrivateSyncLink(store.syncKey, location.origin, location.pathname),
);

const maskedActiveKey = computed(() => maskSyncKey(store.syncKey));

const statusBadge = computed<{
  label: string;
  severity: "success" | "info" | "secondary" | "danger";
}>(() => {
  if (store.syncConnected) {
    return { label: t("sync.statusSynced"), severity: "success" };
  }
  if (store.syncBusy) {
    return { label: t("sync.statusConnecting"), severity: "info" };
  }
  if (store.syncKey && store.syncStatus.toLowerCase().includes("error")) {
    return { label: t("sync.statusError"), severity: "danger" };
  }
  if (store.syncKey) {
    return { label: store.syncStatus, severity: "info" };
  }
  return { label: t("sync.statusLocal"), severity: "secondary" };
});

async function createOrReconnect() {
  failure.value = "";
  try {
    await store.connectDatabase();
  } catch (reason) {
    failure.value = friendlyError(reason);
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(privateLink.value);
    store.message = t("sync.linkCopied");
    justCopied.value = true;
    setTimeout(() => {
      justCopied.value = false;
    }, 2500);
  } catch {
    showLink.value = true;
  }
}

async function share() {
  if (!canShare.value) return;
  try {
    await navigator.share({
      title: t("nav.brand"),
      text: t("sync.privateLink"),
      url: privateLink.value,
    });
  } catch {
    // User dismissed native share sheet
  }
}

function confirmDisconnect() {
  store.disconnectDatabase();
  confirmDisconnectVisible.value = false;
  showLink.value = false;
  showSwitchPanel.value = false;
}
</script>
