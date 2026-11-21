<template>
  <div class="space-y-5">
    <div class="space-y-1">
      <div class="flex items-center gap-2.5">
        <CalendarClock :size="20" class="text-accent shrink-0" />
        <h2 class="text-xl font-bold text-text m-0">
          {{ t("onboarding.frequentTitle") }}
        </h2>
      </div>
      <p class="text-xs sm:text-sm text-muted m-0 leading-relaxed">
        {{ t("onboarding.frequentSubtitle") }}
      </p>
    </div>

    <!-- Quick Templates -->
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="text-xs text-muted mr-1">
        {{ t("onboarding.frequentQuickTemplates") }}
      </span>
      <Button
        v-for="tpl in quickTemplates"
        :key="tpl.name"
        type="button"
        severity="secondary"
        variant="outlined"
        size="small"
        class="text-xs py-1! px-2.5!"
        @click="applyTemplate(tpl)"
      >
        + {{ tpl.name }}
      </Button>
    </div>

    <!-- Inline Add / Edit Form -->
    <div class="rounded-2xl border border-[var(--border)] bg-black/20 p-4 space-y-3.5">
      <h3 class="text-sm font-bold text-text m-0">
        {{ editingId ? t("frequent.editPayment") : t("onboarding.frequentAddTitle") }}
      </h3>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("frequent.nameLabel") }}</span>
          <InputText
            v-model="form.name"
            placeholder="e.g. Electricity, Rent, Mobile Plan"
            fluid
          />
        </label>
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("expenses.amount") }} · NZD</span>
          <InputText
            v-model="form.amount"
            inputmode="decimal"
            placeholder="e.g. 135.00"
            fluid
          />
        </label>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <label for="onboarding-fp-frequency">{{ t("frequent.frequencyLabel") }}</label>
          <Select
            v-model="form.frequency"
            inputId="onboarding-fp-frequency"
            :options="frequencyOptions"
            optionLabel="label"
            optionValue="value"
            fluid
          />
        </div>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <label for="onboarding-fp-category">{{ t("frequent.categoryLabel") }}</label>
          <Select
            v-model="form.category"
            inputId="onboarding-fp-category"
            :options="categoryOptions"
            optionLabel="label"
            optionValue="value"
            fluid
          />
        </div>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <label for="onboarding-fp-account">{{ t("frequent.accountLabel") }}</label>
          <Select
            v-model="form.accountId"
            inputId="onboarding-fp-account"
            :options="accountOptions"
            optionLabel="label"
            optionValue="value"
            fluid
          />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <label for="onboarding-fp-due">{{ t("frequent.nextDueLabel") }}</label>
          <DatePicker
            v-model="selectedDueDate"
            inputId="onboarding-fp-due"
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
            placeholder="e.g. Auto-debit on Mondays"
            fluid
          />
        </label>
      </div>

      <Message v-if="formError" severity="error" :closable="false">
        {{ formError }}
      </Message>

      <div class="flex flex-wrap items-center gap-2.5 pt-1">
        <Button
          type="button"
          severity="secondary"
          class="inline-flex items-center gap-1.5"
          @click="addOrUpdatePayment"
        >
          <Plus v-if="!editingId" :size="15" />
          <span>
            {{
              editingId
                ? t("onboarding.frequentUpdateButton")
                : t("onboarding.frequentAddButton")
            }}
          </span>
        </Button>
        <Button
          v-if="editingId"
          type="button"
          severity="secondary"
          variant="text"
          size="small"
          @click="resetForm"
        >
          {{ t("common.cancel") }}
        </Button>
      </div>
    </div>

    <!-- Live Commitment Summary + Staged Payments List -->
    <div v-if="setup.frequentPayments.value.length" class="space-y-3">
      <div class="grid grid-cols-2 gap-2.5">
        <article class="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-3 grid gap-0.5">
          <span class="text-xs text-muted">{{ t("frequent.weeklyCommitment") }}</span>
          <strong class="text-lg font-bold tabular-nums text-text">
            {{ store.displayMoney(setup.frequentWeeklyCommitmentCents.value) }}
          </strong>
        </article>
        <article class="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-3 grid gap-0.5">
          <span class="text-xs text-muted">{{ t("frequent.monthlyCommitment") }}</span>
          <strong class="text-lg font-bold tabular-nums text-text">
            {{ store.displayMoney(setup.frequentMonthlyCommitmentCents.value) }}
          </strong>
        </article>
      </div>

      <p class="text-xs font-semibold uppercase tracking-wider text-muted m-0">
        {{ t("onboarding.frequentAddedList", { count: setup.frequentPayments.value.length }) }}
      </p>

      <div class="grid gap-2">
        <article
          v-for="payment in setup.frequentPayments.value"
          :key="payment.id"
          class="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border)]"
        >
          <div class="flex items-center gap-3 min-w-0">
            <CategoryIcon :category="payment.category" />
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <strong class="text-sm font-bold text-text truncate">
                  {{ payment.name }}
                </strong>
                <Tag :value="frequencyText(payment.frequency)" severity="secondary" />
              </div>
              <span class="text-xs text-muted tabular-nums">
                {{ store.displayMoney(payment.amount) }} (~{{ store.displayMoney(frequencyToWeekly(payment.amount, payment.frequency)) }}/wk)
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="text"
              severity="secondary"
              rounded
              size="small"
              aria-label="Edit payment"
              @click="editPayment(payment)"
            >
              <Pencil :size="15" />
            </Button>
            <Button
              type="button"
              variant="text"
              severity="danger"
              rounded
              size="small"
              aria-label="Remove payment"
              @click="setup.removeFrequentPayment(payment.id)"
            >
              <Trash2 :size="15" />
            </Button>
          </div>
        </article>
      </div>
    </div>
    <p v-else class="text-xs text-muted m-0">
      {{ t("onboarding.frequentNoneAdded") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, shallowRef } from "vue";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-vue-next";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Select from "primevue/select";
import Tag from "primevue/tag";
import CategoryIcon from "@/components/CategoryIcon.vue";
import { useExpenses, friendlyError } from "@/stores/expenses";
import {
  formatIsoDate,
  frequencyToWeekly,
  parseIsoDate,
  parseMoney,
} from "@/lib/finance";
import { useI18n } from "@/lib/i18n";
import type {
  AccountId,
  Category,
  FrequentPayment,
  PaymentFrequency,
} from "@/lib/types";
import type { OnboardingSetupContext } from "@/composables/useOnboardingSetup";

const props = defineProps<{
  setup: OnboardingSetupContext;
}>();

const store = useExpenses();
const { t, categoryLabel } = useI18n();

const editingId = shallowRef<string | null>(null);
const formError = shallowRef("");

const form = reactive({
  name: "",
  amount: "",
  frequency: "monthly" as PaymentFrequency,
  category: "Bills" as Category,
  accountId: "global" as AccountId,
  nextDueDate: "",
  note: "",
});

const quickTemplates: Array<{
  name: string;
  frequency: PaymentFrequency;
  category: Category;
}> = [
  { name: "Rent", frequency: "weekly", category: "Rent" },
  { name: "Electricity", frequency: "monthly", category: "Bills" },
  { name: "Internet", frequency: "monthly", category: "Bills" },
  { name: "Mobile Plan", frequency: "monthly", category: "Bills" },
  { name: "Insurance", frequency: "monthly", category: "Bills" },
];

const frequencyOptions = computed(() => [
  { value: "weekly" as PaymentFrequency, label: t("frequent.frequencyWeekly") },
  {
    value: "fortnightly" as PaymentFrequency,
    label: t("frequent.frequencyFortnightly"),
  },
  {
    value: "monthly" as PaymentFrequency,
    label: t("frequent.frequencyMonthly"),
  },
  { value: "yearly" as PaymentFrequency, label: t("frequent.frequencyYearly") },
]);

const categoryOptions = computed(() =>
  props.setup.availableCategories.value.map((cat) => ({
    value: cat,
    label: categoryLabel(cat),
  })),
);

const accountOptions = computed(() => [
  { value: "global" as AccountId, label: t("accounts.globalEveryday") },
  { value: "nz" as AccountId, label: t("accounts.nzSavings") },
]);

const selectedDueDate = computed<Date | null>({
  get() {
    return parseIsoDate(form.nextDueDate);
  },
  set(val: Date | null) {
    form.nextDueDate = formatIsoDate(val);
  },
});

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

function applyTemplate(tpl: {
  name: string;
  frequency: PaymentFrequency;
  category: Category;
}) {
  editingId.value = null;
  form.name = tpl.name;
  form.frequency = tpl.frequency;
  form.category = tpl.category;
  formError.value = "";
}

function editPayment(payment: FrequentPayment) {
  editingId.value = payment.id;
  form.name = payment.name;
  form.amount = (payment.amount / 100).toFixed(2);
  form.frequency = payment.frequency;
  form.category = payment.category;
  form.accountId = payment.accountId;
  form.nextDueDate = payment.nextDueDate ?? "";
  form.note = payment.note ?? "";
  formError.value = "";
}

function resetForm() {
  editingId.value = null;
  form.name = "";
  form.amount = "";
  form.frequency = "monthly";
  form.category = "Bills";
  form.accountId = "global";
  form.nextDueDate = "";
  form.note = "";
  formError.value = "";
}

function addOrUpdatePayment() {
  formError.value = "";
  try {
    if (!form.name.trim()) {
      throw new Error("Give the payment a name.");
    }
    const cents = parseMoney(form.amount);
    const now = Date.now();
    props.setup.saveFrequentPayment({
      id: editingId.value || crypto.randomUUID(),
      name: form.name.trim(),
      amount: cents,
      frequency: form.frequency,
      category: form.category,
      accountId: form.accountId,
      nextDueDate: form.nextDueDate || undefined,
      note: form.note.trim() || undefined,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    resetForm();
  } catch (reason) {
    formError.value = friendlyError(reason);
  }
}
</script>
