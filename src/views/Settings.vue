<script setup lang="ts">
import DeviceSync from "@/components/data/DeviceSync.vue";
import CategoryManager from "@/components/CategoryManager.vue";
import FrequentPayments from "@/components/FrequentPayments.vue";
import { shallowRef, ref, watch } from "vue";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { downloadFile, today, parseMoney, parseOptionalMoney, money } from "@/lib/finance";
import { parseBackup } from "@/lib/storage";
import {
  Wallet,
  PiggyBank,
  Banknote,
  RefreshCw,
  Check,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-vue-next";
import {
  getOllamaHost,
  setOllamaHost,
  getOllamaModel,
  setOllamaModel,
  checkOllamaStatus,
  isLocalDesktopApp,
  type OllamaStatus,
} from "@/lib/ollama";
import { t } from "@/lib/i18n";

const store = useExpenses();
const error = shallowRef("");
const accountsBusy = shallowRef(false);
const accountsSaved = shallowRef(false);

// Ollama Settings State
const ollamaHost = shallowRef(getOllamaHost());
const ollamaModel = shallowRef(getOllamaModel());
const ollamaTesting = shallowRef(false);
const ollamaStatus = shallowRef<OllamaStatus | null>(null);
const ollamaSaved = shallowRef(false);

async function testOllama() {
  if (!isLocalDesktopApp()) return;
  ollamaTesting.value = true;
  ollamaStatus.value = null;
  try {
    ollamaStatus.value = await checkOllamaStatus(ollamaHost.value, ollamaModel.value);
  } catch (err) {
    ollamaStatus.value = {
      ok: false,
      host: ollamaHost.value,
      model: ollamaModel.value,
      availableModels: [],
      isModelPresent: false,
      error: friendlyError(err),
    };
  } finally {
    ollamaTesting.value = false;
  }
}

function saveOllamaSettings() {
  setOllamaHost(ollamaHost.value);
  setOllamaModel(ollamaModel.value);
  ollamaSaved.value = true;
  store.message = "Ollama settings saved";
  setTimeout(() => {
    ollamaSaved.value = false;
  }, 2500);
}

// Accounts Form State
const usdInitial = shallowRef("");
const nzdInitial = shallowRef("");
const nzSavingsInitial = shallowRef("");
const weeklySalaryInput = shallowRef("");

// Keep form fields synchronized with store data as cloud connects or updates
watch(
  [() => store.accounts, () => store.salary],
  ([newAccounts, newSalary]) => {
    if (accountsBusy.value) return;
    usdInitial.value = newAccounts.globalInitialUSD
      ? (newAccounts.globalInitialUSD / 100).toFixed(2)
      : "";
    nzdInitial.value = newAccounts.globalInitialNZD
      ? (newAccounts.globalInitialNZD / 100).toFixed(2)
      : "";
    nzSavingsInitial.value = newAccounts.nzInitialNZD
      ? (newAccounts.nzInitialNZD / 100).toFixed(2)
      : "";
    weeklySalaryInput.value = newSalary.weeklyAverageNZD
      ? (newSalary.weeklyAverageNZD / 100).toFixed(2)
      : "";
  },
  { immediate: true, deep: true },
);

// Auto-convert USD to NZD when USD is typed and rate is available
function convertUsdToNzd() {
  if (!usdInitial.value.trim() || !store.rates.rate) return;
  try {
    const usdCents = parseOptionalMoney(usdInitial.value);
    if (!usdCents) return;
    // Rate is 1 NZD = X USD, so NZD = USD / rate
    const nzdCents = Math.round(usdCents / store.rates.rate);
    nzdInitial.value = (nzdCents / 100).toFixed(2);
  } catch {
    // wait for complete input
  }
}

async function saveAccountsSetup() {
  accountsBusy.value = true;
  error.value = "";
  accountsSaved.value = false;
  try {
    const globalNZD = parseOptionalMoney(nzdInitial.value);
    const globalUSD = usdInitial.value.trim()
      ? parseOptionalMoney(usdInitial.value)
      : undefined;
    const nzNZD = parseOptionalMoney(nzSavingsInitial.value);
    const salaryNZD = parseOptionalMoney(weeklySalaryInput.value);

    await store.saveAccountsAndSalary(
      {
        globalInitialNZD: globalNZD,
        globalInitialUSD: globalUSD,
        nzInitialNZD: nzNZD,
        globalManualNZD: true,
      },
      salaryNZD,
    );

    accountsSaved.value = true;
    setTimeout(() => {
      accountsSaved.value = false;
    }, 3000);
  } catch (reason) {
    error.value = friendlyError(reason);
  } finally {
    accountsBusy.value = false;
  }
}

function backup() {
  downloadFile(
    `expenses-${today()}.json`,
    JSON.stringify(store.data, null, 2),
    "application/json",
  );
}

async function restore(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 10_000_000)
      throw new Error("Choose a backup smaller than 10 MB.");
    const text = await file.text();
    const backup = parseBackup(text);
    if (
      !confirm(
        `Replace expenses, products, shops, limits, and accounts with this backup (${backup.expenses.length} expenses)?`,
      )
    )
      return;
    await store.restore(text);
    error.value = "";
  } catch (reason) {
    error.value = friendlyError(reason);
  } finally {
    input.value = "";
  }
}

async function clear() {
  if (
    !confirm(
      "Delete all expenses from this database and connected devices? Export a backup first if you want to keep them.",
    )
  )
    return;
  try {
    await store.clearAll();
    error.value = "";
  } catch (reason) {
    error.value = friendlyError(reason);
  }
}
</script>

<template>
  <DeviceSync />

  <!-- Initial Capital & Accounts Setup -->
  <section class="panel accounts-config-panel">
    <div class="panel-header">
      <div class="header-tag">
        <Wallet :size="20" />
        <h2>Starting Capital & Accounts Setup</h2>
      </div>
      <p class="small muted">
        Set your starting money in USD or NZD to monitor all-time capital preservation and savings.
      </p>
    </div>

    <form @submit.prevent="saveAccountsSetup">
      <div class="form-pair">
        <label>
          Global Starting Money · USD
          <input
            v-model="usdInitial"
            inputmode="decimal"
            placeholder="e.g. 5000.00"
            @input="convertUsdToNzd"
          />
        </label>
        <label>
          Global Starting Money · NZD
          <input
            v-model="nzdInitial"
            inputmode="decimal"
            placeholder="e.g. 8200.00"
          />
        </label>
      </div>

      <div class="rate-indicator-row small muted">
        <span>
          Reference rate: 1 NZD = {{ store.rates.rate ?? "..." }} USD ({{ store.rates.status }})
        </span>
        <button
          type="button"
          class="text-button convert-btn"
          @click="
            store.rates.refresh();
            convertUsdToNzd();
          "
        >
          <RefreshCw :size="13" /> Update conversion
        </button>
      </div>

      <div class="form-pair">
        <label>
          NZ Account Initial Balance · NZD
          <input
            v-model="nzSavingsInitial"
            inputmode="decimal"
            placeholder="e.g. 2000.00"
          />
        </label>
        <label>
          Weekly Average Salary · NZD
          <input
            v-model="weeklySalaryInput"
            inputmode="decimal"
            placeholder="e.g. 1200.00"
          />
        </label>
      </div>
      <p v-if="error" class="error-note" role="alert">{{ error }}</p>

      <div class="save-actions">
        <button class="primary" :disabled="accountsBusy">
          <Check v-if="accountsSaved" :size="16" />
          {{ accountsSaved ? "Saved" : "Save accounts setup" }}
        </button>
      </div>
    </form>
  </section>

  <!-- Frequent Payments Manager -->
  <FrequentPayments />

  <!-- Categories -->
  <section class="panel">
    <CategoryManager />
  </section>

  <!-- Local Ollama AI Settings (Desktop Only) -->
  <section v-if="isLocalDesktopApp()" class="panel ollama-config-panel">
    <div class="panel-header">
      <div class="header-tag">
        <Sparkles :size="20" />
        <h2>{{ t('ollama.title') }}</h2>
      </div>
      <p class="small muted">
        {{ t('ollama.description') }}
      </p>
    </div>

    <form @submit.prevent="saveOllamaSettings">
      <div class="form-pair">
        <label>
          {{ t('ollama.endpoint') }}
          <input
            v-model="ollamaHost"
            placeholder="http://localhost:11434"
            required
          />
        </label>
        <label>
          {{ t('ollama.model') }}
          <input
            v-model="ollamaModel"
            placeholder="gemma4:e4b"
            required
          />
        </label>
      </div>

      <div class="ollama-actions-row">
        <button
          type="button"
          class="secondary btn-sm"
          :disabled="ollamaTesting"
          @click="testOllama"
        >
          <RefreshCw :size="14" :class="{ spinning: ollamaTesting }" />
          <span>{{ ollamaTesting ? t('ollama.testing') : t('ollama.testConnection') }}</span>
        </button>

        <button type="submit" class="primary btn-sm">
          <Check v-if="ollamaSaved" :size="14" />
          <span>{{ ollamaSaved ? t('common.saved') : t('ollama.saveSettings') }}</span>
        </button>
      </div>

      <div v-if="ollamaStatus" class="ollama-status-banner" :class="{ success: ollamaStatus.ok, failure: !ollamaStatus.ok }">
        <CheckCircle2 v-if="ollamaStatus.ok" :size="16" />
        <AlertTriangle v-else :size="16" />
        <div class="banner-msg">
          <template v-if="ollamaStatus.ok">
            <strong>Connected to Ollama!</strong>
            <span class="small">
              Available models: {{ ollamaStatus.availableModels.join(', ') || 'None found (run ollama pull ' + ollamaModel + ')' }}
            </span>
          </template>
          <template v-else>
            <strong>Connection Failed</strong>
            <span class="small">{{ ollamaStatus.error }}</span>
          </template>
        </div>
      </div>

      <p class="small muted">
        To allow browser requests, start Ollama with <code>OLLAMA_ORIGINS="*" ollama serve</code>.
      </p>
    </form>
  </section>

  <!-- Backup & Restore -->
  <section class="panel">
    <h2>Backup</h2>
    <p>Export a copy of expenses, products, shops, limits, and financial accounts.</p>
    <button class="secondary" @click="backup">Export backup</button>
    <label class="restore-input">
      Restore backup
      <input
        type="file"
        accept=".json,application/json"
        @change="restore"
      />
    </label>
    <p class="small muted">
      Restoring replaces the current database, including connected devices.
    </p>
  </section>

  <!-- Install -->
  <section class="panel">
    <h2>Install</h2>
    <p>
      iPhone: Safari → Share → Add to Home Screen. Android: Chrome → Install app.
    </p>
  </section>

  <!-- Danger Zone -->
  <section class="panel">
    <button
      v-if="store.removedExpenses.length"
      class="secondary"
      @click="store.undoDelete"
    >
      Undo deletion
    </button>
    <button class="text-button danger" @click="clear">
      Delete all expenses
    </button>
  </section>

  <p v-if="error" class="error-note" role="alert">{{ error }}</p>
</template>

<style scoped>
.accounts-config-panel {
  display: grid;
  gap: 16px;
}

.header-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #153d35;
}

.header-tag h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 750;
}

.rate-indicator-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 10px;
  background: #f0f5f2;
  border-radius: 8px;
}

.convert-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.save-actions {
  display: flex;
  justify-content: flex-start;
}

.ollama-config-panel {
  display: grid;
  gap: 16px;
}

.ollama-actions-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.btn-sm {
  min-height: 34px;
  padding: 4px 12px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.spinning {
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.ollama-status-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
}

.ollama-status-banner.success {
  background: #e8f7ee;
  border: 1px solid #c2ebd0;
  color: #176537;
}

.ollama-status-banner.failure {
  background: #fdf2f0;
  border: 1px solid #f2bdb5;
  color: #a03e30;
}

.banner-msg {
  display: grid;
  gap: 2px;
}

@media (max-width: 480px) {
  .form-pair {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
