<template>
  <div class="mb-4">
    <Button
      type="button"
      severity="secondary"
      class="inline-flex items-center gap-2"
      @click="bulk = true"
    >
      <ClipboardList :size="18" />
      <span>{{ t("expenses.addSeveral") }}</span>
    </Button>
  </div>
  <BulkEntry v-if="bulk" @close="bulk = false" />

  <section class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm grid gap-4">
    <!-- Period Selector Switch -->
    <div
      class="flex gap-1 p-1 rounded-xl bg-[var(--pill-bg)] border border-[var(--border)]"
      aria-label="Filter spending period"
    >
      <Button
        type="button"
        size="small"
        class="flex-1 inline-flex items-center justify-center gap-1.5"
        :severity="period === 'week' ? 'primary' : 'secondary'"
        :variant="period === 'week' ? undefined : 'text'"
        @click="period = 'week'"
      >
        <Calendar :size="15" />
        <span>{{ t("expenses.thisWeek") }}</span>
      </Button>
      <Button
        type="button"
        size="small"
        class="flex-1 inline-flex items-center justify-center gap-1.5"
        :severity="period === 'month' ? 'primary' : 'secondary'"
        :variant="period === 'month' ? undefined : 'text'"
        @click="period = 'month'"
      >
        <span>{{ t("expenses.thisMonth") }}</span>
      </Button>
      <Button
        type="button"
        size="small"
        class="flex-1 inline-flex items-center justify-center gap-1.5"
        :severity="period === 'all' ? 'primary' : 'secondary'"
        :variant="period === 'all' ? undefined : 'text'"
        @click="period = 'all'"
      >
        <span>{{ t("expenses.allExpenses") }}</span>
      </Button>
    </div>

    <!-- Active Period Information Banner -->
    <div
      v-if="period === 'week'"
      class="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] text-xs text-text"
    >
      <span>
        <strong>{{ t("expenses.thisWeek") }}:</strong> {{ store.weekStart }} to {{ store.weekEnd }} ({{ store.weekWeekdayRange }})
      </span>
      <span class="font-bold">
        {{ filtered.length }} {{ t("nav.expenses").toLowerCase() }} · {{ store.displayMoney(total(filtered)) }}
      </span>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-wrap items-center gap-2.5">
      <IconField class="w-full sm:w-auto sm:flex-[2] min-w-[200px]">
        <InputIcon>
          <Search :size="16" />
        </InputIcon>
        <InputText
          v-model="search"
          type="search"
          :placeholder="t('expenses.searchPlaceholder')"
          :aria-label="t('common.search')"
          fluid
        />
      </IconField>

      <div class="flex-1 min-w-[140px]">
        <Select
          v-model="category"
          :options="categoryOptions"
          optionLabel="label"
          optionValue="value"
          :aria-label="t('expenses.category')"
          fluid
        />
      </div>

      <div class="flex-1 min-w-[140px]">
        <Select
          v-model="account"
          :options="accountOptions"
          optionLabel="label"
          optionValue="value"
          aria-label="Filter by account"
          fluid
        />
      </div>

      <div class="flex-1 min-w-[150px]">
        <Select
          v-model="sortBy"
          :options="sortOptions"
          optionLabel="label"
          optionValue="value"
          :aria-label="t('expenses.sortBy')"
          fluid
        >
          <template #value="slotProps">
            <div class="flex items-center gap-1.5">
              <ArrowUpDown :size="14" class="text-muted shrink-0" />
              <span class="truncate">{{ sortOptions.find((o) => o.value === slotProps.value)?.label }}</span>
            </div>
          </template>
        </Select>
      </div>

      <Button
        type="button"
        severity="secondary"
        variant="outlined"
        class="inline-flex items-center gap-1.5"
        @click="exportCsv"
      >
        <Download :size="16" />
        <span>{{ t("expenses.export") }}</span>
      </Button>

      <Button
        v-if="hasActiveFilters"
        type="button"
        variant="text"
        severity="secondary"
        size="small"
        class="inline-flex items-center gap-1.5"
        @click="resetFilters"
      >
        <RotateCcw :size="14" />
        <span>{{ t("expenses.resetFilters") }}</span>
      </Button>
    </div>

    <!-- Summary Bar -->
    <div class="flex items-center justify-between text-sm pt-2 pb-3 border-b border-[var(--border)] text-muted">
      <span>{{ filtered.length }} {{ t("nav.expenses").toLowerCase() }}</span>
      <strong class="text-text">{{ store.displayMoney(total(filtered)) }}</strong>
    </div>

    <ExpenseList :expenses="filtered" />
  </section>
</template>

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
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import Select from "primevue/select";
import BulkEntry from "@/components/BulkEntry.vue";
import ExpenseList from "@/components/ExpenseList.vue";
import { useExpenses } from "@/stores/expenses";
import { csv, downloadFile, total } from "@/lib/finance";
import { t } from "@/lib/i18n";

const store = useExpenses();
const bulk = shallowRef(false);
const search = shallowRef("");
const category = shallowRef("");
const account = shallowRef<"" | "global" | "nz">("");
const period = shallowRef<"week" | "month" | "all">("month");
const sortBy = shallowRef<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">(
  "date-desc",
);

const categoryOptions = computed(() => [
  { value: "", label: t("expenses.allCategories") },
  ...store.allCategories.map((item) => ({ value: item, label: item })),
]);

const accountOptions = computed(() => [
  { value: "" as const, label: t("expenses.allAccounts") },
  { value: "global" as const, label: "💳 Global Account" },
  { value: "nz" as const, label: "🏦 NZ Account (Savings)" },
]);

const sortOptions = computed(() => [
  { value: "date-desc" as const, label: t("expenses.sortNewest") },
  { value: "date-asc" as const, label: t("expenses.sortOldest") },
  { value: "amount-desc" as const, label: t("expenses.sortHighest") },
  { value: "amount-asc" as const, label: t("expenses.sortLowest") },
]);

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
