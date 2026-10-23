<script setup lang="ts">
import { computed, shallowRef } from "vue";
import {
  Download,
  Calendar,
  Target,
  Wallet,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  PieChart,
  LineChart,
  Layers,
  ArrowRightLeft,
} from "lucide-vue-next";
import { useExpenses } from "@/stores/expenses";
import { total, money, csv, downloadFile, compareSpendWithInitial } from "@/lib/finance";
import CategoryDonutChart from "@/components/reports/CategoryDonutChart.vue";
import SpendTrajectoryChart from "@/components/reports/SpendTrajectoryChart.vue";
import BudgetVarianceChart from "@/components/reports/BudgetVarianceChart.vue";
import AccountCashflowChart from "@/components/reports/AccountCashflowChart.vue";

const store = useExpenses();
const mode = shallowRef<"week" | "month" | "year" | "all" | "custom">("month");
const from = shallowRef(`${store.month}-01`);
const to = shallowRef(new Date().toLocaleDateString("en-CA"));

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

// Initial Global Baseline comparison for this specific period
const initialGlobalNZD = computed(() => store.initialGlobalNZD);
const initialGlobalUSD = computed(() => store.initialGlobalUSD);

const periodBaselineComparison = computed(() =>
  compareSpendWithInitial(sum.value, initialGlobalNZD.value),
);

const allTimeBaselineComparison = computed(() =>
  compareSpendWithInitial(store.allTimeTotal, initialGlobalNZD.value),
);

// Daily spending for the current week (7 days: Monday to Sunday)
const weekDays = computed(() => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const start = new Date(`${store.weekStart}T12:00:00`);

  return days.map((label, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
    const amount = total(rows.value.filter((item) => item.date === dateStr));

    return {
      label,
      date: dateStr,
      amount,
    };
  });
});

const maxWeekDay = computed(() =>
  Math.max(1, ...weekDays.value.map((d) => d.amount)),
);

const limitProgress = computed(() =>
  store.weeklyLimit ? Math.round((sum.value / store.weeklyLimit) * 100) : 0,
);

// Monthly spending for the year
const monthly = computed(() =>
  Array.from({ length: 12 }, (_, index) => {
    const month = `${store.month.slice(0, 4)}-${String(index + 1).padStart(2, "0")}`;
    return {
      label: new Date(`${month}-01T12:00:00`).toLocaleDateString("en", {
        month: "short",
      }),
      amount: total(rows.value.filter((item) => item.date.startsWith(month))),
    };
  }),
);

const max = computed(() =>
  Math.max(1, ...monthly.value.map((item) => item.amount)),
);

// Multiplier for category budgets in this view
const budgetMultiplier = computed(() => {
  if (mode.value === "week") return 1;
  if (mode.value === "month") return 4.33; // 52 / 12
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

<template>
  <section class="panel report-filters" aria-label="Report timeframe controls">
    <div class="segmented" aria-label="Report period">
      <button
        v-for="period in ['week', 'month', 'year', 'all', 'custom'] as const"
        :key="period"
        :class="{ selected: mode === period }"
        @click="mode = period"
      >
        {{
          period === "week"
            ? "Weekly"
            : period === "month"
              ? "Monthly"
              : period === "year"
                ? "Yearly"
                : period === "all"
                  ? "All Time"
                  : "Custom dates"
        }}
      </button>
    </div>

    <!-- Week Selector Note -->
    <div v-if="mode === 'week'" class="week-filter-details">
      <label class="week-input-label">
        <Calendar :size="15" />
        <span>Week containing:</span>
        <input v-model="store.weekDate" type="date" required />
      </label>
      <span class="small muted">
        {{ store.weekStart }} to {{ store.weekEnd }} (Monday–Sunday)
      </span>
    </div>

    <div v-if="mode === 'custom'" class="form-pair">
      <label>From<input v-model="from" type="date" /></label>
      <label>To<input v-model="to" type="date" :min="from" /></label>
    </div>

    <button class="secondary export-btn" @click="exportCsv">
      <Download :size="16" />Export report
    </button>
  </section>

  <!-- Initial Global Money Baseline Analysis Hub -->
  <section v-if="initialGlobalNZD > 0" class="panel baseline-hub-panel">
    <div class="section-heading">
      <div class="heading-with-icon">
        <Wallet :size="20" class="hub-icon" />
        <div>
          <h2>Initial Global Capital Comparison</h2>
          <p class="small muted">
            Starting money: {{ store.displayMoney(initialGlobalNZD) }}
            <template v-if="initialGlobalUSD">
              (${{ (initialGlobalUSD / 100).toFixed(2) }} USD)
            </template>
          </p>
        </div>
      </div>
    </div>

    <div class="baseline-comparison-grid">
      <!-- Period Spend vs Initial Capital -->
      <article
        class="comparison-card"
        :class="{ 'card-over': periodBaselineComparison.isOverInitial, 'card-under': !periodBaselineComparison.isOverInitial }"
      >
        <div class="comp-header">
          <span class="small font-medium">Selected Period vs Initial Funds</span>
          <span class="comp-badge">
            {{ Math.round(periodBaselineComparison.spentPercent) }}% of starting money
          </span>
        </div>
        <div class="comp-body">
          <strong class="comp-number">{{ store.displayMoney(sum) }} spent</strong>
          <p class="small">
            <template v-if="!periodBaselineComparison.isOverInitial">
              Spent less than starting funds · {{ store.displayMoney(periodBaselineComparison.remaining) }} remaining runway
            </template>
            <template v-else>
              Exceeded starting funds by {{ store.displayMoney(periodBaselineComparison.difference) }}
            </template>
          </p>
        </div>
      </article>

      <!-- All-Time Spend vs Initial Capital -->
      <article
        class="comparison-card"
        :class="{ 'card-over': allTimeBaselineComparison.isOverInitial, 'card-under': !allTimeBaselineComparison.isOverInitial }"
      >
        <div class="comp-header">
          <span class="small font-medium">All-Time Spend vs Initial Funds</span>
          <span class="comp-badge">
            {{ Math.round(allTimeBaselineComparison.spentPercent) }}% all-time
          </span>
        </div>
        <div class="comp-body">
          <strong class="comp-number">{{ store.displayMoney(store.allTimeTotal) }} spent</strong>
          <p class="small">
            <template v-if="!allTimeBaselineComparison.isOverInitial">
              Total spent is LESS than initial global money ({{ store.displayMoney(allTimeBaselineComparison.remaining) }} balance)
            </template>
            <template v-else>
              Total spent is MORE than initial global money (+{{ store.displayMoney(allTimeBaselineComparison.difference) }})
            </template>
          </p>
        </div>
      </article>
    </div>
  </section>

  <!-- Executive Summary Stats -->
  <div class="report-stats">
    <article class="panel">
      <span class="muted">Total spending</span>
      <strong>{{ store.displayMoney(sum) }}</strong>
      <small>{{ rows.length }} recorded expenses</small>
    </article>
    <article class="panel">
      <span class="muted">Average expense</span>
      <strong>{{ store.displayMoney(average) }}</strong>
      <small>Per transaction</small>
    </article>
    <article class="panel">
      <span class="muted">Largest expense</span>
      <strong>{{ store.displayMoney(largest?.amount ?? 0) }}</strong>
      <small>{{ largest?.merchant ?? "No expenses in this period" }}</small>
    </article>
  </div>

  <!-- Chart 1: Spending Trajectory & Cumulative Line -->
  <section class="panel">
    <div class="section-heading">
      <div class="heading-with-icon">
        <LineChart :size="18" />
        <div>
          <h2>Spending Progression & Trajectory</h2>
          <p class="small muted">Daily transaction amounts and cumulative spending trend</p>
        </div>
      </div>
    </div>
    <SpendTrajectoryChart :expenses="rows" />
  </section>

  <!-- Chart 2: Interactive Donut Category Breakdown -->
  <section class="panel">
    <div class="section-heading">
      <div class="heading-with-icon">
        <PieChart :size="18" />
        <div>
          <h2>Category Distribution</h2>
          <p class="small muted">Proportionate breakdown across expense buckets</p>
        </div>
      </div>
    </div>
    <CategoryDonutChart :expenses="rows" :currency="store.currency" />
  </section>

  <!-- Chart 3: Structured Budget Variance Analysis -->
  <section v-if="store.categoryLimits.length" class="panel">
    <div class="section-heading">
      <div class="heading-with-icon">
        <Layers :size="18" />
        <div>
          <h2>Budget vs. Actual Variance</h2>
          <p class="small muted">Comparing allocated category limits against actual spend</p>
        </div>
      </div>
    </div>
    <BudgetVarianceChart
      :expenses="rows"
      :multiplier="budgetMultiplier"
      :period-title="mode"
    />
  </section>

  <!-- Chart 4: Dual Account Cashflow & Net Position -->
  <section class="panel">
    <div class="section-heading">
      <div class="heading-with-icon">
        <ArrowRightLeft :size="18" />
        <div>
          <h2>Account Cashflow & Net Position</h2>
          <p class="small muted">Global Account everyday outflows vs NZ Account salary savings</p>
        </div>
      </div>
    </div>
    <AccountCashflowChart :expenses="rows" />
  </section>
</template>

<style scoped>
.week-filter-details {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: #f0f5f2;
  border-radius: 10px;
}

.week-input-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  margin: 0;
}

.week-input-label input {
  width: auto;
  min-height: 36px;
  padding: 4px 8px;
}

.limit-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #edf5ee;
  border: 1px solid #b7ccbf;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #21533b;
}

.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.heading-with-icon {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hub-icon {
  color: #153d35;
}

.baseline-hub-panel {
  display: grid;
  gap: 14px;
  background: #f5f9f7;
  border: 1px solid #d2e4db;
}

.baseline-comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.comparison-card {
  padding: 14px 16px;
  border-radius: 14px;
  display: grid;
  gap: 8px;
}

.comparison-card.card-under {
  background: #edf7f0;
  border: 1px solid #bce1ca;
  color: #174d31;
}

.comparison-card.card-over {
  background: #fdf3f1;
  border: 1px solid #f6c8c1;
  color: #8c2a1c;
}

.comp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.comp-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.06);
}

.comp-number {
  font-size: 20px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  display: block;
}

.comp-body p {
  margin: 2px 0 0;
}

@media (max-width: 480px) {
  .report-filters .segmented {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
    scrollbar-width: none;
  }
  .report-filters .segmented::-webkit-scrollbar {
    display: none;
  }
  .report-filters .segmented button {
    font-size: 11.5px;
    padding: 6px 10px;
    white-space: nowrap;
    flex: 0 0 auto;
  }
  .baseline-comparison-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
