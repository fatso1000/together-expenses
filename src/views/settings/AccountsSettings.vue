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
          <input
            v-model="usdInitial"
            inputmode="decimal"
            placeholder="e.g. 5000.00"
            @input="convertUsdToNzd"
          />
        </label>
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("settings.globalNzd") }}</span>
          <input
            v-model="nzdInitial"
            inputmode="decimal"
            placeholder="e.g. 8200.00"
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
          <input
            v-model="nzSavingsInitial"
            inputmode="decimal"
            placeholder="e.g. 2000.00"
          />
        </label>
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("settings.salaryNzd") }}</span>
          <input
            v-model="weeklySalaryInput"
            inputmode="decimal"
            placeholder="e.g. 1200.00"
          />
        </label>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("settings.salaryPaymentDay") }}</span>
          <select v-model.number="payDayOfWeekInput">
            <option :value="1">{{ t("days.1") }}</option>
            <option :value="2">{{ t("days.2") }}</option>
            <option :value="3">{{ t("days.3") }}</option>
            <option :value="4">{{ t("days.4") }}</option>
            <option :value="5">{{ t("days.5") }}</option>
            <option :value="6">{{ t("days.6") }}</option>
            <option :value="0">{{ t("days.0") }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("weeklyLimit.pickFromDate") }}</span>
          <input
            v-model="payDateInput"
            type="date"
            @change="onPayDateChange"
          />
        </label>
      </div>
      <p class="text-xs text-muted -mt-2 mb-3">
        {{ t("settings.salaryPaymentDayHint") }}
      </p>
      <p v-if="error" class="error-note" role="alert">{{ error }}</p>

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
import { shallowRef, ref, watch } from "vue";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { parseOptionalMoney } from "@/lib/finance";
import { Wallet, RefreshCw, Check } from "lucide-vue-next";
import { t } from "@/lib/i18n";
import Button from "primevue/button";
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

function onPayDateChange() {
  if (payDateInput.value) {
    const d = new Date(`${payDateInput.value}T12:00:00`);
    if (!isNaN(d.getTime())) {
      payDayOfWeekInput.value = d.getDay() as DayOfWeek;
    }
  }
}

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
