<template>
  <div class="w-full max-w-4xl mx-auto space-y-8 py-4 sm:py-8">
    <!-- Hero Intro -->
    <div class="text-center space-y-3 max-w-2xl mx-auto">
      <h1 class="text-3xl sm:text-5xl font-bold tracking-tight text-text m-0">
        {{ t("onboarding.welcomeTitle") }}
      </h1>
      <p class="text-sm sm:text-base text-muted m-0 leading-relaxed">
        {{ t("onboarding.welcomeSubtitle") }}
      </p>
    </div>

    <!-- Primary Choice Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
      <!-- Choice 1: Configure From Scratch -->
      <article
        class="rounded-2xl border border-[var(--accent)]/40 bg-[var(--surface-card)] p-5 sm:p-6 shadow-md flex flex-col justify-between gap-6 transition-colors duration-150 hover:border-accent"
      >
        <div class="space-y-4">
          <div class="flex items-center justify-between gap-2">
            <div
              class="w-12 h-12 rounded-2xl bg-[var(--success-bg)] text-accent flex items-center justify-center"
            >
              <SlidersHorizontal :size="24" />
            </div>
            <Tag :value="t('onboarding.scratchBadge')" severity="success" />
          </div>

          <div class="space-y-2">
            <h2 class="text-xl font-bold text-text m-0">
              {{ t("onboarding.scratchTitle") }}
            </h2>
            <p class="text-xs sm:text-sm text-muted m-0 leading-relaxed">
              {{ t("onboarding.scratchDescription") }}
            </p>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <Tag :value="t('onboarding.steps.accounts')" severity="secondary" />
            <Tag :value="t('onboarding.steps.budget')" severity="secondary" />
            <Tag
              :value="t('onboarding.steps.categories')"
              severity="secondary"
            />
            <Tag :value="t('onboarding.steps.frequent')" severity="secondary" />
          </div>
        </div>

        <Button
          type="button"
          severity="primary"
          class="w-full inline-flex items-center justify-center gap-2 min-h-12"
          data-testid="onboarding-start-scratch"
          @click="emit('chooseScratch')"
        >
          <span>{{ t("onboarding.scratchCta") }}</span>
          <ArrowRight :size="17" />
        </Button>
      </article>

      <!-- Choice 2: Connect to Existing Database -->
      <article
        class="rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] p-5 sm:p-6 shadow-md flex flex-col justify-between gap-6 transition-colors duration-150 hover:border-accent/60"
      >
        <div class="space-y-4">
          <div class="flex items-center justify-between gap-2">
            <div
              class="w-12 h-12 rounded-2xl bg-[var(--pill-bg)] text-accent flex items-center justify-center"
            >
              <CloudDownload :size="24" />
            </div>
            <Tag :value="t('onboarding.connectBadge')" severity="secondary" />
          </div>

          <div class="space-y-2">
            <h2 class="text-xl font-bold text-text m-0">
              {{ t("onboarding.connectTitle") }}
            </h2>
            <p class="text-xs sm:text-sm text-muted m-0 leading-relaxed">
              {{ t("onboarding.connectDescription") }}
            </p>
          </div>

          <div class="flex items-center gap-2 text-xs text-muted">
            <Lock :size="14" class="text-accent shrink-0" />
            <span>AES-256-GCM</span>
          </div>
        </div>

        <Button
          type="button"
          severity="secondary"
          variant="outlined"
          class="w-full inline-flex items-center justify-center gap-2 min-h-12"
          data-testid="onboarding-choose-connect"
          @click="emit('chooseConnect')"
        >
          <Link2 :size="17" />
          <span>{{ t("onboarding.connectCta") }}</span>
        </Button>
      </article>
    </div>

    <!-- Subtle Secondary Footer: Restore JSON Backup -->
    <div class="flex flex-col items-center gap-2 pt-2">
      <div
        class="flex flex-wrap items-center justify-center gap-2 text-xs text-muted"
      >
        <span>{{ t("onboarding.restorePrompt") }}</span>
        <Button
          type="button"
          variant="link"
          size="small"
          class="p-0! h-auto! text-xs inline-flex items-center gap-1"
          @click="backupInput?.click()"
        >
          <Upload :size="13" />
          <span>{{ t("onboarding.restoreAction") }}</span>
        </Button>
        <input
          ref="backupInput"
          type="file"
          accept=".json,application/json"
          class="sr-only"
          :aria-label="t('onboarding.restoreAction')"
          @change="handleRestore"
        />
      </div>

      <Message
        v-if="restoreError"
        severity="error"
        :closable="false"
        class="max-w-md w-full"
      >
        {{ restoreError }}
      </Message>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from "vue";
import {
  ArrowRight,
  CloudDownload,
  Link2,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
} from "lucide-vue-next";
import Button from "primevue/button";
import Message from "primevue/message";
import Tag from "primevue/tag";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { useI18n } from "@/lib/i18n";

const emit = defineEmits<{
  chooseScratch: [];
  chooseConnect: [];
}>();

const store = useExpenses();
const { t } = useI18n();
const restoreError = shallowRef("");
const backupInput = useTemplateRef<HTMLInputElement>("backupInput");

async function handleRestore(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  restoreError.value = "";
  try {
    if (file.size > 10_000_000) {
      throw new Error("Choose a backup smaller than 10 MB.");
    }
    const text = await file.text();
    await store.restore(text);
  } catch (reason) {
    restoreError.value = friendlyError(reason);
  } finally {
    input.value = "";
  }
}
</script>
