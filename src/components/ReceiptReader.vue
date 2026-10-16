<script setup lang="ts">
import { shallowRef, reactive, computed, onUnmounted } from "vue";
import { Camera, ImagePlus, ScanLine } from "lucide-vue-next";
import { parseReceipt, type ReceiptSuggestion } from "@/lib/receipt";
const emit = defineEmits<{ result: [suggestion: ReceiptSuggestion] }>();
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
    if (!signal.aborted) emit("result", parseReceipt(text));
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
<template>
  <section class="scan-panel">
    <div class="scan-title">
      <ScanLine :size="20" /><strong>Read a receipt</strong>
    </div>
    <div class="entry-actions">
      <label class="secondary upload-button"
        ><Camera :size="18" />Take photo<input
          class="sr-only"
          type="file"
          accept="image/*"
          capture="environment"
          :disabled="busy"
          @change="selectPhoto"
      /></label>
      <label class="secondary upload-button"
        ><ImagePlus :size="18" />Upload photo<input
          class="sr-only"
          type="file"
          accept="image/*"
          :disabled="busy"
          @change="selectPhoto"
      /></label>
    </div>
    <div v-if="preview" class="receipt-crop">
      <p class="small">
        Keep only the receipt inside the green box. Include all items and the
        total.
      </p>
      <div class="crop-preview">
        <img :src="preview" alt="Receipt crop preview" />
        <div class="crop-selection" :style="selectionStyle"></div>
      </div>
      <div class="crop-controls">
        <label
          >Left<input
            v-model.number="crop.left"
            type="range"
            min="0"
            :max="crop.right - 5"
            :disabled="busy"
        /></label>
        <label
          >Right<input
            v-model.number="crop.right"
            type="range"
            :min="crop.left + 5"
            max="100"
            :disabled="busy"
        /></label>
        <label
          >Top<input
            v-model.number="crop.top"
            type="range"
            min="0"
            :max="crop.bottom - 5"
            :disabled="busy"
        /></label>
        <label
          >Bottom<input
            v-model.number="crop.bottom"
            type="range"
            :min="crop.top + 5"
            max="100"
            :disabled="busy"
        /></label>
      </div>
      <button type="button" :disabled="busy" @click="scan">
        Read selected area
      </button>
    </div>
    <p class="small muted">
      Free • Photo stays on this device. First use downloads the reader. Review
      all suggestions.
    </p>
    <p v-if="busy" role="status">
      {{ status }}
      <button type="button" class="text-button" @click="controller?.abort()">
        Cancel
      </button>
    </p>
    <p v-if="failure" role="alert" class="error-note">{{ failure }}</p>
  </section>
</template>

<style scoped>
.crop-preview {
  position: relative;
  width: min(100%, 300px);
  margin: 12px auto;
  overflow: hidden;
}
.crop-preview img {
  display: block;
  width: 100%;
}
.crop-selection {
  position: absolute;
  border: 3px solid #16a36a;
  box-shadow: 0 0 0 600px #0008;
  pointer-events: none;
}
.crop-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
.crop-controls label {
  display: grid;
  gap: 4px;
}
.crop-controls input {
  width: 100%;
  min-height: 36px;
  padding: 0;
}
</style>
