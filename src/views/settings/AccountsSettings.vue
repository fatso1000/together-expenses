<template>
  <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm space-y-5">
    <div class="space-y-1">
      <div class="flex items-center gap-2.5 text-[var(--text-color)]">
        <Wallet class="text-accent" :size="20" />
        <h2 class="text-lg font-bold text-text m-0">{{ t("settings.accountsSetup") }}</h2>
      </div>
      <p class="text-xs text-muted m-0">
        {{ t("settings.accountsDescription") }}
      </p>
    </div>

    <form class="space-y-4" @submit.prevent="saveAccountsSetup">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("settings.globalUsd") }}</span>
          <InputText
            v-model="usdInitial"
            inputmode="decimal"
            placeholder="e.g. 5000.00"
            fluid
            @input="convertUsdToNzd"
          />
        </label>
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("settings.globalNzd") }}</span>
          <InputText
            v-model="nzdInitial"
            inputmode="decimal"
            placeholder="e.g. 8200.00"
            fluid
          />
        </label>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-black/20 border border-[var(--border)] rounded-xl text-xs text-muted">
        <span>
          Reference rate: 1 NZD = {{ store.rates.rate ?? "..." }} USD ({{ store.rates.status }})
        </span>
        <Button
          type="button"
          variant="text"
          size="small"
          class="inline-flex items-center gap-1.5 text-xs py-1 px-2"
          @click="
            store.rates.refresh();
            convertUsdToNzd();
          "
        >
          <RefreshCw :size="13" />
          <span>{{ t("settings.updateConversion") }}</span>
        </Button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("settings.nzAccountNzd") }}</span>
          <InputText
            v-model="nzSavingsInitial"
            inputmode="decimal"
            placeholder="e.g. 2000.00"
            fluid
          />
        </label>
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("settings.salaryNzd") }}</span>
          <InputText
            v-model="weeklySalaryInput"
            inputmode="decimal"
            placeholder="e.g. 1200.00"
            fluid
          />
        </label>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <label for="accounts-pay-day">{{ t("settings.salaryPaymentDay") }}</label>
          <Select
            v-model="payDayOfWeekInput"
            inputId="accounts-pay-day"
            :options="dayOptions"
            optionLabel="label"
            optionValue="value"
            fluid
          />
        </div>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <label for="accounts-pay-date">{{ t("weeklyLimit.pickFromDate") }}</label>
          <DatePicker
            v-model="selectedPayDate"
            inputId="accounts-pay-date"
            dateFormat="yy-mm-dd"
            showIcon
            iconDisplay="input"
            fluid
          />
        </div>
      </div>

      <p class="text-xs text-muted -mt-2 mb-3">
        {{ t("settings.salaryPaymentDayHint") }}
      </p>

      <Message v-if="error" severity="error" :closable="false">
        {{ error }}
      </Message>

      <div class="flex justify-start pt-1">
        <Button
          type="submit"
          severity="primary"
          :disabled="accountsBusy"
          class="inline-flex items-center gap-2"
        >
          <Check v-if="accountsSaved" :size="16" />
          <span>{{ accountsSaved ? t("common.saved") || "Saved" : t("settings.saveAccounts") }}</span>
        </Button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, ref, computed, watch } from "vue";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { parseOptionalMoney, parseIsoDate, formatIsoDate } from "@/lib/finance";
import { Wallet, RefreshCw, Check } from "lucide-vue-next";
import { t } from "@/lib/i18n";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Message from "primevue/message";
import type { DayOfWeek } from "@/lib/types";

const store = useExpenses();
const error = shallowRef("");
const accountsBusy = shallowRef(false);
const accountsSaved = shallowRef(false);

const usdInitial = shallowRef("");
const nzdInitial = shallowRef("");
const nzSavingsInitial = shallowRef("");
const weeklySalaryInput = shallowRef("");
const payDayOfWeekInput = ref<DayOfWeek>(1);
const payDateInput = ref<string>("");

const dayOptions = computed(() => [
  { value: 1 as DayOfWeek, label: t("days.1") },
  { value: 2 as DayOfWeek, label: t("days.2") },
  { value: 3 as DayOfWeek, label: t("days.3") },
  { value: 4 as DayOfWeek, label: t("days.4") },
  { value: 5 as DayOfWeek, label: t("days.5") },
  { value: 6 as DayOfWeek, label: t("days.6") },
  { value: 0 as DayOfWeek, label: t("days.0") },
]);

const selectedPayDate = computed<Date | null>({
  get() {
    return parseIsoDate(payDateInput.value);
  },
  set(val: Date | null) {
    payDateInput.value = formatIsoDate(val);
    if (val instanceof Date && !Number.isNaN(val.getTime())) {
      payDayOfWeekInput.value = val.getDay() as DayOfWeek;
    }
  },
});

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
    payDayOfWeekInput.value = (newSalary.payDayOfWeek ?? 1) as DayOfWeek;
    payDateInput.value = newSalary.payDate ?? "";
  },
  { immediate: true, deep: true },
);

function convertUsdToNzd() {
  if (!usdInitial.value.trim() || !store.rates.rate) return;
  try {
    const usdCents = parseOptionalMoney(usdInitial.value);
    if (!usdCents) return;
    const nzdCents = Math.round(usdCents / store.rates.rate);
    nzdInitial.value = (nzdCents / 100).toFixed(2);
  } catch {
    // waiting for complete input
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
      payDayOfWeekInput.value,
      payDateInput.value.trim() || undefined,
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
</script>
