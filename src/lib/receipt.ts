import type { PurchaseItem, Currency, Unit } from "@/lib/types";
import { validDate, itemsTotal } from "@/lib/purchases";

export interface ReceiptSuggestion {
  merchant: string;
  date: string;
  currency?: Currency;
  amount: number | null;
  items: PurchaseItem[];
  text: string;
}

function cents(value: string): number {
  return Math.round(Number(value.replace(/,/g, "")) * 100);
}

function receiptDate(text: string): string {
  const iso = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  const numeric = text.match(
    /\b(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2}|\d{2})\b/,
  );
  const named = text.match(
    /\b(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(20\d{2}|\d{2})\b/i,
  );
  let date = "";
  if (iso) {
    date = `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  } else if (numeric) {
    date = `${numeric[3].length === 2 ? "20" : ""}${numeric[3]}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
  } else if (named) {
    const months = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    const month = months.indexOf(named[2].toLowerCase()) + 1;
    date = `${named[3].length === 2 ? "20" : ""}${named[3]}-${String(month).padStart(2, "0")}-${named[1].padStart(2, "0")}`;
  }
  return validDate(date) ? date : "";
}

function measureUnit(value: string): Unit {
  const unit = value.toLowerCase();
  if (["l", "ltr", "litre", "litres"].includes(unit)) return "L";
  if (["ka", "ky"].includes(unit)) return "kg";
  return unit as Unit;
}

const administrative =
  /^(?:sub\s*total|total\s+gst|gst|tax|cash|change|eftpos|visa|mastercard|mcard|balance|savings|rounding|tender|payment|paid|auth|terminal|tran(?:saction)?\b|card|contactless|purchase\b|time\b|date\b|receipt|voucher\s+id|served|issued|accrued|store\b|tel\b|ph\b|www\.|thank|for more|call or text|kia kaha|item\s+qty|r[uv]rd)/i;

function merchantName(lines: string[]): string {
  const store = lines.find((line) => /^store\s*:/i.test(line));
  if (store) return store.replace(/^store\s*:\s*/i, "").slice(0, 100);
  const header = lines.slice(0, 14);
  const pak = header.find((line) => /pak\s*['’nN ]*\s*save/i.test(line));
  if (pak) {
    const fuel = header.some((line) => /fuel/i.test(line));
    const branch = header.find(
      (line) => /pak.*save\s+[a-z]{3}/i.test(line) && !/fuel/i.test(line),
    );
    return (
      fuel ? "PAK'nSAVE Fuel" : (branch ?? pak).replace(/[*_]/g, "").trim()
    ).slice(0, 100);
  }
  return (
    header
      .find(
        (line) =>
          /[a-z]{3}/i.test(line) &&
          !administrative.test(line) &&
          !/invoice|\d{3}|tax/i.test(line),
      )
      ?.replace(/[*_]/g, "")
      .trim()
      .slice(0, 100) ?? ""
  );
}

export function parseReceipt(text: string): ReceiptSuggestion {
  const normalizedText = text.replace(/(\d)\s*\.\s*(\d{2})\b/g, "$1.$2");
  const lines = normalizedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const items: PurchaseItem[] = [];
  let amount: number | null = null;
  let pendingTitle = "";
  let paymentSection = false;
  let tableItem: PurchaseItem | undefined;

  for (const line of lines) {
    const money = line.match(
      /(-?\s*(?:NZ\$|NZD\s*|US\$|\$)?\s*[\d,]+\.\d{2})\s*[A-Z*]?$/i,
    );
    const price = money
      ? cents(money[1].replace(/NZD|NZ|US|\$|\s/g, ""))
      : null;
    const label = money ? line.slice(0, money.index).trim() : line;
    const totalLabel = label
      .replace(/^["\s]*\d+\s+/, "")
      .replace(/[:$]/g, "")
      .trim();
    if (
      price !== null &&
      /^(?:grand\s+total|total(?:\s+(?:in[gc]\.?\s*gst|due|amount|nzd|usd))?|amount\s+due|balance\s+due)$/i.test(
        totalLabel,
      )
    ) {
      if (amount === null || /balance\s+due/i.test(totalLabel)) amount = price;
      paymentSection = true;
      pendingTitle = "";
      continue;
    }
    if (paymentSection) continue;

    // A measured continuation may follow the title alone or an already priced row.
    const measured = line.match(
      /^(\d+(?:\.\d{1,3})?)\s*(kg|ka|ky|g|ml|ltr|litres?|l|lb|oz)\s*[@©]\s*\$?([\d.]+)\s*\//i,
    );
    if (measured) {
      let item = pendingTitle ? undefined : items.at(-1);
      if (!item && pendingTitle) {
        item = {
          id: `scan-${items.length}`,
          title: pendingTitle,
          unitPrice:
            price ??
            Math.round(Number(measured[1]) * Number(measured[3]) * 100),
          quantity: 1,
        };
        items.push(item);
      }
      if (item) {
        // Store the charged line total and measured size. Fuel rates can have
        // fractions of a cent, which must not be rounded before multiplication.
        item.size = Number(measured[1]);
        item.unit = measureUnit(measured[2]);
        item.quantity = 1;
        if (price !== null && !/\/\s*(?:kg|g|l|ltr)\s*$/i.test(line))
          item.unitPrice = price;
      }
      pendingTitle = "";
      continue;
    }
    const multiple = line.match(
      /^(\d+(?:\.\d{1,3})?)\s*[@©x×]?\s*\$?([\d,]+\.\d{2})/i,
    );
    if (multiple && pendingTitle && price !== null) {
      const quantity = Number(multiple[1]);
      const unitPrice = cents(multiple[2]);
      if (quantity > 0 && quantity <= 10000) {
        items.push(makeItem(pendingTitle, unitPrice, quantity, items.length));
      }
      pendingTitle = "";
      continue;
    }
    if (price !== null && price < 0) {
      const previous = items.at(-1);
      if (
        previous &&
        /discount|voucher|saving|^pf[_\s]|^of\s|promo/i.test(label)
      ) {
        const discount = (previous.discount ?? 0) + Math.abs(price);
        if (discount <= Math.round(previous.unitPrice * previous.quantity))
          previous.discount = discount;
      }
      pendingTitle = "";
      continue;
    }
    if (administrative.test(line) || /^(?:[-_* .]+)$/.test(line)) {
      pendingTitle = "";
      tableItem = undefined;
      continue;
    }
    if (
      price !== null &&
      price > 0 &&
      /[a-z]/i.test(label) &&
      label.length <= 140
    ) {
      const table = label.match(
        /^(.*?)\s+(\d+(?:\.\d+)?)\s+\$?([\d,]+\.\d{2})$/,
      );
      const prefix = label.match(/^(\d+(?:\.\d{1,3})?)\s*[x×]\s+(.+)$/i);
      const title = table ? table[1] : prefix ? prefix[2] : label;
      const quantity = table
        ? Number(table[2])
        : prefix
          ? Number(prefix[1])
          : 1;
      if (quantity <= 0 || quantity > 10000 || items.length >= 200) continue;
      const unitPrice = table ? cents(table[3]) : Math.round(price / quantity);
      const item = makeItem(title, unitPrice, quantity, items.length);
      items.push(item);
      tableItem = table ? item : undefined;
      pendingTitle = "";
      continue;
    }
    if (!money && /[a-z]{3}/i.test(line) && line.length <= 100) {
      if (tableItem && /\d.*\//.test(tableItem.title)) {
        tableItem.title = line;
        tableItem = undefined;
      } else {
        pendingTitle = line;
      }
    }
  }
  const currency: Currency | undefined = /\bUSD\b|US\$/.test(text)
    ? "USD"
    : /\bNZD\b|NZ\$/.test(text)
      ? "NZD"
      : undefined;
  return {
    merchant: merchantName(lines),
    date: receiptDate(text),
    currency,
    amount,
    items,
    text,
  };
}

function makeItem(
  title: string,
  unitPrice: number,
  quantity: number,
  index: number,
): PurchaseItem {
  const measure = title.match(
    /\b(\d+(?:\.\d{1,3})?)\s*(kg|g|ml|l|lb|oz|cm|m)\b/i,
  );
  return {
    id: `scan-${index}`,
    title: measure
      ? title.replace(measure[0], "").replace(/\s+/g, " ").trim()
      : title,
    unitPrice,
    quantity,
    size: measure ? Number(measure[1]) : 1,
    unit: measure ? measureUnit(measure[2]) : "each",
  };
}

export function receiptDifference(
  suggestion: ReceiptSuggestion,
): number | null {
  return suggestion.amount === null
    ? null
    : suggestion.amount - itemsTotal(suggestion.items);
}
