<template>
  <section class="grid gap-3 p-1">
    <div class="flex items-center gap-2 text-text">
      <ScanLine :size="20" class="text-accent" />
      <strong class="text-base">{{ t("receipt.title") }}</strong>
    </div>

    <div v-if="isLocalDesktopApp()" class="flex items-center">
      <div
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-semibold text-text"
        :title="t('receipt.gemmaTooltip')"
      >
        <Checkbox v-model="useGemma" binary inputId="gemma-ocr-toggle" />
        <label for="gemma-ocr-toggle" class="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <Sparkles :size="15" class="text-accent" />
          <span>{{ t("receipt.gemmaAiParser", { model: getOllamaModel() }) }}</span>
        </label>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2.5">
      <Button
        type="button"
        severity="secondary"
        variant="outlined"
        :disabled="busy"
        class="inline-flex items-center gap-2"
        @click="cameraInput?.click()"
      >
        <Camera :size="18" />
        <span>{{ t("receipt.takePhoto") }}</span>
      </Button>
      <input
        ref="cameraInput"
        class="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        :disabled="busy"
        :aria-label="t('receipt.takePhoto')"
        @change="selectPhoto"
      />

      <Button
        type="button"
        severity="secondary"
        variant="outlined"
        :disabled="busy"
        class="inline-flex items-center gap-2"
        @click="uploadInput?.click()"
      >
        <ImagePlus :size="18" />
        <span>{{ t("receipt.uploadPhoto") }}</span>
      </Button>
      <input
        ref="uploadInput"
        class="sr-only"
        type="file"
        accept="image/*"
        :disabled="busy"
        :aria-label="t('receipt.uploadPhoto')"
        @change="selectPhoto"
      />
    </div>

    <div v-if="preview" class="grid gap-3">
      <p class="text-xs text-muted m-0">
        {{ t("receipt.cropHelp") }}
      </p>
      <div class="relative w-full max-w-[300px] mx-auto overflow-hidden rounded-lg">
        <img :src="preview" alt="Receipt crop preview" class="block w-full" />
        <div
          class="absolute border-3 border-accent shadow-[0_0_0_600px_var(--glass-backdrop)] pointer-events-none"
          :style="selectionStyle"
        />
      </div>
      <div class="grid grid-cols-2 gap-3.5">
        <div class="grid gap-2 text-xs text-muted">
          <div class="flex justify-between">
            <span>Left</span>
            <span>{{ crop.left }}%</span>
          </div>
          <Slider
            v-model="crop.left"
            :min="0"
            :max="crop.right - 5"
            :disabled="busy"
            aria-label="Crop left"
          />
        </div>
        <div class="grid gap-2 text-xs text-muted">
          <div class="flex justify-between">
            <span>Right</span>
            <span>{{ crop.right }}%</span>
          </div>
          <Slider
            v-model="crop.right"
            :min="crop.left + 5"
            :max="100"
            :disabled="busy"
            aria-label="Crop right"
          />
        </div>
        <div class="grid gap-2 text-xs text-muted">
          <div class="flex justify-between">
            <span>Top</span>
            <span>{{ crop.top }}%</span>
          </div>
          <Slider
            v-model="crop.top"
            :min="0"
            :max="crop.bottom - 5"
            :disabled="busy"
            aria-label="Crop top"
          />
        </div>
        <div class="grid gap-2 text-xs text-muted">
          <div class="flex justify-between">
            <span>Bottom</span>
            <span>{{ crop.bottom }}%</span>
          </div>
          <Slider
            v-model="crop.bottom"
            :min="crop.top + 5"
            :max="100"
            :disabled="busy"
            aria-label="Crop bottom"
          />
        </div>
      </div>
      <div>
        <Button type="button" severity="primary" :disabled="busy" @click="scan">
          {{ t("receipt.readArea") }}
        </Button>
      </div>
    </div>

    <p class="text-xs text-muted m-0">
      Free • Photo stays on this device. First use downloads the reader. Review
      all suggestions.
    </p>

    <div v-if="busy" class="flex flex-wrap items-center gap-2 text-sm text-text" role="status">
      <span>{{ status }}</span>
      <Button type="button" variant="link" size="small" @click="controller?.abort()">
        {{ t("common.cancel") }}
      </Button>
    </div>

    <Message v-if="failure" severity="error" :closable="false">
      {{ failure }}
    </Message>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, reactive, computed, onUnmounted, useTemplateRef } from "vue";
import { Camera, ImagePlus, ScanLine, Sparkles } from "lucide-vue-next";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Slider from "primevue/slider";
import Message from "primevue/message";
import { parseReceipt, type ReceiptSuggestion } from "@/lib/receipt";
import { parseReceiptWithGemma, getOllamaModel, isLocalDesktopApp } from "@/lib/ollama";
import { t } from "@/lib/i18n";
import { useExpenses } from "@/stores/expenses";

const store = useExpenses();
const useGemma = shallowRef(isLocalDesktopApp());
const emit = defineEmits<{
  result: [suggestion: ReceiptSuggestion, imageUrl?: string];
}>();
const cameraInput = useTemplateRef<HTMLInputElement>("cameraInput");
const uploadInput = useTemplateRef<HTMLInputElement>("uploadInput");
const busy = shallowRef(false);
const status = shallowRef("");
const failure = shallowRef("");
let controller: AbortController | undefined;
const selectedFile = shallowRef<File | null>(null);
const preview = shallowRef("");
const crop = reactive({ left: 0, top: 0, right: 100, bottom: 100 });
const selectionStyle = computed(() => ({
  left: `${crop.left}%`,
  top: `${crop.top}%`,
  width: `${crop.right - crop.left}%`,
  height: `${crop.bottom - crop.top}%`,
}));

onUnmounted(() => {
  controller?.abort();
  if (preview.value) URL.revokeObjectURL(preview.value);
});

function selectPhoto(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (preview.value) URL.revokeObjectURL(preview.value);
  selectedFile.value = file;
  preview.value = URL.createObjectURL(file);
  Object.assign(crop, { left: 0, top: 0, right: 100, bottom: 100 });
  input.value = "";
}

async function scan() {
  const file = selectedFile.value;
  if (!file) return;
  busy.value = true;
  failure.value = "";
  status.value = "Preparing reader…";
  controller = new AbortController();
  const signal = controller.signal;
  try {
    const { readReceipt } = await import("@/lib/ocr");
    const text = await readReceipt(
      file,
      signal,
      (value) => {
        status.value = value;
      },
      crop,
    );
    if (!signal.aborted) {
      let suggestion: ReceiptSuggestion;
      if (isLocalDesktopApp() && useGemma.value) {
        status.value = t("receipt.extractingWithGemma", { model: getOllamaModel() });
        try {
          suggestion = await parseReceiptWithGemma(
            text,
            store.allCategories,
            signal,
          );
        } catch {
          suggestion = parseReceipt(text);
          store.message = t("receipt.fallbackNotice");
        }
      } else {
        suggestion = parseReceipt(text);
      }

      const reader = new FileReader();
      reader.onload = () => {
        emit("result", suggestion, reader.result as string);
      };
      reader.onerror = () => {
        emit("result", suggestion, preview.value);
      };
      reader.readAsDataURL(file);
    }
  } catch (reason) {
    if (!signal.aborted)
      failure.value =
        reason instanceof Error
          ? reason.message
          : "Could not read this receipt.";
  } finally {
    busy.value = false;
  }
}
</script>
