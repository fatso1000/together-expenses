import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appVuePath = path.resolve(__dirname, "../src/App.vue");
const expenseFormPath = path.resolve(__dirname, "../src/components/ExpenseForm.vue");
const itemEditorPath = path.resolve(__dirname, "../src/components/ItemEditor.vue");

test("App.vue uses PrimeVue Button for primary header add-expense action", () => {
  const content = fs.readFileSync(appVuePath, "utf-8");

  assert.match(
    content,
    /import\s+Button\s+from\s+["']primevue\/button["']/,
    "App.vue must import PrimeVue Button"
  );
  assert.match(
    content,
    /<Button\b[^>]*class="[^"]*\badd-expense\b[^"]*"[^>]*@click="store\.openExpense\(\)"/,
    "App.vue must use PrimeVue Button for add-expense action"
  );
});

test("ExpenseForm.vue adapts basic inputs and textarea to PrimeVue components", () => {
  const content = fs.readFileSync(expenseFormPath, "utf-8");

  // PrimeVue imports
  assert.match(
    content,
    /import\s+InputText\s+from\s+["']primevue\/inputtext["']/,
    "ExpenseForm.vue must import PrimeVue InputText"
  );
  assert.match(
    content,
    /import\s+Textarea\s+from\s+["']primevue\/textarea["']/,
    "ExpenseForm.vue must import PrimeVue Textarea"
  );
  assert.match(
    content,
    /import\s+Button\s+from\s+["']primevue\/button["']/,
    "ExpenseForm.vue must import PrimeVue Button"
  );

  // Template usages
  assert.match(
    content,
    /<InputText\b[^>]*v-model="form\.merchant"/,
    "ExpenseForm.vue must use InputText for merchant"
  );
  assert.match(
    content,
    /<InputText\b[^>]*v-model="form\.amount"/,
    "ExpenseForm.vue must use InputText for quick amount"
  );
  assert.match(
    content,
    /<Textarea\b[^>]*v-model="form\.note"/,
    "ExpenseForm.vue must use PrimeVue Textarea for notes"
  );
  assert.match(
    content,
    /<Button\b[^>]*class="[^"]*\bprimary\b[^"]*"[^>]*:disabled="busy"/,
    "ExpenseForm.vue must use PrimeVue Button for submit/save button"
  );
});

test("ItemEditor.vue adapts action buttons to PrimeVue Button component", () => {
  const content = fs.readFileSync(itemEditorPath, "utf-8");

  assert.match(
    content,
    /import\s+Button\s+from\s+["']primevue\/button["']/,
    "ItemEditor.vue must import PrimeVue Button"
  );
  assert.match(
    content,
    /<Button[\s\S]*?@click="add\(\)"/,
    "ItemEditor.vue must use PrimeVue Button for add item"
  );
});
