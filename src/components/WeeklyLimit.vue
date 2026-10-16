<script setup lang="ts">
import { computed, shallowRef } from "vue";
import {
  Target,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
} from "lucide-vue-next";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { parseMoney, today } from "@/lib/finance";

const store = useExpenses();
const editing = shallowRef(false);
const amount = shallowRef("");
const error = shallowRef("");
const busy = shallowRef(false);

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

function edit() {
  amount.value = store.weeklyLimit ? (store.weeklyLimit / 100).toFixed(2) : "";
  editing.value = true;
}

async function save(remove = false) {
  busy.value = true;
  error.value = "";
  try {
    await store.saveLimit(remove ? null : parseMoney(amount.value));
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

      <div v-if="store.weeklyLimit" class="row-actions">
        <button
          class="icon-button"
          aria-label="Edit weekly limit"
          type="button"
          @click="edit"
        >
          <Pencil :size="17" />
        </button>
        <button
          class="icon-button"
          aria-label="Remove weekly limit"
          type="button"
          :disabled="busy"
          @click="save(true)"
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
        <p>Set a weekly spending target to stay on top of daily expenses.</p>
      </div>
      <button class="primary" type="button" @click="edit">
        <Target :size="17" />Set weekly limit
      </button>
    </div>

    <!-- Edit/Set Limit Form -->
    <form v-if="editing" class="limit-form" @submit.prevent="save()">
      <label>
        Weekly limit · NZD
        <input
          v-model="amount"
          inputmode="decimal"
          required
          placeholder="e.g. 350.00"
          autofocus
        />
      </label>
      <p class="small muted">Applies every Monday–Sunday week.</p>
      <div class="entry-actions">
        <button class="primary" :disabled="busy">Save limit</button>
        <button type="button" class="secondary" @click="editing = false">
          Cancel
        </button>
      </div>
    </form>

    <p v-if="error" class="error-note" role="alert">{{ error }}</p>
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

/* Status-driven card styling */
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

/* Status Banner */
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

/* Progress Track */
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

/* Pacing Footer */
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

/* No Limit Set Banner */
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

.no-limit-banner p {
  color: #4b6058;
}
</style>
