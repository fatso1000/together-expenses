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

function dueStatus(nextDueDate?: string): {
  label: string;
  type: "overdue" | "today" | "soon" | "future" | "none";
} {
  if (!nextDueDate) return { label: "", type: "none" };
  const todayStr = today();
  if (nextDueDate === todayStr) {
    return { label: "Due today", type: "today" };
  }
  if (nextDueDate < todayStr) {
    return { label: "Overdue", type: "overdue" };
  }
  const diffDays = Math.round(
    (new Date(`${nextDueDate}T12:00:00`).getTime() -
      new Date(`${todayStr}T12:00:00`).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (diffDays <= 5) {
    return { label: `Due in ${diffDays}d`, type: "soon" };
  }
  return { label: `Due ${nextDueDate}`, type: "future" };
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
          <h2>Frequent Payments & Bills</h2>
          <p class="small muted">
            Electricity, insurance, phone, rent, and subscriptions
          </p>
        </div>
      </div>
      <button class="primary btn-sm" type="button" @click="openForm()">
        <Plus :size="16" />Add payment
      </button>
    </div>

    <!-- Summary Commitment Metrics -->
    <div v-if="store.frequentPayments.length" class="frequent-metrics">
      <article class="metric-card">
        <span class="muted small">Weekly Commitment</span>
        <strong>{{ store.displayMoney(store.frequentWeeklyCommitment) }}</strong>
        <span class="small font-mono">avg per week</span>
      </article>
      <article class="metric-card">
        <span class="muted small">Monthly Commitment</span>
        <strong>{{ store.displayMoney(store.frequentMonthlyCommitment) }}</strong>
        <span class="small font-mono">avg per month</span>
      </article>
      <article class="metric-card">
        <span class="muted small">Active Payments</span>
        <strong>{{ store.frequentPayments.filter((p) => p.active).length }}</strong>
        <span class="small font-mono">{{ store.frequentPayments.length }} total</span>
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
              <span class="freq-tag">{{ payment.frequency }}</span>
              <span
                class="account-mini-tag"
                :class="{ 'nz-tag': payment.accountId === 'nz' }"
              >
                {{ payment.accountId === "nz" ? "NZ Account" : "Global" }}
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
            class="secondary log-btn"
            title="Log this payment as an expense today"
            type="button"
            @click="logExpense(payment)"
          >
            <Receipt :size="15" />Log expense
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
      <p>No frequent payments added yet.</p>
      <span class="small muted">
        Add electricity, insurance, phone, or rent to monitor weekly budget impacts and log expenses in one click.
      </span>
      <button class="secondary btn-sm" type="button" @click="openForm()">
        <Plus :size="15" />Add first frequent payment
      </button>
    </div>

    <!-- Add/Edit Modal -->
    <dialog
      v-if="editingPayment"
      class="modal-backdrop"
      open
      @click.self="editingPayment = null"
    >
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>
            {{ editingPayment === "new" ? "Add Frequent Payment" : "Edit Frequent Payment" }}
          </h3>
          <button
            class="icon-button"
            type="button"
            @click="editingPayment = null"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="saveForm">
          <label>
            Payment Name
            <input
              v-model="form.name"
              required
              placeholder="e.g. Electricity, Health Insurance, Mobile Plan"
              autofocus
            />
          </label>

          <div class="form-pair">
            <label>
              Amount · NZD
              <input
                v-model="form.amount"
                inputmode="decimal"
                required
                placeholder="e.g. 135.00"
              />
            </label>
            <label>
              Frequency
              <select v-model="form.frequency">
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
          </div>

          <div class="form-pair">
            <label>
              Category
              <select v-model="form.category">
                <option
                  v-for="cat in store.allCategories"
                  :key="cat"
                  :value="cat"
                >
                  {{ cat }}
                </option>
              </select>
            </label>
            <label>
              Paid From Account
              <select v-model="form.accountId">
                <option value="global">Global Account (Everyday)</option>
                <option value="nz">NZ Account (Savings)</option>
              </select>
            </label>
          </div>

          <label>
            Next Due Date (Optional)
            <input v-model="form.nextDueDate" type="date" />
          </label>

          <label>
            Note (Optional)
            <input
              v-model="form.note"
              placeholder="e.g. Direct debit on 1st of month"
            />
          </label>

          <p v-if="formError" class="error-note" role="alert">{{ formError }}</p>

          <div class="entry-actions">
            <button class="primary" :disabled="formBusy">
              Save Payment
            </button>
            <button
              type="button"
              class="secondary"
              @click="editingPayment = null"
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
  gap: 6px;
  flex-shrink: 0;
}

.log-btn {
  min-height: 32px;
  padding: 4px 9px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
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
  max-width: 480px;
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

.form-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
