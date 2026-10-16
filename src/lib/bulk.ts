import { categories, type Currency, type ExpenseDraft } from "@/lib/types";
import { parseMoney, today } from "@/lib/finance";
import { validDate } from "@/lib/purchases";
export function parseBulk(text: string, currency: Currency): ExpenseDraft[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length || lines.length > 200)
    throw new Error("Paste between 1 and 200 rows.");
  return lines.map((line, index) => {
    const parts = line.split(/\t|\|/).map((part) => part.trim());
    const [date, merchant, amount, category = "Other"] = parts;
    if (
      parts.length < 3 ||
      parts.length > 4 ||
      !validDate(date) ||
      date > today() ||
      !merchant ||
      merchant.length > 100
    ) {
      throw new Error(
        `Row ${index + 1}: use date | shop | amount | category. Dates use YYYY-MM-DD and cannot be in the future.`,
      );
    }
    const matched = categories.find(
      (value) => value.toLowerCase() === category.toLowerCase(),
    );
    if (!matched)
      throw new Error(`Row ${index + 1}: choose a listed category.`);
    try {
      return {
        date,
        merchant,
        amount: parseMoney(amount),
        category: matched,
        currency,
        note: "",
      };
    } catch {
      throw new Error(
        `Row ${index + 1}: enter a positive amount with up to two decimal places.`,
      );
    }
  });
}
