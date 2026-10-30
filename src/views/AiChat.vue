<script setup lang="ts">
import { shallowRef, onMounted } from "vue";
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from "lucide-vue-next";
import {
  checkOllamaStatus,
  getOllamaHost,
  getOllamaModel,
  isLocalDesktopApp,
  type OllamaStatus,
} from "@/lib/ollama";
import AiSpendingChat from "@/components/AiSpendingChat.vue";
import { t } from "@/lib/i18n";

const isDesktop = isLocalDesktopApp();
const status = shallowRef<OllamaStatus | null>(null);
const checkingStatus = shallowRef(false);
const showSetupGuide = shallowRef(false);

async function refreshOllamaStatus() {
  if (!isDesktop) return;
  checkingStatus.value = true;
  try {
    status.value = await checkOllamaStatus();
  } catch {
    status.value = {
      ok: false,
      host: getOllamaHost(),
      model: getOllamaModel(),
      availableModels: [],
      isModelPresent: false,
    };
  } finally {
    checkingStatus.value = false;
  }
}

onMounted(() => {
  if (isDesktop) {
    void refreshOllamaStatus();
  }
});
</script>

<template>
  <div class="ai-chat-page">
    <!-- Non-desktop hosted web warning -->
    <div v-if="!isDesktop" class="panel web-ai-disabled-box" role="alert">
      <ShieldAlert :size="24" class="alert-icon" />
      <div>
        <h3>{{ t('ai.disabledHosted') }}</h3>
        <p class="small muted">
          To ensure 100% privacy, the AI financial chat runs entirely on your machine via local Ollama. Download or run the desktop version to use Gemma.
        </p>
      </div>
    </div>

    <template v-else>
      <!-- Top Ollama & Model Status Bar -->
      <section class="panel ai-chat-topbar" aria-label="AI Service Status">
        <div class="ai-chat-status-info">
          <div class="advisor-icon-badge">
            <Sparkles :size="20" />
          </div>
          <div>
            <h2>{{ t('chat.title') }}</h2>
            <p class="small muted">
              Private, on-device intelligence powered by local Gemma ({{ getOllamaModel() }})
            </p>
          </div>
        </div>

        <div class="advisor-status-wrap">
          <button
            class="status-pill-btn"
            :class="{ connected: status?.ok, offline: !status?.ok }"
            type="button"
            :title="status?.ok ? 'Connected to local Ollama daemon' : 'Click to see Ollama setup guide'"
            @click="showSetupGuide = !showSetupGuide"
          >
            <span class="status-dot"></span>
            <span>{{ status?.ok ? `${status.model} Ready` : 'Ollama Offline' }}</span>
            <ChevronDown v-if="!showSetupGuide" :size="13" />
            <ChevronUp v-else :size="13" />
          </button>
          <button
            class="icon-button"
            title="Refresh Ollama connection"
            type="button"
            :disabled="checkingStatus"
            @click="refreshOllamaStatus"
          >
            <RefreshCw :size="14" :class="{ spinning: checkingStatus }" />
          </button>
        </div>
      </section>

      <!-- Collapsible Setup Guide when Offline or Toggled -->
      <div v-if="showSetupGuide" class="setup-guide-box">
        <strong>Running Gemma 4 Locally with Ollama:</strong>
        <ol class="small">
          <li>Install Ollama from <a href="https://ollama.com" target="_blank" rel="noopener">ollama.com</a>.</li>
          <li>Pull the Gemma model: <code>ollama pull {{ getOllamaModel() }}</code></li>
          <li>Start Ollama allowing browser requests: <code>OLLAMA_ORIGINS="*" ollama serve</code></li>
          <li>Tap the refresh button above to connect.</li>
        </ol>
        <p v-if="status?.error" class="small error-text">{{ status.error }}</p>
      </div>

      <!-- Main Chat Component -->
      <AiSpendingChat />
    </template>
  </div>
</template>
