<script setup lang="ts">
import { shallowRef, computed } from "vue";
import { Search, Download } from "lucide-vue-next";
import BulkEntry from "@/components/BulkEntry.vue";
import { ClipboardList } from "lucide-vue-next";
import ExpenseList from "@/components/ExpenseList.vue";
import { categories } from "@/lib/types";
import { useExpenses } from "@/stores/expenses";
import { csv, downloadFile, money, total } from "@/lib/finance";
const store = useExpenses();
const bulk = shallowRef(false);
const search = shallowRef("");
const category = shallowRef("");
const filtered = computed(() =>
  store.monthExpenses.filter(
    (item) =>
      (!category.value || item.category === category.value) &&
      `${item.merchant} ${item.note} ${(item.items ?? []).map((line) => line.title).join(" ")}`
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
);
function exportCsv() {
  downloadFile(
    `expenses-${store.month}.csv`,
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
  <section class="panel">
    <div class="filter-bar">
      <label class="search-input"
        ><Search :size="18" /><span class="sr-only">Search expenses</span
        ><input
          v-model="search"
          type="search"
          placeholder="Search expenses…" /></label
      ><label
        ><span class="sr-only">Category</span
        ><select v-model="category">
          <option value="">All categories</option>
          <option v-for="item in categories" :key="item">{{ item }}</option>
        </select></label
      ><button class="secondary" @click="exportCsv">
        <Download :size="16" />Export
      </button>
    </div>
    <div class="list-summary">
      <span>{{ filtered.length }} expenses</span
      ><strong>{{ store.displayMoney(total(filtered)) }}</strong>
    </div>
    <ExpenseList :expenses="filtered" />
  </section>
</template>
