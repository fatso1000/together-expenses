<template>
  <Card class="mb-6" :data-status="store.weeklyLimit ? status : 'none'">
    <template #header>
      <div class="flex flex-wrap items-start justify-between gap-3 p-5 pb-0">
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0"
            :class="
              status === 'over'
                ? 'bg-[var(--danger-bg)] text-[var(--danger-colour)]'
                : status === 'near'
                  ? 'bg-[var(--warning-bg)] text-[var(--warning-colour)]'
                  : 'bg-[var(--surface)] text-text'
            "
          >
            <AlertCircle v-if="status === 'over'" :size="22" />
            <AlertTriangle v-else-if="status === 'near'" :size="22" />
            <Target v-else :size="22" />
          </div>
          <div>
            <h2 class="text-lg sm:text-xl font-bold m-0 text-text">
              Weekly Spending Limit
            </h2>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Button
            :aria-label="t('weeklyLimit.configureBudget')"
            type="button"
            size="small"
            @click="openEdit"
          >
            {{ t("weeklyLimit.configureBudget") }}
          </Button>
        </div>
      </div>
    </template>

    <template #content>
      <div class="flex flex-col gap-4">
        <!-- Active Limit State -->
        <template v-if="store.weeklyLimit">
          <!-- High-Impact Status Alert Banner -->
          <div
            class="flex items-center gap-3 px-4 py-3 rounded-xl border text-xs"
            :class="
              status === 'over'
                ? 'bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger-colour)]'
                : status === 'near'
                  ? 'bg-[var(--warning-bg)] border-[var(--warning-border)] text-[var(--warning-colour)]'
                  : 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-colour)]'
            "
            role="status"
          >
            <AlertCircle v-if="status === 'over'" :size="18" class="shrink-0" />
            <AlertTriangle v-else-if="status === 'near'" :size="18" class="shrink-0" />
            <CheckCircle2 v-else :size="18" class="shrink-0" />

            <div class="flex flex-col gap-0.5">
              <template v-if="status === 'over'">
                <strong class="text-sm font-bold">
                  {{
                    t("weeklyLimit.exceededBy", {
                      amount: store.displayMoney(diff),
                    })
                  }}
                </strong>
                <span>
                  {{ t("weeklyLimit.spentOfLimit", { percent: progress }) }}
                </span>
              </template>
              <template v-else-if="status === 'near'">
                <strong class="text-sm font-bold">
                  {{
                    t("weeklyLimit.approaching", {
                      amount: store.displayMoney(diff),
                    })
                  }}
                </strong>
                <span>
                  {{ progress }}% used ·
                  {{
                    t("weeklyLimit.daysRemaining", {
                      count: daysRemaining,
                      unit:
                        daysRemaining === 1
                          ? t("weeklyLimit.daysRemainingSingle")
                          : t("weeklyLimit.daysRemainingPlural"),
                    })
                  }}
                </span>
              </template>
              <template v-else>
                <strong class="text-sm font-bold">
                  {{
                    t("weeklyLimit.onTrack", { amount: store.displayMoney(diff) })
                  }}
                </strong>
                <span>
                  {{
                    t("weeklyLimit.onTrackDays", {
                      percent: progress,
                      days: `${daysRemaining} ${daysRemaining === 1 ? t("weeklyLimit.daysRemainingSingle") : t("weeklyLimit.daysRemainingPlural")}`,
                    })
                  }}
                </span>
              </template>
            </div>
          </div>

          <!-- Weekly Salary vs Budget vs Spend Stats -->
          <div
            v-if="weeklySalary > 0"
            class="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
          >
            <div class="grid gap-0.5">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {{ t("weeklyLimit.salaryLabel") }}
              </span>
              <strong class="text-sm font-bold text-text">
                {{ store.displayMoney(weeklySalary) }}
              </strong>
            </div>
            <div class="grid gap-0.5">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {{ t("weeklyLimit.limit") }}
              </span>
              <strong class="text-sm font-bold text-muted">
                {{ store.displayMoney(store.weeklyLimit) }}
              </strong>
            </div>
            <div class="grid gap-0.5">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {{ t("weeklyLimit.targetSavings") }}
              </span>
              <strong class="text-sm font-bold text-accent inline-flex items-center gap-1.5">
                <span>{{ store.displayMoney(targetSavings) }}</span>
                <Tag :value="`${savingsRate}%`" severity="success" />
              </strong>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <!-- Hero Spending Numbers -->
            <div class="flex flex-wrap items-baseline justify-between gap-3 py-1">
              <div class="flex flex-col">
                <span class="text-xs font-medium text-muted">{{ t("weeklyLimit.spent") }}</span>
                <strong
                  class="text-3xl font-extrabold tracking-tight tabular-nums"
                  :class="status === 'over' ? 'text-[var(--danger-colour)]' : 'text-text'"
                >
                  {{ store.displayMoney(store.weekTotal) }}
                </strong>
              </div>
              <div class="flex flex-col text-right">
                <span class="text-xs font-medium text-muted">{{ t("weeklyLimit.limit") }}</span>
                <strong class="text-xl font-bold tabular-nums text-muted">
                  {{ store.displayMoney(store.weeklyLimit) }}
                </strong>
              </div>
            </div>

            <!-- Gauge Progress Bar -->
            <div class="relative w-full h-3.5 rounded-lg bg-[var(--border)] overflow-hidden">
              <div
                class="h-full rounded-lg transition-[width] duration-300 ease-out"
                :class="
                  status === 'over'
                    ? 'bg-[var(--danger-colour)]'
                    : status === 'near'
                      ? 'bg-[var(--warning-colour)]'
                      : 'bg-[var(--success-colour)]'
                "
                :style="{ width: `${Math.min(100, progress)}%` }"
              />
              <div
                class="absolute top-0 bottom-0 left-[80%] w-0.5 bg-muted"
                title="80% Warning threshold"
              />
            </div>
          </div>

          <!-- Structured Category Budgets Breakdown -->
          <div v-if="store.categoryBudgetProgress.length" class="grid gap-2.5 pt-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1.5 text-xs font-bold text-text">
                <Layers :size="15" />
                <span>{{ t("weeklyLimit.structuredTitle") }}</span>
              </span>
              <span
                v-if="store.frequentWeeklyCommitment > 0"
                class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-[var(--pill-bg)] text-text"
              >
                <Receipt :size="12" />
                <span>
                  {{
                    t("weeklyLimit.frequentBillsCommitment", {
                      amount: store.displayMoney(store.frequentWeeklyCommitment),
                    })
                  }}
                </span>
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <div
                v-for="cat in store.categoryBudgetProgress"
                :key="cat.category"
                class="p-3 rounded-xl border grid gap-1.5"
                :class="
                  cat.status === 'over'
                    ? 'bg-[var(--danger-bg)] border-[var(--danger-border)]'
                    : 'bg-[var(--surface-card)] border-[var(--border)]'
                "
              >
                <div class="flex items-center justify-between gap-2 text-xs">
                  <div class="flex items-center gap-1.5 font-semibold text-text min-w-0">
                    <CategoryIcon :category="cat.category" />
                    <span class="truncate">{{ categoryLabel(cat.category) }}</span>
                  </div>
                  <span class="text-[11px] text-muted tabular-nums shrink-0">
                    {{ store.displayMoney(cat.spent) }} / {{ store.displayMoney(cat.limit) }}
                  </span>
                </div>

                <div class="w-full h-1.5 rounded bg-[var(--border)] overflow-hidden">
                  <div
                    class="h-full rounded transition-[width] duration-300"
                    :class="
                      cat.status === 'over'
                        ? 'bg-[var(--danger-colour)]'
                        : cat.status === 'near'
                          ? 'bg-[var(--warning-colour)]'
                          : 'bg-[var(--success-colour)]'
                    "
                    :style="{ width: `${Math.min(100, cat.percent)}%` }"
                  />
                </div>

                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-muted">{{ Math.round(cat.percent) }}%</span>
                  <span
                    class="font-semibold"
                    :class="
                      cat.status === 'over'
                        ? 'text-[var(--danger-colour)]'
                        : 'text-[var(--success-colour)]'
                    "
                  >
                    {{
                      cat.status === "over"
                        ? t("weeklyLimit.overBudget", {
                            amount: store.displayMoney(cat.spent - cat.limit),
                          })
                        : t("weeklyLimit.leftBudget", {
                            amount: store.displayMoney(cat.remaining),
                          })
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Daily Pacing Advice -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-muted">
            <div class="flex items-center gap-1.5">
              <Tag
                v-if="status === 'over'"
                :value="t('weeklyLimit.overpace')"
                severity="danger"
              />
              <template v-else>
                <TrendingUp :size="15" />
                <span>
                  {{
                    t("weeklyLimit.dailyBudgetRemaining", {
                      amount: store.displayMoney(dailyAllowance),
                      days: `${daysRemaining} ${daysRemaining === 1 ? t("weeklyLimit.daysRemainingSingle") : t("weeklyLimit.daysRemainingPlural")}`,
                    })
                  }}
                </span>
              </template>
            </div>
          </div>
        </template>

        <!-- Empty State: No Limit Set -->
        <div
          v-else-if="!editing"
          class="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--surface)] border border-dashed border-[var(--border)]"
        >
          <p class="text-sm text-muted m-0">{{ t("weeklyLimit.emptyHint") }}</p>
          <Button
            type="button"
            severity="primary"
            class="inline-flex items-center gap-2"
            @click="openEdit"
          >
            <Target :size="17" />
            <span>{{ t("weeklyLimit.setLimitBtn") }}</span>
          </Button>
        </div>

        <!-- Configure Budget & Salary Drawer -->
        <Drawer
          v-model:visible="editing"
          position="bottom"
          class="budget-drawer-dialog w-full! max-w-full!"
          style="height: auto; max-height: 92dvh"
          :dismissable="!busy"
          :closeOnEscape="!busy"
        >
          <template #header>
            <h3 class="text-lg font-bold m-0">{{ t("weeklyLimit.configureTitle") }}</h3>
          </template>

          <template #closebutton="{ closeCallback }">
            <Button
              type="button"
              variant="text"
              severity="secondary"
              rounded
              aria-label="Close"
              :disabled="busy"
              @click="closeCallback"
            >
              <X :size="18" />
            </Button>
          </template>

          <div class="p-5 grid gap-4">
            <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
              <span>{{ t("weeklyLimit.salaryField") }}</span>
              <InputText
                v-model="salaryAmount"
                inputmode="decimal"
                placeholder="e.g. 1200.00"
                fluid
              />
            </label>
            <p class="text-xs text-muted -mt-2 m-0">
              {{ t("weeklyLimit.salaryHint") }}
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
                <label for="limit-pay-day">{{ t("weeklyLimit.salaryPaymentDay") }}</label>
                <Select
                  v-model="payDayOfWeek"
                  inputId="limit-pay-day"
                  :options="dayOptions"
                  optionLabel="label"
                  optionValue="value"
                  fluid
                />
              </div>
              <div class="flex flex-col gap-1.5 text-xs font-medium text-muted">
                <label for="limit-pay-date">{{ t("weeklyLimit.pickFromDate") }}</label>
                <DatePicker
                  v-model="selectedPayDate"
                  inputId="limit-pay-date"
                  dateFormat="yy-mm-dd"
                  showIcon
                  iconDisplay="input"
                  fluid
                />
              </div>
            </div>
            <p class="text-xs text-muted -mt-2 m-0">
              {{ t("weeklyLimit.paymentDayHint") }}
            </p>

            <hr class="border-0 border-t border-[var(--border)] my-1" />

            <!-- Mode Segmented Switch -->
            <div
              class="flex gap-1 p-1 rounded-xl bg-[var(--input-bg)] border border-[var(--border)]"
              aria-label="Budget Mode"
            >
              <Button
                type="button"
                size="small"
                class="flex-1"
                :severity="editMode === 'structured' ? 'primary' : 'secondary'"
                :variant="editMode === 'structured' ? undefined : 'text'"
                @click="editMode = 'structured'"
              >
                {{ t("weeklyLimit.structuredTab") }}
              </Button>
              <Button
                type="button"
                size="small"
                class="flex-1"
                :severity="editMode === 'quick' ? 'primary' : 'secondary'"
                :variant="editMode === 'quick' ? undefined : 'text'"
                @click="editMode = 'quick'"
              >
                {{ t("weeklyLimit.singleTab") }}
              </Button>
            </div>

            <!-- Structured Mode -->
            <div v-if="editMode === 'structured'" class="grid gap-3">
              <p class="text-xs text-muted m-0">
                {{ t("weeklyLimit.structuredHint") }}
              </p>

              <div class="grid gap-2">
                <div
                  v-for="(row, idx) in localCategoryLimits"
                  :key="idx"
                  class="grid grid-cols-[1fr_110px_36px] sm:grid-cols-[1fr_140px_36px] gap-2 items-center"
                >
                  <Select
                    v-model="row.category"
                    :options="categoryOptions"
                    optionLabel="label"
                    optionValue="value"
                    fluid
                  />

                  <InputText
                    :modelValue="(row.amount / 100).toFixed(2)"
                    inputmode="decimal"
                    placeholder="0.00"
                    fluid
                    @update:modelValue="onLimitAmountChange(row, $event)"
                  />

                  <Button
                    type="button"
                    variant="text"
                    severity="danger"
                    rounded
                    size="small"
                    title="Remove category"
                    aria-label="Remove category"
                    @click="removeCategoryRow(idx)"
                  >
                    <Trash2 :size="15" />
                  </Button>
                </div>
              </div>

              <div>
                <Button
                  type="button"
                  severity="secondary"
                  size="small"
                  class="inline-flex items-center gap-1.5"
                  @click="addCategoryRow"
                >
                  <Plus :size="14" />
                  <span>{{ t("weeklyLimit.addCategoryLimit") }}</span>
                </Button>
              </div>

              <div class="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm">
                <span class="text-text">{{ t("weeklyLimit.totalWeeklyLimit") }}</span>
                <strong class="text-base font-bold text-text">
                  {{ store.displayMoney(structuredTotal) }}
                </strong>
              </div>
            </div>

            <!-- Quick Single Limit Mode -->
            <div v-else class="grid gap-2">
              <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
                <span>{{ t("weeklyLimit.limit") }} · NZD</span>
                <InputText
                  v-model="amount"
                  inputmode="decimal"
                  required
                  placeholder="e.g. 500.00"
                  fluid
                />
              </label>
            </div>

            <Message v-if="error" severity="error" :closable="false">
              {{ error }}
            </Message>

            <div class="flex flex-wrap items-center gap-3 pt-1">
              <Button type="button" severity="primary" :disabled="busy" @click="saveBudget">
                {{ t("weeklyLimit.saveBudget") }}
              </Button>
              <Button
                type="button"
                severity="secondary"
                variant="outlined"
                @click="editing = false"
              >
                {{ t("common.cancel") }}
              </Button>
              <Button
                v-if="store.weeklyLimit"
                type="button"
                severity="danger"
                variant="text"
                class="ml-auto"
                :disabled="busy"
                @click="removeLimit"
              >
                {{ t("common.delete") }}
              </Button>
            </div>
          </div>
        </Drawer>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed, shallowRef, ref } from "vue";
import {
  Target,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Layers,
  Plus,
  Receipt,
  X,
} from "lucide-vue-next";
import Card from "primevue/card";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Tag from "primevue/tag";
import Message from "primevue/message";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { parseMoney, parseOptionalMoney, today, parseIsoDate, formatIsoDate } from "@/lib/finance";
import { t, categoryLabel } from "@/lib/i18n";
import type { CategoryLimit, DayOfWeek } from "@/lib/types";
import CategoryIcon from "@/components/CategoryIcon.vue";

const store = useExpenses();
const editing = shallowRef(false);
const editMode = shallowRef<"structured" | "quick">("structured");
const amount = shallowRef("");
const salaryAmount = shallowRef("");
const payDayOfWeek = ref<DayOfWeek>(1);
const payDate = ref<string>("");
const error = shallowRef("");
const busy = shallowRef(false);

const localCategoryLimits = ref<CategoryLimit[]>([]);

const dayOptions = computed(() => [
  { value: 1 as DayOfWeek, label: t("days.1") },
  { value: 2 as DayOfWeek, label: t("days.2") },
  { value: 3 as DayOfWeek, label: t("days.3") },
  { value: 4 as DayOfWeek, label: t("days.4") },
  { value: 5 as DayOfWeek, label: t("days.5") },
  { value: 6 as DayOfWeek, label: t("days.6") },
  { value: 0 as DayOfWeek, label: t("days.0") },
]);

const categoryOptions = computed(() =>
  store.allCategories.map((cat) => ({
    value: cat,
    label: categoryLabel(cat),
  })),
);

const selectedPayDate = computed<Date | null>({
  get() {
    return parseIsoDate(payDate.value);
  },
  set(val: Date | null) {
    payDate.value = formatIsoDate(val);
    if (val instanceof Date && !Number.isNaN(val.getTime())) {
      payDayOfWeek.value = val.getDay() as DayOfWeek;
    }
  },
});

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

const weeklySalary = computed(() => store.salary.weeklyAverageNZD ?? 0);
const targetSavings = computed(() =>
  weeklySalary.value > store.weeklyLimit
    ? weeklySalary.value - store.weeklyLimit
    : 0,
);
const savingsRate = computed(() =>
  weeklySalary.value > 0
    ? Math.round((targetSavings.value / weeklySalary.value) * 100)
    : 0,
);

const structuredTotal = computed(() =>
  localCategoryLimits.value.reduce((acc, l) => acc + l.amount, 0),
);

function onLimitAmountChange(row: CategoryLimit, value: string | undefined) {
  try {
    row.amount = parseOptionalMoney(value ?? "0");
  } catch {
    // Wait for valid decimal input
  }
}

function openEdit() {
  amount.value = store.weeklyLimit ? (store.weeklyLimit / 100).toFixed(2) : "";
  salaryAmount.value = weeklySalary.value
    ? (weeklySalary.value / 100).toFixed(2)
    : "";
  payDayOfWeek.value = (store.salary.payDayOfWeek ?? 1) as DayOfWeek;
  payDate.value = store.salary.payDate ?? "";

  if (store.categoryLimits.length) {
    localCategoryLimits.value = store.categoryLimits.map((l) => ({ ...l }));
  } else {
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
    (c) =>
      !localCategoryLimits.value.some(
        (l) => l.category.toLowerCase() === c.toLowerCase(),
      ),
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
      await store.saveWeeklyBudgetAndSalary(
        salCents,
        sum,
        validLimits,
        payDayOfWeek.value,
        payDate.value.trim() || undefined,
      );
    } else {
      const totalCents = parseMoney(amount.value);
      await store.saveWeeklyBudgetAndSalary(
        salCents,
        totalCents,
        undefined,
        payDayOfWeek.value,
        payDate.value.trim() || undefined,
      );
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
    await store.saveWeeklyBudgetAndSalary(
      store.salary.weeklyAverageNZD,
      0,
      [],
      store.salary.payDayOfWeek,
      store.salary.payDate,
    );
    editing.value = false;
  } catch (reason) {
    error.value = friendlyError(reason);
  } finally {
    busy.value = false;
  }
}
</script>
