<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, useTemplateRef } from "vue";
import { CameraOff } from "lucide-vue-next";
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
  } catch (reason) {
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
<template>
  <div class="live-camera">
    <div class="camera-stage">
      <video
        ref="video"
        autoplay
        muted
        playsinline
        aria-label="Live price label camera"
      />
      <div class="target-box"></div>
      <div class="camera-overlay"><slot /></div>
    </div>
    <p v-if="!error" role="status">{{ status }}</p>
    <p v-else role="alert" class="error-note">{{ error }}</p>
    <button
      type="button"
      class="secondary"
      @click="
        stop();
        emit('close');
      "
    >
      <CameraOff :size="18" />Stop camera & edit
    </button>
    <p class="small muted">
      Point at one product name, pack size and price. Editing a field pauses the
      camera. Frames stay on this device.
    </p>
  </div>
</template>
<style scoped>
.live-camera {
  margin-bottom: 16px;
}
video {
  display: block;
  width: 100%;

  object-fit: contain;
  background: #15241d;
  border-radius: 14px;
}
</style>

<style scoped>
.camera-stage {
  position: relative;
}
.target-box {
  position: absolute;
  left: 10%;
  top: 25%;
  width: 80%;
  height: 50%;
  border: 2px solid #fff;
  border-radius: 8px;
  pointer-events: none;
}
.camera-overlay {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
}
</style>
