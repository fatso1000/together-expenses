import test from "node:test";
import assert from "node:assert/strict";
import {
  getSystemPromptForMode,
  parseAiChatStructuredResponse,
  createGenericOutOfScopeResponse,
  queryLocalFinancialChat,
} from "../src/lib/ai-chat.ts";

test("getSystemPromptForMode provides strict persona instructions", () => {
  const lowPrompt = getSystemPromptForMode("low");
  assert.match(lowPrompt, /Frugal/i);
  assert.match(lowPrompt, /discretionary/i);

  const mediumPrompt = getSystemPromptForMode("medium");
  assert.match(mediumPrompt, /Balanced/i);

  const highPrompt = getSystemPromptForMode("high");
  assert.match(highPrompt, /Growth/i);
  assert.match(highPrompt, /ROI/i);
});

test("parseAiChatStructuredResponse parses clean JSON", () => {
  const json = JSON.stringify({
    outOfScope: false,
    budgetMode: "low",
    verdict: "Cut milk from branded supermarket to generic brand.",
    reply: "You bought 2L milk 6 times. Switch to value brand.",
    dataInsights: ["Milk cost $25.20 this month"],
    actionPlan: [
      {
        action: "swap",
        target: "Standard Milk 2L",
        estimatedSavingsNZD: 4.5,
        impact: "Save 18% on dairy.",
      },
    ],
  });

  const parsed = parseAiChatStructuredResponse(json, "low");
  assert.equal(parsed.outOfScope, false);
  assert.equal(parsed.budgetMode, "low");
  assert.equal(parsed.verdict, "Cut milk from branded supermarket to generic brand.");
  assert.equal(parsed.actionPlan.length, 1);
  assert.equal(parsed.actionPlan[0].action, "swap");
  assert.equal(parsed.actionPlan[0].estimatedSavingsNZD, 4.5);
});

test("parseAiChatStructuredResponse handles markdown fenced code blocks", () => {
  const raw = `\`\`\`json
{
  "outOfScope": false,
  "budgetMode": "medium",
  "verdict": "Keep milk, cut impulse snacks.",
  "reply": "Milk is an essential nutrition staple.",
  "dataInsights": ["Groceries are 45% of budget"],
  "actionPlan": []
}
\`\`\``;

  const parsed = parseAiChatStructuredResponse(raw, "medium");
  assert.equal(parsed.verdict, "Keep milk, cut impulse snacks.");
});

test("parseAiChatStructuredResponse handles malformed or non-JSON fallback", () => {
  const raw = "I am a local LLM and here is plain text without JSON.";
  const parsed = parseAiChatStructuredResponse(raw, "high");
  assert.equal(parsed.budgetMode, "high");
  assert.equal(parsed.verdict, "Reviewing spending analysis");
  assert.equal(parsed.reply, "I am a local LLM and here is plain text without JSON.");
  assert.equal(parsed.dataInsights.length, 0);
  assert.equal(parsed.actionPlan.length, 0);
});

test("createGenericOutOfScopeResponse produces polite standard refusal", () => {
  const refusal = createGenericOutOfScopeResponse();
  assert.equal(refusal.outOfScope, true);
  assert.match(refusal.reply, /spending and expense advisor/i);
  assert.equal(refusal.actionPlan.length, 0);
});

test("queryLocalFinancialChat intercepts off-topic query before calling network", async () => {
  const refusal = await queryLocalFinancialChat({
    userMessage: "how do I center a div in css?",
    mode: "medium",
    financialContext: "Spent $50 this week",
    history: [],
  });

  assert.equal(refusal.outOfScope, true);
  assert.match(refusal.reply, /spending and expense advisor/i);
});

test("queryLocalFinancialChat queries Ollama and parses structured response", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) || "{}");
      assert.match(body.prompt, /FRUGAL/i);
      assert.match(body.prompt, /Groceries: \$100/);
      assert.equal(body.format, "json");
      assert.equal(body.options.temperature, 0.1);

      return {
        ok: true,
        status: 200,
        json: async () => ({
          response: JSON.stringify({
            outOfScope: false,
            budgetMode: "low",
            verdict: "Do not buy branded items",
            reply: "Generic brand saves $10",
            dataInsights: ["Saved $10"],
            actionPlan: [{ action: "cut", target: "Soda", estimatedSavingsNZD: 10, impact: "Cut junk food" }],
          }),
        }),
      } as unknown as Response;
    }) as typeof fetch;

    const result = await queryLocalFinancialChat({
      userMessage: "how can I save on groceries?",
      mode: "low",
      financialContext: "Groceries: $100",
      history: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi" },
      ],
    });

    assert.equal(result.outOfScope, false);
    assert.equal(result.budgetMode, "low");
    assert.equal(result.verdict, "Do not buy branded items");
    assert.equal(result.actionPlan.length, 1);
    assert.equal(result.actionPlan[0].action, "cut");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("queryLocalFinancialChat throws on Ollama HTTP failure", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => ({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    })) as unknown as typeof fetch;

    await assert.rejects(
      () =>
        queryLocalFinancialChat({
          userMessage: "how can I save on groceries?",
          mode: "medium",
          financialContext: "",
          history: [],
        }),
      /Ollama request failed \(500\)/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
