<template>
  <section v-if="isLocalDesktopApp()" class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm space-y-4">
    <div class="space-y-1">
      <div class="flex items-center gap-2.5 text-[var(--text-color)]">
        <Sparkles class="text-accent" :size="20" />
        <h2 class="text-lg font-bold text-text m-0">{{ t("ollama.title") }}</h2>
      </div>
      <p class="text-xs text-muted m-0">
        {{ t("ollama.description") }}
      </p>
    </div>

    <form class="space-y-4" @submit.prevent="saveOllamaSettings">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("ollama.endpoint") }}</span>
          <input
            v-model="ollamaHost"
            placeholder="http://localhost:11434"
            required
          />
        </label>
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("ollama.model") }}</span>
          <input
            v-model="ollamaModel"
            placeholder="gemma4:e4b"
            required
          />
        </label>
      </div>

      <div class="flex flex-wrap items-center gap-3 pt-1">
        <Button
          type="button"
          severity="secondary"
          size="small"
          :disabled="ollamaTesting"
          class="inline-flex items-center gap-2"
          @click="testOllama"
        >
          <RefreshCw :size="14" :class="{ 'animate-spin': ollamaTesting }" />
          <span>{{ ollamaTesting ? t("ollama.testing") : t("ollama.testConnection") }}</span>
        </Button>

        <Button
          type="submit"
          severity="primary"
          size="small"
          class="inline-flex items-center gap-2"
        >
          <Check v-if="ollamaSaved" :size="14" />
          <span>{{ ollamaSaved ? t("common.saved") : t("ollama.saveSettings") }}</span>
        </Button>
      </div>

      <div
        v-if="ollamaStatus"
        class="flex items-start gap-2.5 p-3 rounded-xl border text-xs"
        :class="ollamaStatus.ok ? 'border-emerald-500/20 bg-emerald-950/20 text-emerald-300' : 'border-red-500/20 bg-red-950/20 text-red-300'"
      >
        <CheckCircle2 v-if="ollamaStatus.ok" :size="16" class="shrink-0 mt-0.5" />
        <AlertTriangle v-else :size="16" class="shrink-0 mt-0.5" />
        <div class="grid gap-1">
          <template v-if="ollamaStatus.ok">
            <strong class="font-semibold text-emerald-200">Connected to Ollama!</strong>
            <span class="text-xs opacity-90">
              Available models: {{ ollamaStatus.availableModels.join(", ") || "None found (run ollama pull " + ollamaModel + ")" }}
            </span>
          </template>
          <template v-else>
            <strong class="font-semibold text-red-200">Connection Failed</strong>
            <span class="text-xs opacity-90">{{ ollamaStatus.error }}</span>
          </template>
        </div>
      </div>

      <p class="text-xs text-muted m-0">
        To allow browser requests, start Ollama with <code>OLLAMA_ORIGINS="*" ollama serve</code>.
      </p>
    </form>
  </section>

  <section v-else class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm space-y-2">
    <h2 class="text-lg font-bold text-text m-0">{{ t("ollama.title") }}</h2>
    <p class="text-xs text-muted m-0">
      {{ t("ollama.disabledHosted") || "AI features are only available in the local desktop app." }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from "vue";
import { useExpenses, friendlyError } from "@/stores/expenses";
import {
  Sparkles,
  RefreshCw,
  Check,
  CheckCircle2,
  AlertTriangle,
} from "lucide-vue-next";
import {
  getOllamaHost,
  setOllamaHost,
  getOllamaModel,
  setOllamaModel,
  checkOllamaStatus,
  isLocalDesktopApp,
  type OllamaStatus,
} from "@/lib/ollama";
import { t } from "@/lib/i18n";
import Button from "primevue/button";

const store = useExpenses();
const ollamaHost = shallowRef(getOllamaHost());
const ollamaModel = shallowRef(getOllamaModel());
const ollamaTesting = shallowRef(false);
const ollamaStatus = shallowRef<OllamaStatus | null>(null);
const ollamaSaved = shallowRef(false);

async function testOllama() {
  if (!isLocalDesktopApp()) return;
  ollamaTesting.value = true;
  ollamaStatus.value = null;
  try {
    ollamaStatus.value = await checkOllamaStatus(
      ollamaHost.value,
      ollamaModel.value,
    );
  } catch (err) {
    ollamaStatus.value = {
      ok: false,
      host: ollamaHost.value,
      model: ollamaModel.value,
      availableModels: [],
      isModelPresent: false,
      error: friendlyError(err),
    };
  } finally {
    ollamaTesting.value = false;
  }
}

function saveOllamaSettings() {
  setOllamaHost(ollamaHost.value);
  setOllamaModel(ollamaModel.value);
  ollamaSaved.value = true;
  store.message = t("ollama.saved") || "Ollama settings saved";
  setTimeout(() => {
    ollamaSaved.value = false;
  }, 2500);
}
</script>
