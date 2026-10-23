<script setup lang="ts">
import { computed, shallowRef, ref } from "vue";
import {
  Target,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Layers,
  Banknote,
  Plus,
  Receipt,
  PiggyBank,
  X,
} from "lucide-vue-next";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { parseMoney, parseOptionalMoney, today } from "@/lib/finance";
import type { CategoryLimit } from "@/lib/types";
import CategoryIcon from "@/components/CategoryIcon.vue";

const store = useExpenses();
const editing = shallowRef(false);
const editMode = shallowRef<"structured" | "quick">("structured");
const amount = shallowRef("");
const salaryAmount = shallowRef("");
const error = shallowRef("");
const busy = shallowRef(false);

// Local state for structured category limits editing
const localCategoryLimits = ref<CategoryLimit[]>([]);

const progress = computed(() =>
  store.weeklyLimit
    ? Math.round((store.weekTotal / store.weeklyLimit) * 100)
    : 0,
);

const status = computed<"under" | "near" | "over">(() => {
  if (progress.value >= 100) return "over";
  if (progress.value >= 80) return "near";
  return "under";
});

// Calculate remaining budget and days left in the week
const diff = computed(() =>
  Math.abs((store.weeklyLimit || 0) - store.weekTotal),
);

const daysRemaining = computed(() => {
  const now = new Date(`${today()}T12:00:00`).getTime();
  const end = new Date(`${store.weekEnd}T12:00:00`).getTime();
  const diffDays = Math.round((end - now) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.min(7, diffDays));
});

const dailyAllowance = computed(() => {
  if (!store.weeklyLimit) return 0;
  if (store.weekTotal >= store.weeklyLimit) return 0;
  return Math.round(diff.value / daysRemaining.value);
});

// Salary vs Limit Analysis
const weeklySalary = computed(() => store.salary.weeklyAverageNZD ?? 0);
const targetSavings = computed(() =>
  weeklySalary.value > store.weeklyLimit
    ? weeklySalary.value - store.weeklyLimit
    : 0,
);
const projectedSavings = computed(() =>
  weeklySalary.value > store.weekTotal
    ? weeklySalary.value - store.weekTotal
    : 0,
);
const savingsRate = computed(() =>
  weeklySalary.value > 0
    ? Math.round((targetSavings.value / weeklySalary.value) * 100)
    : 0,
);

// Structured budget sum
const structuredTotal = computed(() =>
  localCategoryLimits.value.reduce((acc, l) => acc + l.amount, 0),
);

function openEdit() {
  amount.value = store.weeklyLimit ? (store.weeklyLimit / 100).toFixed(2) : "";
  salaryAmount.value = weeklySalary.value
    ? (weeklySalary.value / 100).toFixed(2)
    : "";

  // Populate local category limits
  if (store.categoryLimits.length) {
    localCategoryLimits.value = store.categoryLimits.map((l) => ({ ...l }));
  } else {
    // Default starting categories if none configured
    localCategoryLimits.value = [
      { category: "Rent", amount: 35000 },
      { category: "Groceries", amount: 15000 },
      { category: "Bills", amount: 8000 },
      { category: "Shopping", amount: 7000 },
      { category: "Other", amount: 5000 },
    ];
  }
  editing.value = true;
}

function addCategoryRow() {
  const availableCats = store.allCategories.filter(
    (c) => !localCategoryLimits.value.some((l) => l.category.toLowerCase() === c.toLowerCase()),
  );
  const nextCat = availableCats[0] ?? "Other";
  localCategoryLimits.value.push({ category: nextCat, amount: 5000 });
}

function removeCategoryRow(index: number) {
  localCategoryLimits.value.splice(index, 1);
}

async function saveBudget() {
  busy.value = true;
  error.value = "";
  try {
    const salCents = salaryAmount.value.trim()
      ? parseOptionalMoney(salaryAmount.value)
      : 0;

    if (editMode.value === "structured") {
      // Clean and validate category limits
      const validLimits: CategoryLimit[] = [];
      for (const lim of localCategoryLimits.value) {
        if (!lim.category.trim()) continue;
        if (lim.amount > 0) {
          validLimits.push({
            category: lim.category.trim(),
            amount: lim.amount,
          });
        }
      }
      const sum = validLimits.reduce((acc, l) => acc + l.amount, 0);
      await store.saveWeeklyBudgetAndSalary(salCents, sum, validLimits);
    } else {
      // Quick amount
      const totalCents = parseMoney(amount.value);
      await store.saveWeeklyBudgetAndSalary(salCents, totalCents);
    }
    editing.value = false;
  } catch (reason) {
    error.value = friendlyError(reason);
  } finally {
    busy.value = false;
  }
}

async function removeLimit() {
  if (!confirm("Remove the weekly limit and structured budgets?")) return;
  busy.value = true;
  error.value = "";
  try {
    await store.saveWeeklyBudgetAndSalary(store.salary.weeklyAverageNZD, 0, []);
    editing.value = false;
  } catch (reason) {
    error.value = friendlyError(reason);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section
    class="panel high-impact-limit-card"
    :data-status="store.weeklyLimit ? status : 'none'"
  >
    <!-- Card Header -->
    <div class="limit-card-header">
      <div class="limit-title-wrap">
        <div class="limit-icon-badge" :data-status="status">
          <AlertCircle v-if="status === 'over'" :size="22" />
          <AlertTriangle v-else-if="status === 'near'" :size="22" />
          <Target v-else :size="22" />
        </div>
        <div>
          <h2>Weekly Spending Limit</h2>
          <p class="small muted date-range">
            <Calendar :size="13" />
            {{ store.weekStart }} – {{ store.weekEnd }}
          </p>
        </div>
      </div>

      <div class="row-actions">
        <button
          class="secondary btn-sm"
          aria-label="Edit weekly limit & salary"
          type="button"
          @click="openEdit"
        >
          <Pencil :size="15" />Configure budget
        </button>
        <button
          v-if="store.weeklyLimit"
          class="icon-button"
          aria-label="Remove weekly limit"
          type="button"
          :disabled="busy"
          @click="removeLimit"
        >
          <Trash2 :size="17" />
        </button>
      </div>
    </div>

    <!-- Active Limit State -->
    <template v-if="store.weeklyLimit">
      <!-- High-Impact Status Alert Banner -->
      <div class="limit-status-banner" :data-status="status" role="status">
        <template v-if="status === 'over'">
          <AlertCircle :size="18" />
          <div class="banner-text">
            <strong>Exceeded weekly limit by {{ store.displayMoney(diff) }}</strong>
            <span>{{ progress }}% of your limit spent</span>
          </div>
        </template>
        <template v-else-if="status === 'near'">
          <AlertTriangle :size="18" />
          <div class="banner-text">
            <strong>Approaching limit: {{ store.displayMoney(diff) }} left</strong>
            <span>{{ progress }}% used · {{ daysRemaining }} {{ daysRemaining === 1 ? 'day' : 'days' }} remaining</span>
          </div>
        </template>
        <template v-else>
          <CheckCircle2 :size="18" />
          <div class="banner-text">
            <strong>On track: {{ store.displayMoney(diff) }} remaining</strong>
            <span>{{ progress }}% used · {{ daysRemaining }} {{ daysRemaining === 1 ? 'day' : 'days' }} left in week</span>
          </div>
        </template>
      </div>

      <!-- Weekly Salary vs Budget vs Spend Stats -->
      <div v-if="weeklySalary > 0" class="salary-comparison-strip">
        <div class="salary-stat-col">
          <span class="stat-micro-label">Weekly Salary</span>
          <strong class="salary-amount">{{ store.displayMoney(weeklySalary) }}</strong>
        </div>
        <div class="salary-stat-col">
          <span class="stat-micro-label">Weekly Limit</span>
          <strong class="limit-target-amount">{{ store.displayMoney(store.weeklyLimit) }}</strong>
        </div>
        <div class="salary-stat-col">
          <span class="stat-micro-label">Target Savings</span>
          <strong class="savings-amount">
            {{ store.displayMoney(targetSavings) }}
            <span class="rate-badge">{{ savingsRate }}%</span>
          </strong>
        </div>
      </div>

      <!-- Hero Spending Numbers -->
      <div class="limit-hero-numbers">
        <div class="spent-stat">
          <span class="stat-label">Spent this week</span>
          <strong class="stat-value" :class="{ 'text-danger': status === 'over' }">
            {{ store.displayMoney(store.weekTotal) }}
          </strong>
        </div>
        <div class="limit-target-stat">
          <span class="stat-label">Weekly limit</span>
          <strong class="stat-value-secondary">
            {{ store.displayMoney(store.weeklyLimit) }}
          </strong>
        </div>
      </div>

      <!-- Account Spending Breakdown -->
      <div v-if="store.weekTotal > 0" class="weekly-account-breakdown">
        <span class="breakdown-tag global-tag">
          💳 Global: <strong>{{ store.displayMoney(store.weekGlobalTotal) }}</strong>
        </span>
        <span class="breakdown-tag nz-tag">
          🏦 NZ Savings: <strong>{{ store.displayMoney(store.weekNZTotal) }}</strong>
        </span>
      </div>

      <!-- Enhanced Gauge Progress Bar -->
      <div class="progress-container">
        <div class="progress-track">
          <div
            class="progress-fill"
            :data-status="status"
            :style="{ width: `${Math.min(100, progress)}%` }"
          />
          <div class="threshold-marker marker-80" title="80% Warning threshold" />
        </div>
      </div>

      <!-- Structured Category Budgets Breakdown (if configured) -->
      <div v-if="store.categoryBudgetProgress.length" class="structured-budget-section">
        <div class="structured-header">
          <span class="structured-title">
            <Layers :size="15" /> Structured Category Limits
          </span>
          <span v-if="store.frequentWeeklyCommitment > 0" class="frequent-pill">
            <Receipt :size="12" /> {{ store.displayMoney(store.frequentWeeklyCommitment) }}/wk in frequent bills
          </span>
        </div>

        <div class="category-budget-grid">
          <div
            v-for="cat in store.categoryBudgetProgress"
            :key="cat.category"
            class="cat-budget-card"
            :data-status="cat.status"
          >
            <div class="cat-budget-header">
              <div class="cat-tag">
                <CategoryIcon :category="cat.category" />
                <span class="cat-name">{{ cat.category }}</span>
              </div>
              <span class="cat-fraction">
                {{ store.displayMoney(cat.spent) }} / {{ store.displayMoney(cat.limit) }}
              </span>
            </div>

            <div class="cat-progress-track">
              <div
                class="cat-progress-fill"
                :data-status="cat.status"
                :style="{ width: `${Math.min(100, cat.percent)}%` }"
              />
            </div>

            <div class="cat-footer">
              <span class="cat-percent small muted">{{ Math.round(cat.percent) }}%</span>
              <span class="cat-rem small" :class="{ 'rem-over': cat.status === 'over' }">
                {{
                  cat.status === "over"
                    ? `+${store.displayMoney(cat.spent - cat.limit)} over`
                    : `${store.displayMoney(cat.remaining)} left`
                }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Pacing & Pacing Advice -->
      <div class="pacing-footer">
        <div class="pacing-advice">
          <template v-if="status === 'over'">
            <span class="pacing-badge alert-badge">
              Overpace · Limit reached {{ store.weekTotal > store.weeklyLimit ? 'this week' : '' }}
            </span>
          </template>
          <template v-else>
            <TrendingUp :size="15" />
            <span>
              Daily budget: <strong>{{ store.displayMoney(dailyAllowance) }}/day</strong> for remaining {{ daysRemaining }} {{ daysRemaining === 1 ? 'day' : 'days' }}
            </span>
          </template>
        </div>

        <label class="week-picker-inline" title="Select week to review">
          <span>Week:</span>
          <input v-model="store.weekDate" type="date" required />
        </label>
      </div>
    </template>

    <!-- Empty State: No Limit Set -->
    <div v-else-if="!editing" class="no-limit-banner">
      <div class="no-limit-info">
        <p>Set a structured weekly limit and salary to manage category spending.</p>
      </div>
      <button class="primary" type="button" @click="openEdit">
        <Target :size="17" />Set weekly limit & budget
      </button>
    </div>

    <!-- Configure Budget & Salary Drawer -->
    <div
      v-if="editing"
      class="drawer-backdrop"
      @click.self="editing = false"
    >
      <div class="bottom-drawer" role="dialog" aria-modal="true">
        <div class="drawer-handle-bar"><div class="drawer-handle"></div></div>
        <div class="drawer-header">
          <h3>Configure Weekly Budget & Salary</h3>
          <button class="icon-button" type="button" aria-label="Close" @click="editing = false">
            <X :size="18" />
          </button>
        </div>

        <div class="budget-drawer-body budget-modal-body">
          <!-- Weekly Salary Input -->
          <label>
            Weekly Average Salary · NZD (can change anytime)
            <input
              v-model="salaryAmount"
              inputmode="decimal"
              placeholder="e.g. 1200.00"
            />
          </label>
          <p class="small muted">
            Used to calculate your target weekly savings and compare against your weekly limit.
          </p>

          <hr class="modal-divider" />

          <!-- Mode Segmented Switch -->
          <div class="segmented" aria-label="Budget Mode">
            <button
              type="button"
              :class="{ selected: editMode === 'structured' }"
              @click="editMode = 'structured'"
            >
              Structured by Category
            </button>
            <button
              type="button"
              :class="{ selected: editMode === 'quick' }"
              @click="editMode = 'quick'"
            >
              Single Overall Limit
            </button>
          </div>

          <!-- Structured Mode -->
          <div v-if="editMode === 'structured'" class="structured-form">
            <p class="small muted">
              Separate your week limit between rent, food, bills, expenses, and discretionary spending.
            </p>

            <div class="category-inputs-list">
              <div
                v-for="(row, idx) in localCategoryLimits"
                :key="idx"
                class="category-limit-row"
              >
                <select v-model="row.category">
                  <option
                    v-for="cat in store.allCategories"
                    :key="cat"
                    :value="cat"
                  >
                    {{ cat }}
                  </option>
                </select>

                <div class="amount-input-wrap">
                  <span class="currency-prefix">$</span>
                  <input
                    :value="(row.amount / 100).toFixed(2)"
                    inputmode="decimal"
                    placeholder="0.00"
                    @input="row.amount = parseMoney(($event.target as HTMLInputElement).value || '0')"
                  />
                </div>

                <button
                  class="icon-button"
                  type="button"
                  title="Remove category"
                  @click="removeCategoryRow(idx)"
                >
                  <Trash2 :size="15" />
                </button>
              </div>
            </div>

            <button
              class="secondary btn-sm add-cat-btn"
              type="button"
              @click="addCategoryRow"
            >
              <Plus :size="14" />Add category limit
            </button>

            <div class="structured-total-banner">
              <span>Total Weekly Limit:</span>
              <strong>{{ store.displayMoney(structuredTotal) }}</strong>
            </div>
          </div>

          <!-- Quick Single Limit Mode -->
          <div v-else class="quick-limit-form">
            <label>
              Weekly limit · NZD
              <input
                v-model="amount"
                inputmode="decimal"
                required
                placeholder="e.g. 500.00"
              />
            </label>
          </div>

          <p v-if="error" class="error-note" role="alert">{{ error }}</p>

          <div class="entry-actions">
            <button class="primary" :disabled="busy" @click="saveBudget">
              Save Budget
            </button>
            <button type="button" class="secondary" @click="editing = false">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.high-impact-limit-card {
  display: grid;
  gap: 16px;
  border-radius: 20px;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}

.high-impact-limit-card[data-status="over"] {
  background: #fdf5f4;
  border: 2px solid #e58778;
  box-shadow: 0 4px 20px rgba(160, 62, 48, 0.12);
}

.high-impact-limit-card[data-status="near"] {
  background: #fdfaf3;
  border: 2px solid #ebc680;
  box-shadow: 0 4px 18px rgba(180, 156, 76, 0.1);
}

.high-impact-limit-card[data-status="under"] {
  background: #f5f9f6;
  border: 2px solid #b8dcce;
}

.limit-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.limit-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.limit-icon-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #e2ede6;
  color: #153d35;
}

.limit-icon-badge[data-status="over"] {
  background: #fde2de;
  color: #a03e30;
}

.limit-icon-badge[data-status="near"] {
  background: #fbf0d8;
  color: #9c7b28;
}

.limit-title-wrap h2 {
  font-size: 19px;
  font-weight: 750;
  margin: 0;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  color: #556c62;
}

.btn-sm {
  min-height: 32px;
  padding: 4px 10px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.limit-status-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 13px;
}

.limit-status-banner[data-status="over"] {
  background: #fce4e0;
  color: #8c2e21;
  border: 1px solid #f7bdb5;
}

.limit-status-banner[data-status="near"] {
  background: #fdf3de;
  color: #7d601b;
  border: 1px solid #f5dea9;
}

.limit-status-banner[data-status="under"] {
  background: #e7f4ec;
  color: #1e5239;
  border: 1px solid #c2e2cf;
}

.banner-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.banner-text strong {
  font-size: 14px;
}

/* Salary strip */
.salary-comparison-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #edf5ef;
  border-radius: 12px;
  border: 1px solid #c7dfd0;
}

.salary-stat-col {
  display: grid;
  gap: 1px;
}

.stat-micro-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: #4b6257;
}

.salary-amount {
  font-size: 14px;
  font-weight: 700;
  color: #153d35;
}

.limit-target-amount {
  font-size: 14px;
  font-weight: 700;
  color: #556c62;
}

.savings-amount {
  font-size: 14px;
  font-weight: 750;
  color: #1e5239;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.rate-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 8px;
  background: #c9ef88;
  color: #153d35;
}

/* Hero Numbers */
.limit-hero-numbers {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12px;
  padding: 4px 0;
}

.spent-stat,
.limit-target-stat {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 12px;
  color: #5d7168;
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.8px;
  font-variant-numeric: tabular-nums;
  color: #153d35;
}

.stat-value.text-danger {
  color: #a03e30;
}

.stat-value-secondary {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #61776d;
}

.progress-container {
  width: 100%;
}

.progress-track {
  position: relative;
  height: 14px;
  background: #e0eae3;
  border-radius: 8px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 8px;
  transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.progress-fill[data-status="under"] {
  background: #27ae60;
}

.progress-fill[data-status="near"] {
  background: #f39c12;
}

.progress-fill[data-status="over"] {
  background: #e74c3c;
}

.threshold-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(0, 0, 0, 0.2);
}

.marker-80 {
  left: 80%;
}

/* Structured category budgets */
.structured-budget-section {
  display: grid;
  gap: 10px;
  padding-top: 6px;
}

.structured-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.structured-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #153d35;
}

.frequent-pill {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 8px;
  background: #edf2ee;
  color: #4b6058;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.category-budget-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 8px;
}

.cat-budget-card {
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e1e8e4;
  border-radius: 10px;
  display: grid;
  gap: 6px;
}

.cat-budget-card[data-status="over"] {
  border-color: #f6c8c2;
  background: #fdf6f5;
}

.cat-budget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.cat-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #153d35;
}

.cat-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
}

.cat-fraction {
  font-size: 11px;
  color: #63776d;
  font-variant-numeric: tabular-nums;
}

.cat-progress-track {
  width: 100%;
  height: 6px;
  background: #e4ece7;
  border-radius: 4px;
  overflow: hidden;
}

.cat-progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.cat-progress-fill[data-status="under"] {
  background: #27ae60;
}

.cat-progress-fill[data-status="near"] {
  background: #f39c12;
}

.cat-progress-fill[data-status="over"] {
  background: #e74c3c;
}

.cat-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.cat-rem {
  font-weight: 600;
  color: #21533b;
}

.cat-rem.rem-over {
  color: #a03e30;
}

.pacing-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #4b6257;
  padding-top: 4px;
}

.pacing-advice {
  display: flex;
  align-items: center;
  gap: 6px;
}

.alert-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 12px;
  background: #fbe2de;
  color: #a03e30;
}

.week-picker-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin: 0;
}

.week-picker-inline input {
  min-height: 32px;
  padding: 2px 6px;
  font-size: 12px;
  width: auto;
}

.no-limit-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
  background: #f0f5f2;
  border: 1px dashed #b9ccc1;
  border-radius: 14px;
}

.weekly-account-breakdown {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 6px 10px;
  background: #f1f6f3;
  border-radius: 10px;
  border: 1px solid #dbe6df;
  font-size: 12px;
}

.breakdown-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.breakdown-tag.global-tag {
  color: #1e5239;
}

.breakdown-tag.nz-tag {
  color: #2b5585;
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(13, 36, 30, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  z-index: 1000;
}

.bottom-drawer {
  background: #fff;
  width: 100vw;
  max-width: 100vw;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -16px 64px rgba(13, 36, 30, 0.35);
  display: flex;
  flex-direction: column;
  max-height: 92dvh;
  overflow: hidden;
  animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.drawer-handle-bar {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
  cursor: grab;
}

.drawer-handle {
  width: 44px;
  height: 5px;
  background: #d2ded7;
  border-radius: 10px;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 22px 14px;
  border-bottom: 1px solid #edf2ef;
}

.drawer-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.budget-drawer-body {
  padding: 20px 22px calc(24px + env(safe-area-inset-bottom));
  overflow-y: auto;
}

.budget-modal-body {
  display: grid;
  gap: 14px;
}

.modal-divider {
  border: 0;
  border-top: 1px solid #e5ebe7;
  margin: 0;
}

.category-inputs-list {
  display: grid;
  gap: 8px;
  margin: 8px 0;
}

.category-limit-row {
  display: grid;
  grid-template-columns: 1fr 140px 36px;
  gap: 8px;
  align-items: center;
}

.amount-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.currency-prefix {
  position: absolute;
  left: 10px;
  font-size: 13px;
  color: #70847b;
  pointer-events: none;
}

.amount-input-wrap input {
  padding-left: 22px;
}

.add-cat-btn {
  justify-self: start;
}

.structured-total-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f0f5f2;
  border-radius: 10px;
  font-size: 14px;
  color: #153d35;
}

.structured-total-banner strong {
  font-size: 16px;
  color: #153d35;
}

@media (max-width: 480px) {
  .limit-card-header {
    flex-wrap: wrap;
    gap: 10px;
  }
  .limit-title-wrap {
    flex: 1 1 auto;
    min-width: 0;
  }
  .limit-title-wrap h2 {
    font-size: 17px;
  }
  .limit-icon-badge {
    width: 38px;
    height: 38px;
  }
  .salary-comparison-strip {
    gap: 6px;
    padding: 8px 10px;
  }
  .salary-stat-col strong {
    font-size: 13px;
  }
  .stat-micro-label {
    font-size: 9px;
  }
  .limit-hero-numbers .stat-value {
    font-size: 28px;
  }
  .limit-hero-numbers .stat-value-secondary {
    font-size: 18px;
  }
  .category-budget-grid {
    grid-template-columns: 1fr;
  }
  .category-limit-row {
    grid-template-columns: 1fr 110px 32px;
    gap: 6px;
  }
  .budget-drawer-body {
    padding: 16px 16px calc(20px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
