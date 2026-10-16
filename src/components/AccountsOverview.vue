<script setup lang="ts">
import { computed, shallowRef } from "vue";
import {
  Wallet,
  PiggyBank,
  ArrowRightLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Settings,
  AlertCircle,
  CheckCircle2,
} from "lucide-vue-next";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { parseMoney, today } from "@/lib/finance";

defineProps<{ compact?: boolean }>();

const store = useExpenses();
const showDepositModal = shallowRef(false);
const depositAmount = shallowRef("");
const depositDate = shallowRef(today());
const depositNote = shallowRef("");
const depositBusy = shallowRef(false);
const depositError = shallowRef("");

const hasInitialFunds = computed(
  () => store.initialGlobalNZD > 0 || (store.accounts.nzInitialNZD ?? 0) > 0,
);

const spendComparison = computed(() => {
  const initial = store.initialGlobalNZD;
  const spent = store.allTimeTotal;
  if (!initial) {
    return {
      hasBaseline: false,
      isOver: false,
      diff: 0,
      percent: 0,
      label: "No initial global baseline set",
    };
  }
  const isOver = spent > initial;
  const diff = Math.abs(initial - spent);
  const percent = Math.round((spent / initial) * 100);
  return {
    hasBaseline: true,
    isOver,
    diff,
    percent,
    label: isOver
      ? `Spent ${store.displayMoney(diff)} more than initial funds (${percent}%)`
      : `Spent ${store.displayMoney(spent)} of ${store.displayMoney(initial)} (${percent}% · ${store.displayMoney(diff)} remaining)`,
  };
});

const netWorthComparison = computed(() => {
  const initial = store.initialGlobalNZD;
  const currentTotal = store.totalMoney;
  if (!initial) return null;
  const diff = currentTotal - initial;
  const isPositive = diff >= 0;
  return {
    isPositive,
    diff: Math.abs(diff),
    label: isPositive
      ? `+${store.displayMoney(diff)} total net gain vs initial global funds`
      : `-${store.displayMoney(Math.abs(diff))} total capital reduction`,
  };
});

async function recordDeposit() {
  depositBusy.value = true;
  depositError.value = "";
  try {
    const cents = parseMoney(depositAmount.value);
    await store.saveSavingsRecord({
      id: crypto.randomUUID(),
      amount: cents,
      date: depositDate.value || today(),
      note: depositNote.value.trim() || "Salary savings deposit",
      createdAt: Date.now(),
    });
    depositAmount.value = "";
    depositNote.value = "";
    showDepositModal.value = false;
  } catch (reason) {
    depositError.value = friendlyError(reason);
  } finally {
    depositBusy.value = false;
  }
}
</script>

<template>
  <section class="panel accounts-panel" aria-label="Financial accounts and net worth">
    <div class="accounts-header">
      <div class="accounts-title-wrap">
        <div class="accounts-icon-badge">
          <ArrowRightLeft :size="20" />
        </div>
        <div>
          <h2>Accounts & Total Money</h2>
          <p class="small muted">
            Global spending account · NZ salary savings account
          </p>
        </div>
      </div>
      <div class="header-actions">
        <button
          class="secondary btn-sm"
          type="button"
          @click="showDepositModal = true"
        >
          <Plus :size="15" />Add savings
        </button>
        <RouterLink to="/settings" class="icon-button" aria-label="Configure accounts">
          <Settings :size="17" />
        </RouterLink>
      </div>
    </div>

    <!-- Hero Combined Total Money Card -->
    <div class="hero-balance-card">
      <div class="hero-balance-info">
        <span class="hero-label">Total Current Money (All Accounts)</span>
        <strong class="hero-amount">{{ store.displayMoney(store.totalMoney) }}</strong>
        <p v-if="netWorthComparison" class="small net-status" :class="{ positive: netWorthComparison.isPositive }">
          <TrendingUp v-if="netWorthComparison.isPositive" :size="14" />
          <TrendingDown v-else :size="14" />
          {{ netWorthComparison.label }}
        </p>
      </div>
    </div>

    <!-- Initial Global Baseline Status Callout -->
    <div
      v-if="spendComparison.hasBaseline"
      class="baseline-callout"
      :class="{ 'over-baseline': spendComparison.isOver, 'under-baseline': !spendComparison.isOver }"
    >
      <div class="baseline-icon">
        <AlertCircle v-if="spendComparison.isOver" :size="18" />
        <CheckCircle2 v-else :size="18" />
      </div>
      <div class="baseline-text">
        <strong>
          {{
            spendComparison.isOver
              ? "All-time spending exceeds initial global capital"
              : "All-time spending is within initial global capital"
          }}
        </strong>
        <p class="small">{{ spendComparison.label }}</p>
      </div>
    </div>
    <div v-else class="baseline-callout baseline-empty">
      <p class="small">
        <Sparkles :size="14" /> Set an initial global baseline in
        <RouterLink to="/settings">Data settings</RouterLink> to track spending against your starting funds in USD and NZD.
      </p>
    </div>

    <!-- Dual Accounts Grid -->
    <div class="accounts-grid">
      <!-- Global Spending Account -->
      <article class="account-card global-card">
        <div class="account-card-header">
          <div class="account-tag">
            <Wallet :size="16" />
            <strong>Global Account</strong>
          </div>
          <span class="account-badge">Everyday purchases</span>
        </div>

        <div class="account-stats">
          <div class="account-balance">
            <span class="stat-label">Current balance</span>
            <strong class="account-amount">{{ store.displayMoney(store.globalBalance) }}</strong>
          </div>
          <div v-if="store.initialGlobalNZD" class="account-initial-row">
            <span class="muted small">Initial baseline:</span>
            <span class="small font-mono">
              {{ store.displayMoney(store.initialGlobalNZD) }}
              <template v-if="store.initialGlobalUSD">
                (${{ (store.initialGlobalUSD / 100).toFixed(2) }} USD)
              </template>
            </span>
          </div>
        </div>
      </article>

      <!-- NZ Savings Account -->
      <article class="account-card nz-card">
        <div class="account-card-header">
          <div class="account-tag">
            <PiggyBank :size="16" />
            <strong>NZ Account</strong>
          </div>
          <span class="account-badge savings-badge">Salary savings</span>
        </div>

        <div class="account-stats">
          <div class="account-balance">
            <span class="stat-label">Current savings</span>
            <strong class="account-amount nz-amount">{{ store.displayMoney(store.nzBalance) }}</strong>
          </div>
          <div class="account-initial-row">
            <span class="muted small">Savings deposits:</span>
            <span class="small font-mono">{{ store.savingsRecords.length }} recorded</span>
          </div>
        </div>
      </article>
    </div>

    <!-- Add Savings Deposit Modal -->
    <dialog
      v-if="showDepositModal"
      class="modal-backdrop"
      open
      @click.self="showDepositModal = false"
    >
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>Record Salary / Savings Deposit</h3>
          <button
            class="icon-button"
            type="button"
            @click="showDepositModal = false"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="recordDeposit">
          <label>
            Deposit Amount · NZD
            <input
              v-model="depositAmount"
              inputmode="decimal"
              required
              placeholder="e.g. 1200.00"
              autofocus
            />
          </label>
          <label>
            Date
            <input v-model="depositDate" type="date" required />
          </label>
          <label>
            Note / Description
            <input
              v-model="depositNote"
              placeholder="e.g. Weekly salary deposit, Bonus"
            />
          </label>
          <p class="small muted">
            Deposits are credited to your NZ Account and contribute to your total money.
          </p>

          <p v-if="depositError" class="error-note" role="alert">{{ depositError }}</p>

          <div class="entry-actions">
            <button class="primary" :disabled="depositBusy">Save Deposit</button>
            <button
              type="button"
              class="secondary"
              @click="showDepositModal = false"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
.accounts-panel {
  display: grid;
  gap: 16px;
}

.accounts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.accounts-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.accounts-icon-badge {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #e2ede6;
  color: #153d35;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.accounts-title-wrap h2 {
  font-size: 18px;
  font-weight: 750;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-sm {
  min-height: 34px;
  padding: 4px 10px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.hero-balance-card {
  padding: 18px 20px;
  background: linear-gradient(135deg, #153d35 0%, #1e5247 100%);
  color: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(21, 61, 53, 0.15);
}

.hero-balance-info {
  display: grid;
  gap: 4px;
}

.hero-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #c9ef88;
  font-weight: 600;
}

.hero-amount {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.8px;
  font-variant-numeric: tabular-nums;
}

.net-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #e0eae3;
  margin: 2px 0 0;
  font-weight: 500;
}

.net-status.positive {
  color: #c9ef88;
}

.baseline-callout {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
}

.baseline-callout.under-baseline {
  background: #edf7f0;
  border: 1px solid #c2e5cf;
  color: #1b5336;
}

.baseline-callout.over-baseline {
  background: #fdf2f0;
  border: 1px solid #f6c4be;
  color: #8c2a1c;
}

.baseline-callout.baseline-empty {
  background: #f4f6f5;
  border: 1px dashed #d0dcd5;
  color: #556c62;
}

.baseline-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.baseline-text {
  display: grid;
  gap: 2px;
}

.baseline-text p {
  margin: 0;
}

.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.account-card {
  padding: 14px 16px;
  background: #f8faf9;
  border: 1px solid #e1e8e4;
  border-radius: 14px;
  display: grid;
  gap: 10px;
}

.account-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.account-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #153d35;
}

.account-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  background: #e6ede8;
  border-radius: 12px;
  color: #3b5046;
}

.account-badge.savings-badge {
  background: #e1f2e8;
  color: #1e5239;
}

.account-stats {
  display: grid;
  gap: 6px;
}

.account-balance {
  display: grid;
}

.stat-label {
  font-size: 11px;
  color: #63776d;
}

.account-amount {
  font-size: 22px;
  font-weight: 750;
  color: #153d35;
  font-variant-numeric: tabular-nums;
}

.nz-amount {
  color: #1e5239;
}

.account-initial-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px dashed #e1e8e4;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 100;
  border: 0;
  width: 100vw;
  height: 100vh;
}

.modal-dialog {
  background: #fff;
  border-radius: 20px;
  padding: 22px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  display: grid;
  gap: 16px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}
</style>
