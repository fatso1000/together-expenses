<template>
  <div class="flex flex-col bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius)] shadow-sm overflow-hidden h-[520px] sm:h-[580px] max-h-[85vh] mt-3 relative">
    <!-- Mode Selector & Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[var(--glass-card-bg)] border-b border-[var(--border)]">
      <div class="flex items-center gap-2 text-sm font-semibold text-text">
        <MessageSquare :size="18" class="text-accent shrink-0" />
        <strong>Spending Advisor Chat</strong>
      </div>

      <div
        class="flex items-center gap-1 p-0.5 rounded-full bg-white/5 border border-[var(--border)]"
        role="radiogroup"
        aria-label="Budget Mode"
      >
        <Button
          v-for="mode in budgetModes"
          :key="mode.id"
          type="button"
          size="small"
          rounded
          :severity="chatStore.budgetMode === mode.id ? 'primary' : 'secondary'"
          :variant="chatStore.budgetMode === mode.id ? undefined : 'text'"
          class="text-[11px]! font-bold! tracking-wider! px-2.5! py-1!"
          :title="mode.desc"
          @click="chatStore.setBudgetMode(mode.id)"
        >
          {{ mode.id.toUpperCase() }}
        </Button>
      </div>

      <Button
        v-if="chatStore.messages.length > 0"
        type="button"
        variant="text"
        severity="danger"
        rounded
        size="small"
        title="Clear chat history"
        aria-label="Clear chat history"
        @click="onClear"
      >
        <Trash2 :size="14" />
      </Button>
    </div>

    <!-- Quick Prompts Bar -->
    <div class="flex items-center gap-2 px-4 py-2.5 overflow-x-auto border-b border-[var(--border)] bg-black/5">
      <Button
        v-for="p in quickPrompts"
        :key="p"
        type="button"
        size="small"
        severity="secondary"
        variant="outlined"
        rounded
        class="whitespace-nowrap shrink-0 text-xs!"
        :disabled="chatStore.loading"
        @click="onQuickSelect(p)"
      >
        {{ p }}
      </Button>
    </div>

    <!-- Chat Messages Window -->
    <div
      ref="chatContainer"
      class="flex-1 overflow-y-auto p-3.5 sm:p-4.5 flex flex-col gap-3 sm:gap-4 scroll-smooth"
      role="log"
      aria-live="polite"
    >
      <div
        v-if="chatStore.messages.length === 0"
        class="m-auto text-center py-8 px-4 flex flex-col items-center gap-2.5 text-muted max-w-sm"
      >
        <Sparkles :size="28" class="text-accent animate-pulse" />
        <p class="m-0 text-sm text-text">
          <strong>Ask anything about your expenses, accounts, or financial health.</strong>
        </p>
        <span class="text-xs text-muted">
          The advisor knows your weekly budget, recurring bills, account balances, and cashflow health.
        </span>
      </div>

      <div
        v-for="msg in chatStore.messages"
        :key="msg.id"
        class="flex w-full"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <!-- User Bubble -->
        <div
          v-if="msg.role === 'user'"
          class="max-w-[90%] sm:max-w-[80%] bg-accent text-[var(--on-accent)] px-4 py-2.5 rounded-[18px_18px_4px_18px] shadow-sm text-sm leading-snug break-words flex flex-col gap-1"
        >
          <p class="m-0 text-sm">{{ msg.text }}</p>
          <span v-if="msg.timestamp" class="text-[10px] opacity-75 self-end">
            {{ formatTime(msg.timestamp) }}
          </span>
        </div>

        <!-- Assistant Structured Card -->
        <div
          v-else
          class="max-w-[95%] sm:max-w-[88%] bg-[var(--surface-card)] border border-[var(--border)] rounded-[4px_18px_18px_18px] p-4 shadow-sm flex flex-col gap-3 text-sm leading-relaxed"
        >
          <!-- Out of Scope Refusal Banner -->
          <div
            v-if="msg.structured?.outOfScope"
            class="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-border)] text-[var(--warning-colour)] text-xs font-medium"
          >
            <ShieldAlert :size="16" class="shrink-0" />
            <span>{{ msg.structured.reply }}</span>
          </div>

          <div v-else class="grid gap-3">
            <!-- Verdict Badge -->
            <div class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--success-bg)] border border-[var(--success-border)] text-accent text-xs font-semibold">
              <Sparkles :size="16" class="shrink-0 text-accent" />
              <strong>{{ msg.structured?.verdict }}</strong>
            </div>

            <!-- Conversational Explanation -->
            <p class="m-0 text-text whitespace-pre-wrap text-sm">{{ msg.text }}</p>

            <!-- Data Insights -->
            <div
              v-if="msg.structured?.dataInsights && msg.structured.dataInsights.length > 0"
              class="flex flex-col gap-1.5 px-3.5 py-2.5 bg-[var(--surface-card)] rounded-lg border border-[var(--border)] text-xs"
            >
              <div
                v-for="(insight, idx) in msg.structured.dataInsights"
                :key="idx"
                class="flex items-start gap-2"
              >
                <span class="text-accent font-bold leading-tight">•</span>
                <span>{{ insight }}</span>
              </div>
            </div>

            <!-- Action Plan Cards -->
            <div
              v-if="msg.structured?.actionPlan && msg.structured.actionPlan.length > 0"
              class="grid grid-cols-1 gap-2 mt-1"
            >
              <div
                v-for="(action, aIdx) in msg.structured.actionPlan"
                :key="aIdx"
                class="flex flex-col gap-1 px-3.5 py-2.5 rounded-xl border border-[var(--border)] border-l-4"
                :class="actionCardClass(action.action)"
              >
                <div class="flex items-center gap-2 flex-wrap text-xs">
                  <component :is="getActionIcon(action.action)" :size="14" />
                  <Tag
                    :value="action.action.toUpperCase()"
                    :severity="actionTagSeverity(action.action)"
                  />
                  <span class="font-semibold text-text">{{ action.target }}</span>
                  <Tag
                    v-if="action.estimatedSavingsNZD > 0"
                    :value="`Save ~$${action.estimatedSavingsNZD} NZD`"
                    severity="success"
                    class="ml-auto"
                  />
                </div>
                <p v-if="action.impact" class="m-0 text-xs text-muted leading-snug">
                  {{ action.impact }}
                </p>
              </div>
            </div>
          </div>

          <span v-if="msg.timestamp" class="text-[10px] text-muted opacity-80 self-end mt-1">
            {{ formatTime(msg.timestamp) }}
          </span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="chatStore.loading" class="flex w-full justify-start">
        <div class="flex items-center gap-3 px-4 py-3.5 rounded-[4px_18px_18px_18px] bg-[var(--surface-card)] border border-[var(--border)] text-muted italic text-sm">
          <Loader2 :size="18" class="animate-spin text-accent shrink-0" />
          <span>Analyzing spendings and formulating critical advice…</span>
        </div>
      </div>

      <!-- Error Message -->
      <Message v-if="chatStore.error" severity="error" :closable="false">
        {{ chatStore.error }}
      </Message>
    </div>

    <!-- Input Box -->
    <form
      class="flex items-center gap-2.5 px-3.5 sm:px-4.5 py-3 border-t border-[var(--border)] bg-[var(--glass-card-bg)]"
      @submit.prevent="onSend"
    >
      <InputText
        v-model="inputPrompt"
        placeholder="Ask about your spendings (e.g. should I remove milk?)..."
        :disabled="chatStore.loading"
        fluid
        class="rounded-full!"
      />
      <Button
        type="submit"
        rounded
        severity="primary"
        :disabled="!inputPrompt.trim() || chatStore.loading"
        title="Send message"
        aria-label="Send message"
        class="w-11! h-11! shrink-0! p-0!"
      >
        <Send :size="16" />
      </Button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from "vue";
import {
  MessageSquare,
  Sparkles,
  Send,
  Trash2,
  CheckCircle2,
  ArrowRightLeft,
  Scissors,
  TrendingUp,
  ShieldAlert,
  Loader2,
} from "lucide-vue-next";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
import Message from "primevue/message";
import { useAiChat } from "@/stores/ai-chat";
import { type AiChatBudgetMode } from "@/lib/ai-chat";

const chatStore = useAiChat();
const inputPrompt = ref("");
const chatContainer = ref<HTMLElement | null>(null);

const quickPrompts = [
  "What can I improve in my accounts?",
  "How is my account cashflow and runway?",
  "What can I cut from my shopping cart?",
  "Audit my recurring bills & subscriptions",
  "Should I remove milk?",
];

const budgetModes: Array<{ id: AiChatBudgetMode; labelKey: string; desc: string }> = [
  { id: "low", labelKey: "ai.modes.low", desc: "Ruthless frugality & survival" },
  { id: "medium", labelKey: "ai.modes.medium", desc: "Balanced value & smart swaps" },
  { id: "high", labelKey: "ai.modes.high", desc: "Growth, abundance & strategic ROI" },
];

function actionCardClass(action: string): string {
  switch (action) {
    case "cut":
      return "border-l-[var(--danger-colour)] bg-[var(--danger-bg)]";
    case "swap":
      return "border-l-[var(--warning-colour)] bg-[var(--warning-bg)]";
    case "keep":
      return "border-l-[var(--success-colour)] bg-[var(--success-bg)]";
    case "optimize":
      return "border-l-[var(--info-colour)] bg-[var(--info-bg)]";
    default:
      return "bg-[var(--surface-card-hover)]";
  }
}

function actionTagSeverity(
  action: string,
): "danger" | "warn" | "success" | "info" | "secondary" {
  switch (action) {
    case "cut":
      return "danger";
    case "swap":
      return "warn";
    case "keep":
      return "success";
    case "optimize":
      return "info";
    default:
      return "secondary";
  }
}

async function scrollToBottom() {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
}

watch(
  () => chatStore.messages.length,
  () => {
    void scrollToBottom();
  },
);

onMounted(() => {
  void scrollToBottom();
});

async function onSend() {
  const text = inputPrompt.value.trim();
  if (!text || chatStore.loading) return;
  inputPrompt.value = "";
  await chatStore.sendMessage(text);
  void scrollToBottom();
}

function onQuickSelect(prompt: string) {
  inputPrompt.value = prompt;
  void onSend();
}

function onClear() {
  if (typeof window !== "undefined" && typeof window.confirm === "function") {
    if (window.confirm("Clear chat history?")) {
      chatStore.clearMessages();
    }
  } else {
    chatStore.clearMessages();
  }
}

function getActionIcon(action: string) {
  switch (action) {
    case "cut":
      return Scissors;
    case "swap":
      return ArrowRightLeft;
    case "keep":
      return CheckCircle2;
    case "optimize":
      return TrendingUp;
    default:
      return Sparkles;
  }
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
</script>
