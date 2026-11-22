<template>
  <div
    v-if="!expenses.length"
    class="flex flex-col items-center justify-center text-center py-9 px-4 gap-3 text-muted"
  >
    <Receipt :size="32" />
    <h3 class="text-base font-bold text-text m-0">{{ t("expenses.noExpensesFound") }}</h3>
    <p class="text-sm m-0">{{ t("expenses.emptyHint") }}</p>
    <Button
      type="button"
      severity="secondary"
      class="mt-2"
      @click="store.openExpense()"
    >
      {{ t("common.addExpense") }}
    </Button>
  </div>

  <ul v-else class="list-none m-0 p-0 divide-y divide-[var(--border)]">
    <li
      v-for="expense in expenses"
      :key="expense.id"
      class="py-3 sm:py-3.5 first:pt-1.5 last:pb-0 min-w-0 grid gap-2"
    >
      <div class="flex items-start sm:items-center gap-2.5 sm:gap-3.5 min-w-0">
        <CategoryIcon :category="expense.category" class="mt-0.5 sm:mt-0" />
        <div class="flex-1 min-w-0 grid gap-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <strong class="text-sm font-semibold text-text break-words">
              {{ expense.merchant }}
            </strong>
            <Button
              type="button"
              size="small"
              rounded
              :severity="expense.accountId === 'nz' ? 'warn' : 'secondary'"
              variant="outlined"
              class="px-2! py-0.5! min-h-6! text-[10px]! font-semibold!"
              :title="`Click to switch to ${expense.accountId === 'nz' ? 'Global Account' : 'NZ Account (Savings)'}`"
              @click.stop="store.toggleExpenseAccount(expense.id)"
            >
              {{ expense.accountId === "nz" ? `🏦 ${t("accounts.nzShort")}` : `💳 ${t("accounts.globalShort")}` }}
            </Button>
          </div>
          <span class="text-xs text-muted break-words">
            {{ categoryLabel(expense.category) }} <span aria-hidden="true">·</span>
            <template v-if="expense.items?.length">
              {{
                expense.items.length === 1
                  ? t("expenses.singleItem")
                  : t("expenses.multipleItems", { count: expense.items.length })
              }}
              ·
            </template>
            {{ dateLabel(expense.date) }}
            <template v-if="expense.note && !compact">
              <br />{{ expense.note }}
            </template>
          </span>
        </div>

        <div class="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 shrink-0">
          <strong
            class="text-sm sm:text-base font-bold tabular-nums text-right whitespace-nowrap"
            :class="
              level(expense) === 'high'
                ? 'text-[var(--danger-colour)]'
                : level(expense) === 'low'
                  ? 'text-[var(--success-colour)]'
                  : 'text-text'
            "
            :title="
              level(expense) === 'normal'
                ? 'Typical amount'
                : `${level(expense)} compared with this month’s average`
            "
          >
            {{ store.displayMoney(expense.amount) }}
          </strong>

          <div class="flex items-center gap-0.5">
            <Button
              type="button"
              variant="text"
              severity="secondary"
              rounded
              size="small"
              class="w-8! h-8! p-0!"
              :aria-label="`Repeat ${expense.merchant}`"
              @click="
                store.openExpense(
                  expense.items?.length ? 'items' : 'quick',
                  expense,
                )
              "
            >
              <Copy :size="15" />
            </Button>
            <Button
              type="button"
              variant="text"
              severity="secondary"
              rounded
              size="small"
              class="w-8! h-8! p-0!"
              :aria-label="`Edit ${expense.merchant}`"
              @click="store.editor = expense"
            >
              <Pencil :size="15" />
            </Button>
            <Button
              v-if="!compact"
              type="button"
              variant="text"
              severity="danger"
              rounded
              size="small"
              class="w-8! h-8! p-0!"
              :disabled="deleting === expense.id"
              :aria-label="`Delete ${expense.merchant}`"
              @click="confirmingId = expense.id"
            >
              <Trash2 :size="15" />
            </Button>
          </div>
        </div>
      </div>

      <div
        v-if="confirmingId === expense.id"
        class="p-2.5 rounded-xl bg-[var(--pill-bg)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-2"
      >
        <span class="text-xs text-text">
          {{ t("expenses.confirmDelete", { merchant: expense.merchant, amount: store.displayMoney(expense.amount) }) }}
        </span>
        <div class="flex items-center gap-2 ml-auto">
          <Button type="button" severity="secondary" size="small" @click="confirmingId = ''">
            {{ t("common.cancel") }}
          </Button>
          <Button
            type="button"
            severity="danger"
            size="small"
            :disabled="deleting === expense.id"
            @click="remove(expense)"
          >
            {{ t("common.delete") }}
          </Button>
        </div>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { shallowRef, computed } from "vue";
import { Pencil, Trash2, Receipt, Copy } from "lucide-vue-next";
import Button from "primevue/button";
import CategoryIcon from "@/components/CategoryIcon.vue";
import type { Expense } from "@/lib/types";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { useI18n } from "@/lib/i18n";

defineProps<{ expenses: Expense[]; compact?: boolean }>();

const store = useExpenses();
const { locale, t, categoryLabel } = useI18n();
const deleting = shallowRef("");
const confirmingId = shallowRef("");
const average = computed(() =>
  store.monthExpenses.length
    ? store.monthTotal / store.monthExpenses.length
    : 0,
);

function level(expense: Expense) {
  if (!average.value) return "normal";
  return expense.amount > average.value * 1.5
    ? "high"
    : expense.amount < average.value * 0.5
      ? "low"
      : "normal";
}

async function remove(expense: Expense) {
  deleting.value = expense.id;
  try {
    await store.removeExpense(expense);
    confirmingId.value = "";
  } catch (reason) {
    store.error = friendlyError(reason);
  } finally {
    deleting.value = "";
  }
}

function dateLabel(date: string) {
  const lang = locale.value === "es" ? "es-AR" : "en-US";
  return new Date(`${date}T12:00:00`).toLocaleDateString(lang, {
    day: "numeric",
    month: "short",
  });
}
</script>
