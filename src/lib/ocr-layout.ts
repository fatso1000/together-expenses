/** Rejoin receipt columns by their position, rather than OCR block order. */
export interface OcrWord {
  text: string;
  bbox: { x0: number; x1: number; y0: number; y1: number };
}
export function receiptRows(words: OcrWord[]): string {
  const sorted = words
    .filter((word) => word.text.trim())
    .sort((a, b) => {
      return (a.bbox.y0 + a.bbox.y1) / 2 - (b.bbox.y0 + b.bbox.y1) / 2;
    });
  const rows: { center: number; height: number; words: OcrWord[] }[] = [];
  for (const word of sorted) {
    const center = (word.bbox.y0 + word.bbox.y1) / 2;
    const height = word.bbox.y1 - word.bbox.y0;
    const row = rows.at(-1);
    if (
      row &&
      Math.abs(center - row.center) <
        Math.max(5, Math.min(height, row.height) * 0.65)
    ) {
      row.center =
        (row.center * row.words.length + center) / (row.words.length + 1);
      row.words.push(word);
    } else {
      rows.push({ center, height, words: [word] });
    }
  }
  return rows
    .map((row) =>
      row.words
        .sort((a, b) => a.bbox.x0 - b.bbox.x0)
        .map((word) => word.text)
        .join(" "),
    )
    .join("\n");
}
