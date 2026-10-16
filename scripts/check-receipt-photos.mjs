// Local-only OCR inspection: pnpm exec node scripts/check-receipt-photos.mjs /path/to/cropped-receipt.png
import { createWorker, PSM } from 'tesseract.js';
import { receiptRows } from '../src/lib/ocr-layout.ts';
const paths = process.argv.slice(2);
if (!paths.length) throw new Error('Pass one or more cropped receipt image paths.');
const worker = await createWorker('eng', 1, { langPath: 'public/receipt-ocr', cacheMethod: 'none' });
try {
  for (const path of paths) {
    for (const mode of [PSM.AUTO, PSM.SINGLE_BLOCK]) {
      await worker.setParameters({ tessedit_pageseg_mode: mode });
      const result = await worker.recognize(path, { rotateAuto: true }, { text: true, blocks: true });
      const words = result.data.blocks.flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words)));
      console.log(`Layout ${mode}: ${path}\n${receiptRows(words)}`);
    }
  }
} finally {
  await worker.terminate();
}
