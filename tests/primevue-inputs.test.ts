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
const purchaseItemRowPath = path.resolve(__dirname, "../src/components/products/PurchaseItemRow.vue");
const weeklyLimitPath = path.resolve(__dirname, "../src/components/WeeklyLimit.vue");

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

test("ExpenseForm.vue adapts Select, DatePicker, Checkbox, and Buttons to PrimeVue components", () => {
  const content = fs.readFileSync(expenseFormPath, "utf-8");

  // PrimeVue imports
  assert.match(
    content,
    /import\s+DatePicker\s+from\s+["']primevue\/datepicker["']/,
    "ExpenseForm.vue must import PrimeVue DatePicker"
  );
  assert.match(
    content,
    /import\s+Select\s+from\s+["']primevue\/select["']/,
    "ExpenseForm.vue must import PrimeVue Select"
  );
  assert.match(
    content,
    /import\s+Checkbox\s+from\s+["']primevue\/checkbox["']/,
    "ExpenseForm.vue must import PrimeVue Checkbox"
  );

  // Template usages
  assert.match(
    content,
    /<DatePicker\b[^>]*v-model="selectedDate"/,
    "ExpenseForm.vue must use PrimeVue DatePicker for date selection"
  );
  assert.match(
    content,
    /<Select\b[^>]*v-model="form\.category"/,
    "ExpenseForm.vue must use PrimeVue Select for category selection"
  );
  assert.match(
    content,
    /<Select\b[^>]*v-model="form\.accountId"/,
    "ExpenseForm.vue must use PrimeVue Select for account selection"
  );
  assert.match(
    content,
    /<Checkbox\b[^>]*v-model="reviewed"/,
    "ExpenseForm.vue must use PrimeVue Checkbox for receipt review confirmation"
  );

  // Mode entry tabs use PrimeVue Button
  assert.match(
    content,
    /<Button\b[^>]*@click="mode\s*=\s*'quick'"/,
    "ExpenseForm.vue must use PrimeVue Button for quick mode"
  );
  assert.match(
    content,
    /<Button\b[^>]*@click="mode\s*=\s*'items'"/,
    "ExpenseForm.vue must use PrimeVue Button for items mode"
  );
  assert.match(
    content,
    /<Button\b[^>]*@click="mode\s*=\s*'receipt'"/,
    "ExpenseForm.vue must use PrimeVue Button for receipt mode"
  );

  // Verify legacy raw form input elements are not used
  assert.doesNotMatch(
    content,
    /<input\b[^>]*type="date"/,
    "Legacy raw input[type='date'] must not be present in ExpenseForm.vue"
  );
  assert.doesNotMatch(
    content,
    /<input\b[^>]*type="checkbox"/,
    "Legacy raw input[type='checkbox'] must not be present in ExpenseForm.vue"
  );
  assert.doesNotMatch(
    content,
    /<select\b/,
    "Legacy raw <select> must not be present in ExpenseForm.vue"
  );
});

test("ExpenseForm.vue integrates PrimeVue Drawer that opens when mounted and emits close on hide", () => {
  const content = fs.readFileSync(expenseFormPath, "utf-8");

  // Imports PrimeVue Drawer
  assert.match(
    content,
    /import\s+Drawer\s+from\s+["']primevue\/drawer["']/,
    "ExpenseForm.vue must import PrimeVue Drawer"
  );

  // drawerIsOpen starts as true so Drawer is visible on mount
  assert.match(
    content,
    /const\s+drawerIsOpen\s*=\s*ref\(true\)/,
    "drawerIsOpen must be initialized to true so the drawer opens on mount"
  );

  // Drawer usage
  assert.match(
    content,
    /<Drawer\b[^>]*v-model:visible="drawerIsOpen"/,
    "ExpenseForm.vue must bind Drawer visibility to drawerIsOpen"
  );

  // Emits close when drawer is dismissed
  assert.match(
    content,
    /@(?:after-hide|hide)="emit\(['"]close['"]\)"/,
    "ExpenseForm.vue must emit close when Drawer hides"
  );
});

test("WeeklyLimit.vue integrates PrimeVue Drawer for budget configuration", () => {
  const content = fs.readFileSync(weeklyLimitPath, "utf-8");

  assert.match(
    content,
    /import\s+Drawer\s+from\s+["']primevue\/drawer["']/,
    "WeeklyLimit.vue must import PrimeVue Drawer"
  );

  assert.match(
    content,
    /<Drawer\b[^>]*v-model:visible="editing"[^>]*position="bottom"/,
    "WeeklyLimit.vue must use PrimeVue Drawer with position bottom bound to editing"
  );
});

test("ItemEditor.vue adapts Select input and action buttons to PrimeVue components", () => {
  const content = fs.readFileSync(itemEditorPath, "utf-8");

  assert.match(
    content,
    /import\s+Button\s+from\s+["']primevue\/button["']/,
    "ItemEditor.vue must import PrimeVue Button"
  );
  assert.match(
    content,
    /import\s+Select\s+from\s+["']primevue\/select["']/,
    "ItemEditor.vue must import PrimeVue Select"
  );
  assert.match(
    content,
    /<Select\b[^>]*v-model="selected"/,
    "ItemEditor.vue must use PrimeVue Select for saved products selection"
  );
  assert.match(
    content,
    /<Button[\s\S]*?@click="add\(\)"/,
    "ItemEditor.vue must use PrimeVue Button for add item"
  );
  assert.doesNotMatch(
    content,
    /<select\b/,
    "Legacy raw <select> must not be present in ItemEditor.vue"
  );
});

test("PurchaseItemRow.vue adapts inputs, select, and action buttons to PrimeVue components", () => {
  const content = fs.readFileSync(purchaseItemRowPath, "utf-8");

  assert.match(
    content,
    /import\s+InputText\s+from\s+["']primevue\/inputtext["']/,
    "PurchaseItemRow.vue must import PrimeVue InputText"
  );
  assert.match(
    content,
    /import\s+Select\s+from\s+["']primevue\/select["']/,
    "PurchaseItemRow.vue must import PrimeVue Select"
  );
  assert.match(
    content,
    /import\s+Button\s+from\s+["']primevue\/button["']/,
    "PurchaseItemRow.vue must import PrimeVue Button"
  );

  // Template usages
  assert.match(
    content,
    /<InputText\b[^>]*:modelValue="item\.title"/,
    "PurchaseItemRow.vue must use InputText for title"
  );
  assert.match(
    content,
    /<InputText\b[^>]*:modelValue="item\.price"/,
    "PurchaseItemRow.vue must use InputText for price"
  );
  assert.match(
    content,
    /<InputText\b[^>]*:modelValue="item\.quantity"/,
    "PurchaseItemRow.vue must use InputText for quantity"
  );
  assert.match(
    content,
    /<InputText\b[^>]*:modelValue="item\.size/,
    "PurchaseItemRow.vue must use InputText for size"
  );
  assert.match(
    content,
    /<Select\b[^>]*:modelValue="item\.unit/,
    "PurchaseItemRow.vue must use Select for unit"
  );
  assert.match(
    content,
    /<InputText\b[^>]*:modelValue="item\.discount/,
    "PurchaseItemRow.vue must use InputText for discount"
  );
  assert.match(
    content,
    /<Button\b[^>]*class="[^"]*\bitem-remove\b[^"]*"[^>]*@click="emit\('remove'\)"/,
    "PurchaseItemRow.vue must use PrimeVue Button for item remove"
  );

  // Legacy elements removed
  assert.doesNotMatch(
    content,
    /<input\b/,
    "Legacy raw <input> must not be present in PurchaseItemRow.vue"
  );
  assert.doesNotMatch(
    content,
    /<select\b/,
    "Legacy raw <select> must not be present in PurchaseItemRow.vue"
  );
});
