<script setup lang="ts">
import { ref, shallowRef, computed, reactive } from "vue";
import {
  CalendarClock,
  Plus,
  Zap,
  Trash2,
  Pencil,
  Check,
  Pause,
  Play,
  Calendar,
  AlertTriangle,
  Receipt,
  Wallet,
  PiggyBank,
  X,
  SkipForward,
  CheckCircle2,
} from "lucide-vue-next";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { parseMoney, today, frequencyToWeekly } from "@/lib/finance";
import type {
  FrequentPayment,
  PaymentFrequency,
  Category,
  AccountId,
} from "@/lib/types";
import CategoryIcon from "@/components/CategoryIcon.vue";
import { t, categoryLabel } from "@/lib/i18n";

const store = useExpenses();

const editingPayment = shallowRef<FrequentPayment | "new" | null>(null);
const formError = shallowRef("");
const formBusy = shallowRef(false);

const form = reactive({
  name: "",
  amount: "",
  frequency: "monthly" as PaymentFrequency,
  category: "Bills" as Category,
  accountId: "global" as AccountId,
  nextDueDate: "",
  note: "",
  active: true,
});

function openForm(payment?: FrequentPayment) {
  formError.value = "";
  if (payment) {
    editingPayment.value = payment;
    form.name = payment.name;
    form.amount = (payment.amount / 100).toFixed(2);
    form.frequency = payment.frequency;
    form.category = payment.category;
    form.accountId = payment.accountId;
    form.nextDueDate = payment.nextDueDate ?? "";
    form.note = payment.note ?? "";
    form.active = payment.active;
  } else {
    editingPayment.value = "new";
    form.name = "";
    form.amount = "";
    form.frequency = "monthly";
    form.category = "Bills";
    form.accountId = "global";
    form.nextDueDate = "";
    form.note = "";
    form.active = true;
  }
}

async function saveForm() {
  formBusy.value = true;
  formError.value = "";
  try {
    if (!form.name.trim()) throw new Error("Give the payment a name.");
    const cents = parseMoney(form.amount);
    const existing =
      editingPayment.value && editingPayment.value !== "new"
        ? editingPayment.value
        : undefined;

    await store.saveFrequentPayment({
      id: existing?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      amount: cents,
      frequency: form.frequency,
      category: form.category,
      accountId: form.accountId,
      nextDueDate: form.nextDueDate || undefined,
      note: form.note.trim() || undefined,
      active: form.active,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });
    editingPayment.value = null;
  } catch (reason) {
    formError.value = friendlyError(reason);
  } finally {
    formBusy.value = false;
  }
}

async function remove(id: string) {
  if (!confirm("Remove this frequent payment?")) return;
  try {
    await store.removeFrequentPayment(id);
  } catch (reason) {
    store.error = friendlyError(reason);
  }
}

async function logExpense(payment: FrequentPayment) {
  try {
    await store.logFrequentPaymentAsExpense(payment.id);
  } catch (reason) {
    store.error = friendlyError(reason);
  }
}

async function skipPayment(payment: FrequentPayment) {
  try {
    await store.skipFrequentPayment(payment.id);
  } catch (reason) {
    store.error = friendlyError(reason);
  }
}

function dueStatus(nextDueDate?: string): {
  label: string;
  type: "overdue" | "today" | "soon" | "future" | "none";
} {
  if (!nextDueDate) return { label: "", type: "none" };
  const todayStr = today();
  if (nextDueDate === todayStr) {
    return { label: t("frequent.dueToday"), type: "today" };
  }
  if (nextDueDate < todayStr) {
    return { label: t("frequent.dueOverdue"), type: "overdue" };
  }
  const diffDays = Math.round(
    (new Date(`${nextDueDate}T12:00:00`).getTime() -
      new Date(`${todayStr}T12:00:00`).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (diffDays <= 5) {
    return { label: t("frequent.dueInDays", { days: diffDays }), type: "soon" };
  }
  return { label: t("frequent.dueOnDate", { date: nextDueDate }), type: "future" };
}
</script>

<template>
  <section class="panel frequent-panel" aria-label="Frequent payments and recurring bills">
    <div class="frequent-header">
      <div class="frequent-title-wrap">
        <div class="frequent-icon-badge">
          <CalendarClock :size="20" />
        </div>
        <div>
          <h2>{{ t('frequent.title') }}</h2>
          <p class="small muted">
            {{ t('frequent.subtitle') }}
          </p>
        </div>
      </div>
      <button class="primary btn-sm" type="button" @click="openForm()">
        <Plus :size="16" />{{ t('frequent.addPayment') }}
      </button>
    </div>

    <!-- Summary Commitment Metrics -->
    <div v-if="store.frequentPayments.length" class="frequent-metrics">
      <article class="metric-card">
        <span class="muted small">{{ t('frequent.weeklyCommitment') }}</span>
        <strong>{{ store.displayMoney(store.frequentWeeklyCommitment) }}</strong>
        <span class="small font-mono">{{ t('frequent.avgPerWeek') }}</span>
      </article>
      <article class="metric-card">
        <span class="muted small">{{ t('frequent.monthlyCommitment') }}</span>
        <strong>{{ store.displayMoney(store.frequentMonthlyCommitment) }}</strong>
        <span class="small font-mono">{{ t('frequent.avgPerMonth') }}</span>
      </article>
      <article class="metric-card">
        <span class="muted small">{{ t('frequent.activePayments') }}</span>
        <strong>{{ store.frequentPayments.filter((p) => p.active).length }}</strong>
        <span class="small font-mono">{{ store.frequentPayments.length }} {{ t('frequent.total') }}</span>
      </article>
    </div>

    <!-- Payments List -->
    <div v-if="store.frequentPayments.length" class="payments-list">
      <article
        v-for="payment in store.frequentPayments"
        :key="payment.id"
        class="payment-row"
        :class="{ inactive: !payment.active }"
      >
        <div class="row-left">
          <CategoryIcon :category="payment.category" />
          <div class="payment-details">
            <div class="payment-title-line">
              <strong>{{ payment.name }}</strong>
              <span class="freq-tag">{{ payment.frequency === 'weekly' ? t('frequent.frequencyWeekly') : payment.frequency === 'fortnightly' ? t('frequent.frequencyFortnightly') : payment.frequency === 'monthly' ? t('frequent.frequencyMonthly') : t('frequent.frequencyYearly') }}</span>
              <span
                class="account-mini-tag"
                :class="{ 'nz-tag': payment.accountId === 'nz' }"
              >
                {{ payment.accountId === "nz" ? "NZ Account" : "Global" }}
              </span>
              <span
                v-if="store.isPaymentLoggedForWeek(payment)"
                class="status-tag logged-tag"
                title="Expense logged for this week"
              >
                <CheckCircle2 :size="12" /> {{ t('frequent.loggedThisWeek') }}
              </span>
              <span
                v-else-if="store.isPaymentSkippedForWeek(payment)"
                class="status-tag skipped-tag"
                title="Payment skipped for this cycle"
              >
                <SkipForward :size="12" /> {{ t('frequent.skippedThisCycle') }}
              </span>
            </div>

            <div class="payment-meta">
              <span class="payment-amount">{{ store.displayMoney(payment.amount) }}</span>
              <span class="weekly-equiv muted small">
                (~{{ store.displayMoney(frequencyToWeekly(payment.amount, payment.frequency)) }}/wk)
              </span>
              <span
                v-if="payment.nextDueDate && dueStatus(payment.nextDueDate).type !== 'none'"
                class="due-pill"
                :data-due="dueStatus(payment.nextDueDate).type"
              >
                <Calendar :size="12" />
                {{ dueStatus(payment.nextDueDate).label }}
              </span>
            </div>
          </div>
        </div>

        <div class="row-actions">
          <button
            class="primary log-btn-prominent"
            :class="{ 'already-logged': store.isPaymentLoggedForWeek(payment) }"
            :title="store.isPaymentLoggedForWeek(payment) ? 'Already logged this week - click to log another expense' : 'Log this payment as an expense in week expenses'"
            type="button"
            @click="logExpense(payment)"
          >
            <Receipt :size="15" />
            <span>{{ store.isPaymentLoggedForWeek(payment) ? t('frequent.logAgain') : t('frequent.logPayment') }}</span>
          </button>
          <button
            class="secondary skip-btn"
            title="Skip this payment cycle without creating an expense"
            type="button"
            @click="skipPayment(payment)"
          >
            <SkipForward :size="14" />
            <span>{{ t('frequent.skipPayment') }}</span>
          </button>
          <button
            class="icon-button"
            :title="payment.active ? 'Pause payment' : 'Activate payment'"
            type="button"
            @click="store.toggleFrequentPayment(payment.id)"
          >
            <Pause v-if="payment.active" :size="16" />
            <Play v-else :size="16" />
          </button>
          <button
            class="icon-button"
            title="Edit payment"
            type="button"
            @click="openForm(payment)"
          >
            <Pencil :size="16" />
          </button>
          <button
            class="icon-button"
            title="Delete payment"
            type="button"
            @click="remove(payment.id)"
          >
            <Trash2 :size="16" />
          </button>
        </div>
      </article>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-frequent">
      <CalendarClock :size="32" class="empty-icon" />
      <p>{{ t('frequent.emptyPrompt') }}</p>
      <span class="small muted">
        {{ t('frequent.emptyHint') }}
      </span>
      <button class="secondary btn-sm" type="button" @click="openForm()">
        <Plus :size="15" />{{ t('frequent.addFirstPayment') }}
      </button>
    </div>

    <!-- Add/Edit Drawer -->
    <Teleport to="body">
      <div
        v-if="editingPayment"
        class="drawer-backdrop"
        @click.self="editingPayment = null"
      >
      <div class="bottom-drawer" role="dialog" aria-modal="true">
        <div class="drawer-handle-bar"><div class="drawer-handle"></div></div>
        <div class="drawer-header">
          <h3>
            {{ editingPayment === "new" ? t('frequent.addPayment') : t('frequent.editPayment') }}
          </h3>
          <button
            class="icon-button"
            type="button"
            aria-label="Close"
            @click="editingPayment = null"
          >
            <X :size="18" />
          </button>
        </div>

        <form class="drawer-content" @submit.prevent="saveForm">
          <label>
            {{ t('frequent.nameLabel') }}
            <input
              v-model="form.name"
              required
              placeholder="e.g. Electricity, Health Insurance, Mobile Plan"
              autofocus
            />
          </label>

          <div class="form-pair">
            <label>
              {{ t('expenses.amount') }} · NZD
              <input
                v-model="form.amount"
                inputmode="decimal"
                required
                placeholder="e.g. 135.00"
              />
            </label>
            <label>
              {{ t('frequent.frequencyLabel') }}
              <select v-model="form.frequency">
                <option value="weekly">{{ t('frequent.frequencyWeekly') }}</option>
                <option value="fortnightly">{{ t('frequent.frequencyFortnightly') }}</option>
                <option value="monthly">{{ t('frequent.frequencyMonthly') }}</option>
                <option value="yearly">{{ t('frequent.frequencyYearly') }}</option>
              </select>
            </label>
          </div>

          <div class="form-pair">
            <label>
              {{ t('frequent.categoryLabel') }}
              <select v-model="form.category">
                <option
                  v-for="cat in store.allCategories"
                  :key="cat"
                  :value="cat"
                >
                  {{ categoryLabel(cat) }}
                </option>
              </select>
            </label>
            <label>
              {{ t('frequent.accountLabel') }}
              <select v-model="form.accountId">
                <option value="global">{{ t('accounts.globalEveryday') }}</option>
                <option value="nz">{{ t('accounts.nzSavings') }}</option>
              </select>
            </label>
          </div>

          <label>
            {{ t('frequent.nextDueLabel') }}
            <input v-model="form.nextDueDate" type="date" />
          </label>

          <label>
            {{ t('frequent.noteLabel') }}
            <input
              v-model="form.note"
              placeholder="e.g. Direct debit on 1st of month"
            />
          </label>

          <p v-if="formError" class="error-note" role="alert">{{ formError }}</p>

          <div class="entry-actions">
            <button class="primary" :disabled="formBusy">
              {{ t('frequent.savePayment') }}
            </button>
            <button
              type="button"
              class="secondary"
              @click="editingPayment = null"
            >
              {{ t('common.cancel') }}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Teleport>
  </section>
</template>

<style scoped>
.frequent-panel {
  display: grid;
  gap: 16px;
}

.frequent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.frequent-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.frequent-icon-badge {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #fbf0d8;
  color: #9c7b28;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.frequent-title-wrap h2 {
  font-size: 18px;
  font-weight: 750;
  margin: 0;
}

.btn-sm {
  min-height: 34px;
  padding: 4px 12px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.frequent-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.metric-card {
  padding: 12px 14px;
  background: #f8faf9;
  border: 1px solid #e1e8e4;
  border-radius: 12px;
  display: grid;
  gap: 2px;
}

.metric-card strong {
  font-size: 18px;
  color: #153d35;
  font-variant-numeric: tabular-nums;
}

.payments-list {
  display: grid;
  gap: 8px;
}

.payment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #e1e8e4;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.payment-row.inactive {
  opacity: 0.55;
  background: #f9fbf9;
}

.row-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.payment-details {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.payment-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.payment-title-line strong {
  font-size: 14px;
  color: #153d35;
}

.freq-tag {
  font-size: 11px;
  text-transform: capitalize;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
  background: #eef4f0;
  color: #21533b;
}

.account-mini-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 6px;
  background: #f0f2f1;
  color: #556c62;
  font-weight: 550;
}

.account-mini-tag.nz-tag {
  background: #e1f2e8;
  color: #1e5239;
}

.payment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.payment-amount {
  font-size: 14px;
  font-weight: 700;
  color: #153d35;
  font-variant-numeric: tabular-nums;
}

.due-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 8px;
}

.due-pill[data-due="today"] {
  background: #fce4e0;
  color: #8c2e21;
}

.due-pill[data-due="overdue"] {
  background: #fde2de;
  color: #a03e30;
  font-weight: 700;
}

.due-pill[data-due="soon"] {
  background: #fdf3de;
  color: #7d601b;
}

.due-pill[data-due="future"] {
  background: #f0f4f2;
  color: #556c62;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.log-btn-prominent {
  min-height: 36px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #153d35;
  color: #fff;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 6px rgba(21, 61, 53, 0.2);
}

.log-btn-prominent:hover {
  background: #1c5247;
  transform: translateY(-1px);
}

.log-btn-prominent.already-logged {
  background: #27ae60;
  box-shadow: 0 2px 6px rgba(39, 174, 96, 0.2);
}

.skip-btn {
  min-height: 36px;
  padding: 6px 11px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #fff;
  color: #556c62;
  border: 1px solid #d2ded7;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.skip-btn:hover {
  background: #f3f7f5;
  color: #153d35;
  border-color: #b7cbbf;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 650;
  padding: 2px 7px;
  border-radius: 8px;
}

.status-tag.logged-tag {
  background: #e7f7ed;
  color: #1e7e48;
  border: 1px solid #c3ebcf;
}

.status-tag.skipped-tag {
  background: #f1f4f3;
  color: #637b70;
  border: 1px solid #d8e2dc;
}

.empty-frequent {
  text-align: center;
  padding: 28px 16px;
  background: #f8faf9;
  border: 1px dashed #d0ded6;
  border-radius: 14px;
  display: grid;
  justify-items: center;
  gap: 8px;
}

.empty-icon {
  color: #8da398;
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: var(--surface-backdrop, rgba(10, 24, 20, 0.45));
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  z-index: 1000;
}

.bottom-drawer {
  background: var(--surface-drawer, #fff);
  border: 1px solid var(--surface-drawer-border, rgba(21, 61, 53, 0.12));
  width: 100vw;
  max-width: 100vw;
  border-radius: 24px 24px 0 0;
  box-shadow: var(--surface-drawer-shadow, 0 -16px 64px rgba(13, 36, 30, 0.35));
  display: flex;
  flex-direction: column;
  max-height: 92dvh;
  overflow: hidden;
  animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
  transform: translate3d(0, 0, 0);
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
  font-size: 17px;
  font-weight: 700;
}

.drawer-content {
  padding: 20px 22px calc(24px + env(safe-area-inset-bottom));
  overflow-y: auto;
  display: grid;
  gap: 16px;
}

.form-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 480px) {
  .payment-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .row-actions {
    justify-content: flex-end;
    border-top: 1px dashed #e8eee9;
    padding-top: 6px;
  }
  .form-pair {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .drawer-content {
    padding: 16px 16px calc(20px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
