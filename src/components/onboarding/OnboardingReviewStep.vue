<template>
  <div class="space-y-5">
    <div class="space-y-1">
      <div class="flex items-center gap-2.5">
        <CheckCircle2 :size="20" class="text-accent shrink-0" />
        <h2 class="text-xl font-bold text-text m-0">
          {{ t("onboarding.reviewTitle") }}
        </h2>
      </div>
      <p class="text-xs sm:text-sm text-muted m-0 leading-relaxed">
        {{ t("onboarding.reviewSubtitle") }}
      </p>
    </div>

    <!-- Summary Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <!-- Accounts & Salary Summary -->
      <article class="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <strong class="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Wallet :size="14" class="text-accent" />
            <span>{{ t("onboarding.steps.accounts") }}</span>
          </strong>
          <Button
            type="button"
            variant="link"
            size="small"
            class="p-0! h-auto! text-xs"
            @click="setup.goToStep('accounts')"
          >
            {{ t("onboarding.reviewEdit") }}
          </Button>
        </div>
        <div class="grid gap-1 text-xs">
          <div class="flex justify-between gap-2">
            <span class="text-muted">Global:</span>
            <strong class="tabular-nums text-text">
              {{
                setup.globalInitialNzdCents.value > 0
                  ? store.displayMoney(setup.globalInitialNzdCents.value)
                  : t("onboarding.reviewNotSet")
              }}
            </strong>
          </div>
          <div class="flex justify-between gap-2">
            <span class="text-muted">NZ Savings:</span>
            <strong class="tabular-nums text-text">
              {{
                setup.nzInitialNzdCents.value > 0
                  ? store.displayMoney(setup.nzInitialNzdCents.value)
                  : t("onboarding.reviewNotSet")
              }}
            </strong>
          </div>
          <div class="flex justify-between gap-2">
            <span class="text-muted">{{ t("weeklyLimit.salaryLabel") }}:</span>
            <strong class="tabular-nums text-text">
              {{
                setup.weeklySalaryCents.value > 0
                  ? `${store.displayMoney(setup.weeklySalaryCents.value)} (${t(`days.${setup.accountsForm.payDayOfWeek}`)})`
                  : t("onboarding.reviewNotSet")
              }}
            </strong>
          </div>
        </div>
      </article>

      <!-- Weekly Spending Limit Summary -->
      <article class="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <strong class="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Target :size="14" class="text-accent" />
            <span>{{ t("onboarding.steps.budget") }}</span>
          </strong>
          <Button
            type="button"
            variant="link"
            size="small"
            class="p-0! h-auto! text-xs"
            @click="setup.goToStep('budget')"
          >
            {{ t("onboarding.reviewEdit") }}
          </Button>
        </div>
        <div class="grid gap-1 text-xs">
          <div class="flex justify-between gap-2">
            <span class="text-muted">{{ t("weeklyLimit.limit") }}:</span>
            <strong class="tabular-nums text-text">
              {{
                setup.effectiveWeeklyLimitCents.value > 0
                  ? store.displayMoney(setup.effectiveWeeklyLimitCents.value)
                  : t("onboarding.reviewNotSet")
              }}
            </strong>
          </div>
          <div
            v-if="setup.budgetMode.value === 'structured' && setup.validCategoryLimits.value.length"
            class="flex justify-between gap-2"
          >
            <span class="text-muted">{{ t("onboarding.steps.categories") }}:</span>
            <strong class="text-text">
              {{ setup.validCategoryLimits.value.length }}
            </strong>
          </div>
          <div
            v-if="setup.weeklySalaryCents.value > 0 && setup.effectiveWeeklyLimitCents.value > 0"
            class="flex justify-between gap-2"
          >
            <span class="text-muted">{{ t("weeklyLimit.targetSavings") }}:</span>
            <strong class="tabular-nums text-accent">
              {{ store.displayMoney(setup.targetWeeklySavingsCents.value) }} ({{ setup.savingsRatePercent.value }}%)
            </strong>
          </div>
        </div>
      </article>

      <!-- Categories Summary -->
      <article class="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <strong class="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Tags :size="14" class="text-accent" />
            <span>{{ t("onboarding.steps.categories") }}</span>
          </strong>
          <Button
            type="button"
            variant="link"
            size="small"
            class="p-0! h-auto! text-xs"
            @click="setup.goToStep('categories')"
          >
            {{ t("onboarding.reviewEdit") }}
          </Button>
        </div>
        <p class="text-xs text-text font-semibold m-0">
          {{
            t("onboarding.reviewCategoriesSummary", {
              count: setup.customCategories.value.length,
            })
          }}
        </p>
      </article>

      <!-- Frequent Payments Summary -->
      <article class="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <strong class="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <CalendarClock :size="14" class="text-accent" />
            <span>{{ t("onboarding.steps.frequent") }}</span>
          </strong>
          <Button
            type="button"
            variant="link"
            size="small"
            class="p-0! h-auto! text-xs"
            @click="setup.goToStep('frequent')"
          >
            {{ t("onboarding.reviewEdit") }}
          </Button>
        </div>
        <p class="text-xs text-text font-semibold m-0">
          {{
            setup.frequentPayments.value.length
              ? t("onboarding.reviewBillsSummary", {
                  count: setup.frequentPayments.value.length,
                  weekly: store.displayMoney(setup.frequentWeeklyCommitmentCents.value),
                })
              : t("onboarding.reviewNoBills")
          }}
        </p>
      </article>
    </div>

    <!-- Local AI (Ollama) — Desktop Only -->
    <div
      v-if="setup.isDesktop"
      class="rounded-2xl border border-[var(--border)] bg-black/20 p-4 space-y-3"
    >
      <div class="space-y-0.5">
        <h3 class="text-sm font-bold text-text m-0 flex items-center gap-2">
          <Sparkles :size="16" class="text-accent" />
          <span>{{ t("ollama.title") }}</span>
        </h3>
        <p class="text-xs text-muted m-0">
          {{ t("ollama.description") }}
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("ollama.endpoint") }}</span>
          <InputText
            v-model="setup.ollamaHost.value"
            placeholder="http://localhost:11434"
            fluid
          />
        </label>
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("ollama.model") }}</span>
          <InputText
            v-model="setup.ollamaModel.value"
            placeholder="gemma4:e4b"
            fluid
          />
        </label>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          severity="secondary"
          size="small"
          :disabled="ollamaTesting"
          class="inline-flex items-center gap-1.5"
          @click="testOllama"
        >
          <RefreshCw :size="14" :class="{ 'animate-spin': ollamaTesting }" />
          <span>
            {{ ollamaTesting ? t("ollama.testing") : t("ollama.testConnection") }}
          </span>
        </Button>

        <span
          v-if="ollamaStatus"
          class="text-xs font-medium"
          :class="ollamaStatus.ok ? 'text-accent' : 'text-[var(--danger-colour)]'"
        >
          {{
            ollamaStatus.ok
              ? t("ollama.online")
              : ollamaStatus.error || t("ollama.offline")
          }}
        </span>
      </div>
    </div>

    <!-- Storage & Cloud Sync Choice -->
    <div class="space-y-3">
      <h3 class="text-sm font-bold text-text m-0">
        {{ t("onboarding.reviewStorageTitle") }}
      </h3>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          class="rounded-xl border p-4 space-y-2 transition-colors duration-150"
          :class="
            !setup.enableCloudSync.value
              ? 'border-accent bg-[var(--success-bg)]'
              : 'border-[var(--border)] bg-[var(--surface-card)]'
          "
        >
          <div class="flex items-center justify-between gap-2">
            <strong class="text-sm font-bold text-text flex items-center gap-2">
              <HardDrive :size="16" class="text-accent" />
              <span>{{ t("onboarding.reviewLocalTitle") }}</span>
            </strong>
            <Button
              type="button"
              size="small"
              :severity="!setup.enableCloudSync.value ? 'primary' : 'secondary'"
              :variant="!setup.enableCloudSync.value ? undefined : 'outlined'"
              @click="setup.enableCloudSync.value = false"
            >
              {{ !setup.enableCloudSync.value ? "✓" : t("common.confirm") }}
            </Button>
          </div>
          <p class="text-xs text-muted m-0 leading-relaxed">
            {{ t("onboarding.reviewLocalDescription") }}
          </p>
        </div>

        <div
          class="rounded-xl border p-4 space-y-2 transition-colors duration-150"
          :class="
            setup.enableCloudSync.value
              ? 'border-accent bg-[var(--success-bg)]'
              : 'border-[var(--border)] bg-[var(--surface-card)]'
          "
        >
          <div class="flex items-center justify-between gap-2">
            <strong class="text-sm font-bold text-text flex items-center gap-2">
              <Cloud :size="16" class="text-accent" />
              <span>{{ t("onboarding.reviewCloudTitle") }}</span>
            </strong>
            <Button
              type="button"
              size="small"
              :severity="setup.enableCloudSync.value ? 'primary' : 'secondary'"
              :variant="setup.enableCloudSync.value ? undefined : 'outlined'"
              @click="setup.enableCloudSync.value = true"
            >
              {{ setup.enableCloudSync.value ? "✓" : t("common.confirm") }}
            </Button>
          </div>
          <p class="text-xs text-muted m-0 leading-relaxed">
            {{ t("onboarding.reviewCloudDescription") }}
          </p>
        </div>
      </div>
    </div>

    <Message v-if="setup.submitError.value" severity="error" :closable="false">
      {{ setup.submitError.value }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from "vue";
import {
  CalendarClock,
  CheckCircle2,
  Cloud,
  HardDrive,
  RefreshCw,
  Sparkles,
  Tags,
  Target,
  Wallet,
} from "lucide-vue-next";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { checkOllamaStatus, type OllamaStatus } from "@/lib/ollama";
import { useI18n } from "@/lib/i18n";
import type { OnboardingSetupContext } from "@/composables/useOnboardingSetup";

const props = defineProps<{
  setup: OnboardingSetupContext;
}>();

const store = useExpenses();
const { t } = useI18n();

const ollamaTesting = shallowRef(false);
const ollamaStatus = shallowRef<OllamaStatus | null>(null);

async function testOllama() {
  ollamaTesting.value = true;
  ollamaStatus.value = null;
  try {
    ollamaStatus.value = await checkOllamaStatus(
      props.setup.ollamaHost.value,
      props.setup.ollamaModel.value,
    );
  } catch (reason) {
    ollamaStatus.value = {
      ok: false,
      host: props.setup.ollamaHost.value,
      model: props.setup.ollamaModel.value,
      availableModels: [],
      isModelPresent: false,
      error: friendlyError(reason),
    };
  } finally {
    ollamaTesting.value = false;
  }
}
</script>
