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
  Pencil,
  Trash2,
  History,
  X,
} from "lucide-vue-next";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { parseMoney, today } from "@/lib/finance";
import type { SavingsRecord } from "@/lib/types";

defineProps<{ compact?: boolean }>();

const store = useExpenses();
const showDepositModal = shallowRef(false);
const showManageDepositsModal = shallowRef(false);
const editingDepositId = shallowRef<string | null>(null);
const depositAmount = shallowRef("");
const depositDate = shallowRef(today());
const depositNote = shallowRef("");
const depositBusy = shallowRef(false);
const depositError = shallowRef("");

const sortedSavingsRecords = computed(() =>
  [...store.savingsRecords].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  ),
);

const hasInitialFunds = computed(
  () => store.initialGlobalNZD > 0 || (store.accounts.nzInitialNZD ?? 0) > 0,
);

const spendComparison = computed(() => {
  const initial = store.initialGlobalNZD;
  const spent = store.balances.globalSpent;
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
      ? `Global everyday spending exceeds initial capital by ${store.displayMoney(diff)} (${percent}%)`
      : `Spent ${store.displayMoney(spent)} of ${store.displayMoney(initial)} initial funds (${percent}% · ${store.displayMoney(diff)} remaining)`,
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

function openAddDeposit() {
  editingDepositId.value = null;
  depositAmount.value = "";
  depositDate.value = today();
  depositNote.value = "";
  depositError.value = "";
  showDepositModal.value = true;
}

function openEditDeposit(record: SavingsRecord) {
  editingDepositId.value = record.id;
  depositAmount.value = (record.amount / 100).toFixed(2);
  depositDate.value = record.date;
  depositNote.value = record.note || "";
  depositError.value = "";
  showDepositModal.value = true;
}

async function deleteDeposit(record: SavingsRecord) {
  if (
    !confirm(
      `Remove savings deposit of ${store.displayMoney(record.amount)} from ${record.date}?`,
    )
  )
    return;
  depositBusy.value = true;
  try {
    await store.removeSavingsRecord(record.id);
  } catch (reason) {
    alert(friendlyError(reason));
  } finally {
    depositBusy.value = false;
  }
}

async function saveDeposit() {
  depositBusy.value = true;
  depositError.value = "";
  try {
    const cents = parseMoney(depositAmount.value);
    await store.saveSavingsRecord({
      id: editingDepositId.value || crypto.randomUUID(),
      amount: cents,
      date: depositDate.value || today(),
      note: depositNote.value.trim() || "Salary savings deposit",
      createdAt: Date.now(),
    });
    depositAmount.value = "";
    depositNote.value = "";
    editingDepositId.value = null;
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
          @click="openAddDeposit"
        >
          <Plus :size="15" />Add savings
        </button>
        <button
          v-if="store.savingsRecords.length"
          class="secondary btn-sm"
          type="button"
          title="Manage savings deposits"
          @click="showManageDepositsModal = true"
        >
          <History :size="15" />Deposits
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
          <div class="account-initial-row">
            <span class="muted small">Everyday spent:</span>
            <span class="small font-mono">{{ store.displayMoney(store.balances.globalSpent) }}</span>
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
            <span class="muted small">Spent from savings:</span>
            <span class="small font-mono">{{ store.displayMoney(store.balances.nzSpent) }}</span>
          </div>
          <div class="account-initial-row">
            <span class="muted small">Savings deposits:</span>
            <button
              type="button"
              class="text-button small font-mono link-manage-deposits"
              @click="showManageDepositsModal = true"
            >
              {{ store.savingsRecords.length }} recorded · Manage
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- Add / Edit Savings Deposit Drawer -->
    <div
      v-if="showDepositModal"
      class="drawer-backdrop"
      @click.self="showDepositModal = false"
    >
      <div class="bottom-drawer" role="dialog" aria-modal="true">
        <div class="drawer-handle-bar"><div class="drawer-handle"></div></div>
        <div class="drawer-header">
          <h3>{{ editingDepositId ? "Edit Savings Deposit" : "Record Salary / Savings Deposit" }}</h3>
          <button
            class="icon-button"
            type="button"
            aria-label="Close"
            @click="showDepositModal = false"
          >
            <X :size="18" />
          </button>
        </div>

        <form class="drawer-content" @submit.prevent="saveDeposit">
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
            <button class="primary" :disabled="depositBusy">
              {{ editingDepositId ? "Update Deposit" : "Save Deposit" }}
            </button>
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
    </div>

    <!-- Manage Savings Deposits Drawer -->
    <div
      v-if="showManageDepositsModal"
      class="drawer-backdrop"
      @click.self="showManageDepositsModal = false"
    >
      <div class="bottom-drawer" role="dialog" aria-modal="true">
        <div class="drawer-handle-bar"><div class="drawer-handle"></div></div>
        <div class="drawer-header">
          <div class="drawer-title-group">
            <h3>Salary Savings Deposits</h3>
            <span class="small muted">{{ store.savingsRecords.length }} deposits recorded</span>
          </div>
          <div class="row-actions">
            <button class="secondary btn-sm" type="button" @click="openAddDeposit">
              <Plus :size="14" />New deposit
            </button>
            <button
              class="icon-button"
              type="button"
              aria-label="Close"
              @click="showManageDepositsModal = false"
            >
              <X :size="18" />
            </button>
          </div>
        </div>

        <div class="drawer-content deposits-list-stage">
          <div v-if="!store.savingsRecords.length" class="empty-deposits">
            <PiggyBank :size="32" />
            <p>No savings deposits recorded yet.</p>
            <button class="secondary btn-sm" type="button" @click="openAddDeposit">
              <Plus :size="15" />Record first deposit
            </button>
          </div>
          <ul v-else class="deposits-list">
            <li
              v-for="deposit in sortedSavingsRecords"
              :key="deposit.id"
              class="deposit-item"
            >
              <div class="deposit-meta">
                <strong>{{ store.displayMoney(deposit.amount) }}</strong>
                <span class="small muted">
                  {{ deposit.date }} · {{ deposit.note || "Salary savings" }}
                </span>
              </div>
              <div class="deposit-actions">
                <button
                  class="icon-button"
                  type="button"
                  title="Edit deposit"
                  aria-label="Edit deposit"
                  @click="openEditDeposit(deposit)"
                >
                  <Pencil :size="15" />
                </button>
                <button
                  class="icon-button"
                  type="button"
                  title="Delete deposit"
                  aria-label="Delete deposit"
                  @click="deleteDeposit(deposit)"
                >
                  <Trash2 :size="15" />
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
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

.link-manage-deposits {
  padding: 0;
  color: #1e5239;
  text-decoration: underline;
  cursor: pointer;
}

/* Full Width Bottom Drawer Styles */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(13, 36, 30, 0.55);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}

.bottom-drawer {
  background: #ffffff;
  width: 100vw;
  max-width: 100vw;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -16px 64px rgba(13, 36, 30, 0.35);
  display: flex;
  flex-direction: column;
  max-height: 92dvh;
  overflow: hidden;
  animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.drawer-handle-bar {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
  cursor: grab;
}

.drawer-handle {
  width: 44px;
  height: 5px;
  background: #d2ded7;
  border-radius: 10px;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 22px 14px;
  border-bottom: 1px solid #edf2ef;
}

.drawer-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 750;
}

.drawer-title-group {
  display: grid;
  gap: 2px;
}

.drawer-content {
  padding: 20px 22px calc(24px + env(safe-area-inset-bottom));
  overflow-y: auto;
  display: grid;
  gap: 16px;
}

.deposits-list-stage {
  padding: 14px 22px calc(24px + env(safe-area-inset-bottom));
}

.empty-deposits {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  gap: 10px;
  color: #63776d;
}

.deposits-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.deposit-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8faf9;
  border: 1px solid #e1e8e4;
  border-radius: 12px;
}

.deposit-meta {
  display: grid;
  gap: 2px;
}

.deposit-meta strong {
  font-size: 16px;
  color: #1e5239;
  font-variant-numeric: tabular-nums;
}

.deposit-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 480px) {
  .accounts-title-wrap h2 {
    font-size: 17px;
  }
  .accounts-icon-badge {
    width: 34px;
    height: 34px;
  }
  .header-actions {
    margin-left: auto;
  }
  .hero-balance-card {
    padding: 16px;
    border-radius: 14px;
  }
  .hero-amount {
    font-size: 28px;
    letter-spacing: -0.5px;
  }
  .accounts-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .account-card {
    padding: 12px 14px;
  }
  .drawer-content {
    padding: 16px 16px calc(20px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
