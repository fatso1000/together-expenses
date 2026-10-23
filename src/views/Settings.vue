<script setup lang="ts">
import DeviceSync from "@/components/data/DeviceSync.vue";
import CategoryManager from "@/components/CategoryManager.vue";
import FrequentPayments from "@/components/FrequentPayments.vue";
import { shallowRef, ref, watch } from "vue";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { downloadFile, today, parseMoney, parseOptionalMoney, money } from "@/lib/finance";
import { parseBackup } from "@/lib/storage";
import { Wallet, PiggyBank, Banknote, RefreshCw, Check } from "lucide-vue-next";

const store = useExpenses();
const error = shallowRef("");
const accountsBusy = shallowRef(false);
const accountsSaved = shallowRef(false);

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

@media (max-width: 480px) {
  .form-pair {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
