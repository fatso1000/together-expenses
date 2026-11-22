<template>
  <div class="flex flex-col gap-4">
    <!-- Non-desktop hosted web warning -->
    <div
      v-if="!isDesktop"
      class="flex items-start gap-4 p-6 rounded-2xl border border-[var(--border)] border-l-4 border-l-accent bg-[var(--surface)] shadow-sm"
      role="alert"
    >
      <ShieldAlert :size="24" class="text-accent shrink-0" />
      <div class="grid gap-1">
        <h3 class="text-base font-bold text-text m-0">{{ t("ai.disabledHosted") }}</h3>
        <p class="text-xs text-muted m-0">
          To ensure 100% privacy, the AI financial chat runs entirely on your machine via local Ollama. Download or run the desktop version to use Gemma.
        </p>
      </div>
    </div>

    <template v-else>
      <!-- Compact Ollama & Model Status Strip -->
      <section
        class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-2.5"
        aria-label="AI Service Status"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-[var(--success-bg)] text-accent flex items-center justify-center shrink-0">
            <Sparkles :size="17" />
          </div>
          <p class="text-xs text-muted m-0 truncate">
            Local Gemma · <strong class="text-text font-semibold">{{ getOllamaModel() }}</strong>
          </p>
        </div>

        <div class="flex items-center gap-1.5 ml-auto">
          <Button
            type="button"
            size="small"
            rounded
            :severity="status?.ok ? 'success' : 'danger'"
            variant="outlined"
            :title="status?.ok ? 'Connected to local Ollama daemon' : 'Click to see Ollama setup guide'"
            class="inline-flex items-center gap-1.5 text-xs!"
            @click="showSetupGuide = !showSetupGuide"
          >
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="status?.ok ? 'bg-[var(--success-colour)]' : 'bg-[var(--danger-colour)]'"
            />
            <span>{{ status?.ok ? `${status.model} Ready` : "Ollama Offline" }}</span>
            <ChevronDown v-if="!showSetupGuide" :size="13" />
            <ChevronUp v-else :size="13" />
          </Button>
          <Button
            type="button"
            variant="text"
            severity="secondary"
            rounded
            size="small"
            title="Refresh Ollama connection"
            aria-label="Refresh Ollama connection"
            :disabled="checkingStatus"
            @click="refreshOllamaStatus"
          >
            <RefreshCw :size="14" :class="{ 'animate-spin': checkingStatus }" />
          </Button>
        </div>
      </section>

      <!-- Collapsible Setup Guide when Offline or Toggled -->
      <div
        v-if="showSetupGuide"
        class="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] grid gap-2 text-xs"
      >
        <strong class="text-text">Running Gemma 4 Locally with Ollama:</strong>
        <ol class="m-0 pl-5 grid gap-1 text-muted">
          <li>
            Install Ollama from
            <a href="https://ollama.com" target="_blank" rel="noopener" class="text-accent underline">ollama.com</a>.
          </li>
          <li>
            Pull the Gemma model:
            <code class="px-1.5 py-0.5 rounded bg-[var(--input-bg)] text-text font-mono text-[11px]">
              ollama pull {{ getOllamaModel() }}
            </code>
          </li>
          <li>
            Start Ollama allowing browser requests:
            <code class="px-1.5 py-0.5 rounded bg-[var(--input-bg)] text-text font-mono text-[11px]">
              OLLAMA_ORIGINS="*" ollama serve
            </code>
          </li>
          <li>Tap the refresh button above to connect.</li>
        </ol>
        <p v-if="status?.error" class="text-xs text-[var(--danger-colour)] m-0">
          {{ status.error }}
        </p>
      </div>

      <!-- Main Chat Component (fits above mobile dock so input stays visible) -->
      <AiSpendingChat class="h-[calc(100dvh-315px)]! min-h-[320px]! sm:h-[calc(100dvh-200px)]! sm:min-h-[480px]! max-h-none! mt-0!" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, onMounted } from "vue";
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from "lucide-vue-next";
import Button from "primevue/button";
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
