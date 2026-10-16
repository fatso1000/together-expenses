import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { mkdirSync, copyFileSync, readdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const workerRoot = dirname(require.resolve("tesseract.js/package.json"));
const workerRequire = createRequire(join(workerRoot, "package.json"));
const coreRoot = dirname(
  workerRequire.resolve("tesseract.js-core/package.json"),
);
const modelRoot = dirname(
  require.resolve("@tesseract.js-data/eng/package.json"),
);
const target = "public/receipt-ocr";
mkdirSync(target, { recursive: true });
copyFileSync(
  join(workerRoot, "dist/worker.min.js"),
  join(target, "worker.min.js"),
);
for (const file of readdirSync(coreRoot)) {
  if (file.endsWith(".wasm") || file.endsWith(".wasm.js"))
    copyFileSync(join(coreRoot, file), join(target, file));
}
copyFileSync(
  join(modelRoot, "4.0.0_best_int/eng.traineddata.gz"),
  join(target, "eng.traineddata.gz"),
);
