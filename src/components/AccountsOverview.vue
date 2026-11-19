<template>
  <Card class="mb-6" aria-label="Financial accounts and net worth">
    <template #content>
      <div class="grid gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-[var(--success-bg)] text-accent flex items-center justify-center shrink-0">
              <ArrowRightLeft :size="20" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-text m-0">{{ t("accounts.title") }}</h2>
              <p class="text-xs text-muted m-0">
                {{ t("accounts.subtitle") }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 ml-auto sm:ml-0">
            <Button
              type="button"
              severity="secondary"
              size="small"
              class="inline-flex items-center gap-1.5"
              @click="openAddDeposit"
            >
              <Plus :size="15" />
              <span>{{ t("accounts.addSavings") }}</span>
            </Button>
            <Button
              v-if="store.savingsRecords.length"
              type="button"
              severity="secondary"
              size="small"
              :title="t('accounts.manageDeposits')"
              class="inline-flex items-center gap-1.5"
              @click="showManageDepositsModal = true"
            >
              <History :size="15" />
              <span>{{ t("accounts.manageDeposits") }}</span>
            </Button>
            <RouterLink
              to="/settings/accounts"
              class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-muted hover:bg-[var(--surface-card-hover)] hover:text-accent transition-colors"
              aria-label="Configure accounts"
            >
              <Settings :size="17" />
            </RouterLink>
          </div>
        </div>

        <!-- Hero Combined Total Money Card -->
        <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[var(--surface-card)] to-[var(--surface-card-hover)] border border-[var(--border)] shadow-sm">
          <div class="grid gap-1">
            <span class="text-xs uppercase tracking-wider text-accent font-semibold">
              {{ t("accounts.heroLabel") }}
            </span>
            <strong class="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-text font-heading">
              {{ store.displayMoney(store.totalMoney) }}
            </strong>
            <p
              v-if="netWorthComparison"
              class="text-xs inline-flex items-center gap-1.5 mt-1 mb-0 font-medium"
              :class="netWorthComparison.isPositive ? 'text-accent' : 'text-muted'"
            >
              <TrendingUp v-if="netWorthComparison.isPositive" :size="14" />
              <TrendingDown v-else :size="14" />
              <span>{{ netWorthComparison.label }}</span>
            </p>
          </div>
        </div>

        <!-- Initial Global Baseline Status Callout -->
        <div
          v-if="spendComparison.hasBaseline"
          class="flex items-start gap-3 px-4 py-3 rounded-xl border text-xs"
          :class="
            spendComparison.isOver
              ? 'bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger-colour)]'
              : 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-colour)]'
          "
        >
          <div class="shrink-0 mt-0.5">
            <AlertCircle v-if="spendComparison.isOver" :size="18" />
            <CheckCircle2 v-else :size="18" />
          </div>
          <div class="grid gap-0.5">
            <strong class="text-sm font-bold">
              {{
                spendComparison.isOver
                  ? t("accounts.baselineOver")
                  : t("accounts.baselineUnder")
              }}
            </strong>
            <p class="text-xs m-0 opacity-90">{{ spendComparison.label }}</p>
          </div>
        </div>
        <div
          v-else
          class="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-xs text-muted"
        >
          <Sparkles :size="14" class="shrink-0 text-accent" />
          <span>{{ t("accounts.baselineEmpty") }}</span>
        </div>

        <!-- Dual Accounts Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- Global Spending Account -->
          <article class="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border)] grid gap-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 text-sm font-semibold text-text">
                <Wallet :size="16" />
                <strong>Global Account</strong>
              </div>
              <Tag :value="t('accounts.everydayPurchases')" severity="secondary" />
            </div>

            <div class="grid gap-1.5">
              <div class="grid">
                <span class="text-[11px] text-muted">{{ t("accounts.currentBalance") }}</span>
                <strong class="text-2xl font-bold tabular-nums text-text">
                  {{ store.displayMoney(store.globalBalance) }}
                </strong>
              </div>
              <div class="flex justify-between items-baseline gap-2 pt-1.5 border-t border-dashed border-[var(--border)] text-xs">
                <span class="text-muted">{{ t("accounts.everydaySpent") }}</span>
                <span class="font-mono text-text">{{ store.displayMoney(store.balances.globalSpent) }}</span>
              </div>
              <div
                v-if="store.initialGlobalNZD"
                class="flex justify-between items-baseline gap-2 pt-1.5 border-t border-dashed border-[var(--border)] text-xs"
              >
                <span class="text-muted">{{ t("accounts.initialBaseline") }}</span>
                <span class="font-mono text-text">
                  {{ store.displayMoney(store.initialGlobalNZD) }}
                  <template v-if="store.initialGlobalUSD">
                    (${{ (store.initialGlobalUSD / 100).toFixed(2) }} USD)
                  </template>
                </span>
              </div>
            </div>
          </article>

          <!-- NZ Savings Account -->
          <article class="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border)] grid gap-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 text-sm font-semibold text-text">
                <PiggyBank :size="16" />
                <strong>NZ Account</strong>
              </div>
              <Tag :value="t('accounts.salarySavings')" severity="success" />
            </div>

            <div class="grid gap-1.5">
              <div class="grid">
                <span class="text-[11px] text-muted">{{ t("accounts.currentSavings") }}</span>
                <strong class="text-2xl font-bold tabular-nums text-accent">
                  {{ store.displayMoney(store.nzBalance) }}
                </strong>
              </div>
              <div class="flex justify-between items-baseline gap-2 pt-1.5 border-t border-dashed border-[var(--border)] text-xs">
                <span class="text-muted">{{ t("accounts.spentFromSavings") }}</span>
                <span class="font-mono text-text">{{ store.displayMoney(store.balances.nzSpent) }}</span>
              </div>
              <div class="flex justify-between items-baseline gap-2 pt-1.5 border-t border-dashed border-[var(--border)] text-xs">
                <span class="text-muted">{{ t("accounts.savingsDeposits") }}</span>
                <Button
                  type="button"
                  variant="link"
                  size="small"
                  class="p-0! h-auto! font-mono text-xs underline"
                  @click="showManageDepositsModal = true"
                >
                  {{ t("accounts.recordedDeposits", { count: store.savingsRecords.length }) }}
                </Button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </template>

    <!-- Add / Edit Savings Deposit Drawer -->
    <Drawer
      v-model:visible="showDepositModal"
      position="bottom"
      class="w-full! max-w-full!"
      style="height: auto; max-height: 92dvh"
      :dismissable="!depositBusy"
      :closeOnEscape="!depositBusy"
    >
      <template #header>
        <h3 class="text-lg font-bold m-0">
          {{ editingDepositId ? t("accounts.editDepositTitle") : t("accounts.recordDepositTitle") }}
        </h3>
      </template>

      <template #closebutton="{ closeCallback }">
        <Button
          type="button"
          variant="text"
          severity="secondary"
          rounded
          aria-label="Close"
          :disabled="depositBusy"
          @click="closeCallback"
        >
          <X :size="18" />
        </Button>
      </template>

      <form class="grid gap-4 pb-2" @submit.prevent="saveDeposit">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("accounts.depositAmount") }}</span>
          <InputText
            v-model="depositAmount"
            inputmode="decimal"
            required
            placeholder="e.g. 1200.00"
            autofocus
            fluid
          />
        </label>

        <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <label for="deposit-date-input">{{ t("accounts.depositDate") }}</label>
          <DatePicker
            v-model="selectedDepositDate"
            inputId="deposit-date-input"
            dateFormat="yy-mm-dd"
            showIcon
            iconDisplay="input"
            fluid
            required
          />
        </div>

        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("accounts.depositNote") }}</span>
          <InputText
            v-model="depositNote"
            placeholder="e.g. Weekly salary deposit, Bonus"
            fluid
          />
        </label>

        <p class="text-xs text-muted m-0">
          {{ t("accounts.depositHint") }}
        </p>

        <Message v-if="depositError" severity="error" :closable="false">
          {{ depositError }}
        </Message>

        <div class="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" severity="primary" :disabled="depositBusy">
            {{ editingDepositId ? t("accounts.updateDeposit") : t("accounts.saveDeposit") }}
          </Button>
          <Button
            type="button"
            severity="secondary"
            variant="outlined"
            @click="showDepositModal = false"
          >
            {{ t("common.cancel") }}
          </Button>
        </div>
      </form>
    </Drawer>

    <!-- Manage Savings Deposits Drawer -->
    <Drawer
      v-model:visible="showManageDepositsModal"
      position="bottom"
      class="w-full! max-w-full!"
      style="height: auto; max-height: 92dvh"
    >
      <template #header>
        <div class="grid gap-0.5">
          <h3 class="text-lg font-bold m-0">{{ t("accounts.depositsTitle") }}</h3>
          <span class="text-xs text-muted">
            {{ t("accounts.depositsCount", { count: store.savingsRecords.length }) }}
          </span>
        </div>
      </template>

      <template #closebutton="{ closeCallback }">
        <div class="flex items-center gap-2">
          <Button
            type="button"
            severity="secondary"
            size="small"
            class="inline-flex items-center gap-1"
            @click="openAddDeposit"
          >
            <Plus :size="14" />
            <span>{{ t("accounts.newDeposit") }}</span>
          </Button>
          <Button
            type="button"
            variant="text"
            severity="secondary"
            rounded
            aria-label="Close"
            @click="closeCallback"
          >
            <X :size="18" />
          </Button>
        </div>
      </template>

      <div class="pb-2">
        <div
          v-if="!store.savingsRecords.length"
          class="flex flex-col items-center justify-center py-8 px-4 gap-3 text-muted text-center"
        >
          <PiggyBank :size="32" />
          <p class="text-sm m-0">{{ t("accounts.noDeposits") }}</p>
          <Button
            type="button"
            severity="secondary"
            size="small"
            class="inline-flex items-center gap-1.5"
            @click="openAddDeposit"
          >
            <Plus :size="15" />
            <span>{{ t("accounts.recordFirstDeposit") }}</span>
          </Button>
        </div>

        <ul v-else class="list-none m-0 p-0 grid gap-2">
          <li
            v-for="deposit in sortedSavingsRecords"
            :key="deposit.id"
            class="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
          >
            <div class="grid gap-0.5">
              <strong class="text-base tabular-nums text-accent">
                {{ store.displayMoney(deposit.amount) }}
              </strong>
              <span class="text-xs text-muted">
                {{ deposit.date }} · {{ deposit.note || "Salary savings" }}
              </span>
            </div>
            <div class="flex items-center gap-1">
              <Button
                type="button"
                variant="text"
                severity="secondary"
                rounded
                size="small"
                title="Edit deposit"
                aria-label="Edit deposit"
                @click="openEditDeposit(deposit)"
              >
                <Pencil :size="15" />
              </Button>
              <Button
                type="button"
                variant="text"
                severity="danger"
                rounded
                size="small"
                title="Delete deposit"
                aria-label="Delete deposit"
                @click="deleteDeposit(deposit)"
              >
                <Trash2 :size="15" />
              </Button>
            </div>
          </li>
        </ul>
      </div>
    </Drawer>
  </Card>
</template>

<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { RouterLink } from "vue-router";
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
import Card from "primevue/card";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import InputText from "primevue/inputtext";
import DatePicker from "primevue/datepicker";
import Tag from "primevue/tag";
import Message from "primevue/message";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { parseMoney, today, parseIsoDate, formatIsoDate } from "@/lib/finance";
import { t } from "@/lib/i18n";
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

const selectedDepositDate = computed<Date | null>({
  get() {
    return parseIsoDate(depositDate.value);
  },
  set(val: Date | null) {
    depositDate.value = formatIsoDate(val) || today();
  },
});

const sortedSavingsRecords = computed(() =>
  [...store.savingsRecords].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  ),
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
