# Implementation Plan: Permanent Dark Mode, Scroll Reset, and PrimeVue UI Adaptation

## Phase 1: Permanent Dark Mode Foundation & Light Mode Purge
- [ ] Task: Write Unit Tests for Dark Mode Lock and Theme Toggle Removal
  - [ ] Create tests in `tests/theme-lock.test.ts` verifying that `App.vue` no longer renders theme toggle controls (`theme-toggle-btn`).
  - [ ] Add assertions verifying that `data-theme="dark"` and PrimeVue `.p-dark` classes are permanently applied to the document root.
  - [ ] Confirm tests fail (Red Phase).
- [ ] Task: Remove Theme Toggling Logic from `App.vue` and Configure Root HTML
  - [ ] Remove `isDark`, `applyTheme`, `onThemeToggle`, and `localStorage.getItem("expenses-theme")` from `src/App.vue`.
  - [ ] Remove the theme toggle button and unused icons (`Sun`, `Moon`) from the header toolbar in `src/App.vue`.
  - [ ] Update `index.html` to include `class="p-dark"` and `data-theme="dark"` on `<html>` to eliminate initial-load flashes.
  - [ ] Verify unit tests pass (Green Phase).
- [ ] Task: Configure PrimeVue Theme Preset for Dark Mode in `main.ts`
  - [ ] Verify and update `PrimeVue` plugin configuration in `src/main.ts` with Aura preset and dark mode selector (`.p-dark`).
  - [ ] Ensure clean initialization on application startup.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Universal Route Navigation Scroll Reset
- [ ] Task: Write Tests for Route Navigation Scroll Reset
  - [ ] Create test in `tests/navigation-scroll.test.ts` mocking router transitions and asserting that scroll coordinates reset to `(0, 0)`.
  - [ ] Test both window scroll reset and workspace container (`.workspace`) scroll reset.
  - [ ] Confirm tests fail (Red Phase).
- [ ] Task: Implement Router `scrollBehavior` and Workspace Scroll-to-Top Reset
  - [ ] Add `scrollBehavior(to, from, savedPosition)` in `src/main.ts` returning `{ top: 0, left: 0 }`.
  - [ ] Add `router.afterEach` hook or route watcher in `src/App.vue` resetting `.workspace` container scroll position to `(0, 0)`.
  - [ ] Verify navigation tests pass (Green Phase).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Dark-First Styling Audit & CSS Token Consolidation
- [ ] Task: Write Tests for Dark Theme CSS Token Integrity
  - [ ] Create tests in `tests/dark-styles.test.ts` asserting obsidian dark CSS variables are defined directly in `:root`.
  - [ ] Assert that no critical components rely on deprecated light-mode-only variables.
  - [ ] Confirm tests fail (Red Phase).
- [ ] Task: Refactor `:root` CSS Variables to Dark Palette and Purge Light Rules
  - [ ] In `src/styles.css`, promote the obsidian dark color tokens and glass surface variables directly into `:root`.
  - [ ] Remove obsolete `[data-theme="dark"]` duplicate overrides and delete dead light-mode CSS rules.
  - [ ] Verify body and root styles default to `#0b1412` background and `#e2ede8` text.
- [ ] Task: Audit and Update Component Classes and Colors for Dark Mode
  - [ ] Audit views (`Dashboard.vue`, `Expenses.vue`, `Reports.vue`, `Products.vue`, `Shops.vue`, `Settings.vue`, `AiChat.vue`) and components for hardcoded light backgrounds (`#fff`, `bg-white`) or low-contrast dark text.
  - [ ] Standardize background surfaces, borders, cards, and text colors to semantic tokens (`--surface`, `--glass-card-bg`, `--border`, `--muted`).
  - [ ] Verify dark style integrity tests pass (Green Phase).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Adapt Foundational Inputs & Buttons to PrimeVue / PrimeUI
- [ ] Task: Write Tests for PrimeVue Input and Button Component Integration
  - [ ] Create tests in `tests/primevue-inputs.test.ts` testing PrimeVue Button, InputText, InputNumber, and Textarea integration in form contexts.
  - [ ] Assert `v-model` binding updates, validation, and accessibility attributes.
  - [ ] Confirm tests fail (Red Phase).
- [ ] Task: Migrate ExpenseForm and ItemEditor Inputs to PrimeVue Components
  - [ ] Replace standard `<input type="text">` with PrimeVue `InputText` in `src/components/ExpenseForm.vue` and `src/components/ItemEditor.vue`.
  - [ ] Replace standard `<input type="number">` with PrimeVue `InputNumber` where appropriate.
  - [ ] Replace standard `<textarea>` with PrimeVue `Textarea` for expense notes.
  - [ ] Ensure full styling compatibility with existing layout and Tailwind utilities.
- [ ] Task: Migrate Primary Action Buttons to PrimeVue Button Component
  - [ ] Replace standard primary buttons (e.g. "Add Expense", form submit, quick actions) with PrimeVue `Button`.
  - [ ] Retain Lucide icons and button labels while preserving responsive styling.
  - [ ] Verify component tests pass (Green Phase).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Full Regression Testing & Verification Pass
- [ ] Task: Run Comprehensive Automated Test Suites (Unit & E2E)
  - [ ] Execute all unit tests (`tsx --test tests/*.test.ts`) and ensure 100% pass rate.
  - [ ] Run Playwright E2E suites (`playwright test`) to verify key flows (adding expense, filtering, navigation, drawer opening).
- [ ] Task: Execute Cross-Route Verification and Theme Consistency Audit
  - [ ] Verify all routes render cleanly in dark mode without visual glitches or unreadable contrast.
  - [ ] Confirm scroll position resets to top on every navigation across desktop and mobile viewport sizes.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
