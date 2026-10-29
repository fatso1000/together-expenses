<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from "vue";
import {
  MessageSquare,
  Sparkles,
  Send,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  Scissors,
  TrendingUp,
  ShieldAlert,
  Loader2,
} from "lucide-vue-next";
import { useAiChat } from "@/stores/ai-chat";
import { type AiChatBudgetMode } from "@/lib/ai-chat";
import { t } from "@/lib/i18n";

const chatStore = useAiChat();
const inputPrompt = ref("");
const chatContainer = ref<HTMLElement | null>(null);

const quickPrompts = [
  "Should I remove milk?",
  "What can I cut from my shopping cart?",
  "How can I earn/save the most this week?",
  "Audit my recurring bills & subscriptions",
];

const budgetModes: Array<{ id: AiChatBudgetMode; labelKey: string; desc: string }> = [
  { id: "low", labelKey: "ai.modes.low", desc: "Ruthless frugality & survival" },
  { id: "medium", labelKey: "ai.modes.medium", desc: "Balanced value & smart swaps" },
  { id: "high", labelKey: "ai.modes.high", desc: "Growth, abundance & strategic ROI" },
];

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

<template>
  <div class="ai-spending-chat-container">
    <!-- Mode Selector & Header -->
    <div class="chat-header-bar">
      <div class="chat-header-title">
        <MessageSquare :size="18" class="accent-icon" />
        <strong>Spending Advisor Chat</strong>
      </div>

      <div class="budget-mode-selector" role="radiogroup" aria-label="Budget Mode">
        <button
          v-for="mode in budgetModes"
          :key="mode.id"
          type="button"
          class="mode-btn"
          :class="{ active: chatStore.budgetMode === mode.id }"
          :title="mode.desc"
          @click="chatStore.setBudgetMode(mode.id)"
        >
          {{ mode.id.toUpperCase() }}
        </button>
      </div>

      <button
        v-if="chatStore.messages.length > 0"
        type="button"
        class="icon-btn-compact"
        title="Clear chat history"
        @click="onClear"
      >
        <Trash2 :size="14" />
      </button>
    </div>

    <!-- Quick Prompts Bar -->
    <div class="quick-prompts-bar">
      <button
        v-for="p in quickPrompts"
        :key="p"
        type="button"
        class="quick-prompt-pill"
        :disabled="chatStore.loading"
        @click="onQuickSelect(p)"
      >
        {{ p }}
      </button>
    </div>

    <!-- Chat Messages Window -->
    <div ref="chatContainer" class="chat-messages-window" role="log" aria-live="polite">
      <div v-if="chatStore.messages.length === 0" class="chat-empty-state">
        <Sparkles :size="28" class="sparkle-idle" />
        <p><strong>Ask anything about your expenses, shopping cart, or pacing.</strong></p>
        <span class="small muted">
          The advisor knows your weekly budget, recurring bills, and regular item purchase history.
        </span>
      </div>

      <div
        v-for="msg in chatStore.messages"
        :key="msg.id"
        class="chat-bubble-row"
        :class="msg.role"
      >
        <!-- User Bubble -->
        <div v-if="msg.role === 'user'" class="user-bubble">
          <p>{{ msg.text }}</p>
          <span v-if="msg.timestamp" class="chat-time">{{ formatTime(msg.timestamp) }}</span>
        </div>

        <!-- Assistant Structured Card -->
        <div v-else class="assistant-card">
          <!-- Out of Scope Refusal Banner -->
          <div v-if="msg.structured?.outOfScope" class="out-of-scope-banner">
            <ShieldAlert :size="16" />
            <span>{{ msg.structured.reply }}</span>
          </div>

          <div v-else>
            <!-- Verdict Badge -->
            <div class="verdict-banner">
              <Sparkles :size="16" class="verdict-icon" />
              <strong>{{ msg.structured?.verdict }}</strong>
            </div>

            <!-- Conversational Explanation -->
            <p class="assistant-text">{{ msg.text }}</p>

            <!-- Data Insights -->
            <div
              v-if="msg.structured?.dataInsights && msg.structured.dataInsights.length > 0"
              class="chat-insights-list"
            >
              <div
                v-for="(insight, idx) in msg.structured.dataInsights"
                :key="idx"
                class="insight-item"
              >
                <span class="bullet">•</span>
                <span>{{ insight }}</span>
              </div>
            </div>

            <!-- Action Plan Cards -->
            <div
              v-if="msg.structured?.actionPlan && msg.structured.actionPlan.length > 0"
              class="action-plan-grid"
            >
              <div
                v-for="(action, aIdx) in msg.structured.actionPlan"
                :key="aIdx"
                class="action-card"
                :class="action.action"
              >
                <div class="action-card-header">
                  <component :is="getActionIcon(action.action)" :size="14" />
                  <span class="action-tag">{{ action.action.toUpperCase() }}</span>
                  <span class="action-target">{{ action.target }}</span>
                  <span v-if="action.estimatedSavingsNZD > 0" class="savings-badge">
                    Save ~${{ action.estimatedSavingsNZD }} NZD
                  </span>
                </div>
                <p v-if="action.impact" class="action-impact">{{ action.impact }}</p>
              </div>
            </div>
          </div>
          <span v-if="msg.timestamp" class="chat-time assistant-time">{{ formatTime(msg.timestamp) }}</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="chatStore.loading" class="chat-bubble-row assistant">
        <div class="assistant-card loading-card">
          <Loader2 :size="18" class="spin-animation" />
          <span>Analyzing spendings and formulating critical advice…</span>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="chatStore.error" class="chat-error-banner" role="alert">
        <AlertTriangle :size="16" />
        <span>{{ chatStore.error }}</span>
      </div>
    </div>

    <!-- Input Box -->
    <form class="chat-input-bar" @submit.prevent="onSend">
      <input
        v-model="inputPrompt"
        type="text"
        placeholder="Ask about your spendings (e.g. should I remove milk?)..."
        :disabled="chatStore.loading"
        class="chat-text-input"
      />
      <button
        type="submit"
        class="chat-send-btn"
        :disabled="!inputPrompt.trim() || chatStore.loading"
        title="Send message"
      >
        <Send :size="16" />
      </button>
    </form>
  </div>
</template>
