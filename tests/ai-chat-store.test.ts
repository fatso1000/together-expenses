import test from "node:test";
import assert from "node:assert/strict";

const mockLocation = {
  hostname: "localhost",
  protocol: "http:",
  pathname: "/",
  search: "",
  hash: "",
};

// Mock browser globals for Node test environment
if (typeof globalThis.window === "undefined") {
  globalThis.window = {
    location: mockLocation,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Window & typeof globalThis;
} else if (!(globalThis.window as any).location) {
  (globalThis.window as any).location = mockLocation;
}

if (typeof globalThis.location === "undefined") {
  globalThis.location = mockLocation as unknown as Location;
}

if (typeof globalThis.history === "undefined") {
  globalThis.history = { replaceState: () => {} } as unknown as History;
}

let mockStorageStore = new Map<string, string>();
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage?.getItem) {
  globalThis.localStorage = {
    getItem: (key: string) => mockStorageStore.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorageStore.set(key, String(value)),
    removeItem: (key: string) => { mockStorageStore.delete(key); },
    clear: () => { mockStorageStore.clear(); },
    key: (index: number) => Array.from(mockStorageStore.keys())[index] ?? null,
    get length() { return mockStorageStore.size; },
  } as unknown as Storage;
}

import { setActivePinia, createPinia } from "pinia";
import { isSpendingRelatedQuery } from "../src/lib/spending-knowledge.ts";
import { useAiChat, type StoredChatMessage } from "../src/stores/ai-chat.ts";

test("scope check blocks unrelated queries immediately before network call", () => {
  const badQuery = "how can I center a div";
  const check = isSpendingRelatedQuery(badQuery);
  assert.equal(check.isAllowed, false);
});

test("useAiChat initializes with default state", () => {
  mockStorageStore.clear();
  setActivePinia(createPinia());
  const store = useAiChat();

  assert.equal(store.budgetMode, "medium");
  assert.equal(store.messages.length, 0);
  assert.equal(store.loading, false);
  assert.equal(store.error, "");
});

test("useAiChat restores persisted budget mode and messages from localStorage", () => {
  mockStorageStore.clear();
  const preloadedMessages: StoredChatMessage[] = [
    {
      id: "msg-1",
      role: "user",
      text: "How much spent on groceries?",
      timestamp: 1700000000000,
      mode: "low",
    },
    {
      id: "msg-2",
      role: "assistant",
      text: "You spent $45 on groceries.",
      timestamp: 1700000001000,
      mode: "low",
    },
  ];
  mockStorageStore.set("expenses-ai-chat-mode", "high");
  mockStorageStore.set("expenses-ai-chat-history", JSON.stringify(preloadedMessages));

  setActivePinia(createPinia());
  const store = useAiChat();

  assert.equal(store.budgetMode, "high");
  assert.equal(store.messages.length, 2);
  assert.equal(store.messages[0].text, "How much spent on groceries?");
  assert.equal(store.messages[1].text, "You spent $45 on groceries.");
});

test("setBudgetMode changes mode and persists to localStorage", () => {
  mockStorageStore.clear();
  setActivePinia(createPinia());
  const store = useAiChat();

  assert.equal(store.budgetMode, "medium");
  store.setBudgetMode("low");
  assert.equal(store.budgetMode, "low");
  assert.equal(mockStorageStore.get("expenses-ai-chat-mode"), "low");

  store.setBudgetMode("high");
  assert.equal(store.budgetMode, "high");
  assert.equal(mockStorageStore.get("expenses-ai-chat-mode"), "high");
});

test("clearMessages resets message history, error, and localStorage", () => {
  mockStorageStore.clear();
  setActivePinia(createPinia());
  const store = useAiChat();

  store.messages.push({
    id: "temp",
    role: "user",
    text: "test",
    timestamp: Date.now(),
  });
  store.error = "previous error";

  store.clearMessages();
  assert.equal(store.messages.length, 0);
  assert.equal(store.error, "");
  assert.equal(mockStorageStore.get("expenses-ai-chat-history"), "[]");
});

test("sendMessage ignores empty or whitespace input", async () => {
  mockStorageStore.clear();
  setActivePinia(createPinia());
  const store = useAiChat();

  await store.sendMessage("");
  await store.sendMessage("   ");
  assert.equal(store.messages.length, 0);
});

test("sendMessage fast-path guardrail rejects out-of-scope query without network call", async () => {
  mockStorageStore.clear();
  setActivePinia(createPinia());
  const store = useAiChat();

  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not be called for out-of-scope queries");
  }) as unknown as typeof fetch;

  try {
    await store.sendMessage("write a python script to sort a list");
    assert.equal(fetchCalled, false, "Network fetch should never be triggered for out-of-scope question");
    assert.equal(store.messages.length, 2);
    assert.equal(store.messages[0].role, "user");
    assert.equal(store.messages[0].text, "write a python script to sort a list");
    assert.equal(store.messages[1].role, "assistant");
    assert.match(store.messages[1].text, /spending and expense advisor/i);
    assert.equal(store.messages[1].structured?.outOfScope, true);
    assert.equal(store.loading, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sendMessage processes spending query and saves assistant structured output", async () => {
  mockStorageStore.clear();
  setActivePinia(createPinia());
  const store = useAiChat();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse((init?.body as string) || "{}");
    assert.match(body.prompt, /Balanced/i);

    return {
      ok: true,
      status: 200,
      json: async () => ({
        response: JSON.stringify({
          outOfScope: false,
          budgetMode: "medium",
          verdict: "Reduce cafe coffee spending",
          reply: "Making coffee at home will save approximately $25 per week.",
          dataInsights: ["Cafe spend is 15% of discretionary budget"],
          actionPlan: [
            {
              action: "swap",
              target: "Cafe Flat White",
              estimatedSavingsNZD: 25,
              impact: "Brew at home on weekdays",
            },
          ],
        }),
      }),
    } as unknown as Response;
  }) as typeof fetch;

  try {
    await store.sendMessage("can I save on my weekly coffee spending?");
    assert.equal(store.messages.length, 2);
    assert.equal(store.messages[0].role, "user");
    assert.equal(store.messages[1].role, "assistant");
    assert.equal(store.messages[1].text, "Making coffee at home will save approximately $25 per week.");
    assert.equal(store.messages[1].structured?.verdict, "Reduce cafe coffee spending");
    assert.equal(store.messages[1].structured?.actionPlan.length, 1);
    assert.equal(store.messages[1].structured?.actionPlan[0].action, "swap");
    assert.equal(store.loading, false);
    assert.equal(store.error, "");

    // Verify localStorage persistence
    const saved = JSON.parse(mockStorageStore.get("expenses-ai-chat-history") || "[]");
    assert.equal(saved.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sendMessage captures error when local LLM query fails", async () => {
  mockStorageStore.clear();
  setActivePinia(createPinia());
  const store = useAiChat();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return {
      ok: false,
      status: 502,
      text: async () => "Bad Gateway",
    } as unknown as Response;
  }) as typeof fetch;

  try {
    await store.sendMessage("how can I cut my grocery budget?");
    assert.equal(store.loading, false);
    assert.match(store.error, /Ollama request failed \(502\)/);
    // User message was recorded, assistant response was not
    assert.equal(store.messages.length, 1);
    assert.equal(store.messages[0].role, "user");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
