<template>
  <Card aria-label="AI Money Advisor" class="mb-6">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3 p-5 pb-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[var(--success-bg)] text-accent flex items-center justify-center shrink-0">
            <Sparkles :size="20" />
          </div>
          <div>
            <h2 class="text-lg font-bold m-0 text-text">AI Money Advisor</h2>
            <p class="text-xs text-muted m-0">
              On-device intelligence powered by local Gemma ({{ getOllamaModel() }})
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <RouterLink
            to="/chat"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-accent bg-[var(--success-bg)] border border-[var(--success-border)] rounded-full no-underline hover:bg-[var(--surface-card-hover)] hover:border-accent transition-colors"
            title="Open AI Spending Chat"
          >
            <MessageSquare :size="15" />
            <span>{{ t("nav.aiChat") }}</span>
          </RouterLink>

          <div class="flex items-center gap-1.5">
            <Button
              type="button"
              size="small"
              :title="
                status?.ok
                  ? 'Connected to local Ollama daemon'
                  : 'Click to see Ollama setup guide'
              "
              :severity="status?.ok ? undefined : 'danger'"
              class="inline-flex items-center gap-1.5"
              @click="showSetupGuide = !showSetupGuide"
            >
              <span>{{ status?.ok ? `${status.model} Ready` : "Ollama Offline" }}</span>
              <ChevronDown v-if="!showSetupGuide" :size="18" />
              <ChevronUp v-else :size="18" />
            </Button>
            <Button
              variant="text"
              severity="secondary"
              rounded
              size="small"
              title="Refresh Ollama connection"
              aria-label="Refresh Ollama connection"
              type="button"
              :disabled="checkingStatus"
              @click="refreshOllamaStatus"
            >
              <RefreshCw :size="14" :class="{ 'animate-spin': checkingStatus }" />
            </Button>
          </div>
        </div>
      </div>
    </template>

    <template #content>
      <div class="flex flex-col gap-3">
        <!-- Collapsible Setup Guide when Offline or Toggled -->
        <div
          v-if="showSetupGuide"
          class="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] grid gap-2 text-xs"
        >
          <strong class="text-text">Running Gemma 4 Locally with Ollama:</strong>
          <ol class="m-0 pl-5 grid gap-1 text-muted">
            <li>
              Install Ollama from
              <a href="https://ollama.com" target="_blank" rel="noopener" class="text-accent underline">ollama.com</a>.
            </li>
            <li>
              Pull the Gemma model:
              <code class="px-1.5 py-0.5 rounded bg-[var(--input-bg)] text-text font-mono text-[11px]">
                ollama pull {{ getOllamaModel() }}
              </code>
            </li>
            <li>
              Start Ollama allowing browser requests:
              <code class="px-1.5 py-0.5 rounded bg-[var(--input-bg)] text-text font-mono text-[11px]">
                OLLAMA_ORIGINS="*" ollama serve
              </code>
            </li>
            <li>Tap the refresh button above to connect.</li>
          </ol>
          <p v-if="status?.error" class="text-xs text-[var(--danger-colour)] m-0">
            {{ status.error }}
          </p>
        </div>

        <!-- Quick Action Pills -->
        <div class="flex flex-wrap gap-2">
          <Button
            type="button"
            size="small"
            :severity="activeMode === 'pacing' ? 'primary' : 'secondary'"
            :variant="activeMode === 'pacing' ? undefined : 'outlined'"
            :disabled="analyzing"
            class="inline-flex items-center gap-1.5"
            @click="runAnalysis('pacing')"
          >
            <TrendingUp :size="15" />
            <span>Weekly Budget Pace</span>
          </Button>

          <Button
            type="button"
            size="small"
            :severity="activeMode === 'savings' ? 'primary' : 'secondary'"
            :variant="activeMode === 'savings' ? undefined : 'outlined'"
            :disabled="analyzing"
            class="inline-flex items-center gap-1.5"
            @click="runAnalysis('savings')"
          >
            <PiggyBank :size="15" />
            <span>Save Money</span>
          </Button>

          <Button
            type="button"
            size="small"
            :severity="activeMode === 'bills' ? 'primary' : 'secondary'"
            :variant="activeMode === 'bills' ? undefined : 'outlined'"
            :disabled="analyzing"
            class="inline-flex items-center gap-1.5"
            @click="runAnalysis('bills')"
          >
            <Receipt :size="15" />
            <span>Audit Bills</span>
          </Button>

          <Button
            type="button"
            size="small"
            :severity="activeMode === 'audit' ? 'primary' : 'secondary'"
            :variant="activeMode === 'audit' ? undefined : 'outlined'"
            :disabled="analyzing"
            class="inline-flex items-center gap-1.5"
            @click="runAnalysis('audit')"
          >
            <Sparkles :size="15" />
            <span>Overall Health</span>
          </Button>
        </div>

        <!-- Busy Spinner -->
        <div
          v-if="analyzing"
          class="flex flex-col items-center gap-2.5 py-7 px-4 rounded-xl bg-[var(--surface)] border border-dashed border-[var(--border)] text-muted text-center"
        >
          <RefreshCw :size="24" class="animate-spin text-accent" />
          <p class="text-sm m-0">Gemma is analyzing your spending patterns and category data…</p>
        </div>

        <!-- Error State -->
        <div
          v-else-if="analysisError"
          class="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger-colour)]"
          role="alert"
        >
          <AlertTriangle :size="18" class="shrink-0" />
          <div class="grid gap-0.5 flex-1">
            <strong class="text-xs">{{ t("ai.couldNotComplete") }}</strong>
            <span class="text-xs">{{ analysisError }}</span>
          </div>
          <Button
            severity="secondary"
            size="small"
            type="button"
            @click="runAnalysis(activeMode)"
          >
            {{ t("common.retry") }}
          </Button>
        </div>

        <!-- Analysis Results Card -->
        <div
          v-else-if="analysis"
          class="grid gap-3 p-4 rounded-xl border"
          :class="
            analysis.status === 'critical'
              ? 'bg-[var(--danger-bg)] border-[var(--danger-border)]'
              : analysis.status === 'caution'
                ? 'bg-[var(--warning-bg)] border-[var(--warning-border)]'
                : 'bg-[var(--surface-card)] border-[var(--border)]'
          "
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <Tag
                :value="
                  analysis.status === 'on_track'
                    ? 'On Track'
                    : analysis.status === 'caution'
                      ? 'Caution'
                      : 'Action Needed'
                "
                :severity="
                  analysis.status === 'on_track'
                    ? 'success'
                    : analysis.status === 'caution'
                      ? 'warn'
                      : 'danger'
                "
              />
              <h3 class="text-base font-bold m-0 text-text">{{ analysis.headline }}</h3>
            </div>

            <div
              v-if="analysis.potentialSavingsNZD > 0"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--success-bg)] text-[var(--success-colour)] text-xs font-bold"
            >
              <Lightbulb :size="14" />
              <span>+${{ analysis.potentialSavingsNZD }} NZD Potential Savings</span>
            </div>
          </div>

          <p class="m-0 text-sm leading-relaxed text-text">{{ analysis.summary }}</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-dashed border-[var(--border)]">
            <div v-if="analysis.insights.length" class="grid gap-1.5">
              <span class="text-[11px] font-bold uppercase tracking-wider text-muted">
                Key Observations
              </span>
              <ul class="m-0 pl-4 grid gap-1.5 text-xs text-text">
                <li v-for="(insight, idx) in analysis.insights" :key="idx">
                  {{ insight }}
                </li>
              </ul>
            </div>

            <div v-if="analysis.recommendations.length" class="grid gap-1.5">
              <span class="text-[11px] font-bold uppercase tracking-wider text-muted">
                Recommended Actions
              </span>
              <ul class="m-0 pl-4 grid gap-1.5 text-xs font-medium text-text">
                <li v-for="(rec, idx) in analysis.recommendations" :key="idx">
                  {{ rec }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Empty Initial State -->
        <div
          v-else
          class="flex items-center gap-2 px-3.5 py-3 rounded-xl bg-[var(--surface)] text-xs text-muted"
        >
          <Lightbulb :size="20" class="shrink-0 text-muted" />
          <span>
            Select any topic above to generate on-device financial insights and
            recommendations.
          </span>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import {
  Sparkles,
  TrendingUp,
  PiggyBank,
  Receipt,
  AlertTriangle,
  RefreshCw,
  Lightbulb,
  MessageSquare,
} from "lucide-vue-next";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { categoryTotals, today } from "@/lib/finance";
import {
  checkOllamaStatus,
  analyzeExpensesWithGemma,
  getOllamaHost,
  getOllamaModel,
  isLocalDesktopApp,
  type AiFinancialAnalysis,
  type FinancialContext,
  type OllamaStatus,
} from "@/lib/ollama";
import { t } from "@/lib/i18n";
import Card from "primevue/card";
import Button from "primevue/button";
import Tag from "primevue/tag";
import ChevronDown from "@primeicons/vue/chevron-down";
import ChevronUp from "@primeicons/vue/chevron-up";

const store = useExpenses();

const status = shallowRef<OllamaStatus | null>(null);
const checkingStatus = shallowRef(false);
const analyzing = shallowRef(false);
const activeMode = shallowRef<"pacing" | "savings" | "bills" | "audit">(
  "pacing",
);
const analysis = ref<AiFinancialAnalysis | null>(null);
const analysisError = shallowRef("");
const showSetupGuide = shallowRef(false);

const daysRemaining = computed(() => {
  const now = new Date(`${today()}T12:00:00`).getTime();
  const end = new Date(`${store.weekEnd}T12:00:00`).getTime();
  const diffDays = Math.round((end - now) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.min(7, diffDays));
});

const dailyAllowance = computed(() => {
  if (!store.weeklyLimit || store.weekTotal >= store.weeklyLimit) return 0;
  return Math.round(
    (store.weeklyLimit - store.weekTotal) / daysRemaining.value,
  );
});

async function refreshOllamaStatus() {
  if (!isLocalDesktopApp()) return;
  checkingStatus.value = true;
  try {
    status.value = await checkOllamaStatus();
  } catch {
    status.value = {
      ok: false,
      host: getOllamaHost(),
      model: getOllamaModel(),
      availableModels: [],
      isModelPresent: false,
    };
  } finally {
    checkingStatus.value = false;
  }
}

function buildContext(): FinancialContext {
  const catTotals = categoryTotals(store.weekExpenses, store.allCategories);
  const frequentList = store.frequentPayments
    .filter((p) => p.active)
    .map((p) => ({
      name: p.name,
      amountNZD: p.amount / 100,
      frequency: p.frequency,
      category: p.category,
    }));

  const recentList = store.weekExpenses.slice(0, 10).map((e) => ({
    merchant: e.merchant,
    amountNZD: e.amount / 100,
    category: e.category,
    date: e.date,
  }));

  return {
    weekTotalNZD: store.weekTotal / 100,
    weeklyLimitNZD: store.weeklyLimit / 100,
    daysRemainingInWeek: daysRemaining.value,
    dailyAllowanceNZD: dailyAllowance.value / 100,
    monthTotalNZD: store.monthTotal / 100,
    frequentWeeklyCommitmentNZD: store.frequentWeeklyCommitment / 100,
    frequentPayments: frequentList,
    categorySpend: catTotals.map((c) => ({
      category: c.category,
      amountNZD: c.amount / 100,
      percent: Math.round(c.percent),
    })),
    recentExpenses: recentList,
  };
}

async function runAnalysis(mode: "pacing" | "savings" | "bills" | "audit") {
  activeMode.value = mode;
  analyzing.value = true;
  analysisError.value = "";
  try {
    const context = buildContext();
    analysis.value = await analyzeExpensesWithGemma(mode, context);
  } catch (err) {
    analysisError.value = friendlyError(err);
  } finally {
    analyzing.value = false;
  }
}

onMounted(() => {
  if (isLocalDesktopApp()) {
    void refreshOllamaStatus();
  }
});
</script>
