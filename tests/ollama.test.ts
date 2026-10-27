import test from "node:test";
import assert from "node:assert/strict";

// Mock localStorage for Node environment if missing
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

import {
  getOllamaHost,
  setOllamaHost,
  getOllamaModel,
  setOllamaModel,
} from "../src/lib/ollama.ts";

test("ollama configuration defaults to gemma4:e4b and supports customization", () => {
  localStorage.removeItem("expenses-ollama-host");
  localStorage.removeItem("expenses-ollama-model");

  assert.equal(getOllamaHost(), "http://localhost:11434");
  assert.equal(getOllamaModel(), "gemma4:e4b");

  setOllamaHost("http://192.168.1.100:11434/");
  assert.equal(getOllamaHost(), "http://192.168.1.100:11434");

  setOllamaModel("gemma2:9b");
  assert.equal(getOllamaModel(), "gemma2:9b");

  // Reset back to defaults
  setOllamaHost("http://localhost:11434");
  setOllamaModel("gemma4:e4b");
  assert.equal(getOllamaModel(), "gemma4:e4b");
});
