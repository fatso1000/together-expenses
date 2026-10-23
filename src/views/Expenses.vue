<script setup lang="ts">
import { shallowRef, computed } from "vue";
import {
  Search,
  Download,
  ClipboardList,
  Calendar,
  ArrowUpDown,
  RotateCcw,
} from "lucide-vue-next";
import BulkEntry from "@/components/BulkEntry.vue";
import ExpenseList from "@/components/ExpenseList.vue";
import { useExpenses } from "@/stores/expenses";
import { csv, downloadFile, total } from "@/lib/finance";

const store = useExpenses();
const bulk = shallowRef(false);
const search = shallowRef("");
const category = shallowRef("");
const account = shallowRef<"" | "global" | "nz">("");
const period = shallowRef<"week" | "month" | "all">("month");
const sortBy = shallowRef<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">(
  "date-desc",
);

// Determine base pool of expenses based on period
const periodExpenses = computed(() => {
  if (period.value === "week") {
    return store.weekExpenses;
  }
  if (period.value === "all") {
    return store.currencyExpenses;
  }
  return store.monthExpenses;
});

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase();
  const selectedCat = category.value;
  const selectedAccount = account.value;

  const result = periodExpenses.value.filter((item) => {
    const matchesCategory = !selectedCat || item.category === selectedCat;
    if (!matchesCategory) return false;

    const matchesAccount =
      !selectedAccount ||
      (selectedAccount === "nz"
        ? item.accountId === "nz"
        : item.accountId !== "nz");
    if (!matchesAccount) return false;

    if (!query) return true;
    const searchable = `${item.merchant} ${item.note} ${(item.items ?? []).map((line) => line.title).join(" ")}`.toLowerCase();
    return searchable.includes(query);
  });

  // Apply sorting
  return [...result].sort((a, b) => {
    if (sortBy.value === "date-asc") {
      return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
    }
    if (sortBy.value === "amount-desc") {
      return b.amount - a.amount;
    }
    if (sortBy.value === "amount-asc") {
      return a.amount - b.amount;
    }
    // Default: date-desc
    return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
  });
});

const hasActiveFilters = computed(
  () =>
    search.value ||
    category.value ||
    account.value ||
    period.value !== "month" ||
    sortBy.value !== "date-desc",
);

function resetFilters() {
  search.value = "";
  category.value = "";
  account.value = "";
  period.value = "month";
  sortBy.value = "date-desc";
}

function exportCsv() {
  const filename =
    period.value === "week"
      ? `expenses-week-${store.weekStart}.csv`
      : period.value === "all"
        ? "expenses-all.csv"
        : `expenses-${store.month}.csv`;

  downloadFile(
    filename,
    csv(filtered.value),
    "text/csv;charset=utf-8",
  );
}
</script>

<template>
  <button class="secondary bulk-button" @click="bulk = true">
    <ClipboardList :size="18" />Add several expenses
  </button>
  <BulkEntry v-if="bulk" @close="bulk = false" />

  <section class="panel expenses-panel">
    <!-- Period Selector Switch -->
    <div class="period-segmented" aria-label="Filter spending period">
      <button
        type="button"
        :class="{ selected: period === 'week' }"
        @click="period = 'week'"
      >
        <Calendar :size="15" />This Week
      </button>
      <button
        type="button"
        :class="{ selected: period === 'month' }"
        @click="period = 'month'"
      >
        This Month
      </button>
      <button
        type="button"
        :class="{ selected: period === 'all' }"
        @click="period = 'all'"
      >
        All Expenses
      </button>
    </div>

    <!-- Active Period Information Banner -->
    <div v-if="period === 'week'" class="week-banner">
      <span>
        <strong>Current week:</strong> {{ store.weekStart }} to {{ store.weekEnd }} (Mon–Sun)
      </span>
      <span class="week-banner-metric">
        {{ filtered.length }} expenses · {{ store.displayMoney(total(filtered)) }}
      </span>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar enhanced-filter-bar">
      <label class="search-input">
        <Search :size="18" />
        <span class="sr-only">Search expenses</span>
        <input
          v-model="search"
          type="search"
          placeholder="Search merchant, item, note…"
        />
      </label>

      <label class="category-select-label">
        <span class="sr-only">Category</span>
        <select v-model="category">
          <option value="">All categories</option>
          <option
            v-for="item in store.allCategories"
            :key="item"
            :value="item"
          >
            {{ item }}
          </option>
        </select>
      </label>

      <!-- Account Filter -->
      <label class="account-select-label">
        <span class="sr-only">Account</span>
        <select v-model="account" aria-label="Filter by account">
          <option value="">All accounts</option>
          <option value="global">💳 Global Account</option>
          <option value="nz">🏦 NZ Account (Savings)</option>
        </select>
      </label>

      <label class="sort-select-label">
        <span class="sr-only">Sort by</span>
        <div class="select-with-icon">
          <ArrowUpDown :size="16" class="select-icon" />
          <select v-model="sortBy" aria-label="Sort expenses">
            <option value="date-desc">Newest date</option>
            <option value="date-asc">Oldest date</option>
            <option value="amount-desc">Highest amount</option>
            <option value="amount-asc">Lowest amount</option>
          </select>
        </div>
      </label>

      <button class="secondary export-btn" @click="exportCsv">
        <Download :size="16" />Export
      </button>

      <button
        v-if="hasActiveFilters"
        type="button"
        class="text-button reset-btn"
        @click="resetFilters"
      >
        <RotateCcw :size="14" />Clear filters
      </button>
    </div>

    <!-- Summary Bar -->
    <div class="list-summary">
      <span>{{ filtered.length }} expenses</span>
      <strong>{{ store.displayMoney(total(filtered)) }}</strong>
    </div>

    <ExpenseList :expenses="filtered" />
  </section>
</template>

<style scoped>
.expenses-panel {
  display: grid;
  gap: 16px;
}

.period-segmented {
  display: flex;
  background: #ebf0ec;
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.period-segmented button {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  background: transparent;
  color: #4b6058;
  transition: all 0.15s ease;
}

.period-segmented button.selected {
  background: #ffffff;
  color: #153d35;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.week-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  background: #edf6f0;
  border: 1px solid #c8e2d2;
  border-radius: 12px;
  font-size: 13px;
  color: #1d4d38;
}

.week-banner-metric {
  font-weight: 700;
}

.enhanced-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.enhanced-filter-bar .search-input {
  flex: 2;
  min-width: 200px;
}

.category-select-label,
.account-select-label,
.sort-select-label {
  flex: 1;
  min-width: 140px;
}

.select-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.select-icon {
  position: absolute;
  left: 10px;
  pointer-events: none;
  color: #6a7c74;
}

.select-with-icon select {
  padding-left: 32px;
}

.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #60756d;
}

@media (max-width: 480px) {
  .period-segmented button {
    font-size: 11.5px;
    padding: 6px 8px;
    gap: 4px;
  }
  .enhanced-filter-bar .search-input {
    flex-basis: 100%;
    min-width: 100%;
  }
  .category-select-label,
  .account-select-label {
    flex: 1 1 calc(50% - 6px);
    min-width: 0;
  }
  .sort-select-label {
    flex: 1 1 100%;
  }
  .export-btn {
    flex: 1;
  }
}
</style>
