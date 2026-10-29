import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";
import { useExpenses } from "@/stores/expenses";
import {
  type AiChatBudgetMode,
  type AiChatStructuredOutput,
  type ChatHistoryEntry,
  queryLocalFinancialChat,
  createGenericOutOfScopeResponse,
} from "@/lib/ai-chat";
import {
  isSpendingRelatedQuery,
  indexRegularPurchases,
  findRelevantPurchases,
  buildCompactFinancialSummary,
  formatKnowledgeForPrompt,
} from "@/lib/spending-knowledge";
import { categoryTotals, today } from "@/lib/finance";

export interface StoredChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  structured?: AiChatStructuredOutput;
  mode?: AiChatBudgetMode;
}

const STORAGE_CHAT_KEY = "expenses-ai-chat-history";
const STORAGE_MODE_KEY = "expenses-ai-chat-mode";

export const useAiChat = defineStore("ai-chat", () => {
  const expensesStore = useExpenses();

  const savedMode = (
    typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_MODE_KEY)
      : "medium"
  ) as AiChatBudgetMode;

  const validModes: AiChatBudgetMode[] = ["low", "medium", "high"];
  const initialMode: AiChatBudgetMode = validModes.includes(savedMode) ? savedMode : "medium";
  const budgetMode = ref<AiChatBudgetMode>(initialMode);

  const messages = ref<StoredChatMessage[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef("");

  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_CHAT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        messages.value = Array.isArray(parsed) ? parsed : [];
      }
    }
  } catch {
    // Fall back to empty history if localStorage is corrupted or unavailable
  }

  function persist(): void {
    try {
      if (typeof localStorage !== "undefined") {
        // Keep only recent 20 messages to control storage usage
        const recentMessages = messages.value.slice(-20);
        localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(recentMessages));
        localStorage.setItem(STORAGE_MODE_KEY, budgetMode.value);
      }
    } catch {
      // Gracefully handle storage quota or access issues
    }
  }

  function setBudgetMode(mode: AiChatBudgetMode): void {
    budgetMode.value = mode;
    persist();
  }

  function clearMessages(): void {
    messages.value = [];
    error.value = "";
    persist();
  }

  async function sendMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || loading.value) {
      return;
    }

    error.value = "";
    const userMessageId = crypto.randomUUID();
    messages.value.push({
      id: userMessageId,
      role: "user",
      text: trimmed,
      timestamp: Date.now(),
      mode: budgetMode.value,
    });
    persist();

    // Fast-path guardrail: reject non-spending questions immediately with zero token waste
    const scopeCheck = isSpendingRelatedQuery(trimmed);
    if (!scopeCheck.isAllowed) {
      const refusal = createGenericOutOfScopeResponse();
      messages.value.push({
        id: crypto.randomUUID(),
        role: "assistant",
        text: refusal.reply,
        timestamp: Date.now(),
        structured: refusal,
        mode: budgetMode.value,
      });
      persist();
      return;
    }

    loading.value = true;
    try {
      // Build synthesized spending context
      const regularIndex = indexRegularPurchases(expensesStore.expenses);
      const relevantItems = findRelevantPurchases(regularIndex, trimmed, 6);

      const now = new Date(`${today()}T12:00:00`).getTime();
      const end = new Date(`${expensesStore.weekEnd}T12:00:00`).getTime();
      const diffDays = Math.max(
        1,
        Math.min(7, Math.round((end - now) / (1000 * 60 * 60 * 24)) + 1),
      );

      const catTotals = categoryTotals(
        expensesStore.weekExpenses,
        expensesStore.allCategories,
      );

      const salaryWeeklyCents =
        (expensesStore as unknown as { salaryAverage?: number }).salaryAverage ??
        expensesStore.salary?.weeklyAverageNZD ??
        0;

      const nzSavingsCents =
        (expensesStore as unknown as { accountBalances?: { nz?: number } }).accountBalances?.nz ??
        expensesStore.nzBalance ??
        0;

      const summary = buildCompactFinancialSummary({
        weekTotalCents: expensesStore.weekTotal,
        weeklyLimitCents: expensesStore.weeklyLimit,
        daysRemaining: diffDays,
        monthTotalCents: expensesStore.monthTotal,
        salaryWeeklyCents,
        frequentWeeklyCommitmentCents: expensesStore.frequentWeeklyCommitment,
        topCategories: catTotals.slice(0, 4).map((c) => ({
          category: c.category,
          amountCents: c.amount,
        })),
        globalCapitalCents: expensesStore.accounts?.globalInitialNZD || 0,
        nzSavingsCents,
      });

      const formattedContext = formatKnowledgeForPrompt(summary, relevantItems);

      const historyEntries: ChatHistoryEntry[] = messages.value
        .slice(-6, -1)
        .map((m) => ({
          role: m.role,
          content: m.text,
        }));

      const structured = await queryLocalFinancialChat({
        userMessage: trimmed,
        mode: budgetMode.value,
        financialContext: formattedContext,
        history: historyEntries,
      });

      messages.value.push({
        id: crypto.randomUUID(),
        role: "assistant",
        text: structured.reply,
        timestamp: Date.now(),
        structured,
        mode: budgetMode.value,
      });
      persist();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to query local LLM.";
    } finally {
      loading.value = false;
    }
  }

  return {
    messages,
    budgetMode,
    loading,
    error,
    setBudgetMode,
    clearMessages,
    sendMessage,
  };
});
