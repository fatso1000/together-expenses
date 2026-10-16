import type { Product, Unit } from "@/lib/types";
import { normalizeName } from "@/lib/products";
export function parsePriceTag(text: string, products: Product[]) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const normalized = normalizeName(text);
  const matched = products
    .filter((product) =>
      [product.title, ...product.aliases].some((alias) => {
        const name = normalizeName(alias);
        return name.length > 2 && ` ${normalized} `.includes(` ${name} `);
      }),
    )
    .sort((a, b) => b.title.length - a.title.length)[0];
  const priceLines = lines.filter(
    (line) =>
      !/\/(?:\s*\d*\s*)?(?:kg|g|l|ml|each)|per\s+(?:kg|100|litre|l\b|each|sheet)|save\s*\$/i.test(
        line,
      ),
  );
  const amounts = [
    ...new Set(
      [...priceLines.join("\n").matchAll(/\$?\s*(\d{1,4})[.,](\d{2})\b/g)].map(
        (match) => Number(match[1]) * 100 + Number(match[2]),
      ),
    ),
  ].filter((amount) => amount > 0);
  const splitPrice = priceLines.join("\n").match(/\$\s*(\d{1,3})\s+(\d{2})\b/);
  if (!amounts.length && splitPrice)
    amounts.push(Number(splitPrice[1]) * 100 + Number(splitPrice[2]));
  // OCR may flatten superscript cents into "$370". Offer both readings;
  // never silently turn a possible $370 price into $3.70.
  if (!amounts.length) {
    const compact = priceLines.join("\n").match(/\$\s*(\d{3,4})\b/);
    if (compact) {
      const digits = Number(compact[1]);
      amounts.push(digits, digits * 100);
    }
  }
  const measure = priceLines
    .join("\n")
    .match(/\b(\d+(?:\.\d{1,3})?)\s*(kg|g|ml|l|lb|oz|cm|m)\b/i);
  let unit: Unit = "each";
  let size = 1;
  if (measure && Number(measure[1]) > 0) {
    size = Number(measure[1]);
    unit =
      measure[2].toLowerCase() === "l"
        ? "L"
        : (measure[2].toLowerCase() as Unit);
  }
  const pack = text.match(/\b(\d{1,3})\s*(?:rolls?|pack|pk|sheets?)\b/i);
  if (!measure && pack) size = Number(pack[1]);
  const guessed =
    lines.find(
      (line) =>
        /[a-z]{3}/i.test(line) &&
        !/special|club|price|save|each|per\s|pak.?n.?save/i.test(line),
    ) ?? "";
  const title =
    matched?.title ??
    guessed
      .replace(/\$?\d+[.,]\d{2}/g, "")
      .replace(/\b\d+(?:\.\d{1,3})?\s*(kg|g|ml|l|lb|oz|cm|m)\b/gi, "")
      .trim()
      .slice(0, 100);
  return { title, productId: matched?.id, prices: amounts, size, unit, text };
}
