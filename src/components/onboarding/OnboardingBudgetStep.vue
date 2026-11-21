<template>
  <div class="space-y-5">
    <div class="space-y-1">
      <div class="flex items-center gap-2.5">
        <Target :size="20" class="text-accent shrink-0" />
        <h2 class="text-xl font-bold text-text m-0">
          {{ t("onboarding.budgetTitle") }}
        </h2>
      </div>
      <p class="text-xs sm:text-sm text-muted m-0 leading-relaxed">
        {{ t("onboarding.budgetSubtitle") }}
      </p>
    </div>

    <!-- Live Weekly Pacing & Savings Preview -->
    <div
      v-if="setup.effectiveWeeklyLimitCents.value > 0"
      class="rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3"
    >
      <div class="grid gap-0.5">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {{ t("weeklyLimit.limit") }}
        </span>
        <strong class="text-base font-bold tabular-nums text-text">
          {{ store.displayMoney(setup.effectiveWeeklyLimitCents.value) }}
        </strong>
      </div>
      <div class="grid gap-0.5">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {{ t("onboarding.budgetDailyAllowance") }}
        </span>
        <strong class="text-base font-bold tabular-nums text-text">
          {{ store.displayMoney(setup.dailyAllowanceCents.value) }}
        </strong>
      </div>
      <div v-if="setup.weeklySalaryCents.value > 0" class="grid gap-0.5">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {{ t("weeklyLimit.salaryLabel") }}
        </span>
        <strong class="text-base font-bold tabular-nums text-text">
          {{ store.displayMoney(setup.weeklySalaryCents.value) }}
        </strong>
      </div>
      <div v-if="setup.weeklySalaryCents.value > 0" class="grid gap-0.5">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {{ t("weeklyLimit.targetSavings") }}
        </span>
        <strong class="text-base font-bold tabular-nums text-accent inline-flex items-center gap-1.5">
          <span>{{ store.displayMoney(setup.targetWeeklySavingsCents.value) }}</span>
          <Tag :value="`${setup.savingsRatePercent.value}%`" severity="success" />
        </strong>
      </div>
    </div>
    <div
      v-else
      class="rounded-xl border border-dashed border-[var(--border)] bg-black/15 px-3.5 py-2.5 text-xs text-muted"
    >
      {{ t("onboarding.budgetNoLimitYet") }}
    </div>

    <!-- Mode Segmented Switch -->
    <div
      class="flex gap-1 p-1 rounded-xl bg-[var(--input-bg)] border border-[var(--border)]"
      aria-label="Budget Mode"
    >
      <Button
        type="button"
        size="small"
        class="flex-1 min-h-10"
        :severity="setup.budgetMode.value === 'structured' ? 'primary' : 'secondary'"
        :variant="setup.budgetMode.value === 'structured' ? undefined : 'text'"
        @click="setup.budgetMode.value = 'structured'"
      >
        {{ t("weeklyLimit.structuredTab") }}
      </Button>
      <Button
        type="button"
        size="small"
        class="flex-1 min-h-10"
        :severity="setup.budgetMode.value === 'quick' ? 'primary' : 'secondary'"
        :variant="setup.budgetMode.value === 'quick' ? undefined : 'text'"
        @click="setup.budgetMode.value = 'quick'"
      >
        {{ t("weeklyLimit.singleTab") }}
      </Button>
    </div>

    <!-- Structured Category Limits -->
    <div v-if="setup.budgetMode.value === 'structured'" class="space-y-3">
      <p class="text-xs text-muted m-0">
        {{ t("weeklyLimit.structuredHint") }}
      </p>

      <div class="grid gap-2">
        <div
          v-for="row in setup.categoryLimitRows.value"
          :key="row.id"
          class="grid grid-cols-[1fr_110px_40px] sm:grid-cols-[1fr_150px_40px] gap-2 items-center"
        >
          <Select
            v-model="row.category"
            :options="categoryOptions"
            optionLabel="label"
            optionValue="value"
            fluid
          />

          <InputText
            v-model="row.amountText"
            inputmode="decimal"
            placeholder="0.00"
            fluid
          />

          <Button
            type="button"
            variant="text"
            severity="danger"
            rounded
            size="small"
            aria-label="Remove category limit"
            @click="setup.removeBudgetCategoryRow(row.id)"
          >
            <Trash2 :size="15" />
          </Button>
        </div>
      </div>

      <!-- Quick Starter Chips + Add Row -->
      <div class="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          severity="secondary"
          size="small"
          class="inline-flex items-center gap-1.5"
          @click="setup.addBudgetCategoryRow()"
        >
          <Plus :size="14" />
          <span>{{ t("weeklyLimit.addCategoryLimit") }}</span>
        </Button>

        <template v-if="unusedStarterCategories.length">
          <span class="text-[11px] text-muted ml-1">
            {{ t("onboarding.budgetStarterLabel") }}
          </span>
          <Button
            v-for="cat in unusedStarterCategories"
            :key="cat"
            type="button"
            severity="secondary"
            variant="outlined"
            size="small"
            class="text-xs py-1! px-2.5! text-text! inline-flex items-center gap-1.5"
            :style="categorySurfaceStyle(resolveCategoryColor(cat, store.categoryDefinitions))"
            @click="setup.addBudgetCategoryRow(cat)"
          >
            <CategoryIcon :category="cat" :size="14" bare />
            <span>+ {{ categoryLabel(cat) }}</span>
          </Button>
        </template>
      </div>
    </div>

    <!-- Single Overall Limit -->
    <div v-else class="space-y-2">
      <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
        <span>{{ t("weeklyLimit.limit") }} · NZD</span>
        <InputText
          v-model="setup.singleWeeklyLimit.value"
          inputmode="decimal"
          placeholder="e.g. 500.00"
          fluid
        />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Plus, Target, Trash2 } from "lucide-vue-next";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import { useExpenses } from "@/stores/expenses";
import { useI18n } from "@/lib/i18n";
import {
  categorySurfaceStyle,
  resolveCategoryColor,
} from "@/lib/category-style";
import CategoryIcon from "@/components/CategoryIcon.vue";
import type { OnboardingSetupContext } from "@/composables/useOnboardingSetup";

const props = defineProps<{
  setup: OnboardingSetupContext;
}>();

const store = useExpenses();
const { t, categoryLabel } = useI18n();

const starterSuggestions = [
  "Rent",
  "Groceries",
  "Bills",
  "Petrol",
  "Eating out",
  "Shopping",
  "Other",
];

const categoryOptions = computed(() =>
  props.setup.availableCategories.value.map((cat) => ({
    value: cat,
    label: categoryLabel(cat),
  })),
);

const unusedStarterCategories = computed(() => {
  const used = new Set(
    props.setup.categoryLimitRows.value.map((row) =>
      row.category.toLowerCase(),
    ),
  );
  return starterSuggestions.filter((cat) => !used.has(cat.toLowerCase()));
});
</script>
