import type { PurchaseItem, Category, FrequentPayment, Expense } from "@/lib/types";
import type { ReceiptSuggestion } from "@/lib/receipt";
import { parseMoney, today } from "@/lib/finance";

const DEFAULT_HOST = "http://localhost:11434";
const DEFAULT_MODEL = "gemma4:e4b";

export function isLocalDesktopApp(): boolean {
  if (typeof window === "undefined") {
    return true; // Node test environment
  }
  const host = window.location.hostname;
  const isLocalHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "";
  const isLocalProtocol =
    window.location.protocol === "file:" ||
    window.location.protocol === "app:";
  const isDesktopContainer = Boolean(
    (window as any).__TAURI__ ||
    (window as any).electron ||
    (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().includes("electron"))
  );

  return isLocalHost || isLocalProtocol || isDesktopContainer;
}

export function getOllamaHost(): string {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("expenses-ollama-host") || DEFAULT_HOST;
    }
  } catch {}
  return DEFAULT_HOST;
}

export function setOllamaHost(host: string): void {
  const cleaned = host.trim().replace(/\/+$/, "");
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("expenses-ollama-host", cleaned || DEFAULT_HOST);
    }
  } catch {}
}

export function getOllamaModel(): string {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("expenses-ollama-model") || DEFAULT_MODEL;
    }
  } catch {}
  return DEFAULT_MODEL;
}

export function setOllamaModel(model: string): void {
  const cleaned = model.trim();
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("expenses-ollama-model", cleaned || DEFAULT_MODEL);
    }
  } catch {}
}

export interface OllamaStatus {
  ok: boolean;
  host: string;
  model: string;
  availableModels: string[];
  isModelPresent: boolean;
  error?: string;
}

export async function checkOllamaStatus(customHost?: string, customModel?: string): Promise<OllamaStatus> {
  const host = (customHost || getOllamaHost()).replace(/\/+$/, "");
  const targetModel = customModel || getOllamaModel();

  if (!isLocalDesktopApp()) {
    return {
      ok: false,
      host,
      model: targetModel,
      availableModels: [],
      isModelPresent: false,
      error: "AI features are disabled on the hosted web application. Run locally on desktop to use Gemma.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`${host}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        ok: false,
        host,
        model: targetModel,
        availableModels: [],
        isModelPresent: false,
        error: `Ollama returned HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = (await res.json()) as { models?: { name: string }[] };
    const availableModels = (data.models || []).map((m) => m.name);
    const isModelPresent = availableModels.some(
      (m) => m.toLowerCase() === targetModel.toLowerCase() || m.toLowerCase().startsWith(targetModel.toLowerCase().split(":")[0]),
    );

    return {
      ok: true,
      host,
      model: targetModel,
      availableModels,
      isModelPresent,
    };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Connection timed out (6s). Check if Ollama daemon is running."
        : "Cannot reach Ollama at " + host + ". Ensure Ollama is running (e.g. OLLAMA_ORIGINS=\"*\" ollama serve).";
    return {
      ok: false,
      host,
      model: targetModel,
      availableModels: [],
      isModelPresent: false,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

interface RawGemmaReceiptItem {
  title?: string;
  name?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  price?: number | string;
  discount?: number | string;
  unit?: string;
  size?: number | string;
}

interface RawGemmaReceipt {
  merchant?: string;
  store?: string;
  date?: string;
  total?: number | string;
  amount?: number | string;
  category?: string;
  items?: RawGemmaReceiptItem[];
  notes?: string;
}

export async function parseReceiptWithGemma(
  rawText: string,
  categoriesList: string[] = [],
  signal?: AbortSignal,
): Promise<ReceiptSuggestion> {
  if (!isLocalDesktopApp()) {
    throw new Error("AI features are disabled on the hosted web application.");
  }
  const host = getOllamaHost();
  const model = getOllamaModel();

  const systemPrompt = `You are a receipt extraction system. Given receipt OCR text, output a strict JSON object with these exact keys:
- "merchant": string (clean store or merchant name)
- "date": string in YYYY-MM-DD format (if missing, use today's date ${today()})
- "total": number (total amount charged in dollars, e.g. 45.50)
- "category": string (choose best fit from: ${categoriesList.join(", ") || "Groceries, Petrol, Shopping, Bills, Eating out, Other"})
- "items": array of items, each with:
  - "title": string (clean product name)
  - "quantity": number (default 1)
  - "unitPrice": number (in dollars, e.g. 3.50)
  - "discount": number (in dollars, default 0)
  - "unit": string ("each", "kg", "g", "L", "ml")
  - "size": number (e.g. 2 for 2L, 500 for 500g)

Return ONLY valid JSON. No conversational text, no markdown backticks.`;

  const prompt = `Receipt OCR Text:\n"""\n${rawText.slice(0, 4000)}\n"""`;

  const response = await fetch(`${host}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model,
      prompt: `${systemPrompt}\n\n${prompt}`,
      stream: false,
      format: "json",
      options: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed (${response.status}): ${await response.text()}`);
  }

  const result = (await response.json()) as { response?: string };
  const rawOutput = (result.response || "").trim();

  let cleanedJson = rawOutput;
  if (cleanedJson.startsWith("```")) {
    cleanedJson = cleanedJson.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }

  const parsed = JSON.parse(cleanedJson) as RawGemmaReceipt;

  // Convert parsed response to ReceiptSuggestion with integer cents
  const merchant = (parsed.merchant || parsed.store || "Unknown Merchant").trim();
  let date = (parsed.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today()) {
    date = today();
  }

  let totalAmount = 0;
  const rawTotal = parsed.total ?? parsed.amount;
  if (rawTotal !== undefined) {
    try {
      totalAmount = typeof rawTotal === "number" ? Math.round(rawTotal * 100) : parseMoney(String(rawTotal));
    } catch {
      totalAmount = 0;
    }
  }

  const items: PurchaseItem[] = [];
  if (Array.isArray(parsed.items)) {
    for (const rawItem of parsed.items) {
      const title = (rawItem.title || rawItem.name || "").trim();
      if (!title) continue;

      let unitPrice = 0;
      const rawPrice = rawItem.unitPrice ?? rawItem.price;
      if (rawPrice !== undefined) {
        try {
          unitPrice = typeof rawPrice === "number" ? Math.round(rawPrice * 100) : parseMoney(String(rawPrice));
        } catch {
          unitPrice = 0;
        }
      }

      let quantity = Number(rawItem.quantity) || 1;
      if (quantity <= 0) quantity = 1;

      let discount = 0;
      if (rawItem.discount) {
        try {
          discount = typeof rawItem.discount === "number" ? Math.round(rawItem.discount * 100) : parseMoney(String(rawItem.discount));
        } catch {
          discount = 0;
        }
      }

      items.push({
        id: crypto.randomUUID(),
        title,
        unitPrice,
        quantity,
        discount,
        unit: (rawItem.unit as any) || "each",
        size: Number(rawItem.size) || 1,
      });
    }
  }

  // If total wasn't parsed but items exist, compute total from items
  if (totalAmount <= 0 && items.length > 0) {
    totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity - (item.discount || 0), 0);
  }

  const suggestedCategory = (parsed.category || "Groceries") as Category;

  return {
    merchant,
    date,
    currency: "NZD",
    amount: Math.max(0, totalAmount),
    items,
    text: rawText,
    category: suggestedCategory,
  } as ReceiptSuggestion & { category?: Category };
}

export interface FinancialContext {
  weekTotalNZD: number;
  weeklyLimitNZD: number;
  daysRemainingInWeek: number;
  dailyAllowanceNZD: number;
  monthTotalNZD: number;
  frequentWeeklyCommitmentNZD: number;
  frequentPayments: { name: string; amountNZD: number; frequency: string; category: string }[];
  categorySpend: { category: string; amountNZD: number; percent: number }[];
  recentExpenses: { merchant: string; amountNZD: number; category: string; date: string }[];
}

export interface AiFinancialAnalysis {
  headline: string;
  summary: string;
  status: "on_track" | "caution" | "critical";
  insights: string[];
  recommendations: string[];
  potentialSavingsNZD: number;
}

export async function analyzeExpensesWithGemma(
  mode: "pacing" | "savings" | "bills" | "audit",
  context: FinancialContext,
  signal?: AbortSignal,
): Promise<AiFinancialAnalysis> {
  if (!isLocalDesktopApp()) {
    throw new Error("AI features are disabled on the hosted web application.");
  }
  const host = getOllamaHost();
  const model = getOllamaModel();

  const contextJson = JSON.stringify(context, null, 2);

  const modeInstructions: Record<string, string> = {
    pacing: "Focus on weekly budget pacing, days remaining in the week, daily allowance vs spend rate, and whether the user is on track to stay within their limit.",
    savings: "Analyze spending across categories, identify discretionary waste or unusually high expenditure, and offer 3 practical, actionable tips to save money this week.",
    bills: "Examine recurring frequent payments and bills, calculate the annualized cost impact, detect potential subscription fatigue, and suggest areas to negotiate or trim.",
    audit: "Provide an overall financial health check comparing month spend, weekly pace, and accounts. Highlight the highest impact money move the user can make today.",
  };

  const systemPrompt = `You are a personal finance advisor powered by local Gemma.
Analyze the user's spending data and respond in strict JSON format matching this schema:
{
  "headline": "Short punchy 4-8 word title",
  "summary": "1-2 sentence executive summary of financial status",
  "status": "on_track" | "caution" | "critical",
  "insights": ["Key observation 1", "Key observation 2", "Key observation 3"],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2", "Actionable recommendation 3"],
  "potentialSavingsNZD": number (estimated realistic weekly or monthly savings in NZD, e.g. 45)
}

Focus instructions: ${modeInstructions[mode] || modeInstructions.audit}
All amounts in context are in NZD.
Return ONLY valid JSON. No conversational preamble, no markdown backticks.`;

  const response = await fetch(`${host}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model,
      prompt: `${systemPrompt}\n\nFinancial Context Data:\n${contextJson}`,
      stream: false,
      format: "json",
      options: {
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed (${response.status}): ${await response.text()}`);
  }

  const result = (await response.json()) as { response?: string };
  const rawOutput = (result.response || "").trim();

  let cleanedJson = rawOutput;
  if (cleanedJson.startsWith("```")) {
    cleanedJson = cleanedJson.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }

  try {
    const parsed = JSON.parse(cleanedJson) as AiFinancialAnalysis;
    return {
      headline: parsed.headline || "Weekly Financial Analysis",
      summary: parsed.summary || "Here is your spending analysis based on recent data.",
      status: ["on_track", "caution", "critical"].includes(parsed.status) ? parsed.status : "on_track",
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      potentialSavingsNZD: Number(parsed.potentialSavingsNZD) || 0,
    };
  } catch (parseErr) {
    throw new Error("Could not parse JSON response from Ollama: " + cleanedJson.slice(0, 100));
  }
}
