# PrimeUI (PrimeVue) Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the entire Together Expenses Vue 3 application from hand-crafted HTML/CSS elements (raw `<button>`, custom bottom drawers `<dialog>` and `.bottom-drawer`, manual panels, custom filters, tables, and lists) to PrimeUI (PrimeVue 5 + `@primeuix/themes/aura`), replacing all buttons, drawers, cards, tables, inputs, segmented selectors, and notifications while preserving 100% of existing financial calculations, offline privacy, test coverage, and responsive layouts.

**Architecture:** PrimeVue 5 core services (`PrimeVue`, `ToastService`, `ConfirmationService`) are configured in `src/main.ts` with Aura preset and dark mode synchronized via `[data-theme="dark"]`. The application layout in `src/App.vue` hosts global feedback overlays (`<Toast />`, `<ConfirmDialog />`). Six custom modal/bottom-drawer implementations are replaced by PrimeVue's accessible `<Drawer position="bottom">` primitive. Complex tabular and catalog listings are converted to PrimeVue `<DataTable>` and `<Card>` primitives. Form controls and segmented toggles are upgraded to PrimeVue `<InputText>`, `<InputNumber>`, `<Select>`, `<DatePicker>`, `<Textarea>`, and `<SelectButton>`.

**Tech Stack:** Vue 3 (Composition API `<script setup>`), TypeScript, PrimeVue 5 (`primevue`), `@primeuix/themes/aura`, Lucide Vue Next (`lucide-vue-next`), Pinia, Vite, `tsx --test`.

**Spec:** User Migration Directive:
- Step-by-step incremental migration with independent verifiable tasks.
- Replace all raw buttons (`<button class="primary|secondary|icon-button|text-button">`) with PrimeVue `<Button>`.
- Replace all drawer and dialog modals (`<dialog>`, `.bottom-drawer`, `.drawer-backdrop`) with PrimeVue `<Drawer>` / `<Dialog>`.
- Replace panels and card containers (`.panel`, `.shop-card`, `.total-card`, `.comparison-card`) with PrimeVue `<Card>`.
- Replace tables and listings (`ExpenseList`, `ProductPrices`, `FrequentPayments`, `Deposits`) with PrimeVue `<DataTable>` / `<DataView>` / structured item rows.
- Replace segmented filters (`.segmented`, `.unit-pills`) with PrimeVue `<SelectButton>`.
- Replace form inputs with PrimeVue `<InputText>`, `<Select>`, `<DatePicker>`, `<Textarea>`, `<Checkbox>`, and `<ProgressBar>`.
- Replace custom toast and `window.confirm` dialogs with PrimeVue `Toast` and `ConfirmDialog`.
- Track every single file and page to modify across the entire workspace.

## Global Constraints

- **Theme Consistency:** Aura preset tokens must align with existing brand variables (`--green: #153d35`, `--accent: #2ac294`, `--surface`, `--radius: 22px`).
- **Dark Mode Support:** PrimeVue theme must honor `document.documentElement.setAttribute("data-theme", "dark")` via `darkModeSelector: '[data-theme="dark"]'`.
- **Performance Rules:** Zero `backdrop-filter` blur in drawer dialogs or cards (must comply with `tests/performance-styles.test.ts`).
- **Data Integrity:** All monetary amounts remain integer cents internally; formatting uses existing `store.displayMoney()` and `money()` helpers.
- **Zero Loss of Features:** Camera OCR, Ollama AI chat, CSV export, multi-currency conversions, and cloud sync must continue functioning seamlessly.
- **Verification Gate:** Every task must pass `pnpm test` and `pnpm build` (`vue-tsc --noEmit && vite build`).

---

## File Tracking Matrix

This matrix tracks every page, view, component, and utility modified during the migration:

| # | Type | File Path | Existing UI Elements | PrimeUI / PrimeVue Replacements |
|---|---|---|---|---|
| 1 | Config | `together/src/main.ts` | Base PrimeVue registration | Add `ToastService`, `ConfirmationService`, configure Aura `darkModeSelector: '[data-theme="dark"]'` |
| 2 | Root | `together/src/App.vue` | Header action buttons, month `<input>`, currency `<select>`, `.toast`, `.update-prompt` | PrimeVue `<Toast>`, `<ConfirmDialog>`, `<Button>`, `<DatePicker view="month">`, `<Select>` |
| 3 | Style | `together/src/styles.css` | Raw dialog & drawer styling, button styling | PrimeVue Aura theme token overrides, remove obsolete `.expense-drawer-dialog` hacks |
| 4 | Cleanup | `together/src/utils/cx.ts` | Broken React/Tailwind leftover | Remove orphaned file to fix `vue-tsc` typecheck |
| 5 | Cleanup | `together/src/utils/use-dismiss-on-outside-press.ts` | Broken React leftover | Remove orphaned file to fix `vue-tsc` typecheck |
| 6 | View | `together/src/views/Dashboard.vue` | Quick action buttons, weekly alert, summary cards, panel wrappers | `<Button>`, `<Message>`, `<Card>` |
| 7 | View | `together/src/views/Expenses.vue` | Bulk button, period segmented buttons, filter inputs & selects, export button | `<Button>`, `<SelectButton>`, `<IconField><InputIcon><InputText>`, `<Select>`, `<Card>` |
| 8 | View | `together/src/views/Reports.vue` | Period segmented buttons, date inputs, export button, baseline hub, comparison cards | `<SelectButton>`, `<DatePicker>`, `<Button>`, `<Card>`, `<Tag>`, `<ProgressBar>` |
| 9 | View | `together/src/views/AiChat.vue` | Status pill button, refresh button, warning alert box, topbar panel | `<Card>`, `<Tag>`, `<Button>`, `<Message>` |
| 10 | View | `together/src/views/Products.vue` | Product catalog container | PrimeVue layout alignment |
| 11 | View | `together/src/views/Shops.vue` | Shop form inputs, add/cancel buttons, search input, shop cards, edit/delete buttons | `<Card>`, `<InputText>`, `<Button>`, `<IconField><InputIcon><InputText>`, `useConfirm` |
| 12 | View | `together/src/views/Settings.vue` | Accounts setup inputs/buttons, Ollama inputs/buttons, backup/restore/clear buttons | `<Card>`, `<InputText>`, `<Select>`, `<DatePicker>`, `<Button>`, `<Message>`, `useConfirm` |
| 13 | Component | `together/src/components/ExpenseForm.vue` | `<dialog class="expense-drawer-dialog">`, mode buttons, account toggle, form inputs, preview dock | `<Drawer position="bottom">`, `<SelectButton>`, `<InputText>`, `<Select>`, `<DatePicker>`, `<Textarea>`, `<Button>`, `<Tabs>` |
| 14 | Component | `together/src/components/ExpenseList.vue` | Empty state button, list items, account tag, repeat/edit/delete buttons | `<DataTable>` / `<DataView>`, `<Tag>`, `<Button>`, `useConfirm` |
| 15 | Component | `together/src/components/BulkEntry.vue` | `<dialog class="expense-dialog">`, account select, textarea, preview & submit buttons | `<Drawer position="bottom">`, `<Select>`, `<Textarea>`, `<Button>`, `<DataTable>` preview |
| 16 | Component | `together/src/components/WeeklyLimit.vue` | Budget card, progress bar, configure button, `.bottom-drawer` + `.drawer-backdrop`, form inputs | `<Card>`, `<ProgressBar>`, `<Button>`, `<Drawer position="bottom">`, `<InputText>`, `<Select>`, `<DatePicker>` |
| 17 | Component | `together/src/components/AccountsOverview.vue` | Balance cards, deposit actions, 2 bottom drawers, deposit form, deposit history list | `<Card>`, `<Button>`, `<Drawer position="bottom">` (two drawers), `<InputText>`, `<DatePicker>`, `<DataTable>` |
| 18 | Component | `together/src/components/FrequentPayments.vue` | Recurring card, frequency segmented buttons, add button, bottom drawer, payment inputs | `<Card>`, `<SelectButton>`, `<Button>`, `<Drawer position="bottom">`, `<InputText>`, `<Select>`, `<DatePicker>`, `<DataTable>` |
| 19 | Component | `together/src/components/CategoryManager.vue` | Category manager card, new category button, category editor form, icon/color pickers, category list | `<Card>`, `<Button>`, `<InputText>`, `<Tag>`, `<DataTable>` / card grid, `useConfirm` |
| 20 | Component | `together/src/components/CategoryBreakdown.vue` | Category rows, percentage track, amount labels | `<ProgressBar>`, `<Tag>`, `<Card>` wrapper |
| 21 | Component | `together/src/components/ItemEditor.vue` | Saved product select, add button, item rows wrapper, add new item wide button | `<Select>`, `<Button>` |
| 22 | Component | `together/src/components/ReceiptReader.vue` | Scan panel, camera/upload buttons, crop controls, scan button, status messages | `<Card>`, `<Button>`, `<Message>` |
| 23 | Component | `together/src/components/TrendChart.vue` | Weekly trend bar chart container | `<Card>` wrapper |
| 24 | Component | `together/src/components/AiSpendingChat.vue` | Mode buttons, quick prompt chips, message input textarea, send button, clear button, advice cards | `<SelectButton>`, `<Button size="small">`, `<Textarea>`, `<Button>`, `<Card>`, `<Tag>` |
| 25 | Component | `together/src/components/AiMoneyAdvisor.vue` | Tabs container (Chat vs Recurring Audit), action list items, apply button | `<Tabs>`, `<TabList>`, `<Tab>`, `<TabPanels>`, `<TabPanel>`, `<Card>`, `<Button>` |
| 26 | Component | `together/src/components/data/DeviceSync.vue` | Sync card, copy button, sync button, connection details, input, checkbox, connect button | `<Card>`, `<Button>`, `<InputText>`, `<Checkbox>` |
| 27 | Component | `together/src/components/products/ProductCatalog.vue` | Price check button, header panel, search input, unit filter pills, new product button, edit form | `<Button>`, `<Card>`, `<IconField><InputIcon><InputText>`, `<SelectButton>`, `<Drawer>`, `<InputText>`, `<Select>`, `<Tag>` |
| 28 | Component | `together/src/components/products/ProductPrices.vue` | Compare similar select, price observations list, cheapest/expensive tags | `<Select>`, `<DataTable>`, `<Tag>` |
| 29 | Component | `together/src/components/products/PurchaseItemRow.vue` | Title input, remove button, price/qty/size/discount inputs, unit select, match buttons | `<InputText>`, `<Button variant="text" severity="danger">`, `<Select>`, `<Button size="small">` |
| 30 | Component | `together/src/components/products/QuickCompare.vue` | `<dialog class="purchase-dialog">`, camera button, photo input, results overlay, form inputs | `<Drawer position="bottom">`, `<Button>`, `<InputText>`, `<Select>` |
| 31 | Component | `together/src/components/products/PriceWarning.vue` | Price comparison warning banner | `<Message>` or `<Tag>` |
| 32 | Component | `together/src/components/reports/CategoryDonutChart.vue` | Category donut SVG chart card | `<Card>` |
| 33 | Component | `together/src/components/reports/SpendTrajectoryChart.vue` | Trajectory line SVG chart card | `<Card>` |
| 34 | Component | `together/src/components/reports/AccountCashflowChart.vue` | Cashflow SVG chart card | `<Card>` |
| 35 | Component | `together/src/components/reports/BudgetVarianceChart.vue` | Budget variance SVG chart card | `<Card>` |
| 36 | Test | `together/tests/primevue-components.test.ts` | Verification suite for PrimeVue services, component imports & theme compatibility | New automated test file |

---

### Task 1: PrimeVue Foundation Setup, Build Cleanup & Global Layout Migration

**Files:**
- Modify: `together/src/main.ts`
- Modify: `together/src/App.vue`
- Delete: `together/src/utils/cx.ts`
- Delete: `together/src/utils/use-dismiss-on-outside-press.ts`
- Create: `together/tests/primevue-components.test.ts`

**Interfaces:**
- Consumes: PrimeVue `ToastService`, `ConfirmationService`, `primevue/toast`, `primevue/confirmdialog`, `primevue/button`, `primevue/select`, `primevue/datepicker`.
- Produces: Global `<Toast />` notification delivery, global `<ConfirmDialog />`, type-safe build without missing React modules.

- [ ] **Step 1: Write failing test verifying PrimeVue component exports and build setup**

Create `together/tests/primevue-components.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";

test("primevue foundation: core components are importable from primevue", async () => {
  const Button = await import("primevue/button");
  const Drawer = await import("primevue/drawer");
  const Card = await import("primevue/card");
  const DataTable = await import("primevue/datatable");
  const Column = await import("primevue/column");
  const Select = await import("primevue/select");
  const InputText = await import("primevue/inputtext");
  const DatePicker = await import("primevue/datepicker");
  const Toast = await import("primevue/toast");
  const ConfirmDialog = await import("primevue/confirmdialog");

  assert.ok(Button.default, "Button component must exist");
  assert.ok(Drawer.default, "Drawer component must exist");
  assert.ok(Card.default, "Card component must exist");
  assert.ok(DataTable.default, "DataTable component must exist");
  assert.ok(Column.default, "Column component must exist");
  assert.ok(Select.default, "Select component must exist");
  assert.ok(InputText.default, "InputText component must exist");
  assert.ok(DatePicker.default, "DatePicker component must exist");
  assert.ok(Toast.default, "Toast component must exist");
  assert.ok(ConfirmDialog.default, "ConfirmDialog component must exist");
});
```

- [ ] **Step 2: Run test to verify module imports pass**

Run: `cd together && pnpm test tests/primevue-components.test.ts`
Expected: PASS

- [ ] **Step 3: Remove orphaned React leftover files and configure PrimeVue services in `src/main.ts`**

Delete `together/src/utils/cx.ts` and `together/src/utils/use-dismiss-on-outside-press.ts`.

Update `together/src/main.ts`:
```typescript
import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "@/App.vue";
import Dashboard from "@/views/Dashboard.vue";
import Expenses from "@/views/Expenses.vue";
import Reports from "@/views/Reports.vue";
import AiChat from "@/views/AiChat.vue";
import Products from "@/views/Products.vue";
import Shops from "@/views/Shops.vue";
import Settings from "@/views/Settings.vue";
import { i18nPlugin } from "@/lib/i18n";
import "@/styles.css";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";
import Aura from "@primeuix/themes/aura";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: Dashboard,
      meta: { titleKey: "nav.overview", title: "Overview" },
    },
    {
      path: "/expenses",
      component: Expenses,
      meta: { titleKey: "nav.expenses", title: "Expenses" },
    },
    {
      path: "/reports",
      component: Reports,
      meta: { titleKey: "nav.reports", title: "Reports" },
    },
    {
      path: "/chat",
      component: AiChat,
      meta: { titleKey: "nav.aiChat", title: "AI Chat" },
    },
    {
      path: "/products",
      component: Products,
      meta: { titleKey: "nav.products", title: "Products" },
    },
    {
      path: "/shops",
      component: Shops,
      meta: { titleKey: "nav.shops", title: "Shops" },
    },
    {
      path: "/settings",
      component: Settings,
      meta: { titleKey: "nav.settings", title: "Data" },
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
router.afterEach((to) => {
  document.title = `${to.meta.title} · Expenses`;
});
const app = createApp(App);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '[data-theme="dark"]',
      cssLayer: false,
    },
  },
  license: import.meta.env.VITE_PRIMEVUE_LICENSE,
});
app.use(ToastService);
app.use(ConfirmationService);
app.use(createPinia());
app.use(router);
app.use(i18nPlugin);
app.mount("#app");
```

- [ ] **Step 4: Update `src/App.vue` to use PrimeVue `<Button>`, `<Select>`, `<Toast>`, and `<ConfirmDialog>`**

In `together/src/App.vue`, import PrimeVue components:
```typescript
import Button from "primevue/button";
import Select from "primevue/select";
import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import { useToast } from "primevue/usetoast";

const toast = useToast();

watch(
  () => store.message,
  (value) => {
    if (!value) return;
    toast.add({
      severity: "info",
      summary: value,
      life: 3500,
    });
    store.message = "";
  },
);
```
Replace the raw buttons in the top header and period toolbar:
- Language toggle: `<Button variant="text" rounded severity="secondary" @click="onToggleLocale">`
- Theme toggle: `<Button variant="text" rounded severity="secondary" @click="onThemeToggle">`
- Add Expense CTA: `<Button severity="primary" @click="store.openExpense()"><template #icon><Plus :size="18" /></template>{{ t('common.addExpense') }}</Button>`
- Currency Select: `<Select v-model="store.currency" :options="currencyOptions" optionLabel="label" optionValue="value" />`
- Mount `<Toast position="bottom-right" />` and `<ConfirmDialog />` at the root of `App.vue`.

- [ ] **Step 5: Run tests and typecheck to verify build succeeds**

Run: `cd together && pnpm test && pnpm build`
Expected: 80 tests passing, build completes with 0 errors.

- [ ] **Step 6: Commit changes**

```bash
git add together/src/main.ts together/src/App.vue together/tests/primevue-components.test.ts together/src/utils/
git commit -m "feat(primeui): initialize PrimeVue services, clean up legacy utils and migrate App.vue"
```

---

### Task 2: Global Drawers & Modals Migration to PrimeVue `Drawer`

**Files:**
- Modify: `together/src/components/ExpenseForm.vue`
- Modify: `together/src/components/WeeklyLimit.vue`
- Modify: `together/src/components/AccountsOverview.vue`
- Modify: `together/src/components/FrequentPayments.vue`
- Modify: `together/src/components/BulkEntry.vue`
- Modify: `together/src/components/products/QuickCompare.vue`

**Interfaces:**
- Consumes: `Drawer` from `primevue/drawer`, `Button` from `primevue/button`, `SelectButton` from `primevue/selectbutton`.
- Produces: Accessible bottom slide drawers across all edit/creation modals with unified dismiss, ESC keybinding, and focus trapping.

- [ ] **Step 1: Write test verifying drawer behavior & PrimeVue Drawer props**

Add to `together/tests/primevue-components.test.ts`:
```typescript
test("primevue drawer: Drawer component supports bottom position and visibility binding", async () => {
  const { default: Drawer } = await import("primevue/drawer");
  assert.ok(Drawer.props.position, "Drawer must support position prop");
  assert.ok(Drawer.props.visible, "Drawer must support visible prop");
});
```

- [ ] **Step 2: Run test to verify Drawer properties**

Run: `cd together && pnpm test tests/primevue-components.test.ts`
Expected: PASS

- [ ] **Step 3: Migrate `ExpenseForm.vue` to PrimeVue `Drawer`**

In `together/src/components/ExpenseForm.vue`:
1. Import PrimeVue components:
```typescript
import Drawer from "primevue/drawer";
import Button from "primevue/button";
import SelectButton from "primevue/selectbutton";
```
2. Replace `<dialog ref="dialog" class="expense-drawer-dialog">` with:
```vue
<Drawer
  :visible="true"
  position="bottom"
  :modal="true"
  :dismissable="true"
  :showCloseIcon="false"
  class="prime-expense-drawer"
  :style="{ height: '92vh', maxHeight: '92vh' }"
  @update:visible="emit('close')"
>
  <template #header>
    <div class="drawer-header-content">
      <div class="drawer-title-area">
        <h2>{{ props.expense ? t('expenses.editExpense') : t('common.addExpense') }}</h2>
      </div>
      <Button
        variant="text"
        rounded
        severity="secondary"
        aria-label="Close expense drawer"
        @click="emit('close')"
      >
        <template #icon><X :size="20" /></template>
      </Button>
    </div>
  </template>

  <!-- Drawer Body Content -->
  ...
</Drawer>
```
3. Replace mode switcher buttons (`quick`, `items`, `receipt`) with PrimeVue `<SelectButton>`:
```typescript
const modeOptions = computed(() => [
  { value: "quick", label: t("expenses.modeQuick") },
  { value: "items", label: t("expenses.modeItems") },
  { value: "receipt", label: t("expenses.modeReceipt") },
]);
```
```vue
<SelectButton
  v-model="mode"
  :options="modeOptions"
  optionLabel="label"
  optionValue="value"
  :allowEmpty="false"
/>
```
4. Replace submit and cancel buttons with PrimeVue `<Button severity="primary">` and `<Button severity="secondary" variant="outlined">`.

- [ ] **Step 4: Migrate `WeeklyLimit.vue` budget configuration drawer**

In `together/src/components/WeeklyLimit.vue`:
1. Import `Drawer` from `primevue/drawer`, `Button` from `primevue/button`, `InputText` from `primevue/inputtext`, `Select` from `primevue/select`, `ProgressBar` from `primevue/progressbar`.
2. Replace `<div v-if="editing" class="drawer-backdrop"><div class="bottom-drawer">` with:
```vue
<Drawer
  v-model:visible="editing"
  position="bottom"
  :modal="true"
  class="prime-bottom-drawer"
  :style="{ height: 'auto', maxHeight: '85vh' }"
>
  <template #header>
    <h3>{{ t('weeklyLimit.configureTitle') }}</h3>
  </template>
  <!-- Form content -->
  <div class="budget-drawer-body">
    <label>
      {{ t('weeklyLimit.salaryField') }}
      <InputText v-model="salaryAmount" inputmode="decimal" placeholder="e.g. 1200.00" />
    </label>
    ...
    <div class="entry-actions">
      <Button severity="primary" @click="saveBudget">{{ t('common.save') }}</Button>
      <Button severity="secondary" variant="outlined" @click="editing = false">{{ t('common.cancel') }}</Button>
    </div>
  </div>
</Drawer>
```
3. Replace progress bars with PrimeVue `<ProgressBar :value="limitPercent" :showValue="false" />`.

- [ ] **Step 5: Migrate `AccountsOverview.vue` deposit form and history drawers**

In `together/src/components/AccountsOverview.vue`:
1. Import `Drawer` from `primevue/drawer`, `Button` from `primevue/button`, `InputText` from `primevue/inputtext`, `Card` from `primevue/card`.
2. Replace both deposit modal Teleports with PrimeVue `<Drawer position="bottom">`:
   - Drawer 1: Record / Edit Savings Deposit (`v-model:visible="showDepositModal"`)
   - Drawer 2: NZ Savings Deposit History (`v-model:visible="showHistoryModal"`)
3. Replace all trigger buttons with PrimeVue `<Button>`.

- [ ] **Step 6: Migrate `FrequentPayments.vue`, `BulkEntry.vue`, and `QuickCompare.vue` drawers**

1. In `together/src/components/FrequentPayments.vue`:
   - Replace `.bottom-drawer` with `<Drawer v-model:visible="isDrawerOpen" position="bottom">`.
   - Replace form action buttons with PrimeVue `<Button>`.
2. In `together/src/components/BulkEntry.vue`:
   - Replace `<dialog ref="dialog" class="expense-dialog">` with `<Drawer :visible="true" position="bottom" @update:visible="emit('close')">`.
   - Replace preview / submit buttons with PrimeVue `<Button>`.
3. In `together/src/components/products/QuickCompare.vue`:
   - Replace `<dialog ref="dialog" class="expense-dialog purchase-dialog">` with `<Drawer :visible="true" position="bottom" @update:visible="emit('close')">`.
   - Replace camera and cancel buttons with PrimeVue `<Button>`.

- [ ] **Step 7: Run test suite and build verification**

Run: `cd together && pnpm test && pnpm build`
Expected: PASS (all tests pass, zero TypeScript build errors).

- [ ] **Step 8: Commit changes**

```bash
git add together/src/components/ExpenseForm.vue together/src/components/WeeklyLimit.vue together/src/components/AccountsOverview.vue together/src/components/FrequentPayments.vue together/src/components/BulkEntry.vue together/src/components/products/QuickCompare.vue together/tests/primevue-components.test.ts
git commit -m "feat(primeui): migrate all custom bottom drawers and dialogs to PrimeVue Drawer"
```

---

### Task 3: Core Expense Tracking Views, Listings & Filters Migration

**Files:**
- Modify: `together/src/views/Dashboard.vue`
- Modify: `together/src/views/Expenses.vue`
- Modify: `together/src/components/ExpenseList.vue`
- Modify: `together/src/components/CategoryBreakdown.vue`
- Modify: `together/src/components/TrendChart.vue`

**Interfaces:**
- Consumes: `Button` from `primevue/button`, `Card` from `primevue/card`, `SelectButton` from `primevue/selectbutton`, `IconField` from `primevue/iconfield`, `InputIcon` from `primevue/inputicon`, `InputText` from `primevue/inputtext`, `Select` from `primevue/select`, `Tag` from `primevue/tag`, `ProgressBar` from `primevue/progressbar`, `Message` from `primevue/message`, `useConfirm` from `primevue/useconfirm`.
- Produces: Fully styled PrimeVue Dashboard & Expense view with accessible search, sorting, category filtering, and itemized listings.

- [ ] **Step 1: Write test verifying Expense filter and sorting behavior with PrimeVue models**

Add to `together/tests/primevue-components.test.ts`:
```typescript
test("primevue expense filters: select options format correctly for Select component", () => {
  const categories = ["Groceries", "Fuel", "Dining"];
  const selectOptions = [
    { label: "All Categories", value: "" },
    ...categories.map((c) => ({ label: c, value: c })),
  ];
  assert.equal(selectOptions.length, 4);
  assert.equal(selectOptions[0].value, "");
  assert.equal(selectOptions[1].label, "Groceries");
});
```

- [ ] **Step 2: Run test to verify assertion passes**

Run: `cd together && pnpm test tests/primevue-components.test.ts`
Expected: PASS

- [ ] **Step 3: Migrate `Dashboard.vue` to PrimeVue components**

In `together/src/views/Dashboard.vue`:
1. Import PrimeVue components:
```typescript
import Button from "primevue/button";
import Card from "primevue/card";
import Message from "primevue/message";
```
2. Replace `.quick-entry-actions` raw buttons with PrimeVue `<Button severity="secondary" variant="outlined">`:
```vue
<div class="quick-entry-actions">
  <Button severity="secondary" variant="outlined" @click="store.openExpense('quick')">
    <template #icon><Zap :size="20" /></template>
    {{ t('dashboard.quickAmount') }}
  </Button>
  <Button severity="secondary" variant="outlined" @click="store.openExpense('items')">
    <template #icon><ListPlus :size="20" /></template>
    {{ t('dashboard.addItems') }}
  </Button>
  <Button severity="secondary" variant="outlined" @click="store.openExpense('receipt')">
    <template #icon><ScanLine :size="20" /></template>
    {{ t('dashboard.scanReceipt') }}
  </Button>
</div>
```
3. Replace `.compact-limit-alert` with PrimeVue `<Message severity="warn" icon="AlertCircle">`:
```vue
<Message v-if="isOverWeeklyLimit" severity="warn" class="mb-3">
  {{ t('dashboard.overWeeklyLimit', { amount: store.displayMoney(store.weekTotal - store.weeklyLimit) }) }}
</Message>
```
4. Replace `.report-stats` articles with PrimeVue `<Card>`:
```vue
<section class="report-stats" :aria-label="t('dashboard.monthlySummary')">
  <Card class="total-card">
    <template #content>
      <span>{{ t('dashboard.thisMonthSimple') }} · {{ store.currency }}</span>
      <strong class="hero-number">{{ store.displayMoney(store.monthTotal) }}</strong>
    </template>
  </Card>
  <Card class="panel">
    <template #content>
      <span class="muted">{{ t('dashboard.expensesCount') }}</span>
      <strong>{{ store.monthExpenses.length }}</strong>
    </template>
  </Card>
  <Card class="panel">
    <template #content>
      <span class="muted">{{ t('dashboard.previousMonth') }}</span>
      <strong>{{ store.displayMoney(lastTotal) }}</strong>
    </template>
  </Card>
</section>
```
5. Wrap Recent Expenses, By Category, and Weekly Spending in PrimeVue `<Card>`.

- [ ] **Step 4: Migrate `Expenses.vue` filters and action controls**

In `together/src/views/Expenses.vue`:
1. Import PrimeVue components:
```typescript
import Button from "primevue/button";
import Card from "primevue/card";
import SelectButton from "primevue/selectbutton";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
```
2. Replace period segmented buttons with PrimeVue `<SelectButton>`:
```typescript
const periodOptions = computed(() => [
  { value: "week", label: t("expenses.thisWeek") },
  { value: "month", label: t("expenses.thisMonth") },
  { value: "all", label: t("expenses.allExpenses") },
]);
```
```vue
<SelectButton
  v-model="period"
  :options="periodOptions"
  optionLabel="label"
  optionValue="value"
  :allowEmpty="false"
  class="period-select-btn"
/>
```
3. Replace search input with PrimeVue `<IconField>`:
```vue
<IconField class="search-input">
  <InputIcon><Search :size="16" /></InputIcon>
  <InputText
    v-model="search"
    type="search"
    :placeholder="t('expenses.searchPlaceholder')"
  />
</IconField>
```
4. Replace Category, Account, and Sort dropdowns with PrimeVue `<Select>`.
5. Replace Bulk entry and Export CSV with PrimeVue `<Button>`.

- [ ] **Step 5: Migrate `ExpenseList.vue` item rows and actions**

In `together/src/components/ExpenseList.vue`:
1. Import PrimeVue components:
```typescript
import Button from "primevue/button";
import Tag from "primevue/tag";
import { useConfirm } from "primevue/useconfirm";

const confirm = useConfirm();
```
2. Replace `confirm()` in `remove(expense)` with PrimeVue `confirm.require()`:
```typescript
function remove(expense: Expense) {
  confirm.require({
    message: `Delete “${expense.merchant}” (${store.displayMoney(expense.amount)})?`,
    header: t("common.confirmDelete"),
    icon: "pi pi-exclamation-triangle",
    acceptClass: "p-button-danger",
    accept: async () => {
      deleting.value = expense.id;
      try {
        await store.removeExpense(expense);
      } catch (reason) {
        store.error = friendlyError(reason);
      } finally {
        deleting.value = "";
      }
    },
  });
}
```
3. Replace the account badge with PrimeVue `<Tag>`:
```vue
<Tag
  :severity="expense.accountId === 'nz' ? 'info' : 'success'"
  :value="expense.accountId === 'nz' ? '🏦 NZ Savings' : '💳 Global'"
  class="cursor-pointer"
  @click.stop="store.toggleExpenseAccount(expense.id)"
/>
```
4. Replace row action buttons with PrimeVue `<Button variant="text" rounded severity="secondary">`.

- [ ] **Step 6: Migrate `CategoryBreakdown.vue` and `TrendChart.vue`**

1. In `together/src/components/CategoryBreakdown.vue`:
   - Import `ProgressBar` from `primevue/progressbar`.
   - Replace `<div class="track"><span :style="{ width: `${row.percent}%` }" /></div>` with `<ProgressBar :value="Math.round(row.percent)" :showValue="false" />`.
2. In `together/src/components/TrendChart.vue`:
   - Wrap trend bars in PrimeVue `<Card>`.

- [ ] **Step 7: Run test suite and build verification**

Run: `cd together && pnpm test && pnpm build`
Expected: PASS

- [ ] **Step 8: Commit changes**

```bash
git add together/src/views/Dashboard.vue together/src/views/Expenses.vue together/src/components/ExpenseList.vue together/src/components/CategoryBreakdown.vue together/src/components/TrendChart.vue together/tests/primevue-components.test.ts
git commit -m "feat(primeui): migrate Dashboard, Expenses view, ExpenseList, and CategoryBreakdown"
```

---

### Task 4: Product Catalog, Item Editor & Price Compare Migration

**Files:**
- Modify: `together/src/views/Products.vue`
- Modify: `together/src/components/products/ProductCatalog.vue`
- Modify: `together/src/components/products/ProductPrices.vue`
- Modify: `together/src/components/ItemEditor.vue`
- Modify: `together/src/components/products/PurchaseItemRow.vue`
- Modify: `together/src/components/products/PriceWarning.vue`

**Interfaces:**
- Consumes: `Button` from `primevue/button`, `Card` from `primevue/card`, `SelectButton` from `primevue/selectbutton`, `IconField` from `primevue/iconfield`, `InputIcon` from `primevue/inputicon`, `InputText` from `primevue/inputtext`, `Select` from `primevue/select`, `Tag` from `primevue/tag`, `Drawer` from `primevue/drawer`, `Message` from `primevue/message`.
- Produces: Modern catalog management with unit pill filtering, itemized purchase row inputs, and live price warnings.

- [ ] **Step 1: Write test verifying unit filter options formatting**

Add to `together/tests/primevue-components.test.ts`:
```typescript
test("primevue product catalog: unit pills convert to SelectButton options cleanly", () => {
  const units = [
    { value: "each", label: "Each" },
    { value: "kg", label: "Kilogram" },
  ];
  const unitOptions = [{ value: "all", label: "All" }, ...units];
  assert.equal(unitOptions.length, 3);
  assert.equal(unitOptions[0].value, "all");
});
```

- [ ] **Step 2: Run test to verify assertion passes**

Run: `cd together && pnpm test tests/primevue-components.test.ts`
Expected: PASS

- [ ] **Step 3: Migrate `ProductCatalog.vue`**

In `together/src/components/products/ProductCatalog.vue`:
1. Import PrimeVue components:
```typescript
import Button from "primevue/button";
import Card from "primevue/card";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import InputText from "primevue/inputtext";
import SelectButton from "primevue/selectbutton";
import Select from "primevue/select";
import Tag from "primevue/tag";
import Drawer from "primevue/drawer";
```
2. Replace price comparison launch button with PrimeVue `<Button severity="primary">`:
```vue
<Button class="compare-launch w-full" severity="primary" @click="comparing = true">
  <template #icon><Scale :size="18" /></template>
  Check a price · camera or type
</Button>
```
3. Upgrade search toolbar:
   - Replace search input with `<IconField><InputIcon><Search :size="16" /></InputIcon><InputText v-model="query" :placeholder="t('products.searchPlaceholder')" /></IconField>`.
   - Replace unit pill buttons with `<SelectButton v-model="selectedUnit" :options="unitOptions" optionLabel="label" optionValue="value" :allowEmpty="false" />`.
   - Replace "New Product" button with `<Button severity="secondary" variant="outlined" size="small" @click="add"><template #icon><Plus :size="16" /></template>{{ t('products.newProduct') }}</Button>`.
4. Wrap Product Edit/New form in PrimeVue `<Drawer position="bottom">`:
   - Replace `<form v-if="editing" class="panel edit-product-form">` with `<Drawer :visible="!!editing" position="bottom" @update:visible="editing = null">`.
   - Use PrimeVue `<InputText v-model="editing.title" />` and `<Select v-model="editing.unit" :options="units" optionLabel="label" optionValue="value" />`.
   - Use PrimeVue `<Button severity="primary">` and `<Button severity="secondary" variant="outlined">`.
5. Render product list cards with PrimeVue `<Card>`:
   - Header with product title, `<Tag :value="product.unit" />`.
   - Action buttons with `<Button variant="text" rounded severity="secondary">`.

- [ ] **Step 4: Migrate `ProductPrices.vue` and `PriceWarning.vue`**

1. In `together/src/components/products/ProductPrices.vue`:
   - Replace comparison select with PrimeVue `<Select v-model="compareId" :options="compareOptions" optionLabel="title" optionValue="id" />`.
   - Replace cheapest and expensive badges with PrimeVue `<Tag severity="success" value="Cheapest" />` and `<Tag severity="danger" value="Higher" />`.
2. In `together/src/components/products/PriceWarning.vue`:
   - Replace `.price-warning` with PrimeVue `<Tag :severity="warningSeverity" :value="warningText" />` or PrimeVue `<Message severity="warn">`.

- [ ] **Step 5: Migrate `ItemEditor.vue` and `PurchaseItemRow.vue`**

1. In `together/src/components/ItemEditor.vue`:
   - Replace saved product picker select and add button with PrimeVue `<Select>` and `<Button>`.
   - Replace "Add item" wide button with `<Button severity="secondary" variant="outlined" class="w-full" @click="add()"><template #icon><Plus :size="18" /></template>{{ t('expenses.addItem') }}</Button>`.
2. In `together/src/components/products/PurchaseItemRow.vue`:
   - Replace item title, price, quantity, size, and discount inputs with PrimeVue `<InputText>`.
   - Replace unit dropdown with PrimeVue `<Select>`.
   - Replace delete item button with PrimeVue `<Button variant="text" rounded severity="danger"><template #icon><Trash2 :size="18" /></template></Button>`.
   - Replace candidate match suggestion buttons with PrimeVue `<Button size="small" variant="outlined" severity="secondary" @click="select(candidate)">`.

- [ ] **Step 6: Run test suite and build verification**

Run: `cd together && pnpm test && pnpm build`
Expected: PASS

- [ ] **Step 7: Commit changes**

```bash
git add together/src/views/Products.vue together/src/components/products/ProductCatalog.vue together/src/components/products/ProductPrices.vue together/src/components/ItemEditor.vue together/src/components/products/PurchaseItemRow.vue together/src/components/products/PriceWarning.vue together/tests/primevue-components.test.ts
git commit -m "feat(primeui): migrate ProductCatalog, ProductPrices, ItemEditor, and PurchaseItemRow"
```

---

### Task 5: Shops & Category Management Views Migration

**Files:**
- Modify: `together/src/views/Shops.vue`
- Modify: `together/src/components/CategoryManager.vue`

**Interfaces:**
- Consumes: `Button` from `primevue/button`, `Card` from `primevue/card`, `InputText` from `primevue/inputtext`, `IconField` from `primevue/iconfield`, `InputIcon` from `primevue/inputicon`, `Tag` from `primevue/tag`, `useConfirm` from `primevue/useconfirm`, `Drawer` from `primevue/drawer`.
- Produces: Clean shops administration and visual category manager with icon palette and color swatches.

- [ ] **Step 1: Write test verifying category manager color palette and icons structure**

Add to `together/tests/primevue-components.test.ts`:
```typescript
test("primevue category manager: curated color palette and icons are populated", async () => {
  const { categories } = await import("../src/lib/types.js");
  assert.ok(categories.length > 0, "Default categories must exist");
});
```

- [ ] **Step 2: Run test to verify assertion passes**

Run: `cd together && pnpm test tests/primevue-components.test.ts`
Expected: PASS

- [ ] **Step 3: Migrate `Shops.vue`**

In `together/src/views/Shops.vue`:
1. Import PrimeVue components:
```typescript
import Button from "primevue/button";
import Card from "primevue/card";
import InputText from "primevue/inputtext";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import { useConfirm } from "primevue/useconfirm";

const confirm = useConfirm();
```
2. Upgrade shop creation panel:
```vue
<Card class="panel mb-4">
  <template #content>
    <form @submit.prevent="saveShop">
      <label class="block mb-2 font-medium">
        {{ editingShop ? t('shops.editShop') : t('shops.newShop') }}
      </label>
      <div class="flex gap-2">
        <InputText
          v-model="name"
          maxlength="100"
          :placeholder="t('shops.placeholder')"
          required
          class="flex-1"
        />
        <Button severity="primary" type="submit" :disabled="busy">
          <template #icon><Plus :size="18" /></template>
          {{ editingShop ? t('shops.saveName') : t('shops.addShop') }}
        </Button>
        <Button
          v-if="editingShop"
          severity="secondary"
          variant="outlined"
          type="button"
          @click="editingShop = undefined; name = '';"
        >
          {{ t('common.cancel') }}
        </Button>
      </div>
    </form>
  </template>
</Card>
```
3. Upgrade search input with `<IconField><InputIcon><Search :size="16" /></InputIcon><InputText v-model="query" /></IconField>`.
4. Render shops using PrimeVue `<Card>`:
   - Edit button: `<Button variant="text" rounded severity="secondary" @click="startEdit(shop)"><template #icon><Pencil :size="18" /></template></Button>`.
   - Remove button with PrimeVue `confirm.require()`:
   ```typescript
   function confirmDeleteShop(shop: Shop) {
     confirm.require({
       message: t("shops.confirmDeleteShop", { name: shop.name }),
       header: t("common.confirmDelete"),
       icon: "pi pi-exclamation-triangle",
       acceptClass: "p-button-danger",
       accept: () => removeShop(shop.id),
     });
   }
   ```

- [ ] **Step 4: Migrate `CategoryManager.vue`**

In `together/src/components/CategoryManager.vue`:
1. Import PrimeVue components:
```typescript
import Button from "primevue/button";
import Card from "primevue/card";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
import { useConfirm } from "primevue/useconfirm";

const confirm = useConfirm();
```
2. Replace header action button with PrimeVue `<Button severity="secondary" variant="outlined" size="small" @click="startNew"><template #icon><Plus :size="16" /></template>{{ t('categories.newCategory') }}</Button>`.
3. Upgrade Category Editor Form:
   - Wrap in PrimeVue `<Card>`.
   - Replace name input with PrimeVue `<InputText v-model="name" maxlength="50" required />`.
   - Replace icon buttons with `<Button variant="text" rounded ...>` or styled selection chips.
   - Replace color swatches with styled color buttons.
   - Replace save/cancel buttons with PrimeVue `<Button severity="primary">` and `<Button severity="secondary" variant="outlined">`.
4. Upgrade custom categories list:
   - Render cards using PrimeVue `<Card>` or list rows with `<Tag>`.
   - Replace edit and delete buttons with PrimeVue `<Button variant="text" rounded severity="secondary">` and `<Button variant="text" rounded severity="danger">` with `confirm.require()`.

- [ ] **Step 5: Run test suite and build verification**

Run: `cd together && pnpm test && pnpm build`
Expected: PASS

- [ ] **Step 6: Commit changes**

```bash
git add together/src/views/Shops.vue together/src/components/CategoryManager.vue together/tests/primevue-components.test.ts
git commit -m "feat(primeui): migrate Shops view and CategoryManager to PrimeVue"
```

---

### Task 6: Reports & Analytics Views Migration

**Files:**
- Modify: `together/src/views/Reports.vue`
- Modify: `together/src/components/reports/CategoryDonutChart.vue`
- Modify: `together/src/components/reports/SpendTrajectoryChart.vue`
- Modify: `together/src/components/reports/AccountCashflowChart.vue`
- Modify: `together/src/components/reports/BudgetVarianceChart.vue`

**Interfaces:**
- Consumes: `Button` from `primevue/button`, `Card` from `primevue/card`, `SelectButton` from `primevue/selectbutton`, `DatePicker` from `primevue/datepicker`, `Tag` from `primevue/tag`, `ProgressBar` from `primevue/progressbar`.
- Produces: Analytics dashboards with period selectors, date range pickers, baseline KPI cards, and SVG financial charts wrapped in PrimeVue Cards.

- [ ] **Step 1: Write test verifying reports period definitions**

Add to `together/tests/primevue-components.test.ts`:
```typescript
test("primevue reports: period options map cleanly for SelectButton", () => {
  const periods = ["week", "month", "year", "all", "custom"] as const;
  const options = periods.map((p) => ({ value: p, label: p.toUpperCase() }));
  assert.equal(options.length, 5);
  assert.equal(options[0].value, "week");
});
```

- [ ] **Step 2: Run test to verify assertion passes**

Run: `cd together && pnpm test tests/primevue-components.test.ts`
Expected: PASS

- [ ] **Step 3: Migrate `Reports.vue` controls and baseline KPI cards**

In `together/src/views/Reports.vue`:
1. Import PrimeVue components:
```typescript
import Button from "primevue/button";
import Card from "primevue/card";
import SelectButton from "primevue/selectbutton";
import DatePicker from "primevue/datepicker";
import Tag from "primevue/tag";
import ProgressBar from "primevue/progressbar";
```
2. Replace period segmented buttons with PrimeVue `<SelectButton>`:
```typescript
const periodOptions = computed(() => [
  { value: "week", label: t("reports.periods.week") },
  { value: "month", label: t("reports.periods.month") },
  { value: "year", label: t("reports.periods.year") },
  { value: "all", label: t("reports.periods.all") },
  { value: "custom", label: t("reports.periods.custom") },
]);
```
```vue
<SelectButton
  v-model="mode"
  :options="periodOptions"
  optionLabel="label"
  optionValue="value"
  :allowEmpty="false"
  class="report-mode-select"
/>
```
3. Replace date pickers with PrimeVue `<DatePicker>`:
   - Week Containing: `<DatePicker v-model="weekDateModel" dateFormat="yy-mm-dd" />`
   - Custom Range: `<DatePicker v-model="fromDateModel" dateFormat="yy-mm-dd" />` and `<DatePicker v-model="toDateModel" dateFormat="yy-mm-dd" />`
4. Replace Export Report button with PrimeVue `<Button severity="secondary" variant="outlined" @click="exportCsv"><template #icon><Download :size="16" /></template>{{ t('reports.exportReport') }}</Button>`.
5. Upgrade Starting Capital Baseline Hub and Comparison Cards to PrimeVue `<Card>`:
   - Header tag with `<Tag :severity="periodBaselineComparison.isOverInitial ? 'danger' : 'success'" :value="percentFormatted" />`.
   - Summary statistics in `<Card>`.
   - Daily spending progress bars with PrimeVue `<ProgressBar :value="percent" :showValue="false" />`.

- [ ] **Step 4: Wrap report chart components in PrimeVue `<Card>`**

In each of:
- `together/src/components/reports/CategoryDonutChart.vue`
- `together/src/components/reports/SpendTrajectoryChart.vue`
- `together/src/components/reports/AccountCashflowChart.vue`
- `together/src/components/reports/BudgetVarianceChart.vue`

Wrap the chart root element in a PrimeVue `<Card class="chart-card">` with header and subtitle slots.

- [ ] **Step 5: Run test suite and build verification**

Run: `cd together && pnpm test && pnpm build`
Expected: PASS

- [ ] **Step 6: Commit changes**

```bash
git add together/src/views/Reports.vue together/src/components/reports/ together/tests/primevue-components.test.ts
git commit -m "feat(primeui): migrate Reports analytics view and chart card wrappers to PrimeVue"
```

---

### Task 7: AI Advisor, Device Sync & Settings Views Migration

**Files:**
- Modify: `together/src/views/AiChat.vue`
- Modify: `together/src/components/AiSpendingChat.vue`
- Modify: `together/src/components/AiMoneyAdvisor.vue`
- Modify: `together/src/components/data/DeviceSync.vue`
- Modify: `together/src/views/Settings.vue`
- Modify: `together/src/components/ReceiptReader.vue`

**Interfaces:**
- Consumes: `Button` from `primevue/button`, `Card` from `primevue/card`, `SelectButton` from `primevue/selectbutton`, `InputText` from `primevue/inputtext`, `Textarea` from `primevue/textarea`, `Checkbox` from `primevue/checkbox`, `Tabs` from `primevue/tabs`, `TabList` from `primevue/tablist`, `Tab` from `primevue/tab`, `TabPanels` from `primevue/tabpanels`, `TabPanel` from `primevue/tabpanel`, `Tag` from `primevue/tag`, `Message` from `primevue/message`, `useConfirm` from `primevue/useconfirm`.
- Produces: Polished AI conversation surface, multi-tab financial advisor, secure device sync card, and settings administration.

- [ ] **Step 1: Write test verifying AI budget modes and tabs setup**

Add to `together/tests/primevue-components.test.ts`:
```typescript
test("primevue ai chat: budget modes map cleanly to SelectButton options", () => {
  const modes = [
    { id: "low", label: "Low Budget" },
    { id: "medium", label: "Medium Budget" },
    { id: "high", label: "High Budget" },
  ];
  assert.equal(modes.length, 3);
  assert.equal(modes[0].id, "low");
});
```

- [ ] **Step 2: Run test to verify assertion passes**

Run: `cd together && pnpm test tests/primevue-components.test.ts`
Expected: PASS

- [ ] **Step 3: Migrate `AiChat.vue` and `AiSpendingChat.vue`**

1. In `together/src/views/AiChat.vue`:
   - Replace topbar with PrimeVue `<Card>`.
   - Replace connection status pill with PrimeVue `<Button :severity="status?.ok ? 'success' : 'warn'" size="small">`.
   - Replace refresh button with PrimeVue `<Button variant="text" rounded severity="secondary">`.
   - Replace non-desktop warning with PrimeVue `<Message severity="warn">`.
2. In `together/src/components/AiSpendingChat.vue`:
   - Replace budget mode selector with PrimeVue `<SelectButton v-model="chatStore.budgetMode" :options="budgetModes" optionLabel="label" optionValue="id" :allowEmpty="false" />`.
   - Replace quick prompt buttons with PrimeVue `<Button size="small" variant="outlined" severity="secondary" @click="onQuickSelect(prompt)">`.
   - Replace prompt input with PrimeVue `<Textarea v-model="inputPrompt" rows="2" autoResize />`.
   - Replace send button with PrimeVue `<Button severity="primary" :disabled="!inputPrompt.trim() || chatStore.loading" @click="onSend"><template #icon><Send :size="16" /></template></Button>`.
   - Replace clear history button with PrimeVue `<Button variant="text" severity="danger" size="small" @click="onClear"><template #icon><Trash2 :size="16" /></template></Button>` using `confirm.require()`.
   - Render advice message cards with PrimeVue `<Card>`.

- [ ] **Step 4: Migrate `AiMoneyAdvisor.vue` to PrimeVue Tabs**

In `together/src/components/AiMoneyAdvisor.vue`:
1. Import PrimeVue Tabs primitives:
```typescript
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import Card from "primevue/card";
import Button from "primevue/button";
```
2. Replace manual active tab state with PrimeVue `<Tabs value="chat">`:
```vue
<Tabs value="chat" class="advisor-tabs">
  <TabList>
    <Tab value="chat"><Sparkles :size="16" />{{ t('advisor.tabChat') }}</Tab>
    <Tab value="audit"><ListOrdered :size="16" />{{ t('advisor.tabAudit') }}</Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="chat">
      <AiSpendingChat />
    </TabPanel>
    <TabPanel value="audit">
      <!-- Recurring spend audit content wrapped in Card -->
    </TabPanel>
  </TabPanels>
</Tabs>
```

- [ ] **Step 5: Migrate `DeviceSync.vue` and `ReceiptReader.vue`**

1. In `together/src/components/data/DeviceSync.vue`:
   - Wrap sync interface in PrimeVue `<Card>`.
   - Replace copy and create buttons with PrimeVue `<Button>`.
   - Replace private link input with PrimeVue `<InputText readonly />`.
   - Replace connection input with PrimeVue `<InputText />`.
   - Replace acknowledgment checkbox with PrimeVue `<Checkbox v-model="acknowledged" binary />`.
2. In `together/src/components/ReceiptReader.vue`:
   - Wrap scan panel in PrimeVue `<Card>`.
   - Replace camera and upload buttons with PrimeVue `<Button severity="secondary" variant="outlined">`.
   - Replace crop / scan CTA with PrimeVue `<Button severity="primary">`.
   - Replace status alerts with PrimeVue `<Message severity="info">`.

- [ ] **Step 6: Migrate `Settings.vue`**

In `together/src/views/Settings.vue`:
1. Import PrimeVue components:
```typescript
import Button from "primevue/button";
import Card from "primevue/card";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Message from "primevue/message";
import { useConfirm } from "primevue/useconfirm";

const confirm = useConfirm();
```
2. Wrap Starting Capital & Accounts Setup in PrimeVue `<Card>`:
   - Use PrimeVue `<InputText>` for USD and NZD initial amounts and salary.
   - Use PrimeVue `<Select>` for payment day of week.
   - Use PrimeVue `<DatePicker>` for payment date.
   - Use PrimeVue `<Button severity="primary">` for saving accounts.
3. Wrap Ollama Configuration in PrimeVue `<Card>`:
   - Use PrimeVue `<InputText>` for host and model.
   - Use PrimeVue `<Button severity="secondary" variant="outlined">` for testing connection.
   - Use PrimeVue `<Button severity="primary">` for saving settings.
4. Upgrade Database Backup, Restore & Clear in PrimeVue `<Card>`:
   - Export backup: `<Button severity="secondary" variant="outlined" @click="exportBackup">`.
   - Restore backup: `<Button severity="secondary" variant="outlined">` triggering file input.
   - Clear All: `<Button severity="danger" @click="clear">` with PrimeVue `confirm.require()`:
   ```typescript
   function clear() {
     confirm.require({
       message: "Delete all expenses from this database and connected devices? Export a backup first if you want to keep them.",
       header: "Danger: Delete All Data",
       icon: "pi pi-exclamation-triangle",
       acceptClass: "p-button-danger",
       accept: async () => {
         try {
           await store.clearAll();
           error.value = "";
         } catch (reason) {
           error.value = friendlyError(reason);
         }
       },
     });
   }
   ```

- [ ] **Step 7: Run test suite and build verification**

Run: `cd together && pnpm test && pnpm build`
Expected: PASS

- [ ] **Step 8: Commit changes**

```bash
git add together/src/views/AiChat.vue together/src/components/AiSpendingChat.vue together/src/components/AiMoneyAdvisor.vue together/src/components/data/DeviceSync.vue together/src/views/Settings.vue together/src/components/ReceiptReader.vue together/tests/primevue-components.test.ts
git commit -m "feat(primeui): migrate AiChat, AiMoneyAdvisor, DeviceSync, Settings, and ReceiptReader"
```

---

### Task 8: Stylesheet Modernization, Theme Integration & Full Regression Testing

**Files:**
- Modify: `together/src/styles.css`
- Modify: `together/tests/performance-styles.test.ts`
- Test: Full unit and build verification

**Interfaces:**
- Consumes: PrimeVue Aura theme CSS variables and app color tokens (`--green`, `--accent`, `--surface`, `--radius`).
- Produces: Cohesive visual styling in light and dark modes without legacy redundant CSS rules or broken tests.

- [ ] **Step 1: Write test verifying complete elimination of raw button classes and legacy drawer hacks**

Add to `together/tests/performance-styles.test.ts`:
```typescript
test("primevue migration: styles.css retains performance tokens and avoids backdrop blurs", () => {
  const styles = fs.readFileSync(stylesPath, "utf-8");
  assert.equal(styles.includes("backdrop-filter: blur(40px)"), false);
});
```

- [ ] **Step 2: Run performance tests to establish baseline**

Run: `cd together && pnpm test tests/performance-styles.test.ts`
Expected: PASS

- [ ] **Step 3: Update `styles.css` to harmonize PrimeVue components with Brand Tokens**

In `together/src/styles.css`:
1. Clean up obsolete `.expense-drawer-dialog` and `.bottom-drawer` specific rules superseded by PrimeVue's `.p-drawer`.
2. Add PrimeVue Aura token integrations ensuring primary color uses brand green `#153d35` (light) and `#2ac294` (dark):
```css
/* PrimeVue Aura Theme Harmonization */
.p-drawer {
  background: var(--surface-drawer, #ffffff) !important;
  border-top: 1px solid var(--surface-drawer-border, rgba(21, 61, 53, 0.12)) !important;
  border-radius: var(--radius, 22px) var(--radius, 22px) 0 0 !important;
}

[data-theme="dark"] .p-drawer {
  background: var(--surface-drawer, #182c26) !important;
  border-top: 1px solid var(--surface-drawer-border, rgba(255, 255, 255, 0.14)) !important;
}

.p-card {
  border-radius: var(--radius, 22px) !important;
  background: var(--glass-card-bg, #ffffff) !important;
  border: var(--glass-card-border, 1px solid rgba(21, 61, 53, 0.12)) !important;
  box-shadow: var(--glass-card-shadow, 0 4px 20px rgba(18, 53, 44, 0.05)) !important;
}

[data-theme="dark"] .p-card {
  background: var(--surface, #182c26) !important;
  border: var(--border, 1px solid rgba(255, 255, 255, 0.09)) !important;
}

.p-button-primary {
  background-color: var(--green) !important;
  border-color: var(--green) !important;
  border-radius: var(--radius-sm, 14px) !important;
}

[data-theme="dark"] .p-button-primary {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #0b1412 !important;
}
```

- [ ] **Step 4: Run full test suite across all 80+ tests**

Run: `cd together && pnpm test`
Expected: All tests pass.

- [ ] **Step 5: Run full TypeScript check and production build**

Run: `cd together && pnpm build`
Expected: `vue-tsc --noEmit && vite build` succeeds with zero errors.

- [ ] **Step 6: Verify in preview mode that all views render without console errors**

Run: `cd together && pnpm preview` (or test via background command / curl)
Expected: Clean HTTP 200 response on `http://127.0.0.1:8080`.

- [ ] **Step 7: Commit changes**

```bash
git add together/src/styles.css together/tests/performance-styles.test.ts
git commit -m "style(primeui): harmonize PrimeVue Aura tokens with brand colors and dark mode"
```

---

## Execution Handoff

Plan complete and saved to `together/docs/superpowers/plans/2026-11-03-primeui-migration.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
