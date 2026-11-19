<template>
  <div class="grid gap-3 mb-4">
    <div class="relative">
      <video
        ref="video"
        autoplay
        muted
        playsinline
        aria-label="Live price label camera"
        class="block w-full object-contain bg-[var(--surface-card)] rounded-2xl"
      />
      <div class="absolute left-[10%] top-[25%] w-[80%] h-[50%] border-2 border-accent rounded-lg pointer-events-none" />
      <div class="absolute bottom-2 left-2 right-2">
        <slot />
      </div>
    </div>

    <p v-if="!error" class="text-sm text-text m-0" role="status">{{ status }}</p>
    <Message v-else severity="error" :closable="false">
      {{ error }}
    </Message>

    <div>
      <Button
        type="button"
        severity="secondary"
        class="inline-flex items-center gap-2"
        @click="
          stop();
          emit('close');
        "
      >
        <CameraOff :size="18" />
        <span>Stop camera & edit</span>
      </Button>
    </div>

    <p class="text-xs text-muted m-0">
      Point at one product name, pack size and price. Editing a field pauses the
      camera. Frames stay on this device.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, useTemplateRef } from "vue";
import { CameraOff } from "lucide-vue-next";
import Button from "primevue/button";
import Message from "primevue/message";

const emit = defineEmits<{ text: [text: string]; close: [] }>();
const video = useTemplateRef<HTMLVideoElement>("video");
const status = shallowRef("Opening camera…");
const error = shallowRef("");
const running = ref(true);
const controller = new AbortController();
let stream: MediaStream | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let session:
  | Awaited<ReturnType<(typeof import("@/lib/ocr"))["createOcrSession"]>>
  | undefined;

function stop() {
  running.value = false;
  controller.abort();
  if (timer) clearTimeout(timer);
  stream?.getTracks().forEach((track) => track.stop());
  session?.close();
  if (video.value) video.value.srcObject = null;
}

function visibility() {
  if (document.hidden) {
    stop();
    emit("close");
  }
}

onMounted(async () => {
  document.addEventListener("visibilitychange", visibility);
  try {
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error("Live camera is unavailable. Use a photo instead.");
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
    if (!running.value) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    video.value!.srcObject = stream;
    await video.value!.play();
    const { createOcrSession } = await import("@/lib/ocr");
    session = await createOcrSession(controller.signal, (value) => {
      status.value = value;
    });
    await scan();
  } catch (reason) {
    if (!controller.signal.aborted)
      error.value =
        reason instanceof Error
          ? reason.message
          : "Could not open camera. Use a photo instead.";
    stop();
  }
});

async function scan() {
  if (!running.value || !session || !video.value) return;
  const canvas = document.createElement("canvas");
  const sourceWidth = video.value.videoWidth * 0.8;
  const sourceHeight = video.value.videoHeight * 0.5;
  const ratio = Math.min(2, 1600 / sourceWidth);
  canvas.width = Math.round(sourceWidth * ratio);
  canvas.height = Math.round(sourceHeight * ratio);
  const context = canvas.getContext("2d");
  if (!context || !canvas.width || !canvas.height) {
    timer = setTimeout(scan, 1000);
    return;
  }
  context.drawImage(
    video.value,
    video.value.videoWidth * 0.1,
    video.value.videoHeight * 0.25,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  try {
    const text = await session.read(canvas, true, true);
    if (!running.value) return;
    emit("text", text);
    status.value = "Live · hold the label steady";
    timer = setTimeout(scan, 2000);
  } catch {
    if (!controller.signal.aborted) {
      error.value = "Could not read this view. Try a photo or enter the price.";
      stop();
    }
  }
}

onUnmounted(() => {
  stop();
  document.removeEventListener("visibilitychange", visibility);
});
</script>
