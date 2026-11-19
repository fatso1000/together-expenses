<template>
  <div class="grid gap-5">
    <section
      class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm flex flex-wrap items-center gap-4"
      aria-label="Report timeframe controls"
    >
      <div
        class="flex flex-wrap sm:flex-nowrap gap-1 p-1 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] w-full sm:w-auto overflow-x-auto"
        aria-label="Report period"
      >
        <Button
          v-for="period in ['week', 'month', 'year', 'all', 'custom'] as const"
          :key="period"
          type="button"
          size="small"
          class="flex-1 sm:flex-none whitespace-nowrap"
          :severity="mode === period ? 'primary' : 'secondary'"
          :variant="mode === period ? undefined : 'text'"
          @click="mode = period"
        >
          {{ t(`reports.periods.${period}`) }}
        </Button>
      </div>

      <!-- Week Selector Note -->
      <div
        v-if="mode === 'week'"
        class="flex flex-wrap items-center gap-3 px-3 py-2 rounded-xl bg-[var(--surface-card)] border border-[var(--border)]"
      >
        <div class="inline-flex items-center gap-2 text-xs font-medium text-muted">
          <Calendar :size="15" />
          <label for="report-week-date">{{ t("reports.weekContaining") }}</label>
          <DatePicker
            v-model="selectedWeekDate"
            inputId="report-week-date"
            dateFormat="yy-mm-dd"
            showIcon
            iconDisplay="input"
          />
        </div>
        <span class="text-xs text-muted">
          {{ store.weekStart }} to {{ store.weekEnd }} ({{ store.weekWeekdayRangeLong }})
        </span>
      </div>

      <div v-if="mode === 'custom'" class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
        <div class="flex flex-col gap-1 text-xs font-medium text-muted">
          <label for="report-from-date">{{ t("reports.from") }}</label>
          <DatePicker
            v-model="selectedFromDate"
            inputId="report-from-date"
            dateFormat="yy-mm-dd"
            showIcon
            iconDisplay="input"
          />
        </div>
        <div class="flex flex-col gap-1 text-xs font-medium text-muted">
          <label for="report-to-date">{{ t("reports.to") }}</label>
          <DatePicker
            v-model="selectedToDate"
            inputId="report-to-date"
            dateFormat="yy-mm-dd"
            :minDate="selectedFromDate ?? undefined"
            showIcon
            iconDisplay="input"
          />
        </div>
      </div>

      <Button
        type="button"
        severity="secondary"
        variant="outlined"
        class="inline-flex items-center gap-1.5 ml-auto"
        @click="exportCsv"
      >
        <Download :size="16" />
        <span>{{ t("reports.exportReport") }}</span>
      </Button>
    </section>

    <!-- Initial Global Money Baseline Analysis Hub -->
    <section
      v-if="initialGlobalNZD > 0"
      class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm grid gap-4"
    >
      <div class="flex items-center gap-2.5">
        <Wallet :size="20" class="text-accent shrink-0" />
        <div>
          <h2 class="text-lg font-bold text-text m-0">{{ t("reports.initialCapitalHub") }}</h2>
          <p class="text-xs text-muted m-0">
            {{ t("reports.startingMoney", { amount: store.displayMoney(initialGlobalNZD) }) }}
            <template v-if="initialGlobalUSD">
              (${{ (initialGlobalUSD / 100).toFixed(2) }} USD)
            </template>
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <!-- Period Spend vs Initial Capital -->
        <article
          class="p-4 rounded-xl border grid gap-2"
          :class="
            periodBaselineComparison.isOverInitial
              ? 'bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger-colour)]'
              : 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-colour)]'
          "
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-medium">{{ t("reports.selectedVsInitial") }}</span>
            <Tag
              :value="t('reports.percentOfStarting', { percent: Math.round(periodBaselineComparison.spentPercent) })"
              :severity="periodBaselineComparison.isOverInitial ? 'danger' : 'success'"
            />
          </div>
          <div class="grid gap-1">
            <strong class="text-xl font-extrabold tabular-nums">
              {{ t("reports.spent", { amount: store.displayMoney(sum) }) }}
            </strong>
            <p class="text-xs m-0">
              <template v-if="!periodBaselineComparison.isOverInitial">
                {{ t("reports.spentLessThanStarting", { remaining: store.displayMoney(periodBaselineComparison.remaining) }) }}
              </template>
              <template v-else>
                {{ t("reports.exceededStarting", { difference: store.displayMoney(periodBaselineComparison.difference) }) }}
              </template>
            </p>
          </div>
        </article>

        <!-- All-Time Spend vs Initial Capital -->
        <article
          class="p-4 rounded-xl border grid gap-2"
          :class="
            allTimeBaselineComparison.isOverInitial
              ? 'bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger-colour)]'
              : 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-colour)]'
          "
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-medium">{{ t("reports.allTimeVsInitial") }}</span>
            <Tag
              :value="`${Math.round(allTimeBaselineComparison.spentPercent)}% all-time`"
              :severity="allTimeBaselineComparison.isOverInitial ? 'danger' : 'success'"
            />
          </div>
          <div class="grid gap-1">
            <strong class="text-xl font-extrabold tabular-nums">
              {{ t("reports.spent", { amount: store.displayMoney(store.allTimeTotal) }) }}
            </strong>
            <p class="text-xs m-0">
              <template v-if="!allTimeBaselineComparison.isOverInitial">
                {{ t("reports.preservedCapital", { amount: store.displayMoney(allTimeBaselineComparison.remaining) }) }}
              </template>
              <template v-else>
                {{ t("reports.capitalDepleted", { amount: store.displayMoney(allTimeBaselineComparison.difference) }) }}
              </template>
            </p>
          </div>
        </article>
      </div>
    </section>

    <!-- Executive Summary Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <template #subtitle>{{ t("reports.totalSpent") }}</template>
        <template #content>
          <div class="grid gap-1">
            <strong class="text-2xl font-bold font-heading tabular-nums">
              {{ store.displayMoney(sum) }}
            </strong>
            <small class="text-xs text-muted">{{ rows.length }} {{ t("reports.transactions") }}</small>
          </div>
        </template>
      </Card>
      <Card>
        <template #subtitle>{{ t("reports.averageTransaction") }}</template>
        <template #content>
          <div class="grid gap-1">
            <strong class="text-2xl font-bold font-heading tabular-nums">
              {{ store.displayMoney(average) }}
            </strong>
            <small class="text-xs text-muted">{{ t("reports.summaryMetrics") }}</small>
          </div>
        </template>
      </Card>
      <Card>
        <template #subtitle>{{ t("reports.largestTransaction") }}</template>
        <template #content>
          <div class="grid gap-1">
            <strong class="text-2xl font-bold font-heading tabular-nums">
              {{ store.displayMoney(largest?.amount ?? 0) }}
            </strong>
            <small class="text-xs text-muted">
              {{ largest ? `${largest.merchant} (${store.displayMoney(largest.amount)})` : "-" }}
            </small>
          </div>
        </template>
      </Card>
    </div>

    <!-- Chart 1: Spending Trajectory & Cumulative Line -->
    <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm space-y-4">
      <div class="flex items-center gap-2.5">
        <LineChart :size="18" class="text-accent shrink-0" />
        <div>
          <h2 class="text-base font-bold text-text m-0">{{ t("reports.spendTrajectoryTitle") }}</h2>
          <p class="text-xs text-muted m-0">{{ t("reports.spendTrajectoryDesc") }}</p>
        </div>
      </div>
      <SpendTrajectoryChart :expenses="rows" />
    </section>

    <!-- Chart 2: Interactive Donut Category Breakdown -->
    <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm space-y-4">
      <div class="flex items-center gap-2.5">
        <PieChart :size="18" class="text-accent shrink-0" />
        <div>
          <h2 class="text-base font-bold text-text m-0">{{ t("reports.categoryBreakdownTitle") }}</h2>
          <p class="text-xs text-muted m-0">{{ t("reports.categoryBreakdownDesc") }}</p>
        </div>
      </div>
      <CategoryDonutChart :expenses="rows" :currency="store.currency" />
    </section>

    <!-- Chart 3: Structured Budget Variance Analysis -->
    <section
      v-if="store.categoryLimits.length"
      class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm space-y-4"
    >
      <div class="flex items-center gap-2.5">
        <Layers :size="18" class="text-accent shrink-0" />
        <div>
          <h2 class="text-base font-bold text-text m-0">{{ t("reports.budgetVarianceTitle") }}</h2>
          <p class="text-xs text-muted m-0">{{ t("reports.budgetVarianceDesc") }}</p>
        </div>
      </div>
      <BudgetVarianceChart
        :expenses="rows"
        :multiplier="budgetMultiplier"
        :period-title="mode"
      />
    </section>

    <!-- Chart 4: Dual Account Cashflow & Net Position -->
    <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm space-y-4">
      <div class="flex items-center gap-2.5">
        <ArrowRightLeft :size="18" class="text-accent shrink-0" />
        <div>
          <h2 class="text-base font-bold text-text m-0">{{ t("reports.cashflowTitle") }}</h2>
          <p class="text-xs text-muted m-0">{{ t("reports.cashflowDesc") }}</p>
        </div>
      </div>
      <AccountCashflowChart :expenses="rows" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from "vue";
import {
  Download,
  Calendar,
  Wallet,
  PieChart,
  LineChart,
  Layers,
  ArrowRightLeft,
} from "lucide-vue-next";
import Button from "primevue/button";
import Card from "primevue/card";
import DatePicker from "primevue/datepicker";
import Tag from "primevue/tag";
import { useExpenses } from "@/stores/expenses";
import {
  total,
  csv,
  downloadFile,
  compareSpendWithInitial,
  parseIsoDate,
  formatIsoDate,
} from "@/lib/finance";
import { t } from "@/lib/i18n";
import CategoryDonutChart from "@/components/reports/CategoryDonutChart.vue";
import SpendTrajectoryChart from "@/components/reports/SpendTrajectoryChart.vue";
import BudgetVarianceChart from "@/components/reports/BudgetVarianceChart.vue";
import AccountCashflowChart from "@/components/reports/AccountCashflowChart.vue";

const store = useExpenses();
const mode = shallowRef<"week" | "month" | "year" | "all" | "custom">("month");
const from = shallowRef(`${store.month}-01`);
const to = shallowRef(new Date().toLocaleDateString("en-CA"));

const selectedWeekDate = computed<Date | null>({
  get() {
    return parseIsoDate(store.weekDate);
  },
  set(val: Date | null) {
    const formatted = formatIsoDate(val);
    if (formatted) {
      store.weekDate = formatted;
    }
  },
});

const selectedFromDate = computed<Date | null>({
  get() {
    return parseIsoDate(from.value);
  },
  set(val: Date | null) {
    const formatted = formatIsoDate(val);
    if (formatted) {
      from.value = formatted;
    }
  },
});

const selectedToDate = computed<Date | null>({
  get() {
    return parseIsoDate(to.value);
  },
  set(val: Date | null) {
    const formatted = formatIsoDate(val);
    if (formatted) {
      to.value = formatted;
    }
  },
});

const rows = computed(() =>
  store.currencyExpenses.filter((item) => {
    if (mode.value === "week") {
      return item.date >= store.weekStart && item.date <= store.weekEnd;
    }
    if (mode.value === "year") {
      return item.date.startsWith(store.month.slice(0, 4));
    }
    if (mode.value === "all") {
      return true;
    }
    if (mode.value === "custom") {
      return item.date >= from.value && item.date <= to.value;
    }
    return item.date.startsWith(store.month);
  }),
);

const sum = computed(() => total(rows.value));
const average = computed(() =>
  rows.value.length ? Math.round(sum.value / rows.value.length) : 0,
);
const largest = computed(
  () => [...rows.value].sort((a, b) => b.amount - a.amount)[0],
);

const initialGlobalNZD = computed(() => store.initialGlobalNZD);
const initialGlobalUSD = computed(() => store.initialGlobalUSD);

const periodBaselineComparison = computed(() =>
  compareSpendWithInitial(sum.value, initialGlobalNZD.value),
);

const allTimeBaselineComparison = computed(() =>
  compareSpendWithInitial(store.allTimeTotal, initialGlobalNZD.value),
);

const budgetMultiplier = computed(() => {
  if (mode.value === "week") return 1;
  if (mode.value === "month") return 4.33;
  if (mode.value === "year") return 52;
  return 1;
});

function exportCsv() {
  const filename =
    mode.value === "week"
      ? `report-week-${store.weekStart}.csv`
      : mode.value === "year"
        ? `report-year-${store.month.slice(0, 4)}.csv`
        : mode.value === "all"
          ? "report-all-time.csv"
          : mode.value === "custom"
            ? `report-${from.value}-to-${to.value}.csv`
            : `report-month-${store.month}.csv`;

  downloadFile(filename, csv(rows.value), "text/csv;charset=utf-8");
}
</script>
