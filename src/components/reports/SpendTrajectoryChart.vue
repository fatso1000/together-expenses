<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useExpenses } from "@/stores/expenses";
import { total } from "@/lib/finance";
import type { Expense } from "@/lib/types";

const props = defineProps<{
  expenses: Expense[];
  periodLabel?: string;
}>();

const store = useExpenses();
const hoveredIndex = shallowRef<number | null>(null);

// Group expenses by date sorted chronologically
const dataPoints = computed(() => {
  if (!props.expenses.length) return [];
  const map = new Map<string, number>();

  // Collect all unique dates in the dataset
  for (const exp of props.expenses) {
    if (exp.currency !== "NZD") continue;
    map.set(exp.date, (map.get(exp.date) ?? 0) + exp.amount);
  }

  const sortedDates = [...map.keys()].sort();
  if (sortedDates.length === 0) return [];

  // Generate sequence of dates from earliest to latest (or padded up to 31 points)
  let cumulative = 0;
  return sortedDates.map((date, idx) => {
    const amount = map.get(date) ?? 0;
    cumulative += amount;
    const label = date.slice(5); // MM-DD
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

// SVG dimensions
const svgWidth = 600;
const svgHeight = 220;
const paddingX = 40;
const paddingY = 30;
const chartW = svgWidth - paddingX * 2;
const chartH = svgHeight - paddingY * 2;

// Coordinate helpers
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

// Generate SVG path for cumulative curve
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

// Generate area fill path
const areaPath = computed(() => {
  const pts = dataPoints.value;
  if (!pts.length) return "";
  const firstX = getX(0, pts.length);
  const lastX = getX(pts.length - 1, pts.length);
  const baselineY = paddingY + chartH;
  return `${linePath.value} L ${lastX.toFixed(1)} ${baselineY} L ${firstX.toFixed(1)} ${baselineY} Z`;
});

const activePoint = computed(() => {
  if (hoveredIndex.value !== null && dataPoints.value[hoveredIndex.value]) {
    return dataPoints.value[hoveredIndex.value];
  }
  return dataPoints.value[dataPoints.value.length - 1] ?? null;
});
</script>

<template>
  <div class="trajectory-chart-wrap">
    <div v-if="dataPoints.length > 1" class="trajectory-card">
      <div class="chart-header-row">
        <div class="chart-legend-row">
          <span class="legend-chip bar-chip">
            <span class="color-box bar-color" /> Daily Spend
          </span>
          <span class="legend-chip line-chip">
            <span class="color-box line-color" /> Cumulative Total
          </span>
        </div>

        <div v-if="activePoint" class="active-stat-box">
          <span class="small muted">{{ activePoint.date }}:</span>
          <strong>{{ store.displayMoney(activePoint.amount) }}</strong>
          <span class="small muted">
            (Cumulative: {{ store.displayMoney(activePoint.cumulative) }})
          </span>
        </div>
      </div>

      <div class="svg-container">
        <svg
          :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
          class="trajectory-svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cumAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#153d35" stop-opacity="0.22" />
              <stop offset="100%" stop-color="#153d35" stop-opacity="0.0" />
            </linearGradient>
          </defs>

          <!-- Horizontal grid lines -->
          <line
            :x1="paddingX"
            :y1="paddingY"
            :x2="svgWidth - paddingX"
            :y2="paddingY"
            stroke="#e4eae7"
            stroke-dasharray="3 3"
          />
          <line
            :x1="paddingX"
            :y1="paddingY + chartH / 2"
            :x2="svgWidth - paddingX"
            :y2="paddingY + chartH / 2"
            stroke="#e4eae7"
            stroke-dasharray="3 3"
          />
          <line
            :x1="paddingX"
            :y1="paddingY + chartH"
            :x2="svgWidth - paddingX"
            :y2="paddingY + chartH"
            stroke="#cbd6d0"
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
            class="daily-bar"
            :class="{ active: hoveredIndex === idx }"
            @mouseenter="hoveredIndex = idx"
            @mouseleave="hoveredIndex = null"
          />

          <!-- Cumulative Area & Line -->
          <path :d="areaPath" fill="url(#cumAreaGrad)" />
          <path
            :d="linePath"
            fill="none"
            stroke="#153d35"
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
            r="4"
            fill="#fff"
            stroke="#153d35"
            stroke-width="2"
            class="cum-point"
            :class="{ active: hoveredIndex === idx }"
            @mouseenter="hoveredIndex = idx"
            @mouseleave="hoveredIndex = null"
          />
        </svg>
      </div>

      <!-- Date Labels -->
      <div class="x-axis-labels">
        <span>{{ dataPoints[0]?.date }}</span>
        <span>{{ dataPoints[Math.floor(dataPoints.length / 2)]?.date }}</span>
        <span>{{ dataPoints[dataPoints.length - 1]?.date }}</span>
      </div>
    </div>

    <div v-else class="empty-trajectory">
      <p class="muted small">
        Need at least two transaction dates to display the spending trajectory.
      </p>
    </div>
  </div>
</template>

<style scoped>
.trajectory-chart-wrap {
  width: 100%;
}

.trajectory-card {
  display: grid;
  gap: 12px;
}

.chart-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.chart-legend-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #556c62;
  font-weight: 550;
}

.color-box {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.bar-color {
  background: #9abfb2;
}

.line-color {
  background: #153d35;
}

.active-stat-box {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  background: #f0f5f2;
  padding: 4px 10px;
  border-radius: 8px;
  color: #153d35;
}

.svg-container {
  width: 100%;
  height: 190px;
}

.trajectory-svg {
  width: 100%;
  height: 100%;
}

.daily-bar {
  fill: #b4d2c7;
  cursor: pointer;
  transition: fill 0.2s ease;
}

.daily-bar:hover,
.daily-bar.active {
  fill: #619a87;
}

.cum-point {
  cursor: pointer;
  transition: r 0.2s ease, stroke-width 0.2s ease;
}

.cum-point:hover,
.cum-point.active {
  r: 6;
  fill: #c9ef88;
  stroke: #153d35;
  stroke-width: 3;
}

.x-axis-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #70847b;
  padding: 0 10px;
}

.empty-trajectory {
  padding: 24px;
  text-align: center;
}
</style>
