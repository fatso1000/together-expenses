<template>
  <Card class="mb-4 sm:mb-5" aria-label="Frequent payments and recurring bills">
    <template #content>
      <div class="grid gap-3.5 sm:gap-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-[var(--warning-bg)] text-[var(--warning-colour)] flex items-center justify-center shrink-0">
              <CalendarClock :size="19" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-base sm:text-lg font-bold text-text m-0 truncate">{{ t("frequent.title") }}</h2>
              <p class="text-[11px] sm:text-xs text-muted m-0 leading-snug">
                {{ t("frequent.subtitle") }}
              </p>
            </div>
          </div>

          <Button
            type="button"
            severity="primary"
            size="small"
            rounded
            class="inline-flex items-center gap-1 text-xs! self-start sm:self-auto shrink-0"
            @click="openForm()"
          >
            <Plus :size="15" />
            <span>{{ t("frequent.addPayment") }}</span>
          </Button>
        </div>

        <!-- Summary Commitment Metrics (2-up + span on mobile so amounts never clip) -->
        <div
          v-if="store.frequentPayments.length"
          class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5"
        >
          <article class="p-2.5 sm:p-3.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border)] grid gap-0.5 min-w-0">
            <span class="text-[10px] sm:text-xs text-muted leading-tight">{{ t("frequent.weeklyCommitment") }}</span>
            <strong class="text-sm sm:text-lg font-bold tabular-nums text-text">
              {{ store.displayMoney(store.frequentWeeklyCommitment) }}
            </strong>
            <span class="text-[10px] sm:text-xs font-mono text-muted truncate">{{ t("frequent.avgPerWeek") }}</span>
          </article>
          <article class="p-2.5 sm:p-3.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border)] grid gap-0.5 min-w-0">
            <span class="text-[10px] sm:text-xs text-muted leading-tight">{{ t("frequent.monthlyCommitment") }}</span>
            <strong class="text-sm sm:text-lg font-bold tabular-nums text-text">
              {{ store.displayMoney(store.frequentMonthlyCommitment) }}
            </strong>
            <span class="text-[10px] sm:text-xs font-mono text-muted truncate">{{ t("frequent.avgPerMonth") }}</span>
          </article>
          <article class="col-span-2 sm:col-span-1 p-2.5 sm:p-3.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border)] flex sm:grid items-baseline justify-between gap-0.5 min-w-0">
            <span class="text-[10px] sm:text-xs text-muted leading-tight">{{ t("frequent.activePayments") }}</span>
            <div class="flex sm:grid items-baseline gap-1.5 sm:gap-0.5">
              <strong class="text-sm sm:text-lg font-bold tabular-nums text-text">
                {{ store.frequentPayments.filter((p) => p.active).length }}
              </strong>
              <span class="text-[10px] sm:text-xs font-mono text-muted">
                {{ store.frequentPayments.length }} {{ t("frequent.total") }}
              </span>
            </div>
          </article>
        </div>

        <!-- Payments List -->
        <div v-if="store.frequentPayments.length" class="grid gap-2.5">
          <article
            v-for="payment in store.frequentPayments"
            :key="payment.id"
            class="grid gap-2.5 p-3 sm:p-3.5 rounded-2xl border border-[var(--border)] transition-opacity min-w-0"
            :class="payment.active ? 'bg-[var(--surface-card)]' : 'bg-[var(--surface)] opacity-55'"
          >
            <!-- Top Row: Identity + Primary Thumb-Accessible Log Action -->
            <div class="flex items-start justify-between gap-2.5 min-w-0">
              <div class="flex items-start gap-2.5 min-w-0 flex-1">
                <CategoryIcon :category="payment.category" />
                <div class="grid gap-1 min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap min-w-0">
                    <strong class="text-sm font-bold text-text break-words leading-snug">{{ payment.name }}</strong>
                    <Tag
                      v-if="payment.nextDueDate && dueStatus(payment.nextDueDate).type !== 'none'"
                      :value="dueStatus(payment.nextDueDate).label"
                      :severity="dueSeverity(dueStatus(payment.nextDueDate).type)"
                      class="text-[10px]!"
                    />
                  </div>
                  <div class="flex items-center gap-1.5 flex-wrap text-xs text-muted">
                    <span class="text-sm font-bold tabular-nums text-text">
                      {{ store.displayMoney(payment.amount) }}
                    </span>
                    <span>(~{{ store.displayMoney(frequencyToWeekly(payment.amount, payment.frequency)) }}/wk)</span>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                :severity="store.isPaymentLoggedForWeek(payment) ? 'success' : 'primary'"
                size="small"
                rounded
                class="inline-flex items-center gap-1 shrink-0 text-xs!"
                :title="
                  store.isPaymentLoggedForWeek(payment)
                    ? 'Already logged this week - click to log another expense'
                    : 'Log this payment as an expense in week expenses'
                "
                @click="logExpense(payment)"
              >
                <Receipt :size="14" />
                <span>{{
                  store.isPaymentLoggedForWeek(payment)
                    ? t("frequent.logAgain")
                    : t("frequent.logPayment")
                }}</span>
              </Button>
            </div>

            <!-- Bottom Row: Status Tags + Secondary Controls -->
            <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/8">
              <div class="flex items-center gap-1.5 flex-wrap">
                <Tag :value="frequencyText(payment.frequency)" severity="secondary" class="text-[10px]!" />
                <Tag
                  :value="payment.accountId === 'nz' ? t('accounts.nzShort') : t('accounts.globalShort')"
                  :severity="payment.accountId === 'nz' ? 'success' : 'secondary'"
                  class="text-[10px]!"
                />
                <Tag
                  v-if="store.isPaymentLoggedForWeek(payment)"
                  :value="t('frequent.loggedThisWeek')"
                  severity="success"
                  class="text-[10px]!"
                  title="Expense logged for this week"
                />
                <Tag
                  v-else-if="store.isPaymentSkippedForWeek(payment)"
                  :value="t('frequent.skippedThisCycle')"
                  severity="secondary"
                  class="text-[10px]!"
                  title="Payment skipped for this cycle"
                />
              </div>

              <div class="flex items-center gap-1 ml-auto">
                <Button
                  type="button"
                  severity="secondary"
                  variant="outlined"
                  size="small"
                  rounded
                  class="inline-flex items-center gap-1 text-xs! py-1! px-2.5!"
                  title="Skip this payment cycle without creating an expense"
                  @click="skipPayment(payment)"
                >
                  <SkipForward :size="13" />
                  <span>{{ t("frequent.skipPayment") }}</span>
                </Button>

                <Button
                  type="button"
                  variant="text"
                  severity="secondary"
                  rounded
                  size="small"
                  :title="payment.active ? 'Pause payment' : 'Activate payment'"
                  :aria-label="payment.active ? 'Pause payment' : 'Activate payment'"
                  @click="store.toggleFrequentPayment(payment.id)"
                >
                  <Pause v-if="payment.active" :size="15" />
                  <Play v-else :size="15" />
                </Button>

                <Button
                  type="button"
                  variant="text"
                  severity="secondary"
                  rounded
                  size="small"
                  title="Edit payment"
                  aria-label="Edit payment"
                  @click="openForm(payment)"
                >
                  <Pencil :size="15" />
                </Button>

                <Button
                  type="button"
                  variant="text"
                  severity="danger"
                  rounded
                  size="small"
                  title="Delete payment"
                  aria-label="Delete payment"
                  @click="removingId = payment.id"
                >
                  <Trash2 :size="15" />
                </Button>
              </div>
            </div>

            <!-- Inline Delete Confirmation -->
            <div
              v-if="removingId === payment.id"
              class="p-3 rounded-xl bg-[var(--pill-bg)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-2"
            >
              <span class="text-xs text-text">{{ t("frequent.confirmDelete", { name: payment.name }) }}</span>
              <div class="flex items-center gap-2 ml-auto">
                <Button type="button" severity="secondary" size="small" @click="removingId = ''">
                  {{ t("common.cancel") }}
                </Button>
                <Button
                  type="button"
                  severity="danger"
                  size="small"
                  :disabled="deletingId === payment.id"
                  @click="confirmRemove(payment.id)"
                >
                  {{ t("common.delete") }}
                </Button>
              </div>
            </div>
          </article>
        </div>

        <!-- Empty State -->
        <div
          v-else
          class="flex flex-col items-center justify-center text-center py-7 px-4 rounded-xl bg-[var(--surface)] border border-dashed border-[var(--border)] gap-2"
        >
          <CalendarClock :size="32" class="text-muted" />
          <p class="text-sm m-0 text-text">{{ t("frequent.emptyPrompt") }}</p>
          <span class="text-xs text-muted">{{ t("frequent.emptyHint") }}</span>
          <Button
            type="button"
            severity="secondary"
            size="small"
            class="inline-flex items-center gap-1.5 mt-1"
            @click="openForm()"
          >
            <Plus :size="15" />
            <span>{{ t("frequent.addFirstPayment") }}</span>
          </Button>
        </div>
      </div>

      <!-- Add/Edit Drawer -->
      <Drawer
        v-model:visible="drawerVisible"
        position="bottom"
        class="w-full! max-w-full!"
        style="height: auto; max-height: 92dvh"
        :dismissable="!formBusy"
        :closeOnEscape="!formBusy"
      >
        <template #header>
          <h3 class="text-lg font-bold m-0">
            {{ editingPayment === "new" ? t("frequent.addPayment") : t("frequent.editPayment") }}
          </h3>
        </template>

        <template #closebutton="{ closeCallback }">
          <Button
            type="button"
            variant="text"
            severity="secondary"
            rounded
            aria-label="Close"
            :disabled="formBusy"
            @click="closeCallback"
          >
            <X :size="18" />
          </Button>
        </template>

        <form class="grid gap-4 pb-2" @submit.prevent="saveForm">
          <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
            <span>{{ t("frequent.nameLabel") }}</span>
            <InputText
              v-model="form.name"
              required
              placeholder="e.g. Electricity, Health Insurance, Mobile Plan"
              autofocus
              fluid
            />
          </label>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
              <span>{{ t("expenses.amount") }} · NZD</span>
              <InputText
                v-model="form.amount"
                inputmode="decimal"
                required
                placeholder="e.g. 135.00"
                fluid
              />
            </label>
            <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
              <label for="frequent-frequency">{{ t("frequent.frequencyLabel") }}</label>
              <Select
                v-model="form.frequency"
                inputId="frequent-frequency"
                :options="frequencyOptions"
                optionLabel="label"
                optionValue="value"
                fluid
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
              <label for="frequent-category">{{ t("frequent.categoryLabel") }}</label>
              <Select
                v-model="form.category"
                inputId="frequent-category"
                :options="categoryOptions"
                optionLabel="label"
                optionValue="value"
                fluid
              />
            </div>
            <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
              <label for="frequent-account">{{ t("frequent.accountLabel") }}</label>
              <Select
                v-model="form.accountId"
                inputId="frequent-account"
                :options="accountOptions"
                optionLabel="label"
                optionValue="value"
                fluid
              />
            </div>
          </div>

          <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
            <label for="frequent-due-date">{{ t("frequent.nextDueLabel") }}</label>
            <DatePicker
              v-model="selectedDueDate"
              inputId="frequent-due-date"
              dateFormat="yy-mm-dd"
              showIcon
              iconDisplay="input"
              fluid
            />
          </div>

          <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
            <span>{{ t("frequent.noteLabel") }}</span>
            <InputText
              v-model="form.note"
              placeholder="e.g. Direct debit on 1st of month"
              fluid
            />
          </label>

          <Message v-if="formError" severity="error" :closable="false">
            {{ formError }}
          </Message>

          <div class="flex flex-wrap items-center gap-3 pt-1">
            <Button type="submit" severity="primary" :disabled="formBusy">
              {{ t("frequent.savePayment") }}
            </Button>
            <Button
              type="button"
              severity="secondary"
              variant="outlined"
              @click="editingPayment = null"
            >
              {{ t("common.cancel") }}
            </Button>
          </div>
        </form>
      </Drawer>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { shallowRef, computed, reactive } from "vue";
import {
  CalendarClock,
  Plus,
  Trash2,
  Pencil,
  Pause,
  Play,
  Receipt,
  X,
  SkipForward,
} from "lucide-vue-next";
import Card from "primevue/card";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Tag from "primevue/tag";
import Message from "primevue/message";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { parseMoney, today, frequencyToWeekly, parseIsoDate, formatIsoDate } from "@/lib/finance";
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
const removingId = shallowRef("");
const deletingId = shallowRef("");

const drawerVisible = computed<boolean>({
  get() {
    return editingPayment.value !== null;
  },
  set(val: boolean) {
    if (!val) {
      editingPayment.value = null;
    }
  },
});

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

const selectedDueDate = computed<Date | null>({
  get() {
    return parseIsoDate(form.nextDueDate);
  },
  set(val: Date | null) {
    form.nextDueDate = formatIsoDate(val);
  },
});

const frequencyOptions = computed(() => [
  { value: "weekly" as PaymentFrequency, label: t("frequent.frequencyWeekly") },
  { value: "fortnightly" as PaymentFrequency, label: t("frequent.frequencyFortnightly") },
  { value: "monthly" as PaymentFrequency, label: t("frequent.frequencyMonthly") },
  { value: "yearly" as PaymentFrequency, label: t("frequent.frequencyYearly") },
]);

const categoryOptions = computed(() =>
  store.allCategories.map((cat) => ({
    value: cat,
    label: categoryLabel(cat),
  })),
);

const accountOptions = computed(() => [
  { value: "global" as AccountId, label: t("accounts.globalEveryday") },
  { value: "nz" as AccountId, label: t("accounts.nzSavings") },
]);

function frequencyText(freq: PaymentFrequency): string {
  switch (freq) {
    case "weekly":
      return t("frequent.frequencyWeekly");
    case "fortnightly":
      return t("frequent.frequencyFortnightly");
    case "yearly":
      return t("frequent.frequencyYearly");
    case "monthly":
    default:
      return t("frequent.frequencyMonthly");
  }
}

function dueSeverity(
  type: "overdue" | "today" | "soon" | "future" | "none",
): "danger" | "warn" | "secondary" {
  if (type === "overdue" || type === "today") return "danger";
  if (type === "soon") return "warn";
  return "secondary";
}

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
      lastLoggedDate: existing?.lastLoggedDate,
      lastSkippedDate: existing?.lastSkippedDate,
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

async function confirmRemove(id: string) {
  deletingId.value = id;
  try {
    await store.removeFrequentPayment(id);
    removingId.value = "";
  } catch (reason) {
    store.error = friendlyError(reason);
  } finally {
    deletingId.value = "";
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
