import {
  isLocalDesktopApp,
  getOllamaHost,
  getOllamaModel,
} from "@/lib/ollama";
import { isSpendingRelatedQuery } from "@/lib/spending-knowledge";

export type AiChatBudgetMode = "low" | "medium" | "high";

export interface AiChatActionItem {
  action: "cut" | "swap" | "keep" | "optimize";
  target: string;
  estimatedSavingsNZD: number;
  impact: string;
}

export interface AiChatStructuredOutput {
  outOfScope: boolean;
  budgetMode: AiChatBudgetMode;
  verdict: string;
  reply: string;
  dataInsights: string[];
  actionPlan: AiChatActionItem[];
}

export interface ChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

export function getSystemPromptForMode(mode: AiChatBudgetMode): string {
  const modePersonalities: Record<AiChatBudgetMode, string> = {
    low: `[PERSONA: BUDGET LOW - RUTHLESS FRUGALITY & SURVIVAL]
- You are uncompromising, highly critical, and strict about eliminating waste.
- Treat every discretionary purchase as a budget leak.
- When asked about items (e.g., "should I remove milk?"), check unit price economics: advocate cheapest bulk store, generic brands, or reducing consumption.
- Prioritize staying strictly under the weekly limit.`,

    medium: `[PERSONA: BUDGET MEDIUM - BALANCED & VALUE-OPTIMIZED]
- You are an analytical, pragmatic financial coach.
- Balance quality of life with smart trade-offs.
- Do not cut essential nutritional staples blindly; instead, optimize unit prices, compare shops (e.g. Pak'nSave vs Countdown), and cut underused recurring subscriptions or impulse snacks.`,

    high: `[PERSONA: BUDGET HIGH - ABUNDANCE, GROWTH & STRATEGIC ROI]
- You are a wealth-building strategist focused on high-leverage money moves.
- Do not waste mental energy micromanaging small staple expenses like milk or coffee.
- Focus on maximizing income, negotiating major fixed recurring costs (rent, utilities, insurance), and optimizing capital surplus for investments.`,
  };

  return `You are the local spending and expense advisor for the Together Expenses app.
${modePersonalities[mode]}

[CRITICAL SCOPE RULE]
You ONLY answer questions regarding expenses, spendings, shopping carts, regular purchases, recurring bills, budget pacing, and income/savings optimization.
If the user's message is unrelated (e.g. coding, centering a div, generating arbitrary json numbers, fantasy/kings, general trivia), you MUST return:
{
  "outOfScope": true,
  "budgetMode": "${mode}",
  "verdict": "Off-topic query discarded",
  "reply": "I am your personal spending and expense advisor. I only handle questions about your expenses, budgets, shopping purchases, and financial optimization within this app.",
  "dataInsights": [],
  "actionPlan": []
}

[OUTPUT FORMAT]
Respond ONLY with a valid JSON object matching this exact schema:
{
  "outOfScope": false,
  "budgetMode": "${mode}",
  "verdict": "Direct 1-sentence decision/verdict",
  "reply": "Critical conversational explanation tailored to the active budget persona",
  "dataInsights": ["Key observation 1 with real numbers", "Key observation 2"],
  "actionPlan": [
    {
      "action": "cut" | "swap" | "keep" | "optimize",
      "target": "Product or category name",
      "estimatedSavingsNZD": number,
      "impact": "1-sentence reason"
    }
  ]
}

No preamble, no conversational filler before or after the JSON.`;
}

export function createGenericOutOfScopeResponse(): AiChatStructuredOutput {
  return {
    outOfScope: true,
    budgetMode: "medium",
    verdict: "Off-topic question outside financial scope",
    reply:
      "I am your personal spending and expense advisor. I can only assist with questions about your expenses, budgets, shopping items, and financial optimization in this app. Please ask me about your purchases, bills, savings, or spending habits.",
    dataInsights: [],
    actionPlan: [],
  };
}

export function parseAiChatStructuredResponse(
  rawOutput: string,
  defaultMode: AiChatBudgetMode,
): AiChatStructuredOutput {
  let cleaned = rawOutput.trim();

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const defaultVerdict = "Financial spending assessment complete.";
    const defaultReply = "Review your spending data and action items below.";

    const verdict = typeof parsed.verdict === "string" && parsed.verdict.trim().length > 0
      ? parsed.verdict.trim()
      : defaultVerdict;

    const reply = typeof parsed.reply === "string" && parsed.reply.trim().length > 0
      ? parsed.reply.trim()
      : defaultReply;

    const validModes: AiChatBudgetMode[] = ["low", "medium", "high"];
    const budgetMode = typeof parsed.budgetMode === "string" && validModes.includes(parsed.budgetMode as AiChatBudgetMode)
      ? (parsed.budgetMode as AiChatBudgetMode)
      : defaultMode;

    const dataInsights = Array.isArray(parsed.dataInsights)
      ? parsed.dataInsights.filter((item): item is string => typeof item === "string")
      : [];

    const rawActionPlan = Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [];
    const validActions: AiChatActionItem["action"][] = ["cut", "swap", "keep", "optimize"];

    const actionPlan: AiChatActionItem[] = rawActionPlan.map((rawItem: unknown) => {
      const item = (typeof rawItem === "object" && rawItem !== null ? rawItem : {}) as Record<string, unknown>;
      const actionStr = typeof item.action === "string" ? item.action : "";
      const action: AiChatActionItem["action"] = validActions.includes(actionStr as AiChatActionItem["action"])
        ? (actionStr as AiChatActionItem["action"])
        : "optimize";

      return {
        action,
        target: typeof item.target === "string" && item.target.trim().length > 0 ? item.target : "Expense item",
        estimatedSavingsNZD: typeof item.estimatedSavingsNZD === "number" && !Number.isNaN(item.estimatedSavingsNZD)
          ? item.estimatedSavingsNZD
          : Number(item.estimatedSavingsNZD) || 0,
        impact: typeof item.impact === "string" ? item.impact : "",
      };
    });

    return {
      outOfScope: Boolean(parsed.outOfScope),
      budgetMode,
      verdict,
      reply,
      dataInsights,
      actionPlan,
    };
  } catch {
    return {
      outOfScope: false,
      budgetMode: defaultMode,
      verdict: "Reviewing spending analysis",
      reply: cleaned.slice(0, 500) || "Could not format response from local model.",
      dataInsights: [],
      actionPlan: [],
    };
  }
}

export async function queryLocalFinancialChat(params: {
  userMessage: string;
  mode: AiChatBudgetMode;
  financialContext: string;
  history: ChatHistoryEntry[];
  signal?: AbortSignal;
}): Promise<AiChatStructuredOutput> {
  const scopeCheck = isSpendingRelatedQuery(params.userMessage);
  if (!scopeCheck.isAllowed) {
    return createGenericOutOfScopeResponse();
  }

  if (!isLocalDesktopApp()) {
    throw new Error("AI features are disabled on the hosted web application. Run locally on desktop to use Gemma.");
  }

  const host = getOllamaHost();
  const model = getOllamaModel();
  const systemPrompt = getSystemPromptForMode(params.mode);

  // Keep last 4 exchanges to protect local model context window
  const boundedHistory = params.history.slice(-4);
  const formattedHistory = boundedHistory
    .map((h) => `${h.role === "user" ? "User" : "Advisor"}: ${h.content}`)
    .join("\n\n");

  const fullPrompt = `${systemPrompt}

${params.financialContext}

${formattedHistory ? `[RECENT CONVERSATION]\n${formattedHistory}\n\n` : ""}[CURRENT USER QUERY]
User: ${params.userMessage}
Advisor (JSON only):`;

  const response = await fetch(`${host}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: params.signal,
    body: JSON.stringify({
      model,
      prompt: fullPrompt,
      stream: false,
      format: "json",
      options: {
        temperature: params.mode === "low" ? 0.1 : params.mode === "medium" ? 0.2 : 0.35,
        num_predict: 512,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed (${response.status}): ${await response.text()}`);
  }

  const jsonResult = (await response.json()) as { response?: string };
  return parseAiChatStructuredResponse(jsonResult.response || "", params.mode);
}
