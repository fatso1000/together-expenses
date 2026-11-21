<template>
  <div class="space-y-4">
    <!-- Auto-detected pending connection link from URL -->
    <div
      v-if="usingPendingLink"
      class="rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] p-4 space-y-3"
      role="status"
    >
      <div class="flex items-start gap-3">
        <div class="w-9 h-9 rounded-xl bg-black/25 text-accent flex items-center justify-center shrink-0">
          <CheckCircle2 :size="20" />
        </div>
        <div class="space-y-1 min-w-0">
          <p class="text-sm font-bold text-text m-0">
            {{ t("sync.pendingDetectedTitle") }}
          </p>
          <p class="text-xs text-text/90 m-0">
            {{ t("sync.pendingDetectedBody", { key: pendingMaskedKey }) }}
          </p>
        </div>
      </div>
      <div>
        <Button
          type="button"
          variant="link"
          size="small"
          class="p-0! h-auto! text-xs"
          @click="switchToManualInput"
        >
          {{ t("sync.useDifferentLink") }}
        </Button>
      </div>
    </div>

    <!-- Manual paste flow with 3-step visual guide -->
    <template v-else>
      <div class="rounded-xl border border-[var(--border)] bg-black/20 p-3.5 space-y-2.5">
        <p class="text-xs font-semibold uppercase tracking-wider text-muted m-0">
          {{ t("sync.howToGetLinkTitle") }}
        </p>
        <ol class="m-0 p-0 list-none grid gap-2">
          <li class="flex items-start gap-2.5 text-xs text-text">
            <span class="w-5 h-5 rounded-full bg-[var(--pill-bg)] border border-[var(--border)] text-accent font-bold text-[11px] flex items-center justify-center shrink-0">
              1
            </span>
            <span class="pt-0.5">{{ t("sync.howToStep1") }}</span>
          </li>
          <li class="flex items-start gap-2.5 text-xs text-text">
            <span class="w-5 h-5 rounded-full bg-[var(--pill-bg)] border border-[var(--border)] text-accent font-bold text-[11px] flex items-center justify-center shrink-0">
              2
            </span>
            <span class="pt-0.5">{{ t("sync.howToStep2") }}</span>
          </li>
          <li class="flex items-start gap-2.5 text-xs text-text">
            <span class="w-5 h-5 rounded-full bg-[var(--pill-bg)] border border-[var(--border)] text-accent font-bold text-[11px] flex items-center justify-center shrink-0">
              3
            </span>
            <span class="pt-0.5">{{ t("sync.howToStep3") }}</span>
          </li>
        </ol>
      </div>

      <div class="space-y-2">
        <label
          :for="inputId"
          class="block text-xs font-semibold text-muted"
        >
          {{ t("sync.inputLabel") }}
        </label>
        <div class="flex flex-col sm:flex-row gap-2">
          <InputText
            :id="inputId"
            v-model="rawConnection"
            autocomplete="off"
            spellcheck="false"
            :placeholder="t('sync.inputPlaceholder')"
            :invalid="inspection.status === 'invalid'"
            class="flex-1 font-mono text-xs"
            fluid
          />
          <div class="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              severity="secondary"
              variant="outlined"
              class="inline-flex items-center gap-1.5 min-h-11"
              :disabled="store.syncBusy"
              @click="pasteFromClipboard"
            >
              <ClipboardPaste :size="16" />
              <span>{{ t("sync.pasteFromClipboard") }}</span>
            </Button>
            <Button
              v-if="rawConnection"
              type="button"
              severity="secondary"
              variant="text"
              rounded
              :aria-label="t('common.close')"
              class="min-h-11 min-w-11"
              :disabled="store.syncBusy"
              @click="clearInput"
            >
              <X :size="16" />
            </Button>
          </div>
        </div>

        <!-- Live validation feedback pill -->
        <div
          v-if="inspection.status === 'valid'"
          class="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] text-xs text-accent font-medium"
          role="status"
        >
          <CheckCircle2 :size="15" class="shrink-0" />
          <span>{{ t("sync.validKeyDetected", { key: inspection.maskedKey }) }}</span>
        </div>
        <div
          v-else-if="inspection.status === 'invalid'"
          class="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-border)] text-xs text-[var(--warning-colour)]"
          role="status"
        >
          <AlertTriangle :size="15" class="shrink-0" />
          <span>{{ t("sync.invalidKeyHint") }}</span>
        </div>

        <p v-if="clipboardNotice" class="text-xs text-muted m-0" role="status">
          {{ clipboardNotice }}
        </p>
      </div>
    </template>

    <!-- Context-aware replacement safety notice (only in settings mode when local data exists) -->
    <div
      v-if="requiresAcknowledgement"
      class="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3.5 space-y-3"
    >
      <div class="flex items-start gap-2.5 text-xs text-[var(--warning-colour)]">
        <AlertTriangle :size="16" class="shrink-0 mt-0.5" />
        <p class="m-0 leading-relaxed">{{ t("sync.replaceNotice") }}</p>
      </div>
      <div class="flex items-start gap-2.5">
        <Checkbox
          v-model="acknowledged"
          binary
          :inputId="checkboxId"
        />
        <label :for="checkboxId" class="text-xs text-text font-medium cursor-pointer leading-snug">
          {{ t("sync.useConnected") }}
        </label>
      </div>
    </div>

    <Message v-if="failure" severity="error" :closable="false">
      {{ failure }}
    </Message>

    <!-- Primary Actions -->
    <div class="flex flex-wrap items-center gap-3 pt-1">
      <Button
        v-if="showBack"
        type="button"
        severity="secondary"
        variant="outlined"
        class="inline-flex items-center gap-1.5 min-h-11"
        :disabled="store.syncBusy"
        @click="emit('back')"
      >
        <ArrowLeft :size="16" />
        <span>{{ t("common.back") }}</span>
      </Button>

      <Button
        type="button"
        severity="primary"
        class="inline-flex items-center gap-2 min-h-11 flex-1 sm:flex-initial justify-center"
        :disabled="!canSubmit"
        @click="connect"
      >
        <Loader2 v-if="store.syncBusy" :size="17" class="animate-spin" />
        <Link2 v-else :size="17" />
        <span>
          {{
            store.syncBusy
              ? t("sync.connectingProgress")
              : t("sync.connectDevice")
          }}
        </span>
      </Button>
    </div>

    <!-- Encryption reassurance -->
    <div class="flex items-start gap-2 pt-1 text-xs text-muted">
      <ShieldCheck :size="15" class="shrink-0 text-accent mt-0.5" />
      <p class="m-0 leading-relaxed">{{ t("sync.encryptionNote") }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, useId } from "vue";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardPaste,
  Link2,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-vue-next";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { inspectSyncInput, maskSyncKey } from "@/lib/sync-link";
import { useI18n } from "@/lib/i18n";

const props = withDefaults(
  defineProps<{
    mode: "onboarding" | "settings";
    hasExistingLocalData?: boolean;
    showBack?: boolean;
  }>(),
  {
    hasExistingLocalData: false,
    showBack: false,
  },
);

const emit = defineEmits<{
  connected: [];
  back: [];
}>();

const store = useExpenses();
const { t } = useI18n();
const uid = useId();
const inputId = `sync-link-input-${uid}`;
const checkboxId = `sync-ack-checkbox-${uid}`;

const rawConnection = shallowRef("");
const ignorePending = shallowRef(false);
const acknowledged = shallowRef(false);
const failure = shallowRef("");
const clipboardNotice = shallowRef("");

const pendingInspection = computed(() =>
  inspectSyncInput(store.pendingConnection),
);

const usingPendingLink = computed(
  () => !ignorePending.value && pendingInspection.value.status === "valid",
);

const pendingMaskedKey = computed(() =>
  pendingInspection.value.key ? maskSyncKey(pendingInspection.value.key) : "",
);

const inspection = computed(() => inspectSyncInput(rawConnection.value));

const resolvedKey = computed<string | null>(() => {
  if (usingPendingLink.value) {
    return pendingInspection.value.key;
  }
  return inspection.value.key;
});

const requiresAcknowledgement = computed(
  () => props.mode === "settings" && props.hasExistingLocalData,
);

const canSubmit = computed(() => {
  if (store.syncBusy) return false;
  if (!resolvedKey.value) return false;
  if (requiresAcknowledgement.value && !acknowledged.value) return false;
  return true;
});

function switchToManualInput() {
  ignorePending.value = true;
  failure.value = "";
}

function clearInput() {
  rawConnection.value = "";
  failure.value = "";
  clipboardNotice.value = "";
}

async function pasteFromClipboard() {
  clipboardNotice.value = "";
  failure.value = "";
  if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
    clipboardNotice.value = t("sync.clipboardDenied");
    return;
  }
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      clipboardNotice.value = t("sync.clipboardEmpty");
      return;
    }
    rawConnection.value = text.trim();
  } catch {
    clipboardNotice.value = t("sync.clipboardDenied");
  }
}

async function connect() {
  failure.value = "";
  const key = resolvedKey.value;
  if (!key) {
    failure.value = t("sync.invalidKeyHint");
    return;
  }
  try {
    await store.connectDatabase(key);
    rawConnection.value = "";
    acknowledged.value = false;
    ignorePending.value = false;
    emit("connected");
  } catch (reason) {
    failure.value = friendlyError(reason);
  }
}
</script>
