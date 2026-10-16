<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { Download } from "lucide-vue-next";
import { useExpenses } from "@/stores/expenses";
import { total, money, csv, downloadFile } from "@/lib/finance";
import CategoryBreakdown from "@/components/CategoryBreakdown.vue";
const store = useExpenses();
const mode = shallowRef("month");
const from = shallowRef(`${store.month}-01`);
const to = shallowRef(new Date().toLocaleDateString("en-CA"));
const rows = computed(() =>
  store.currencyExpenses.filter((item) => {
    if (mode.value === "year")
      return item.date.startsWith(store.month.slice(0, 4));
    if (mode.value === "custom")
      return item.date >= from.value && item.date <= to.value;
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
  downloadFile("report.csv", csv(rows.value), "text/csv;charset=utf-8");
}
</script>
<template>
  <section class="panel report-filters">
    <div class="segmented" aria-label="Report period">
      <button
        v-for="period in ['month', 'year', 'custom']"
        :key="period"
        :class="{ selected: mode === period }"
        @click="mode = period"
      >
        {{
          period === "month"
            ? "Monthly"
            : period === "year"
              ? "Yearly"
              : "Custom dates"
        }}
      </button>
    </div>
    <div v-if="mode === 'custom'" class="form-pair">
      <label>From<input type="date" v-model="from" /></label
      ><label>To<input type="date" v-model="to" :min="from" /></label>
    </div>
    <button class="secondary" @click="exportCsv">
      <Download :size="16" />Export report
    </button>
  </section>
  <div class="report-stats">
    <article class="panel">
      <span class="muted">Total spending</span
      ><strong>{{ store.displayMoney(sum) }}</strong
      ><small>{{ rows.length }} recorded expenses</small>
    </article>
    <article class="panel">
      <span class="muted">Average expense</span
      ><strong>{{ store.displayMoney(average) }}</strong
      ><small>Per transaction</small>
    </article>
    <article class="panel">
      <span class="muted">Largest expense</span
      ><strong>{{ store.displayMoney(largest?.amount ?? 0) }}</strong
      ><small>{{ largest?.merchant ?? "No expenses in this period" }}</small>
    </article>
  </div>
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
        <span>{{ item.label }}</span
        ><span class="sr-only">{{ store.displayMoney(item.amount) }}</span>
      </div>
    </div>
  </section>
  <section class="panel">
    <div class="section-heading">
      <div>
        <h2>Spending by category</h2>
        <p>
          {{
            mode === "custom"
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
