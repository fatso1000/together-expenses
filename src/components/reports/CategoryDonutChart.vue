<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useExpenses } from "@/stores/expenses";
import { categoryTotals } from "@/lib/finance";
import type { Expense } from "@/lib/types";

const props = defineProps<{
  expenses: Expense[];
  currency?: string;
}>();

const store = useExpenses();
const hoveredCategory = shallowRef<string | null>(null);

const rows = computed(() => categoryTotals(props.expenses));
const sum = computed(() => rows.value.reduce((acc, r) => acc + r.amount, 0));

// Resolve color for each category from category definitions
function categoryColor(catName: string): string {
  const def = store.categoryDefinitions.find(
    (c) => c.name.toLowerCase() === catName.toLowerCase(),
  );
  return def?.color ?? "#718469";
}

// Compute SVG circle segments for the donut chart
// Circumference = 2 * PI * r. With r = 70, C ≈ 439.82297
const radius = 70;
const circumference = 2 * Math.PI * radius;

const slices = computed(() => {
  let accumulatedPercent = 0;
  return rows.value.map((row) => {
    const strokeDasharray = `${(row.percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += row.percent;
    return {
      category: row.category,
      amount: row.amount,
      percent: row.percent,
      color: categoryColor(row.category),
      strokeDasharray,
      strokeDashoffset,
    };
  });
});

const activeCategory = computed(() => {
  if (hoveredCategory.value) {
    const found = rows.value.find((r) => r.category === hoveredCategory.value);
    if (found) return found;
  }
  return rows.value[0] ?? null;
});
</script>

<template>
  <div class="donut-chart-wrapper">
    <div v-if="rows.length" class="donut-visual-container">
      <div class="svg-donut-box">
        <svg
          viewBox="0 0 200 200"
          class="donut-svg"
          aria-hidden="true"
        >
          <!-- Background track -->
          <circle
            cx="100"
            cy="100"
            :r="radius"
            fill="transparent"
            stroke="#eef2f0"
            stroke-width="26"
          />

          <!-- Colored Segments -->
          <circle
            v-for="slice in slices"
            :key="slice.category"
            cx="100"
            cy="100"
            :r="radius"
            fill="transparent"
            :stroke="slice.color"
            stroke-width="26"
            :stroke-dasharray="slice.strokeDasharray"
            :stroke-dashoffset="slice.strokeDashoffset"
            class="donut-segment"
            :class="{ active: hoveredCategory === slice.category }"
            transform="rotate(-90 100 100)"
            @mouseenter="hoveredCategory = slice.category"
            @mouseleave="hoveredCategory = null"
          />
        </svg>

        <!-- Center Information Display -->
        <div class="donut-center-info">
          <span class="center-title">
            {{ activeCategory ? activeCategory.category : "Total" }}
          </span>
          <strong class="center-amount">
            {{ store.displayMoney(activeCategory ? activeCategory.amount : sum) }}
          </strong>
          <span class="center-percent">
            {{ activeCategory ? `${Math.round(activeCategory.percent)}% of total` : "" }}
          </span>
        </div>
      </div>

      <!-- Ranked Legend List -->
      <div class="donut-legend-grid">
        <div
          v-for="row in rows"
          :key="row.category"
          class="legend-item"
          :class="{ highlighted: hoveredCategory === row.category }"
          @mouseenter="hoveredCategory = row.category"
          @mouseleave="hoveredCategory = null"
        >
          <div class="legend-color-dot" :style="{ background: categoryColor(row.category) }" />
          <div class="legend-text">
            <div class="legend-header">
              <span class="legend-name">{{ row.category }}</span>
              <span class="legend-percent">{{ Math.round(row.percent) }}%</span>
            </div>
            <span class="legend-amount">{{ store.displayMoney(row.amount) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-chart">
      <p class="muted">No expenses recorded for this period.</p>
    </div>
  </div>
</template>

<style scoped>
.donut-chart-wrapper {
  width: 100%;
}

.donut-visual-container {
  display: grid;
  grid-template-columns: minmax(220px, 280px) 1fr;
  align-items: center;
  gap: 28px;
}

@media (max-width: 640px) {
  .donut-visual-container {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 16px;
  }
}

.svg-donut-box {
  position: relative;
  width: 100%;
  max-width: 240px;
  aspect-ratio: 1;
}

.donut-svg {
  width: 100%;
  height: 100%;
  transform: rotate(0deg);
}

.donut-segment {
  cursor: pointer;
  transition: stroke-width 0.2s ease, opacity 0.2s ease;
}

.donut-segment:hover,
.donut-segment.active {
  stroke-width: 32;
  opacity: 1;
}

.donut-center-info {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
  padding: 10px;
}

.center-title {
  font-size: 12px;
  font-weight: 600;
  color: #63776d;
  max-width: 110px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.center-amount {
  font-size: 19px;
  font-weight: 800;
  color: #153d35;
  font-variant-numeric: tabular-nums;
  margin: 1px 0;
}

.center-percent {
  font-size: 11px;
  color: #72847b;
}

.donut-legend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
  width: 100%;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f8faf9;
  border: 1px solid #e5ebe7;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.legend-item:hover,
.legend-item.highlighted {
  background: #edf5ee;
  border-color: #bad3c3;
  transform: translateY(-1px);
}

.legend-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-text {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 1px;
}

.legend-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
}

.legend-name {
  font-size: 13px;
  font-weight: 600;
  color: #153d35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend-percent {
  font-size: 11px;
  font-weight: 700;
  color: #556c62;
}

.legend-amount {
  font-size: 12px;
  color: #63776d;
  font-variant-numeric: tabular-nums;
}

.empty-chart {
  padding: 30px;
  text-align: center;
}
</style>
