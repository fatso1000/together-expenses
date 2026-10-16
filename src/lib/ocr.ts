import { createWorker, PSM } from "tesseract.js";
import { parseReceipt, receiptDifference } from "@/lib/receipt";
import { receiptRows } from "@/lib/ocr-layout";
function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const cancel = () => {
      signal.removeEventListener("abort", cancel);
      reject(new Error("Reading cancelled."));
    };
    if (signal.aborted) {
      reject(new Error("Reading cancelled."));
      return;
    }
    signal.addEventListener("abort", cancel, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", cancel);
        resolve(value);
      },
      (reason) => {
        signal.removeEventListener("abort", cancel);
        reject(reason);
      },
    );
  });
}
export async function createOcrSession(
  signal: AbortSignal,
  progress: (value: string) => void,
) {
  if (signal.aborted) throw new Error("Reading cancelled.");
  const pending = createWorker("eng", 1, {
    workerPath: "/receipt-ocr/worker.min.js",
    corePath: "/receipt-ocr",
    langPath: "/receipt-ocr",
    workerBlobURL: false,
    logger: (event) =>
      progress(
        event.status === "recognizing text"
          ? `Reading ${Math.round(event.progress * 100)}%`
          : "Preparing reader…",
      ),
  });
  void pending.then(
    (worker) => {
      if (signal.aborted) void worker.terminate();
    },
    () => {},
  );
  const worker = await withAbort(pending, signal);
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    signal.removeEventListener("abort", close);
    void worker.terminate();
  }
  signal.addEventListener("abort", close, { once: true });
  if (signal.aborted) {
    close();
    throw new Error("Reading cancelled.");
  }
  return {
    async read(
      canvas: HTMLCanvasElement,
      receiptLayout = false,
      blockLayout = false,
    ): Promise<string> {
      if (closed) throw new Error("Reader closed.");
      await worker.setParameters({
        tessedit_pageseg_mode: blockLayout ? PSM.SINGLE_BLOCK : PSM.AUTO,
      });
      const result = await withAbort(
        worker.recognize(
          canvas,
          { rotateAuto: receiptLayout },
          { text: true, blocks: receiptLayout },
        ),
        signal,
      );
      if (receiptLayout && result.data.blocks) {
        const words = result.data.blocks.flatMap((block) =>
          block.paragraphs.flatMap((paragraph) =>
            paragraph.lines.flatMap((line) => line.words),
          ),
        );
        return receiptRows(words);
      }
      return result.data.text;
    },
    close,
  };
}
export interface ReceiptCrop {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export async function readReceipt(
  file: File,
  signal: AbortSignal,
  progress: (value: string) => void,
  crop?: ReceiptCrop,
  mode: "receipt" | "label" = "receipt",
): Promise<string> {
  if (file.size > 15_000_000)
    throw new Error("Choose a photo smaller than 15 MB.");
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type))
    throw new Error("Choose a JPG, PNG, or WebP photo.");
  const url = URL.createObjectURL(file);
  let session: Awaited<ReturnType<typeof createOcrSession>> | undefined;
  try {
    const image = new Image();
    image.src = url;
    try {
      await withAbort(image.decode(), signal);
    } catch {
      throw new Error(
        "This photo could not be opened. Use JPG/PNG or take another photo.",
      );
    }
    const left = ((crop?.left ?? 0) / 100) * image.naturalWidth;
    const top = ((crop?.top ?? 0) / 100) * image.naturalHeight;
    const width = ((crop?.right ?? 100) / 100) * image.naturalWidth - left;
    const height = ((crop?.bottom ?? 100) / 100) * image.naturalHeight - top;
    if (width <= 0 || height <= 0)
      throw new Error("Choose a larger receipt area.");
    const scale = Math.min(crop ? 2 : 1, 2800 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Text reading is unavailable in this browser.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      image,
      left,
      top,
      width,
      height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    session = await createOcrSession(signal, progress);
    let text = await session.read(canvas, Boolean(crop), mode === "label");
    if (crop) {
      const first = parseReceipt(text);
      if (
        !text.trim() ||
        (mode === "receipt" &&
          (!first.items.length || receiptDifference(first) !== 0))
      ) {
        progress("Checking another text layout…");
        const alternative = await session.read(canvas, true, mode !== "label");
        if (!text.trim() || receiptScore(alternative) > receiptScore(text))
          text = alternative;
      }
    }
    if (!text.trim())
      throw new Error("No text found. Try a sharper, well-lit photo.");
    return text;
  } finally {
    session?.close();
    URL.revokeObjectURL(url);
  }
}

function receiptScore(text: string): number {
  const receipt = parseReceipt(text);
  const difference = receiptDifference(receipt);
  const total = receipt.amount ?? 0;
  const coverage =
    total > 0 && difference !== null
      ? Math.max(0, 1 - Math.abs(difference) / total)
      : 0;
  return (
    coverage * 100 + Math.min(receipt.items.length, 30) + (receipt.date ? 2 : 0)
  );
}
