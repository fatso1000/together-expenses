<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from "vue";
import {
  Sparkles,
  TrendingUp,
  PiggyBank,
  Receipt,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lightbulb,
  ExternalLink,
  ChevronDown,
  ChevronUp,
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

const store = useExpenses();

const status = shallowRef<OllamaStatus | null>(null);
const checkingStatus = shallowRef(false);
const analyzing = shallowRef(false);
const activeMode = shallowRef<"pacing" | "savings" | "bills" | "audit">("pacing");
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
  return Math.round((store.weeklyLimit - store.weekTotal) / daysRemaining.value);
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

<template>
  <section class="panel ai-advisor-panel" aria-label="AI Money Advisor">
    <div class="advisor-header">
      <div class="advisor-title-wrap">
        <div class="advisor-icon-badge">
          <Sparkles :size="20" />
        </div>
        <div>
          <h2>AI Money Advisor</h2>
          <p class="small muted">
            On-device intelligence powered by local Gemma ({{ getOllamaModel() }})
          </p>
        </div>
      </div>

      <div class="advisor-status-wrap">
        <button
          class="status-pill-btn"
          :class="{ connected: status?.ok, offline: !status?.ok }"
          type="button"
          :title="status?.ok ? 'Connected to local Ollama daemon' : 'Click to see Ollama setup guide'"
          @click="showSetupGuide = !showSetupGuide"
        >
          <span class="status-dot"></span>
          <span>{{ status?.ok ? `${status.model} Ready` : 'Ollama Offline' }}</span>
          <ChevronDown v-if="!showSetupGuide" :size="13" />
          <ChevronUp v-else :size="13" />
        </button>
        <button
          class="icon-button"
          title="Refresh Ollama connection"
          type="button"
          :disabled="checkingStatus"
          @click="refreshOllamaStatus"
        >
          <RefreshCw :size="14" :class="{ spinning: checkingStatus }" />
        </button>
      </div>
    </div>

    <!-- Collapsible Setup Guide when Offline or Toggled -->
    <div v-if="showSetupGuide" class="setup-guide-box">
      <strong>Running Gemma 4 Locally with Ollama:</strong>
      <ol class="small">
        <li>Install Ollama from <a href="https://ollama.com" target="_blank" rel="noopener">ollama.com</a>.</li>
        <li>Pull the Gemma model: <code>ollama pull {{ getOllamaModel() }}</code></li>
        <li>Start Ollama allowing browser requests: <code>OLLAMA_ORIGINS="*" ollama serve</code></li>
        <li>Tap the refresh button above to connect.</li>
      </ol>
      <p v-if="status?.error" class="small error-text">{{ status.error }}</p>
    </div>

    <!-- Quick Action Pills -->
    <div class="analysis-action-pills">
      <button
        class="mode-pill"
        :class="{ active: activeMode === 'pacing' }"
        type="button"
        :disabled="analyzing"
        @click="runAnalysis('pacing')"
      >
        <TrendingUp :size="15" />
        <span>Weekly Budget Pace</span>
      </button>

      <button
        class="mode-pill"
        :class="{ active: activeMode === 'savings' }"
        type="button"
        :disabled="analyzing"
        @click="runAnalysis('savings')"
      >
        <PiggyBank :size="15" />
        <span>Save Money</span>
      </button>

      <button
        class="mode-pill"
        :class="{ active: activeMode === 'bills' }"
        type="button"
        :disabled="analyzing"
        @click="runAnalysis('bills')"
      >
        <Receipt :size="15" />
        <span>Audit Bills</span>
      </button>

      <button
        class="mode-pill"
        :class="{ active: activeMode === 'audit' }"
        type="button"
        :disabled="analyzing"
        @click="runAnalysis('audit')"
      >
        <Sparkles :size="15" />
        <span>Overall Health</span>
      </button>
    </div>

    <!-- Busy Spinner -->
    <div v-if="analyzing" class="analyzing-state">
      <RefreshCw :size="24" class="spinning" />
      <p>Gemma is analyzing your spending patterns and category data…</p>
    </div>

    <!-- Error State -->
    <div v-else-if="analysisError" class="analysis-error" role="alert">
      <AlertTriangle :size="18" />
      <div class="error-msg">
        <strong>Could not complete analysis</strong>
        <span>{{ analysisError }}</span>
      </div>
      <button class="secondary btn-sm" type="button" @click="runAnalysis(activeMode)">
        Retry
      </button>
    </div>

    <!-- Analysis Results Card -->
    <div v-else-if="analysis" class="analysis-card" :data-status="analysis.status">
      <div class="analysis-card-top">
        <div class="headline-line">
          <div class="status-chip" :data-status="analysis.status">
            <CheckCircle2 v-if="analysis.status === 'on_track'" :size="14" />
            <AlertTriangle v-else-if="analysis.status === 'caution'" :size="14" />
            <ShieldAlert v-else :size="14" />
            <span>{{ analysis.status === 'on_track' ? 'On Track' : analysis.status === 'caution' ? 'Caution' : 'Action Needed' }}</span>
          </div>
          <h3>{{ analysis.headline }}</h3>
        </div>

        <div v-if="analysis.potentialSavingsNZD > 0" class="savings-opportunity-badge">
          <Lightbulb :size="14" />
          <span>+${{ analysis.potentialSavingsNZD }} NZD Potential Savings</span>
        </div>
      </div>

      <p class="analysis-summary">{{ analysis.summary }}</p>

      <div class="analysis-grid">
        <div v-if="analysis.insights.length" class="analysis-col">
          <span class="col-title">Key Observations</span>
          <ul class="analysis-list">
            <li v-for="(insight, idx) in analysis.insights" :key="idx">
              {{ insight }}
            </li>
          </ul>
        </div>

        <div v-if="analysis.recommendations.length" class="analysis-col">
          <span class="col-title">Recommended Actions</span>
          <ul class="analysis-list action-list">
            <li v-for="(rec, idx) in analysis.recommendations" :key="idx">
              {{ rec }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Empty Initial State -->
    <div v-else-if="!analyzing" class="empty-advisor-prompt">
      <Lightbulb :size="20" class="hint-icon" />
      <span>Select any topic above to generate on-device financial insights and recommendations.</span>
    </div>
  </section>
</template>

<style scoped>
.ai-advisor-panel {
  display: grid;
  gap: 16px;
  background: #fbfdfc;
  border: 1px solid #d8e5df;
  border-radius: 18px;
}

.advisor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.advisor-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.advisor-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #e5f4ec;
  color: #1e7e48;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.advisor-title-wrap h2 {
  font-size: 18px;
  font-weight: 750;
  margin: 0;
  color: #153d35;
}

.advisor-status-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;
  border: 1px solid #d0ded7;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #95a5a6;
}

.status-pill-btn.connected .status-dot {
  background: #27ae60;
  box-shadow: 0 0 6px rgba(39, 174, 96, 0.6);
}

.status-pill-btn.offline .status-dot {
  background: #e74c3c;
}

.spinning {
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.setup-guide-box {
  padding: 12px 16px;
  background: #f3f7f5;
  border: 1px solid #cce0d6;
  border-radius: 12px;
  display: grid;
  gap: 8px;
}

.setup-guide-box ol {
  margin: 4px 0 0 18px;
  padding: 0;
  display: grid;
  gap: 4px;
}

.setup-guide-box code {
  background: #e2ede7;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
}

.error-text {
  color: #a03e30;
  margin: 0;
}

.analysis-action-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 650;
  border-radius: 10px;
  background: #fff;
  color: #153d35;
  border: 1px solid #cadbd1;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-pill:hover {
  background: #f0f7f3;
  border-color: #a8c7b6;
}

.mode-pill.active {
  background: #153d35;
  color: #fff;
  border-color: #153d35;
  box-shadow: 0 2px 8px rgba(21, 61, 53, 0.2);
}

.analyzing-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 16px;
  background: #f5f9f6;
  border: 1px dashed #bdd6c8;
  border-radius: 14px;
  color: #556c62;
  text-align: center;
}

.analysis-error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fdf2f0;
  border: 1px solid #f2bdb5;
  border-radius: 12px;
  color: #a03e30;
}

.error-msg {
  display: grid;
  gap: 2px;
  flex: 1;
}

.error-msg strong {
  font-size: 13px;
}

.error-msg span {
  font-size: 12px;
}

.analysis-card {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #d5e5dc;
  box-shadow: 0 4px 16px rgba(21, 61, 53, 0.05);
}

.analysis-card[data-status="caution"] {
  border-color: #f0d499;
  background: #fdfcf7;
}

.analysis-card[data-status="critical"] {
  border-color: #e5a499;
  background: #fdf8f7;
}

.analysis-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.headline-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.headline-line h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 750;
  color: #153d35;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
}

.status-chip[data-status="on_track"] {
  background: #e4f7eb;
  color: #1b7a43;
}

.status-chip[data-status="caution"] {
  background: #fef4df;
  color: #8c6b12;
}

.status-chip[data-status="critical"] {
  background: #fde8e5;
  color: #a63121;
}

.savings-opportunity-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 8px;
  background: #e2f6e9;
  color: #1b7a43;
  font-size: 12px;
  font-weight: 700;
}

.analysis-summary {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #2b453b;
}

.analysis-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding-top: 6px;
  border-top: 1px dashed #e1ebe5;
}

.analysis-col {
  display: grid;
  gap: 6px;
}

.col-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #61776d;
  letter-spacing: 0.4px;
}

.analysis-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: #334d42;
}

.action-list li {
  font-weight: 550;
}

.empty-advisor-prompt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: #f3f7f5;
  border-radius: 10px;
  font-size: 13px;
  color: #617a6f;
}

.hint-icon {
  color: #9cb8a9;
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .analysis-grid {
    grid-template-columns: 1fr;
  }
}
</style>
