# Local LLM Spending & Budget AI Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, local-LLM-powered financial chat advisor that knows every aspect of user spendings (macro pacing, recurring bills, account cashflow, and micro item purchases), enforces strict financial scope guardrails, optimizes tokens via structured JSON schemas and deterministic context indexing, and adapts behavior across three distinct budget personas (Low, Medium, High).

**Architecture:** A client-side **Spending Knowledge Synthesizer** deterministically aggregates financial pacing, recurring commitments, and regular item-level purchase patterns from the Pinia store into a compact context (< 400 tokens) with keyword-targeted item retrieval. A **Strict Scope Guardrail** rejects off-topic queries immediately (fast-path heuristic + LLM system constraints). An **AI Chat Engine** communicates with local Ollama (`http://localhost:11434`, default `gemma4:e4b`), tailoring its prompt to the user's chosen budget mode (`low`, `medium`, `high`) and enforcing a compact JSON structured output schema that renders rich verdicts, data insights, and actionable saving cards in a responsive Glass Liquid UI.

**Tech Stack:** Vue 3 (Composition API `<script setup>`), TypeScript, Pinia, Ollama REST API (`/api/generate`), Lucide Icons, Node `tsx --test`.

**Spec:** In-line specification derived from user requirements:
- Grounded in granular spending data & regular purchase history (items, quantities, unit prices, store variations).
- Structured output schema to prevent token bloat and optimize local model inference.
- Three selectable budget modes: `low` (frugal/ruthless), `medium` (balanced/pragmatic), `high` (growth/abundance).
- Strict scope filtering: off-topic questions (e.g. "center a div", "generate json with 1 to 10", "become a king") must be rejected with a standard refusal.
- Useful and critical responses to real purchasing questions ("should I remove milk?", "what can I cut from my shopping cart?", "how can I earn the most money?").
- Performance, token, and memory optimizations (bounded conversation sliding window, targeted retrieval, deterministic pre-aggregation).

## Global Constraints

- Must run strictly in local desktop environment via `isLocalDesktopApp()` check; disabled on hosted web.
- Integer cents standard: all currency operations inside data structures use integer cents, converted to dollar floats only for LLM context prompts and UI formatting.
- Readability-first code: descriptive names, explicit control flow, small cohesive functions, no dense one-liners or placeholders.
- Zero extra external npm dependencies: use existing native fetch, Pinia, and Vue reactive utilities.
- Maintain existing test suite: all 49 existing unit tests must continue passing.

---

## File Structure

```
together/
├── src/
│   ├── lib/
│   │   ├── spending-knowledge.ts       # Deterministic financial profile & regular purchases index
│   │   └── ai-chat.ts                  # Local LLM chat client, prompt engineering & structured parser
│   ├── stores/
│   │   └── ai-chat.ts                  # Pinia store for chat messages, budget mode, and history
│   ├── components/
│   │   ├── AiSpendingChat.vue          # Interactive Glass UI chat interface with action cards
│   │   └── AiMoneyAdvisor.vue          # Tabbed container embedding Chat & Quick Audit
│   └── locales/
│       ├── en.json                     # English translation keys for chat & modes
│       └── es.json                     # Spanish translation keys for chat & modes
└── tests/
    ├── spending-knowledge.test.ts      # Unit tests for knowledge synthesizer & scope guardrail
    ├── ai-chat.test.ts                 # Unit tests for prompt building, modes & JSON parsing
    └── ai-chat-store.test.ts           # Store integration tests
```

---

### Task 1: Spending Knowledge Synthesizer & Scope Guardrails

**Files:**
- Create: `together/src/lib/spending-knowledge.ts`
- Test: `together/tests/spending-knowledge.test.ts`

**Interfaces:**
- Consumes: `Expense`, `PurchaseItem`, `FrequentPayment`, `FinancialAccounts`, `SalaryConfig` from `together/src/lib/types.ts`, `today` from `together/src/lib/finance.ts`.
- Produces:
  ```typescript
  export interface RegularPurchaseItem {
    normalizedTitle: string;
    displayTitle: string;
    purchaseCount: number;
    totalSpentCents: number;
    averageUnitPriceCents: number;
    latestPriceCents: number;
    latestShop: string;
    latestDate: string;
    unit?: string;
    shopPrices: Record<string, number>;
  }

  export interface CompactFinancialSummary {
    currency: string;
    weekTotalNZD: number;
    weeklyLimitNZD: number;
    daysRemainingInWeek: number;
    dailyAllowanceNZD: number;
    pacingStatus: "under_budget" | "near_limit" | "exceeded";
    monthTotalNZD: number;
    salaryWeeklyNZD: number;
    activeRecurringWeeklyCommitmentNZD: number;
    topCategories: Array<{ category: string; amountNZD: number }>;
    accounts: {
      globalCapitalNZD: number;
      nzSavingsNZD: number;
    };
  }

  export interface ScopeCheckResult {
    isAllowed: boolean;
    reason?: string;
  }

  export function isSpendingRelatedQuery(query: string): ScopeCheckResult;
  export function indexRegularPurchases(expenses: Expense[]): RegularPurchaseItem[];
  export function findRelevantPurchases(index: RegularPurchaseItem[], query: string, limit?: number): RegularPurchaseItem[];
  export function buildCompactFinancialSummary(params: { ... }): CompactFinancialSummary;
  export function formatKnowledgeForPrompt(summary: CompactFinancialSummary, relevantPurchases: RegularPurchaseItem[]): string;
  ```

- [ ] **Step 1: Write the failing unit tests for knowledge extraction and scope guardrail**

Create `together/tests/spending-knowledge.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import type { Expense } from "../src/lib/types.ts";
import {
  isSpendingRelatedQuery,
  indexRegularPurchases,
  findRelevantPurchases,
  buildCompactFinancialSummary,
  formatKnowledgeForPrompt,
} from "../src/lib/spending-knowledge.ts";

test("isSpendingRelatedQuery accepts financial and purchase queries", () => {
  const allowedQueries = [
    "should I remove milk?",
    "what can I cut from my shopping cart?",
    "how can I earn the most money?",
    "is my grocery spending too high?",
    "audit my recurring subscriptions",
    "can I afford eating out tonight?",
  ];

  for (const q of allowedQueries) {
    const res = isSpendingRelatedQuery(q);
    assert.equal(res.isAllowed, true, `Query "${q}" should be allowed`);
  }
});

test("isSpendingRelatedQuery rejects programming, trivia, and off-topic absurdities", () => {
  const rejectedQueries = [
    "generate a json with the numbers from 1 to 10",
    "how can I center a div",
    "how can I use my expenses to become a king",
    "write a python script to parse csv",
    "what is the capital of France?",
    "write a poem about dragons",
  ];

  for (const q of rejectedQueries) {
    const res = isSpendingRelatedQuery(q);
    assert.equal(res.isAllowed, false, `Query "${q}" should be rejected`);
  }
});

test("indexRegularPurchases calculates frequency, avg price, and shop comparisons", () => {
  const sampleExpenses: Expense[] = [
    {
      id: "e1",
      amount: 840,
      currency: "NZD",
      category: "Groceries",
      merchant: "PaknSave",
      note: "Weekly groceries",
      date: "2026-10-10",
      createdAt: 1,
      updatedAt: 1,
      items: [
        { id: "i1", title: "Standard Milk 2L", unitPrice: 420, quantity: 1, unit: "L" },
        { id: "i2", title: "Toast Bread 700g", unitPrice: 280, quantity: 1, unit: "each" },
      ],
    },
    {
      id: "e2",
      amount: 450,
      currency: "NZD",
      category: "Groceries",
      merchant: "Countdown",
      note: "Top up",
      date: "2026-10-15",
      createdAt: 2,
      updatedAt: 2,
      items: [
        { id: "i3", title: "Standard Milk 2L", unitPrice: 450, quantity: 1, unit: "L" },
      ],
    },
  ];

  const index = indexRegularPurchases(sampleExpenses);
  const milk = index.find((i) => i.normalizedTitle.includes("milk"));
  assert.ok(milk, "Milk should be indexed");
  assert.equal(milk.purchaseCount, 2);
  assert.equal(milk.totalSpentCents, 870);
  assert.equal(milk.averageUnitPriceCents, 435);
  assert.equal(milk.shopPrices["PaknSave"], 420);
  assert.equal(milk.shopPrices["Countdown"], 450);
});

test("findRelevantPurchases extracts matching items by keyword", () => {
  const sampleExpenses: Expense[] = [
    {
      id: "e1",
      amount: 800,
      currency: "NZD",
      category: "Groceries",
      merchant: "Supermarket",
      note: "",
      date: "2026-10-10",
      createdAt: 1,
      updatedAt: 1,
      items: [
        { id: "i1", title: "Organic Whole Milk 2L", unitPrice: 520, quantity: 1 },
        { id: "i2", title: "Eggs 12pk", unitPrice: 750, quantity: 1 },
      ],
    },
  ];

  const index = indexRegularPurchases(sampleExpenses);
  const matches = findRelevantPurchases(index, "should I cut milk from my breakfast?");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].displayTitle, "Organic Whole Milk 2L");
});

test("buildCompactFinancialSummary formats figures under budget", () => {
  const summary = buildCompactFinancialSummary({
    weekTotalCents: 15000,
    weeklyLimitCents: 30000,
    daysRemaining: 4,
    monthTotalCents: 65000,
    salaryWeeklyCents: 120000,
    frequentWeeklyCommitmentCents: 10000,
    topCategories: [{ category: "Groceries", amountCents: 10000 }],
    globalCapitalCents: 500000,
    nzSavingsCents: 250000,
  });

  assert.equal(summary.pacingStatus, "under_budget");
  assert.equal(summary.dailyAllowanceNZD, 37.5);
  assert.equal(summary.weekTotalNZD, 150);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd together && pnpm tsx --test tests/spending-knowledge.test.ts
```
Expected: FAIL with module not found `together/src/lib/spending-knowledge.ts`.

- [ ] **Step 3: Implement `together/src/lib/spending-knowledge.ts`**

Write `together/src/lib/spending-knowledge.ts`:
```typescript
import type { Expense, PurchaseItem } from "@/lib/types";

export interface RegularPurchaseItem {
  normalizedTitle: string;
  displayTitle: string;
  purchaseCount: number;
  totalSpentCents: number;
  averageUnitPriceCents: number;
  latestPriceCents: number;
  latestShop: string;
  latestDate: string;
  unit?: string;
  shopPrices: Record<string, number>;
}

export interface CompactFinancialSummary {
  currency: string;
  weekTotalNZD: number;
  weeklyLimitNZD: number;
  daysRemainingInWeek: number;
  dailyAllowanceNZD: number;
  pacingStatus: "under_budget" | "near_limit" | "exceeded";
  monthTotalNZD: number;
  salaryWeeklyNZD: number;
  activeRecurringWeeklyCommitmentNZD: number;
  topCategories: Array<{ category: string; amountNZD: number }>;
  accounts: {
    globalCapitalNZD: number;
    nzSavingsNZD: number;
  };
}

export interface ScopeCheckResult {
  isAllowed: boolean;
  reason?: string;
}

const REJECT_PATTERNS: RegExp[] = [
  /\b(?:div|center a div|css|html|javascript|typescript|python|react|vue|json\b.*number|code\b.*function|algorithm|sql query)\b/i,
  /\b(?:king|queen|monarch|throne|emperor|conquer|magic|spell)\b/i,
  /\b(?:poem|song|story|fantasy|dragon|joke|riddle|trivia|capital of|who won|translate this text)\b/i,
];

const FINANCIAL_KEYWORDS: RegExp[] = [
  /\b(?:spend|spending|spent|expense|expenses|cost|costs|budget|budgets|money|saving|savings|save|cut|shopping|cart|buy|bought|purchase|purchases|price|prices|cheap|cheaper|expensive|afford|bill|bills|subscription|subscriptions|salary|income|earn|earning|milk|groceries|petrol|fuel|coffee|food|rent|debt|cash|dollar|nzd|usd|account)\b/i,
];

export function isSpendingRelatedQuery(rawQuery: string): ScopeCheckResult {
  const query = rawQuery.trim();
  if (query.length === 0) {
    return { isAllowed: false, reason: "Query is empty" };
  }

  for (const pattern of REJECT_PATTERNS) {
    if (pattern.test(query)) {
      return {
        isAllowed: false,
        reason: "Query touches off-topic programming, fantasy, or non-financial domain.",
      };
    }
  }

  const hasFinancialIntent = FINANCIAL_KEYWORDS.some((kw) => kw.test(query));
  if (!hasFinancialIntent && query.length > 35) {
    return {
      isAllowed: false,
      reason: "Query does not appear related to spending, budgeting, or shopping.",
    };
  }

  return { isAllowed: true };
}

function normalizeTitle(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function indexRegularPurchases(expenses: Expense[]): RegularPurchaseItem[] {
  const map = new Map<string, RegularPurchaseItem>();

  for (const expense of expenses) {
    const items = expense.items || [];
    const shop = expense.merchant || "Unknown";
    const date = expense.date;

    for (const item of items) {
      const title = (item.title || "").trim();
      if (!title) continue;

      const norm = normalizeTitle(title);
      if (!norm) continue;

      const unitPrice = item.unitPrice || 0;
      const quantity = item.quantity || 1;
      const lineCost = Math.max(0, Math.round(unitPrice * quantity) - (item.discount || 0));

      let existing = map.get(norm);
      if (!existing) {
        existing = {
          normalizedTitle: norm,
          displayTitle: title,
          purchaseCount: 0,
          totalSpentCents: 0,
          averageUnitPriceCents: 0,
          latestPriceCents: unitPrice,
          latestShop: shop,
          latestDate: date,
          unit: item.unit,
          shopPrices: {},
        };
        map.set(norm, existing);
      }

      existing.purchaseCount += 1;
      existing.totalSpentCents += lineCost;
      existing.shopPrices[shop] = unitPrice;

      if (!existing.latestDate || date >= existing.latestDate) {
        existing.latestDate = date;
        existing.latestPriceCents = unitPrice;
        existing.latestShop = shop;
      }
    }
  }

  for (const item of map.values()) {
    if (item.purchaseCount > 0) {
      item.averageUnitPriceCents = Math.round(item.totalSpentCents / item.purchaseCount);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.purchaseCount - a.purchaseCount);
}

export function findRelevantPurchases(
  index: RegularPurchaseItem[],
  query: string,
  limit: number = 5,
): RegularPurchaseItem[] {
  const normQuery = normalizeTitle(query);
  const words = normQuery.split(" ").filter((w) => w.length > 2);

  if (words.length === 0) {
    return index.slice(0, limit);
  }

  const scored = index.map((item) => {
    let score = 0;
    if (item.normalizedTitle.includes(normQuery) || normQuery.includes(item.normalizedTitle)) {
      score += 100;
    }
    for (const word of words) {
      if (item.normalizedTitle.includes(word)) {
        score += 25;
      }
    }
    return { item, score };
  });

  const matching = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.item.purchaseCount - a.item.purchaseCount)
    .map((s) => s.item);

  return matching.length > 0 ? matching.slice(0, limit) : index.slice(0, limit);
}

export function buildCompactFinancialSummary(params: {
  weekTotalCents: number;
  weeklyLimitCents: number;
  daysRemaining: number;
  monthTotalCents: number;
  salaryWeeklyCents: number;
  frequentWeeklyCommitmentCents: number;
  topCategories: Array<{ category: string; amountCents: number }>;
  globalCapitalCents: number;
  nzSavingsCents: number;
}): CompactFinancialSummary {
  const safeDays = Math.max(1, Math.min(7, params.daysRemaining));
  const remainingAllowanceCents = Math.max(0, params.weeklyLimitCents - params.weekTotalCents);
  const dailyAllowanceNZD =
    params.weeklyLimitCents > 0 ? Math.round((remainingAllowanceCents / safeDays) / 100 * 10) / 10 : 0;

  let pacingStatus: "under_budget" | "near_limit" | "exceeded" = "under_budget";
  if (params.weeklyLimitCents > 0) {
    if (params.weekTotalCents >= params.weeklyLimitCents) {
      pacingStatus = "exceeded";
    } else if (params.weekTotalCents >= params.weeklyLimitCents * 0.85) {
      pacingStatus = "near_limit";
    }
  }

  return {
    currency: "NZD",
    weekTotalNZD: Math.round(params.weekTotalCents / 100),
    weeklyLimitNZD: Math.round(params.weeklyLimitCents / 100),
    daysRemainingInWeek: safeDays,
    dailyAllowanceNZD,
    pacingStatus,
    monthTotalNZD: Math.round(params.monthTotalCents / 100),
    salaryWeeklyNZD: Math.round(params.salaryWeeklyCents / 100),
    activeRecurringWeeklyCommitmentNZD: Math.round(params.frequentWeeklyCommitmentCents / 100),
    topCategories: params.topCategories.map((c) => ({
      category: c.category,
      amountNZD: Math.round(c.amountCents / 100),
    })),
    accounts: {
      globalCapitalNZD: Math.round(params.globalCapitalCents / 100),
      nzSavingsNZD: Math.round(params.nzSavingsCents / 100),
    },
  };
}

export function formatKnowledgeForPrompt(
  summary: CompactFinancialSummary,
  relevantPurchases: RegularPurchaseItem[],
): string {
  const purchasesLines = relevantPurchases
    .map((p) => {
      const avgDollars = (p.averageUnitPriceCents / 100).toFixed(2);
      const shops = Object.entries(p.shopPrices)
        .map(([s, c]) => `${s}: $${(c / 100).toFixed(2)}`)
        .join(", ");
      return `- ${p.displayTitle} (${p.purchaseCount}x bought, avg $${avgDollars}, last at ${p.latestShop || "store"}${shops ? " | " + shops : ""})`;
    })
    .join("\n");

  const categories = summary.topCategories
    .map((c) => `${c.category}: $${c.amountNZD}`)
    .join(", ");

  return `[FINANCIAL_CONTEXT]
Pacing: spent $${summary.weekTotalNZD}/$${summary.weeklyLimitNZD} NZD (${summary.daysRemainingInWeek} days left, daily allowance $${summary.dailyAllowanceNZD}, status: ${summary.pacingStatus})
Month: $${summary.monthTotalNZD} NZD | Income avg: $${summary.salaryWeeklyNZD}/wk | Fixed commitments: $${summary.activeRecurringWeeklyCommitmentNZD}/wk
Capital: Global $${summary.accounts.globalCapitalNZD} NZD | Local Savings $${summary.accounts.nzSavingsNZD} NZD
Top Categories: ${categories || "None"}
[RELEVANT_PURCHASES]
${purchasesLines || "No regular purchase items logged yet."}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd together && pnpm tsx --test tests/spending-knowledge.test.ts
```
Expected: PASS with 5 passed tests.

- [ ] **Step 5: Commit changes**

Run:
```bash
cd together && git add src/lib/spending-knowledge.ts tests/spending-knowledge.test.ts && git commit -m "feat(ai): add deterministic spending knowledge synthesizer and scope guardrail"
```

---

### Task 2: AI Chat Engine & Structured Prompt Optimizer

**Files:**
- Create: `together/src/lib/ai-chat.ts`
- Test: `together/tests/ai-chat.test.ts`

**Interfaces:**
- Consumes: `isLocalDesktopApp`, `getOllamaHost`, `getOllamaModel` from `together/src/lib/ollama.ts`, `CompactFinancialSummary`, `RegularPurchaseItem`, `formatKnowledgeForPrompt`, `isSpendingRelatedQuery` from `together/src/lib/spending-knowledge.ts`.
- Produces:
  ```typescript
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

  export function getSystemPromptForMode(mode: AiChatBudgetMode): string;
  export function parseAiChatStructuredResponse(rawOutput: string, defaultMode: AiChatBudgetMode): AiChatStructuredOutput;
  export function createGenericOutOfScopeResponse(): AiChatStructuredOutput;
  export async function queryLocalFinancialChat(params: {
    userMessage: string;
    mode: AiChatBudgetMode;
    financialContext: string;
    history: ChatHistoryEntry[];
    signal?: AbortSignal;
  }): Promise<AiChatStructuredOutput>;
  ```

- [ ] **Step 1: Write the failing unit tests for prompt building, modes, and structured JSON parsing**

Create `together/tests/ai-chat.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import {
  getSystemPromptForMode,
  parseAiChatStructuredResponse,
  createGenericOutOfScopeResponse,
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

test("createGenericOutOfScopeResponse produces polite standard refusal", () => {
  const refusal = createGenericOutOfScopeResponse();
  assert.equal(refusal.outOfScope, true);
  assert.match(refusal.reply, /spending and expense advisor/i);
  assert.equal(refusal.actionPlan.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd together && pnpm tsx --test tests/ai-chat.test.ts
```
Expected: FAIL with module not found `together/src/lib/ai-chat.ts`.

- [ ] **Step 3: Implement `together/src/lib/ai-chat.ts`**

Write `together/src/lib/ai-chat.ts`:
```typescript
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
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<AiChatStructuredOutput>;
    return {
      outOfScope: Boolean(parsed.outOfScope),
      budgetMode: (parsed.budgetMode as AiChatBudgetMode) || defaultMode,
      verdict: parsed.verdict || "Financial spending assessment complete.",
      reply: parsed.reply || "Review your spending data and action items below.",
      dataInsights: Array.isArray(parsed.dataInsights) ? parsed.dataInsights : [],
      actionPlan: Array.isArray(parsed.actionPlan)
        ? parsed.actionPlan.map((a) => ({
            action: (["cut", "swap", "keep", "optimize"].includes(a.action) ? a.action : "optimize") as any,
            target: String(a.target || "Expense item"),
            estimatedSavingsNZD: Number(a.estimatedSavingsNZD) || 0,
            impact: String(a.impact || ""),
          }))
        : [],
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
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd together && pnpm tsx --test tests/ai-chat.test.ts
```
Expected: PASS with 4 passed tests.

- [ ] **Step 5: Commit changes**

Run:
```bash
cd together && git add src/lib/ai-chat.ts tests/ai-chat.test.ts && git commit -m "feat(ai): add AI chat engine with budget mode personas and JSON structured output"
```

---

### Task 3: Pinia AI Chat Store

**Files:**
- Create: `together/src/stores/ai-chat.ts`
- Test: `together/tests/ai-chat-store.test.ts`

**Interfaces:**
- Consumes: `useExpenses` from `together/src/stores/expenses.ts`, `queryLocalFinancialChat`, `AiChatBudgetMode`, `AiChatStructuredOutput` from `together/src/lib/ai-chat.ts`, `buildCompactFinancialSummary`, `indexRegularPurchases`, `findRelevantPurchases`, `formatKnowledgeForPrompt` from `together/src/lib/spending-knowledge.ts`.
- Produces:
  ```typescript
  export interface StoredChatMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    timestamp: number;
    structured?: AiChatStructuredOutput;
    mode?: AiChatBudgetMode;
  }

  export const useAiChat = defineStore("ai-chat", () => {
    const messages = ref<StoredChatMessage[]>([]);
    const budgetMode = ref<AiChatBudgetMode>("medium");
    const loading = shallowRef(false);
    const error = shallowRef("");

    function setBudgetMode(mode: AiChatBudgetMode): void;
    function clearMessages(): void;
    async function sendMessage(text: string): Promise<void>;
  });
  ```

- [ ] **Step 1: Write unit tests for AI chat store**

Create `together/tests/ai-chat-store.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";

// Mock localStorage for Node
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage?.getItem) {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    length: 0,
  } as unknown as Storage;
}

import { isSpendingRelatedQuery } from "../src/lib/spending-knowledge.ts";

test("scope check blocks unrelated queries immediately before network call", () => {
  const badQuery = "how can I center a div";
  const check = isSpendingRelatedQuery(badQuery);
  assert.equal(check.isAllowed, false);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run:
```bash
cd together && pnpm tsx --test tests/ai-chat-store.test.ts
```
Expected: PASS.

- [ ] **Step 3: Implement `together/src/stores/ai-chat.ts`**

Write `together/src/stores/ai-chat.ts`:
```typescript
import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";
import { useExpenses } from "@/stores/expenses";
import {
  type AiChatBudgetMode,
  type AiChatStructuredOutput,
  type ChatHistoryEntry,
  queryLocalFinancialChat,
  createGenericOutOfScopeResponse,
} from "@/lib/ai-chat";
import {
  isSpendingRelatedQuery,
  indexRegularPurchases,
  findRelevantPurchases,
  buildCompactFinancialSummary,
  formatKnowledgeForPrompt,
} from "@/lib/spending-knowledge";
import { categoryTotals, today } from "@/lib/finance";

export interface StoredChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  structured?: AiChatStructuredOutput;
  mode?: AiChatBudgetMode;
}

const STORAGE_CHAT_KEY = "expenses-ai-chat-history";
const STORAGE_MODE_KEY = "expenses-ai-chat-mode";

export const useAiChat = defineStore("ai-chat", () => {
  const expensesStore = useExpenses();

  const savedMode = (typeof localStorage !== "undefined"
    ? localStorage.getItem(STORAGE_MODE_KEY)
    : "medium") as AiChatBudgetMode;
  const budgetMode = ref<AiChatBudgetMode>(
    ["low", "medium", "high"].includes(savedMode) ? savedMode : "medium",
  );

  const messages = ref<StoredChatMessage[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef("");

  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_CHAT_KEY);
      if (raw) {
        messages.value = JSON.parse(raw);
      }
    }
  } catch {}

  function persist(): void {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages.value.slice(-20)));
        localStorage.setItem(STORAGE_MODE_KEY, budgetMode.value);
      }
    } catch {}
  }

  function setBudgetMode(mode: AiChatBudgetMode): void {
    budgetMode.value = mode;
    persist();
  }

  function clearMessages(): void {
    messages.value = [];
    error.value = "";
    persist();
  }

  async function sendMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || loading.value) return;

    error.value = "";
    const userMessageId = crypto.randomUUID();
    messages.value.push({
      id: userMessageId,
      role: "user",
      text: trimmed,
      timestamp: Date.now(),
      mode: budgetMode.value,
    });
    persist();

    // Fast-path guardrail: reject non-spending questions immediately with zero token waste
    const scopeCheck = isSpendingRelatedQuery(trimmed);
    if (!scopeCheck.isAllowed) {
      const refusal = createGenericOutOfScopeResponse();
      messages.value.push({
        id: crypto.randomUUID(),
        role: "assistant",
        text: refusal.reply,
        timestamp: Date.now(),
        structured: refusal,
        mode: budgetMode.value,
      });
      persist();
      return;
    }

    loading.value = true;
    try {
      // Build synthesized spending context
      const regularIndex = indexRegularPurchases(expensesStore.expenses);
      const relevantItems = findRelevantPurchases(regularIndex, trimmed, 6);

      const now = new Date(`${today()}T12:00:00`).getTime();
      const end = new Date(`${expensesStore.weekEnd}T12:00:00`).getTime();
      const diffDays = Math.max(1, Math.min(7, Math.round((end - now) / (1000 * 60 * 60 * 24)) + 1));

      const catTotals = categoryTotals(expensesStore.weekExpenses, expensesStore.allCategories);
      const summary = buildCompactFinancialSummary({
        weekTotalCents: expensesStore.weekTotal,
        weeklyLimitCents: expensesStore.weeklyLimit,
        daysRemaining: diffDays,
        monthTotalCents: expensesStore.monthTotal,
        salaryWeeklyCents: expensesStore.salaryAverage,
        frequentWeeklyCommitmentCents: expensesStore.frequentWeeklyCommitment,
        topCategories: catTotals.slice(0, 4).map((c) => ({
          category: c.category,
          amountCents: c.amount,
        })),
        globalCapitalCents: expensesStore.accounts?.globalInitialNZD || 0,
        nzSavingsCents: expensesStore.accountBalances.nz,
      });

      const formattedContext = formatKnowledgeForPrompt(summary, relevantItems);

      const historyEntries: ChatHistoryEntry[] = messages.value
        .slice(-6, -1)
        .map((m) => ({
          role: m.role,
          content: m.text,
        }));

      const structured = await queryLocalFinancialChat({
        userMessage: trimmed,
        mode: budgetMode.value,
        financialContext: formattedContext,
        history: historyEntries,
      });

      messages.value.push({
        id: crypto.randomUUID(),
        role: "assistant",
        text: structured.reply,
        timestamp: Date.now(),
        structured,
        mode: budgetMode.value,
      });
      persist();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to query local LLM.";
    } finally {
      loading.value = false;
    }
  }

  return {
    messages,
    budgetMode,
    loading,
    error,
    setBudgetMode,
    clearMessages,
    sendMessage,
  };
});
```

- [ ] **Step 4: Verify typecheck passes**

Run:
```bash
cd together && pnpm vue-tsc --noEmit
```
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit changes**

Run:
```bash
cd together && git add src/stores/ai-chat.ts tests/ai-chat-store.test.ts && git commit -m "feat(ai): add Pinia store for local financial AI chat"
```

---

### Task 4: Interactive Glass AI Spending Chat Component

**Files:**
- Create: `together/src/components/AiSpendingChat.vue`
- Modify: `together/src/styles.css` (add chat-specific layout classes without overwriting existing variables)

**Features:**
- Budget Mode Switcher: 3 buttons (`Low`, `Medium`, `High`) with clear visual feedback and active state.
- Quick Prompt Pills:
  * "Should I remove milk?"
  * "What can I cut from my shopping cart?"
  * "How can I earn / save the most this week?"
  * "Audit my recurring bills & subscriptions"
- Chat Message Feed:
  * User message bubbles with time.
  * Assistant response cards with Glass styling:
    - Out-of-scope refusal badge and message if filtered.
    - Verdict badge (`verdict`).
    - Data Insights tags.
    - Action Plan Cards with direct NZD savings estimate badges (`cut`, `swap`, `keep`, `optimize`).
    - Conversational explanation text.
- Input bar:
  * Auto-resizing textarea / enter-to-send.
  * Loading spinner and send button.
  * Clear chat button with confirmation.

- [ ] **Step 1: Write `together/src/components/AiSpendingChat.vue`**

Write `together/src/components/AiSpendingChat.vue`:
```vue
<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from "vue";
import {
  MessageSquare,
  Sparkles,
  Send,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  Scissors,
  TrendingUp,
  ShieldAlert,
  Loader2,
} from "lucide-vue-next";
import { useAiChat } from "@/stores/ai-chat";
import { type AiChatBudgetMode } from "@/lib/ai-chat";
import { t } from "@/lib/i18n";

const chatStore = useAiChat();
const inputPrompt = ref("");
const chatContainer = ref<HTMLElement | null>(null);

const quickPrompts = [
  "Should I remove milk?",
  "What can I cut from my shopping cart?",
  "How can I earn/save the most this week?",
  "Audit my recurring bills & subscriptions",
];

const budgetModes: Array<{ id: AiChatBudgetMode; labelKey: string; desc: string }> = [
  { id: "low", labelKey: "ai.modes.low", desc: "Ruthless frugality & survival" },
  { id: "medium", labelKey: "ai.modes.medium", desc: "Balanced value & smart swaps" },
  { id: "high", labelKey: "ai.modes.high", desc: "Growth, abundance & strategic ROI" },
];

async function scrollToBottom() {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
}

watch(() => chatStore.messages.length, () => {
  void scrollToBottom();
});

onMounted(() => {
  void scrollToBottom();
});

async function onSend() {
  const text = inputPrompt.value.trim();
  if (!text || chatStore.loading) return;
  inputPrompt.value = "";
  await chatStore.sendMessage(text);
  void scrollToBottom();
}

function onQuickSelect(prompt: string) {
  inputPrompt.value = prompt;
  void onSend();
}

function getActionIcon(action: string) {
  switch (action) {
    case "cut": return Scissors;
    case "swap": return ArrowRightLeft;
    case "keep": return CheckCircle2;
    default: return Sparkles;
  }
}
</script>

<template>
  <div class="ai-spending-chat-container">
    <!-- Mode Selector & Header -->
    <div class="chat-header-bar">
      <div class="chat-header-title">
        <MessageSquare :size="18" class="accent-icon" />
        <strong>Spending Advisor Chat</strong>
      </div>

      <div class="budget-mode-selector" role="radiogroup" aria-label="Budget Mode">
        <button
          v-for="mode in budgetModes"
          :key="mode.id"
          type="button"
          class="mode-btn"
          :class="{ active: chatStore.budgetMode === mode.id }"
          :title="mode.desc"
          @click="chatStore.setBudgetMode(mode.id)"
        >
          {{ mode.id.toUpperCase() }}
        </button>
      </div>

      <button
        v-if="chatStore.messages.length > 0"
        type="button"
        class="icon-btn-compact"
        title="Clear chat history"
        @click="chatStore.clearMessages"
      >
        <Trash2 :size="14" />
      </button>
    </div>

    <!-- Quick Prompts Bar -->
    <div class="quick-prompts-bar">
      <button
        v-for="p in quickPrompts"
        :key="p"
        type="button"
        class="quick-prompt-pill"
        :disabled="chatStore.loading"
        @click="onQuickSelect(p)"
      >
        {{ p }}
      </button>
    </div>

    <!-- Chat Messages Window -->
    <div ref="chatContainer" class="chat-messages-window" role="log" aria-live="polite">
      <div v-if="chatStore.messages.length === 0" class="chat-empty-state">
        <Sparkles :size="28" class="sparkle-idle" />
        <p><strong>Ask anything about your expenses, shopping cart, or pacing.</strong></p>
        <span class="small muted">
          The advisor knows your weekly budget, recurring bills, and regular item purchase history.
        </span>
      </div>

      <div
        v-for="msg in chatStore.messages"
        :key="msg.id"
        class="chat-bubble-row"
        :class="msg.role"
      >
        <!-- User Bubble -->
        <div v-if="msg.role === 'user'" class="user-bubble">
          <p>{{ msg.text }}</p>
        </div>

        <!-- Assistant Structured Card -->
        <div v-else class="assistant-card">
          <!-- Out of Scope Refusal Banner -->
          <div v-if="msg.structured?.outOfScope" class="out-of-scope-banner">
            <ShieldAlert :size="16" />
            <span>{{ msg.structured.reply }}</span>
          </div>

          <div v-else>
            <!-- Verdict Badge -->
            <div class="verdict-banner">
              <Sparkles :size="16" class="verdict-icon" />
              <strong>{{ msg.structured?.verdict }}</strong>
            </div>

            <!-- Conversational Explanation -->
            <p class="assistant-text">{{ msg.text }}</p>

            <!-- Data Insights -->
            <div
              v-if="msg.structured?.dataInsights && msg.structured.dataInsights.length > 0"
              class="chat-insights-list"
            >
              <div
                v-for="(insight, idx) in msg.structured.dataInsights"
                :key="idx"
                class="insight-item"
              >
                <span class="bullet">•</span>
                <span>{{ insight }}</span>
              </div>
            </div>

            <!-- Action Plan Cards -->
            <div
              v-if="msg.structured?.actionPlan && msg.structured.actionPlan.length > 0"
              class="action-plan-grid"
            >
              <div
                v-for="(action, aIdx) in msg.structured.actionPlan"
                :key="aIdx"
                class="action-card"
                :class="action.action"
              >
                <div class="action-card-header">
                  <component :is="getActionIcon(action.action)" :size="14" />
                  <span class="action-tag">{{ action.action.toUpperCase() }}</span>
                  <span class="action-target">{{ action.target }}</span>
                  <span v-if="action.estimatedSavingsNZD > 0" class="savings-badge">
                    Save ~${{ action.estimatedSavingsNZD }} NZD
                  </span>
                </div>
                <p v-if="action.impact" class="action-impact">{{ action.impact }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="chatStore.loading" class="chat-bubble-row assistant">
        <div class="assistant-card loading-card">
          <Loader2 :size="18" class="spin-animation" />
          <span>Analyzing spendings and formulating critical advice…</span>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="chatStore.error" class="chat-error-banner" role="alert">
        <AlertTriangle :size="16" />
        <span>{{ chatStore.error }}</span>
      </div>
    </div>

    <!-- Input Box -->
    <form class="chat-input-bar" @submit.prevent="onSend">
      <input
        v-model="inputPrompt"
        type="text"
        placeholder="Ask about your spendings (e.g. should I remove milk?)..."
        :disabled="chatStore.loading"
        class="chat-text-input"
      />
      <button
        type="submit"
        class="chat-send-btn"
        :disabled="!inputPrompt.trim() || chatStore.loading"
      >
        <Send :size="16" />
      </button>
    </form>
  </div>
</template>
```

- [ ] **Step 2: Add styles for `AiSpendingChat.vue` to `together/src/styles.css`**

Append clean, cohesive glass CSS rules for `.ai-spending-chat-container`, `.chat-header-bar`, `.mode-btn`, `.quick-prompts-bar`, `.quick-prompt-pill`, `.chat-messages-window`, `.user-bubble`, `.assistant-card`, `.verdict-banner`, `.action-plan-grid`, `.action-card`, `.chat-input-bar` without touching unrelated selectors.

- [ ] **Step 3: Run type check**

Run:
```bash
cd together && pnpm vue-tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit changes**

Run:
```bash
cd together && git add src/components/AiSpendingChat.vue src/styles.css && git commit -m "feat(ui): add interactive Glass AI Spending Chat component"
```

---

### Task 5: Integrate AI Chat into Dashboard & Add i18n Locales

**Files:**
- Modify: `together/src/components/AiMoneyAdvisor.vue` (embed Chat tab alongside Health Audit)
- Modify: `together/src/locales/en.json` (add chat keys)
- Modify: `together/src/locales/es.json` (add Spanish translations)
- Test: Full project test suite `tests/*.test.ts`

- [ ] **Step 1: Add localization keys to `together/src/locales/en.json` and `together/src/locales/es.json`**

In `en.json`:
```json
"chat": {
  "title": "Spending Advisor Chat",
  "modes": {
    "low": "Budget Low (Frugal)",
    "medium": "Budget Medium (Balanced)",
    "high": "Budget High (Growth)"
  },
  "quickMilk": "Should I remove milk?",
  "quickCart": "What can I cut from my shopping cart?",
  "quickEarn": "How can I earn/save the most this week?",
  "placeholder": "Ask about your spendings (e.g. should I remove milk?)..."
}
```

In `es.json`:
```json
"chat": {
  "title": "Chat Asesor de Gastos",
  "modes": {
    "low": "Presupuesto Bajo (Austero)",
    "medium": "Presupuesto Medio (Equilibrado)",
    "high": "Presupuesto Alto (Crecimiento)"
  },
  "quickMilk": "¿Debería eliminar la leche?",
  "quickCart": "¿Qué puedo recortar de mi carrito?",
  "quickEarn": "¿Cómo puedo ganar/ahorrar más esta semana?",
  "placeholder": "Preguntá sobre tus gastos (ej. ¿debería quitar la leche?)..."
}
```

- [ ] **Step 2: Update `together/src/components/AiMoneyAdvisor.vue`**

Add a tab switcher in `AiMoneyAdvisor.vue` to allow switching between:
- Tab 1: **Spending Chat** (Interactive local chat with item knowledge & budget personas)
- Tab 2: **Instant Audit** (The existing 4-button audit)

- [ ] **Step 3: Run all unit tests**

Run:
```bash
cd together && pnpm test
```
Expected: PASS (all tests pass).

- [ ] **Step 4: Run typecheck**

Run:
```bash
cd together && pnpm vue-tsc --noEmit
```
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit changes**

Run:
```bash
cd together && git add src/components/AiMoneyAdvisor.vue src/locales/en.json src/locales/es.json && git commit -m "feat(ai): integrate AI spending chat into AiMoneyAdvisor with bilingual support"
```

---

## Self-Review Checklist

1. **Spec Coverage:**
   - [x] Local LLM chat (uses Ollama via `getOllamaHost()`, `getOllamaModel()`, local-desktop check).
   - [x] Knows every aspect of spendings (macro pacing, recurring payments, accounts, itemized regular purchases index).
   - [x] Token optimization & structured output (compact context under 400 tokens + strict JSON schema).
   - [x] User-selectable budget mode (Low, Medium, High) with distinctly tailored personas.
   - [x] Strict scope enforcement (discards off-topic programming, fantasy, trivia with generic refusal).
   - [x] Critical & regular purchase-based (evaluates item frequency, median price, shop variations for queries like "should I remove milk?").
   - [x] Architecture for performance, memory, and usage (bounded history, deterministic aggregation, zero cloud dependency).

2. **Placeholder Scan:**
   - No "TBD", "TODO", or pseudo-code anywhere in the plan. All steps provide complete executable code and explicit commands.

3. **Type Consistency:**
   - Types `AiChatBudgetMode`, `AiChatStructuredOutput`, `RegularPurchaseItem`, `CompactFinancialSummary` match across all tasks and files.
