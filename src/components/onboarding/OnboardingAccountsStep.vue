<template>
  <div class="space-y-5">
    <div class="space-y-1">
      <div class="flex items-center gap-2.5">
        <Wallet :size="20" class="text-accent shrink-0" />
        <h2 class="text-xl font-bold text-text m-0">
          {{ t("onboarding.accountsTitle") }}
        </h2>
      </div>
      <p class="text-xs sm:text-sm text-muted m-0 leading-relaxed">
        {{ t("onboarding.accountsSubtitle") }}
      </p>
    </div>

    <div class="space-y-4">
      <!-- Global Starting Money (USD & NZD) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("settings.globalUsd") }}</span>
          <InputText
            v-model="setup.accountsForm.usdInitial"
            inputmode="decimal"
            placeholder="e.g. 5000.00"
            fluid
            @input="setup.convertUsdToNzd()"
          />
        </label>
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("settings.globalNzd") }}</span>
          <InputText
            v-model="setup.accountsForm.nzdInitial"
            inputmode="decimal"
            placeholder="e.g. 8200.00"
            fluid
          />
        </label>
      </div>

      <!-- Live Reference Exchange Rate Bar -->
      <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-black/20 border border-[var(--border)] rounded-xl text-xs text-muted">
        <span>
          {{
            t("settings.referenceRate", {
              rate: store.rates.rate ?? "…",
              status: store.rates.status,
            })
          }}
        </span>
        <Button
          type="button"
          variant="text"
          size="small"
          class="inline-flex items-center gap-1.5 text-xs py-1 px-2"
          @click="setup.refreshRatesAndConvert()"
        >
          <RefreshCw :size="13" />
          <span>{{ t("settings.updateConversion") }}</span>
        </Button>
      </div>

      <!-- NZ Account Savings & Weekly Salary -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("settings.nzAccountNzd") }}</span>
          <InputText
            v-model="setup.accountsForm.nzSavingsInitial"
            inputmode="decimal"
            placeholder="e.g. 2000.00"
            fluid
          />
        </label>
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("settings.salaryNzd") }}</span>
          <InputText
            v-model="setup.accountsForm.weeklySalary"
            inputmode="decimal"
            placeholder="e.g. 1200.00"
            fluid
          />
        </label>
      </div>

      <!-- Pay Day & Pay Date -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <label for="onboarding-pay-day">{{ t("settings.salaryPaymentDay") }}</label>
          <Select
            v-model="setup.accountsForm.payDayOfWeek"
            inputId="onboarding-pay-day"
            :options="dayOptions"
            optionLabel="label"
            optionValue="value"
            fluid
          />
        </div>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <label for="onboarding-pay-date">{{ t("weeklyLimit.pickFromDate") }}</label>
          <DatePicker
            v-model="selectedPayDate"
            inputId="onboarding-pay-date"
            dateFormat="yy-mm-dd"
            showIcon
            iconDisplay="input"
            fluid
          />
        </div>
      </div>

      <p class="text-xs text-muted m-0">
        {{ t("settings.salaryPaymentDayHint") }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RefreshCw, Wallet } from "lucide-vue-next";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { useExpenses } from "@/stores/expenses";
import { formatIsoDate, parseIsoDate } from "@/lib/finance";
import { useI18n } from "@/lib/i18n";
import type { DayOfWeek } from "@/lib/types";
import type { OnboardingSetupContext } from "@/composables/useOnboardingSetup";

const props = defineProps<{
  setup: OnboardingSetupContext;
}>();

const store = useExpenses();
const { t } = useI18n();

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
    return parseIsoDate(props.setup.accountsForm.payDate);
  },
  set(val: Date | null) {
    props.setup.accountsForm.payDate = formatIsoDate(val);
    if (val instanceof Date && !Number.isNaN(val.getTime())) {
      props.setup.accountsForm.payDayOfWeek = val.getDay() as DayOfWeek;
    }
  },
});
</script>
