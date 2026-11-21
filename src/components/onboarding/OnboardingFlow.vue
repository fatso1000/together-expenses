<template>
  <div
    class="relative isolate min-h-svh w-full flex flex-col overflow-y-auto"
    :style="backgroundStyle"
    data-testid="onboarding-flow"
  >
    <!-- Subtle Ambient Animated Background -->
    <div
      class="onboarding-ambient-bg fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      <div class="onboarding-orb onboarding-orb--primary" />
      <div class="onboarding-orb onboarding-orb--secondary" />
      <div class="onboarding-orb onboarding-orb--mist" />
    </div>

    <!-- Top Bar -->
    <header class="sticky top-0 z-20 px-4 sm:px-6 py-3.5 backdrop-blur-md bg-[#16201d]/85 border-b border-[var(--border)] flex items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 min-w-0">
        <img
          src="/icon.svg"
          class="w-8 h-8 shrink-0"
          alt="App Icon"
        />
        <span class="text-base font-bold text-text truncate">
          {{ t("nav.brand") }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <Button
          type="button"
          severity="secondary"
          variant="outlined"
          size="small"
          class="inline-flex items-center gap-1.5"
          :aria-label="t('common.toggleLanguage')"
          @click="toggleLocale"
        >
          <Languages :size="15" />
          <span class="uppercase font-semibold">{{ locale }}</span>
        </Button>

        <Button
          v-if="viewMode !== 'sync-ready'"
          type="button"
          severity="secondary"
          variant="text"
          size="small"
          data-testid="onboarding-skip"
          @click="store.skipOnboarding()"
        >
          {{ t("onboarding.skipForNow") }}
        </Button>
      </div>
    </header>

    <!-- Main Stage -->
    <main class="relative z-10 flex-1 w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center">
      <!-- 1. Welcome Choice View -->
      <OnboardingWelcome
        v-if="viewMode === 'welcome'"
        @choose-scratch="viewMode = 'setup'"
        @choose-connect="viewMode = 'connect'"
      />

      <!-- 2. Connect to Existing Database View -->
      <div
        v-else-if="viewMode === 'connect'"
        class="w-full max-w-2xl mx-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 shadow-lg space-y-5"
      >
        <div class="space-y-1">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-[var(--success-bg)] text-accent flex items-center justify-center shrink-0">
              <CloudDownload :size="20" />
            </div>
            <div>
              <h1 class="text-2xl font-bold text-text m-0">
                {{ t("onboarding.connectTitle") }}
              </h1>
              <p class="text-xs sm:text-sm text-muted m-0">
                {{ t("onboarding.connectDescription") }}
              </p>
            </div>
          </div>
        </div>

        <DatabaseConnectCard
          mode="onboarding"
          :has-existing-local-data="false"
          show-back
          @back="viewMode = 'welcome'"
          @connected="onDatabaseConnected"
        />
      </div>

      <!-- 3. Guided 5-Step Configure From Scratch Wizard -->
      <div
        v-else-if="viewMode === 'setup'"
        class="w-full max-w-3xl mx-auto space-y-5"
      >
        <!-- Stepper Header -->
        <div class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
          <div class="flex items-center justify-between gap-2 text-xs">
            <span class="font-semibold text-accent">
              {{
                t("onboarding.stepOf", {
                  current: setup.currentStepIndex.value + 1,
                  total: setup.steps.length,
                })
              }}
            </span>
            <span class="font-semibold text-text">
              {{ stepLabel(setup.currentStepId.value) }}
            </span>
          </div>

          <!-- Progress Bar -->
          <div class="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              class="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>

          <!-- Desktop Clickable Step Pills -->
          <div class="hidden sm:grid grid-cols-5 gap-1.5 pt-1">
            <Button
              v-for="(stepId, index) in setup.steps"
              :key="stepId"
              type="button"
              size="small"
              :severity="
                index === setup.currentStepIndex.value
                  ? 'primary'
                  : 'secondary'
              "
              :variant="
                index === setup.currentStepIndex.value ? undefined : 'text'
              "
              class="text-xs px-2! py-1.5! justify-center truncate"
              @click="setup.goToStep(stepId)"
            >
              <span class="truncate">{{ index + 1 }}. {{ stepLabel(stepId) }}</span>
            </Button>
          </div>
        </div>

        <!-- Active Step Card -->
        <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 shadow-lg">
          <OnboardingAccountsStep
            v-if="setup.currentStepId.value === 'accounts'"
            :setup="setup"
          />
          <OnboardingBudgetStep
            v-else-if="setup.currentStepId.value === 'budget'"
            :setup="setup"
          />
          <OnboardingCategoriesStep
            v-else-if="setup.currentStepId.value === 'categories'"
            :setup="setup"
          />
          <OnboardingFrequentStep
            v-else-if="setup.currentStepId.value === 'frequent'"
            :setup="setup"
          />
          <OnboardingReviewStep
            v-else
            :setup="setup"
          />
        </section>

        <!-- Navigation Footer -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            severity="secondary"
            variant="outlined"
            class="inline-flex items-center gap-1.5 min-h-11"
            :disabled="setup.submitting.value"
            @click="handleBack"
          >
            <ArrowLeft :size="16" />
            <span>{{ t("onboarding.back") }}</span>
          </Button>

          <div class="flex items-center gap-2.5 ml-auto">
            <Button
              v-if="!setup.isLastStep.value"
              type="button"
              severity="secondary"
              variant="text"
              class="min-h-11"
              @click="setup.nextStep()"
            >
              {{ t("onboarding.skipStep") }}
            </Button>

            <Button
              v-if="!setup.isLastStep.value"
              type="button"
              severity="primary"
              class="inline-flex items-center gap-1.5 min-h-11"
              data-testid="onboarding-next"
              @click="setup.nextStep()"
            >
              <span>{{ t("onboarding.next") }}</span>
              <ArrowRight :size="16" />
            </Button>

            <Button
              v-else
              type="button"
              severity="primary"
              class="inline-flex items-center gap-2 min-h-11"
              :disabled="setup.submitting.value"
              data-testid="onboarding-finish"
              @click="handleFinish"
            >
              <Loader2 v-if="setup.submitting.value" :size="16" class="animate-spin" />
              <Check v-else :size="16" />
              <span>
                {{
                  setup.submitting.value
                    ? t("onboarding.finishing")
                    : t("onboarding.finish")
                }}
              </span>
            </Button>
          </div>
        </div>
      </div>

      <!-- 4. Sync Ready Completion Screen (when user opted into Cloud Sync) -->
      <div
        v-else
        class="w-full max-w-xl mx-auto rounded-2xl border border-[var(--success-border)] bg-[var(--surface)] p-6 sm:p-8 shadow-lg space-y-5 text-center"
      >
        <div class="w-14 h-14 mx-auto rounded-2xl bg-[var(--success-bg)] text-accent flex items-center justify-center">
          <CheckCircle2 :size="30" />
        </div>

        <div class="space-y-2">
          <h1 class="text-2xl sm:text-3xl font-bold text-text m-0">
            {{ t("onboarding.syncReadyTitle") }}
          </h1>
          <p class="text-xs sm:text-sm text-muted m-0 leading-relaxed">
            {{ t("onboarding.syncReadySubtitle") }}
          </p>
        </div>

        <div class="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 space-y-3 text-left">
          <label for="onboarding-created-link" class="block text-xs font-medium text-muted">
            {{ t("sync.privateLink") }}
          </label>
          <InputText
            id="onboarding-created-link"
            :modelValue="createdPrivateLink"
            readonly
            class="font-mono text-xs"
            fluid
          />
          <div class="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              severity="secondary"
              class="inline-flex items-center gap-2 min-h-11"
              @click="copyCreatedLink"
            >
              <Check v-if="linkCopied" :size="16" />
              <Copy v-else :size="16" />
              <span>{{ linkCopied ? t("sync.copied") : t("sync.copyLink") }}</span>
            </Button>
          </div>
          <p class="text-xs text-muted m-0">
            {{ t("sync.linkNotice") }}
          </p>
        </div>

        <Button
          type="button"
          severity="primary"
          class="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-12 px-6"
          @click="store.closeOnboarding()"
        >
          <span>{{ t("onboarding.openDashboard") }}</span>
          <ArrowRight :size="17" />
        </Button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from "vue";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CloudDownload,
  Copy,
  Languages,
  Loader2,
} from "lucide-vue-next";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import DatabaseConnectCard from "@/components/data/DatabaseConnectCard.vue";
import OnboardingWelcome from "@/components/onboarding/OnboardingWelcome.vue";
import OnboardingAccountsStep from "@/components/onboarding/OnboardingAccountsStep.vue";
import OnboardingBudgetStep from "@/components/onboarding/OnboardingBudgetStep.vue";
import OnboardingCategoriesStep from "@/components/onboarding/OnboardingCategoriesStep.vue";
import OnboardingFrequentStep from "@/components/onboarding/OnboardingFrequentStep.vue";
import OnboardingReviewStep from "@/components/onboarding/OnboardingReviewStep.vue";
import {
  useOnboardingSetup,
  type OnboardingStepId,
} from "@/composables/useOnboardingSetup";
import { useExpenses } from "@/stores/expenses";
import { buildPrivateSyncLink } from "@/lib/sync-link";
import { useI18n } from "@/lib/i18n";

defineProps<{
  backgroundStyle: Record<string, string>;
}>();

const store = useExpenses();
const { t, locale, toggleLocale } = useI18n();
const setup = useOnboardingSetup();

type ViewMode = "welcome" | "connect" | "setup" | "sync-ready";

const viewMode = shallowRef<ViewMode>(
  store.pendingConnection ? "connect" : "welcome",
);
const createdSyncKey = shallowRef("");
const linkCopied = shallowRef(false);

const progressPercent = computed(() =>
  Math.round(((setup.currentStepIndex.value + 1) / setup.steps.length) * 100),
);

const createdPrivateLink = computed(() =>
  createdSyncKey.value
    ? buildPrivateSyncLink(
        createdSyncKey.value,
        location.origin,
        location.pathname,
      )
    : "",
);

function stepLabel(stepId: OnboardingStepId): string {
  return t(`onboarding.steps.${stepId}`);
}

function handleBack() {
  if (setup.isFirstStep.value) {
    viewMode.value = "welcome";
    return;
  }
  setup.prevStep();
}

function onDatabaseConnected() {
  store.closeOnboarding();
}

async function handleFinish() {
  const result = await setup.submitSetup();
  if (!result) return;
  if (result.syncEnabled && result.syncKey) {
    createdSyncKey.value = result.syncKey;
    viewMode.value = "sync-ready";
  }
}

async function copyCreatedLink() {
  if (!createdPrivateLink.value) return;
  try {
    await navigator.clipboard.writeText(createdPrivateLink.value);
    store.message = t("sync.linkCopied");
    linkCopied.value = true;
    setTimeout(() => {
      linkCopied.value = false;
    }, 2500);
  } catch {
    // Readonly input is already visible for manual copy
  }
}
</script>

<style scoped>
.onboarding-orb {
  position: absolute;
  border-radius: 9999px;
  will-change: transform, opacity;
}

.onboarding-orb--primary {
  top: -18%;
  right: -12%;
  width: clamp(28rem, 58vw, 56rem);
  height: clamp(28rem, 58vw, 56rem);
  background: radial-gradient(
    circle at center,
    color-mix(in srgb, var(--accent) 16%, transparent) 0%,
    color-mix(in srgb, var(--accent) 6%, transparent) 42%,
    transparent 70%
  );
  animation: onboarding-drift-primary 26s ease-in-out infinite alternate;
}

.onboarding-orb--secondary {
  bottom: -22%;
  left: -14%;
  width: clamp(30rem, 62vw, 60rem);
  height: clamp(30rem, 62vw, 60rem);
  background: radial-gradient(
    circle at center,
    color-mix(in srgb, var(--green) 17%, transparent) 0%,
    color-mix(in srgb, var(--green) 6%, transparent) 44%,
    transparent 72%
  );
  animation: onboarding-drift-secondary 32s ease-in-out -10s infinite alternate;
}

.onboarding-orb--mist {
  top: 24%;
  left: 22%;
  width: clamp(24rem, 48vw, 46rem);
  height: clamp(24rem, 48vw, 46rem);
  background: radial-gradient(
    circle at center,
    rgba(216, 224, 220, 0.08) 0%,
    rgba(216, 224, 220, 0.03) 45%,
    transparent 70%
  );
  animation: onboarding-drift-mist 38s ease-in-out -18s infinite alternate;
}

@keyframes onboarding-drift-primary {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.72;
  }
  50% {
    transform: translate3d(-4%, 5%, 0) scale(1.06);
    opacity: 0.95;
  }
  100% {
    transform: translate3d(-8%, 2%, 0) scale(0.98);
    opacity: 0.78;
  }
}

@keyframes onboarding-drift-secondary {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.75;
  }
  50% {
    transform: translate3d(5%, -4%, 0) scale(1.05);
    opacity: 0.92;
  }
  100% {
    transform: translate3d(2%, -8%, 0) scale(0.97);
    opacity: 0.7;
  }
}

@keyframes onboarding-drift-mist {
  0% {
    transform: translate3d(-3%, 2%, 0) scale(0.96);
    opacity: 0.65;
  }
  50% {
    transform: translate3d(4%, -3%, 0) scale(1.04);
    opacity: 0.9;
  }
  100% {
    transform: translate3d(1%, 4%, 0) scale(0.98);
    opacity: 0.7;
  }
}

@media (prefers-reduced-motion: reduce) {
  .onboarding-orb {
    animation: none;
    will-change: auto;
  }
}
</style>
