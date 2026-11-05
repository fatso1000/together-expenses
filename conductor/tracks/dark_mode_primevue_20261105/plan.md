# Implementation Plan: Permanent Dark Mode, Scroll Reset, and PrimeVue UI Adaptation

## Phase 1: Permanent Dark Mode Foundation & Light Mode Purge [checkpoint: 006141f]
- [x] Task: Write Unit Tests for Dark Mode Lock and Theme Toggle Removal 006141f
  - [x] Create tests in `tests/theme-lock.test.ts` verifying that `App.vue` no longer renders theme toggle controls (`theme-toggle-btn`).
  - [x] Add assertions verifying that `data-theme="dark"` and PrimeVue `.p-dark` classes are permanently applied to the document root.
  - [x] Confirm tests fail (Red Phase).
- [x] Task: Remove Theme Toggling Logic from `App.vue` and Configure Root HTML 006141f
  - [x] Remove `isDark`, `applyTheme`, `onThemeToggle`, and `localStorage.getItem("expenses-theme")` from `src/App.vue`.
  - [x] Remove the theme toggle button and unused icons (`Sun`, `Moon`) from the header toolbar in `src/App.vue`.
  - [x] Update `index.html` to include `class="p-dark"` and `data-theme="dark"` on `<html>` to eliminate initial-load flashes.
  - [x] Verify unit tests pass (Green Phase).
- [x] Task: Configure PrimeVue Theme Preset for Dark Mode in `main.ts` 006141f
  - [x] Verify and update `PrimeVue` plugin configuration in `src/main.ts` with Aura preset and dark mode selector (`.p-dark`).
  - [x] Ensure clean initialization on application startup.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) 006141f

## Phase 2: Universal Route Navigation Scroll Reset [checkpoint: 3753a1f]
- [x] Task: Write Tests for Route Navigation Scroll Reset 3753a1f
  - [x] Create test in `tests/navigation-scroll.test.ts` mocking router transitions and asserting that scroll coordinates reset to `(0, 0)`.
  - [x] Test both window scroll reset and workspace container (`.workspace`) scroll reset.
  - [x] Confirm tests fail (Red Phase).
- [x] Task: Implement Router `scrollBehavior` and Workspace Scroll-to-Top Reset 3753a1f
  - [x] Add `scrollBehavior(to, from, savedPosition)` in `src/main.ts` returning `{ top: 0, left: 0 }`.
  - [x] Add `router.afterEach` hook or route watcher in `src/App.vue` resetting `.workspace` container scroll position to `(0, 0)`.
  - [x] Verify navigation tests pass (Green Phase).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) 3753a1f

## Phase 3: Dark-First Styling Audit & CSS Token Consolidation [checkpoint: 332d43b]
- [x] Task: Write Tests for Dark Theme CSS Token Integrity 332d43b
  - [x] Create tests in `tests/dark-styles.test.ts` asserting obsidian dark CSS variables are defined directly in `:root`.
  - [x] Assert that no critical components rely on deprecated light-mode-only variables.
  - [x] Confirm tests fail (Red Phase).
- [x] Task: Refactor `:root` CSS Variables to Dark Palette and Purge Light Rules 332d43b
  - [x] In `src/styles.css`, promote the obsidian dark color tokens and glass surface variables directly into `:root`.
  - [x] Remove obsolete `[data-theme="dark"]` duplicate overrides and delete dead light-mode CSS rules.
  - [x] Verify body and root styles default to `#0b1412` background and `#e2ede8` text.
- [x] Task: Audit and Update Component Classes and Colors for Dark Mode 332d43b
  - [x] Audit views (`Dashboard.vue`, `Expenses.vue`, `Reports.vue`, `Products.vue`, `Shops.vue`, `Settings.vue`, `AiChat.vue`) and components for hardcoded light backgrounds (`#fff`, `bg-white`) or low-contrast dark text.
  - [x] Standardize background surfaces, borders, cards, and text colors to semantic tokens (`--surface`, `--glass-card-bg`, `--border`, `--muted`).
  - [x] Verify dark style integrity tests pass (Green Phase).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) 332d43b

## Phase 4: Adapt Foundational Inputs & Buttons to PrimeVue / PrimeUI [checkpoint: a2c031a]
- [x] Task: Write Tests for PrimeVue Input and Button Component Integration a2c031a
  - [x] Create tests in `tests/primevue-inputs.test.ts` testing PrimeVue Button, InputText, InputNumber, and Textarea integration in form contexts.
  - [x] Assert `v-model` binding updates, validation, and accessibility attributes.
  - [x] Confirm tests fail (Red Phase).
- [x] Task: Migrate ExpenseForm and ItemEditor Inputs to PrimeVue Components a2c031a
  - [x] Replace standard `<input type="text">` with PrimeVue `InputText` in `src/components/ExpenseForm.vue` and `src/components/ItemEditor.vue`.
  - [x] Replace standard `<input type="number">` with PrimeVue `InputNumber` where appropriate.
  - [x] Replace standard `<textarea>` with PrimeVue `Textarea` for expense notes.
  - [x] Ensure full styling compatibility with existing layout and Tailwind utilities.
- [x] Task: Migrate Primary Action Buttons to PrimeVue Button Component a2c031a
  - [x] Replace standard primary buttons (e.g. "Add Expense", form submit, quick actions) with PrimeVue `Button`.
  - [x] Retain Lucide icons and button labels while preserving responsive styling.
  - [x] Verify component tests pass (Green Phase).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) a2c031a

## Phase 5: Full Regression Testing & Verification Pass
- [ ] Task: Run Comprehensive Automated Test Suites (Unit & E2E)
  - [ ] Execute all unit tests (`tsx --test tests/*.test.ts`) and ensure 100% pass rate.
  - [ ] Run Playwright E2E suites (`playwright test`) to verify key flows (adding expense, filtering, navigation, drawer opening).
- [ ] Task: Execute Cross-Route Verification and Theme Consistency Audit
  - [ ] Verify all routes render cleanly in dark mode without visual glitches or unreadable contrast.
  - [ ] Confirm scroll position resets to top on every navigation across desktop and mobile viewport sizes.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
