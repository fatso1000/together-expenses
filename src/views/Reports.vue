<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { Download, Calendar, Target } from "lucide-vue-next";
import { useExpenses } from "@/stores/expenses";
import { total, money, csv, downloadFile } from "@/lib/finance";
import CategoryBreakdown from "@/components/CategoryBreakdown.vue";

const store = useExpenses();
const mode = shallowRef<"week" | "month" | "year" | "custom">("month");
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

function exportCsv() {
  const filename =
    mode.value === "week"
      ? `report-week-${store.weekStart}.csv`
      : mode.value === "year"
        ? `report-year-${store.month.slice(0, 4)}.csv`
        : mode.value === "custom"
          ? `report-${from.value}-to-${to.value}.csv`
          : `report-month-${store.month}.csv`;

  downloadFile(filename, csv(rows.value), "text/csv;charset=utf-8");
}
</script>

<template>
  <section class="panel report-filters">
    <div class="segmented" aria-label="Report period">
      <button
        v-for="period in ['week', 'month', 'year', 'custom'] as const"
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

  <!-- Weekly spending breakdown chart -->
  <section v-if="mode === 'week'" class="panel">
    <div class="section-heading">
      <div>
        <h2>Weekly spending by day</h2>
        <p>{{ store.weekStart }} to {{ store.weekEnd }} · {{ store.currency }}</p>
      </div>
      <div v-if="store.weeklyLimit" class="limit-status-chip">
        <Target :size="14" />
        <span>{{ limitProgress }}% of limit</span>
      </div>
    </div>

    <div class="week-chart">
      <div v-for="day in weekDays" :key="day.date" class="week-bar-col">
        <span class="week-bar-value">{{ store.displayMoney(day.amount) }}</span>
        <div class="week-bar-space">
          <div
            class="week-bar-fill"
            :style="{ height: `${Math.max(day.amount ? 4 : 0, (day.amount / maxWeekDay) * 100)}%` }"
            :title="`${day.label} (${day.date}): ${store.displayMoney(day.amount)}`"
          />
        </div>
        <span class="week-bar-label">{{ day.label }}</span>
      </div>
    </div>
  </section>

  <!-- Yearly view chart -->
  <section v-if="mode === 'year'" class="panel">
    <div class="section-heading">
      <div>
        <h2>Your year in view</h2>
        <p>{{ store.month.slice(0, 4) }} · {{ store.currency }}</p>
      </div>
    </div>
    <div class="year-chart">
      <div v-for="item in monthly" :key="item.label">
        <div class="year-bar-space">
          <div
            :style="{ height: `${(item.amount / max) * 100}%` }"
            :title="store.displayMoney(item.amount)"
          />
        </div>
        <span>{{ item.label }}</span>
        <span class="sr-only">{{ store.displayMoney(item.amount) }}</span>
      </div>
    </div>
  </section>

  <!-- Category breakdown -->
  <section class="panel">
    <div class="section-heading">
      <div>
        <h2>Spending by category</h2>
        <p>
          {{
            mode === "week"
              ? `${store.weekStart} to ${store.weekEnd}`
              : mode === "custom"
                ? `${from} to ${to}`
                : mode === "year"
                  ? store.month.slice(0, 4)
                  : store.month
          }}
        </p>
      </div>
    </div>
    <CategoryBreakdown :expenses="rows" :currency="store.currency" />
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

.week-chart {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  height: 180px;
  align-items: end;
  padding: 18px 0 6px;
}

.week-bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  gap: 6px;
}

.week-bar-value {
  font-size: 10px;
  font-weight: 600;
  color: #556c62;
  white-space: nowrap;
}

.week-bar-space {
  flex: 1;
  width: 100%;
  max-width: 38px;
  background: #edf2ee;
  border-radius: 8px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.week-bar-fill {
  width: 100%;
  background: #153d35;
  border-radius: 8px 8px 0 0;
  transition: height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.week-bar-label {
  font-size: 11px;
  font-weight: 600;
  color: #3b5046;
}

.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
