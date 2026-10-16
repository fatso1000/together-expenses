<script setup lang="ts">
import { computed } from "vue";
import { useExpenses } from "@/stores/expenses";
import { total } from "@/lib/finance";
import type { Expense } from "@/lib/types";
import CategoryIcon from "@/components/CategoryIcon.vue";

const props = defineProps<{
  expenses: Expense[];
  multiplier?: number; // e.g. 1 for week, 4.33 for month, 52 for year
  periodTitle?: string;
}>();

const store = useExpenses();

const varianceRows = computed(() => {
  const mult = props.multiplier ?? 1;
  const limits = store.categoryLimits;
  if (!limits.length) return [];

  return limits.map((lim) => {
    const allocated = Math.round(lim.amount * mult);
    const spent = total(
      props.expenses.filter(
        (e) =>
          e.currency === "NZD" &&
          e.category.toLowerCase() === lim.category.toLowerCase(),
      ),
    );
    const diff = allocated - spent;
    const isOver = spent > allocated;
    const percent = allocated > 0 ? (spent / allocated) * 100 : 0;

    return {
      category: lim.category,
      allocated,
      spent,
      diff: Math.abs(diff),
      isOver,
      percent: Math.min(100, percent),
      rawPercent: percent,
    };
  });
});
</script>

<template>
  <div class="variance-chart-wrap">
    <div v-if="varianceRows.length" class="variance-list">
      <div
        v-for="row in varianceRows"
        :key="row.category"
        class="variance-row"
        :class="{ 'is-over': row.isOver }"
      >
        <div class="row-header">
          <div class="category-info">
            <CategoryIcon :category="row.category" />
            <strong>{{ row.category }}</strong>
          </div>
          <div class="variance-badge" :class="{ 'badge-over': row.isOver, 'badge-under': !row.isOver }">
            {{
              row.isOver
                ? `+${store.displayMoney(row.diff)} over limit`
                : `${store.displayMoney(row.diff)} remaining`
            }}
          </div>
        </div>

        <!-- Dual Bar Comparison -->
        <div class="variance-bar-track">
          <div
            class="variance-bar-fill"
            :class="{ 'bar-over': row.isOver, 'bar-under': !row.isOver }"
            :style="{ width: `${row.percent}%` }"
          />
        </div>

        <div class="variance-amounts-row">
          <span class="small muted">
            Spent: <strong>{{ store.displayMoney(row.spent) }}</strong>
          </span>
          <span class="small muted">
            Budget allowance: <strong>{{ store.displayMoney(row.allocated) }}</strong>
          </span>
        </div>
      </div>
    </div>

    <div v-else class="empty-variance">
      <p class="muted small">
        Configure category limits in the <strong>Weekly Spending Limit</strong> card or Settings to view budget vs. actual variance analysis.
      </p>
    </div>
  </div>
</template>

<style scoped>
.variance-chart-wrap {
  width: 100%;
}

.variance-list {
  display: grid;
  gap: 12px;
}

.variance-row {
  padding: 12px 14px;
  background: #f8faf9;
  border: 1px solid #e1e8e4;
  border-radius: 12px;
  display: grid;
  gap: 8px;
}

.variance-row.is-over {
  background: #fdf5f4;
  border-color: #f7c3bc;
}

.row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #153d35;
}

.variance-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 10px;
}

.badge-under {
  background: #e3f2e8;
  color: #1a5637;
}

.badge-over {
  background: #fce4e0;
  color: #9c2e20;
}

.variance-bar-track {
  width: 100%;
  height: 10px;
  background: #e0eae4;
  border-radius: 6px;
  overflow: hidden;
}

.variance-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.variance-bar-fill.bar-under {
  background: #27ae60;
}

.variance-bar-fill.bar-over {
  background: #e74c3c;
}

.variance-amounts-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.empty-variance {
  padding: 24px;
  text-align: center;
}
</style>
