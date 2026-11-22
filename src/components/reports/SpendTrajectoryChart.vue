<template>
  <div class="w-full">
    <div v-if="dataPoints.length > 1" class="grid gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2.5">
        <div class="flex items-center gap-3.5">
          <span class="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <span class="w-2.5 h-2.5 rounded-sm bg-muted inline-block" />
            <span>Daily Spend</span>
          </span>
          <span class="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <span class="w-2.5 h-2.5 rounded-sm bg-accent inline-block" />
            <span>Cumulative Total</span>
          </span>
        </div>

        <div
          v-if="activePoint"
          class="inline-flex items-center gap-1.5 text-xs bg-[var(--surface)] px-2.5 py-1 rounded-lg text-text border border-[var(--border)]"
        >
          <span class="text-muted">{{ activePoint.date }}:</span>
          <strong>{{ store.displayMoney(activePoint.amount) }}</strong>
          <span class="text-muted">
            (Cumulative: {{ store.displayMoney(activePoint.cumulative) }})
          </span>
        </div>
      </div>

      <div class="w-full">
        <svg
          :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
          class="w-full h-auto max-h-56"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="cumAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.25" />
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0" />
            </linearGradient>
          </defs>

          <!-- Horizontal grid lines -->
          <line
            :x1="paddingX"
            :y1="paddingY"
            :x2="svgWidth - paddingX"
            :y2="paddingY"
            stroke="var(--border)"
            stroke-dasharray="3 3"
          />
          <line
            :x1="paddingX"
            :y1="paddingY + chartH / 2"
            :x2="svgWidth - paddingX"
            :y2="paddingY + chartH / 2"
            stroke="var(--border)"
            stroke-dasharray="3 3"
          />
          <line
            :x1="paddingX"
            :y1="paddingY + chartH"
            :x2="svgWidth - paddingX"
            :y2="paddingY + chartH"
            stroke="var(--border)"
          />

          <!-- Daily Spending Bars -->
          <rect
            v-for="(point, idx) in dataPoints"
            :key="point.date"
            :x="getX(idx, dataPoints.length) - Math.min(10, Math.max(3, chartW / (dataPoints.length * 2.5)))"
            :y="getYBar(point.amount)"
            :width="Math.min(20, Math.max(6, chartW / (dataPoints.length * 1.5)))"
            :height="paddingY + chartH - getYBar(point.amount)"
            rx="3"
            :fill="(selectedIndex ?? hoveredIndex) === idx ? 'var(--accent)' : 'var(--muted-colour)'"
            :opacity="(selectedIndex ?? hoveredIndex) === idx ? 1 : 0.65"
            class="cursor-pointer transition-colors duration-200"
            @mouseenter="hoveredIndex = idx"
            @mouseleave="hoveredIndex = null"
            @click="togglePoint(idx)"
          />

          <!-- Cumulative Area & Line -->
          <path :d="areaPath" fill="url(#cumAreaGrad)" />
          <path
            :d="linePath"
            fill="none"
            stroke="var(--accent)"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Cumulative Data Points -->
          <circle
            v-for="(point, idx) in dataPoints"
            :key="'pt-' + point.date"
            :cx="getX(idx, dataPoints.length)"
            :cy="getYLine(point.cumulative)"
            :r="(selectedIndex ?? hoveredIndex) === idx ? 6 : 4"
            :fill="(selectedIndex ?? hoveredIndex) === idx ? 'var(--accent)' : 'var(--bg)'"
            :stroke="(selectedIndex ?? hoveredIndex) === idx ? 'var(--bg)' : 'var(--accent)'"
            :stroke-width="(selectedIndex ?? hoveredIndex) === idx ? 3 : 2"
            class="cursor-pointer transition-all duration-200"
            @mouseenter="hoveredIndex = idx"
            @mouseleave="hoveredIndex = null"
            @click="togglePoint(idx)"
          />
        </svg>
      </div>

      <!-- Date Labels -->
      <div class="flex justify-between text-[11px] text-muted px-2.5">
        <span>{{ dataPoints[0]?.date }}</span>
        <span>{{ dataPoints[Math.floor(dataPoints.length / 2)]?.date }}</span>
        <span>{{ dataPoints[dataPoints.length - 1]?.date }}</span>
      </div>
    </div>

    <div v-else class="p-6 text-center">
      <p class="text-xs text-muted m-0">
        Need at least two transaction dates to display the spending trajectory.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useExpenses } from "@/stores/expenses";
import type { Expense } from "@/lib/types";

const props = defineProps<{
  expenses: Expense[];
  periodLabel?: string;
}>();

const store = useExpenses();
const hoveredIndex = shallowRef<number | null>(null);
const selectedIndex = shallowRef<number | null>(null);

function togglePoint(idx: number) {
  selectedIndex.value = selectedIndex.value === idx ? null : idx;
}

const dataPoints = computed(() => {
  if (!props.expenses.length) return [];
  const map = new Map<string, number>();

  for (const exp of props.expenses) {
    if (exp.currency !== "NZD") continue;
    map.set(exp.date, (map.get(exp.date) ?? 0) + exp.amount);
  }

  const sortedDates = [...map.keys()].sort();
  if (sortedDates.length === 0) return [];

  let cumulative = 0;
  return sortedDates.map((date, idx) => {
    const amount = map.get(date) ?? 0;
    cumulative += amount;
    const label = date.slice(5);
    return {
      index: idx,
      date,
      label,
      amount,
      cumulative,
    };
  });
});

const maxDaily = computed(() =>
  Math.max(1, ...dataPoints.value.map((d) => d.amount)),
);

const maxCumulative = computed(() =>
  dataPoints.value.length
    ? dataPoints.value[dataPoints.value.length - 1].cumulative
    : 1,
);

const svgWidth = 600;
const svgHeight = 220;
const paddingX = 40;
const paddingY = 30;
const chartW = svgWidth - paddingX * 2;
const chartH = svgHeight - paddingY * 2;

function getX(index: number, totalPoints: number): number {
  if (totalPoints <= 1) return paddingX + chartW / 2;
  return paddingX + (index / (totalPoints - 1)) * chartW;
}

function getYBar(amount: number): number {
  const h = (amount / maxDaily.value) * (chartH * 0.55);
  return paddingY + chartH - h;
}

function getYLine(cum: number): number {
  const norm = (cum / maxCumulative.value) * (chartH * 0.85);
  return paddingY + chartH - norm;
}

const linePath = computed(() => {
  const pts = dataPoints.value;
  if (!pts.length) return "";
  return pts
    .map((p, i) => {
      const x = getX(i, pts.length);
      const y = getYLine(p.cumulative);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
});

const areaPath = computed(() => {
  const pts = dataPoints.value;
  if (!pts.length) return "";
  const firstX = getX(0, pts.length);
  const lastX = getX(pts.length - 1, pts.length);
  const baselineY = paddingY + chartH;
  return `${linePath.value} L ${lastX.toFixed(1)} ${baselineY} L ${firstX.toFixed(1)} ${baselineY} Z`;
});

const activePoint = computed(() => {
  const idx = hoveredIndex.value ?? selectedIndex.value;
  if (idx !== null && dataPoints.value[idx]) {
    return dataPoints.value[idx];
  }
  return dataPoints.value[dataPoints.value.length - 1] ?? null;
});
</script>
