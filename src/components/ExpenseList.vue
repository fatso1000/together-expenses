<script setup lang="ts">
import { shallowRef, computed } from "vue";
import { Pencil, Trash2, Receipt, Copy } from "lucide-vue-next";
import CategoryIcon from "@/components/CategoryIcon.vue";
import type { Expense } from "@/lib/types";
import { money } from "@/lib/finance";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { useI18n } from "@/lib/i18n";
defineProps<{ expenses: Expense[]; compact?: boolean }>();
const store = useExpenses();
const { locale, t, categoryLabel } = useI18n();
const deleting = shallowRef("");
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
  if (
    !confirm(
      `Delete “${expense.merchant}” (${store.displayMoney(expense.amount)})?`,
    )
  )
    return;
  deleting.value = expense.id;
  try {
    await store.removeExpense(expense);
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
<template>
  <div v-if="!expenses.length" class="empty-state">
    <Receipt :size="32" />
    <h3>{{ t('expenses.noExpensesFound') }}</h3>
    <p>{{ t('expenses.emptyHint') }}</p>
    <button class="secondary" @click="store.openExpense()">{{ t('common.addExpense') }}</button>
  </div>
  <ul v-else class="expense-list">
    <li v-for="expense in expenses" :key="expense.id">
      <CategoryIcon :category="expense.category" />
      <div class="expense-description">
        <div class="expense-title-row">
          <strong>{{ expense.merchant }}</strong>
          <button
            type="button"
            class="account-tag"
            :class="expense.accountId === 'nz' ? 'nz' : 'global'"
            :title="`Click to switch to ${expense.accountId === 'nz' ? 'Global Account' : 'NZ Account (Savings)'}`"
            @click.stop="store.toggleExpenseAccount(expense.id)"
          >
            {{ expense.accountId === "nz" ? "🏦 NZ Savings" : "💳 Global" }}
          </button>
        </div>
        <span
          >{{ categoryLabel(expense.category) }} <span aria-hidden="true">·</span>
          <template v-if="expense.items?.length"
            >{{ expense.items.length === 1 ? t('expenses.singleItem') : t('expenses.multipleItems', { count: expense.items.length }) }} ·
          </template>
          {{ dateLabel(expense.date)
          }}<template v-if="expense.note && !compact"
            ><br />{{ expense.note }}</template
          ></span
        >
      </div>
      <strong
        class="expense-amount"
        :data-level="level(expense)"
        :title="
          level(expense) === 'normal'
            ? 'Typical amount'
            : `${level(expense)} compared with this month’s average`
        "
        >{{ store.displayMoney(expense.amount) }}</strong
      >
      <div class="row-actions">
        <button
          class="icon-button"
          :aria-label="`Repeat ${expense.merchant}`"
          @click="
            store.openExpense(
              expense.items?.length ? 'items' : 'quick',
              expense,
            )
          "
        >
          <Copy :size="16" />
        </button>
        <button
          class="icon-button"
          :aria-label="`Edit ${expense.merchant}`"
          @click="store.editor = expense"
        >
          <Pencil :size="16" /></button
        ><button
          v-if="!compact"
          class="icon-button"
          :disabled="deleting === expense.id"
          :aria-label="`Delete ${expense.merchant}`"
          @click="remove(expense)"
        >
          <Trash2 :size="16" />
        </button>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.expense-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.expense-title-row strong {
  word-break: break-word;
}

.account-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  min-height: 24px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  user-select: none;
  background: #edf5f0;
  color: #27523f;
  border-color: #cde0d5;
}

.account-tag:hover {
  background: #dfeee4;
}

.account-tag.nz {
  background: #fbf5e6;
  color: #8c5b1b;
  border-color: #ebdcb9;
}

.account-tag.nz:hover {
  background: #f5eccf;
}
</style>
