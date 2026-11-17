# Specification: Default UI Construction with Tailwind CSS 4 & PrimeVue

## 1. Overview
This track establishes Tailwind CSS 4 utility classes and PrimeVue 5 UI components as the official, mandatory standard for all UI construction and component styling across the application, replacing the legacy practice of authoring bespoke CSS selectors and ad-hoc class definitions in `src/styles.css` and `<style>` blocks. It migrates foundational layout structures, panels, cards, and interactive forms to direct PrimeVue components styled with Tailwind utilities, deprecates obsolete custom CSS classes, and updates the architectural guidelines (`conductor/code_styleguides/vue.md`) accompanied by automated regression tests to prevent new custom CSS drift.

---

## 2. Functional Requirements

### 2.1 Default UI Construction Standards
- **Mandatory Tailwind + PrimeVue Default**: All newly developed or refactored components, views, dialogs, and sections MUST construct their layout, spacing, flexbox/grid, typography, colors, and responsive behavior using Tailwind CSS 4 utility classes.
- **PrimeVue Component Adoption**: Interactive and structural elements (buttons, inputs, dropdowns, date pickers, modals/drawers, panels, cards, tables, badges) MUST leverage PrimeVue components (`Button`, `InputText`, `Select`, `DatePicker`, `Card`, `Panel`, `Dialog`, `Drawer`, `Badge`) styled directly with Tailwind utility classes and PrimeVue theme tokens (`@primeuix/themes/aura` & `tailwindcss-primeui`).
- **No New Custom CSS**: Disallow creating new custom CSS rules, nested class blocks, or element selectors in `src/styles.css` or component `<style>` blocks when Tailwind utilities or PrimeVue components can achieve the equivalent design.

### 2.2 Core Shared UI Migration
- **Panels & Containers**:
  - Refactor legacy `.panel`, `.card`, and `.accounts-config-panel` structures across major views (`src/views/Settings.vue`, `src/views/settings/*.vue`, `src/views/Dashboard.vue`, `src/views/Expenses.vue`) to use PrimeVue `Card` / `Panel` or semantic Tailwind container classes (`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm`).
- **Forms & Controls**:
  - Replace raw HTML form layouts (`.form-pair`, `.save-actions`, `.header-tag`) with responsive Tailwind grid/flex patterns (`grid grid-cols-1 md:grid-cols-2 gap-4`, `flex items-center gap-2`).
  - Standardize submit/action buttons to PrimeVue `<Button>` with severity/variant properties and Tailwind classes.
- **Legacy CSS Pruning**:
  - Safely remove or deprecate redundant custom CSS definitions in `src/styles.css` and component-level `<style scoped>` blocks where Tailwind utility classes have been adopted.

### 2.3 Styleguide & Architectural Documentation Update
- **Vue & UI Styleguide**:
  - Update `conductor/code_styleguides/vue.md` with explicit, binding rules requiring Tailwind CSS 4 and PrimeVue for all UI construction.
  - Document clear anti-patterns (e.g. writing custom `.my-custom-box { display: flex; ... }`) and approved patterns (e.g. `<div class="flex items-center gap-3">` or `<Button severity="primary" class="w-full sm:w-auto" />`).
- **Tech Stack & Product Guidelines Synchronization**:
  - Ensure `conductor/tech-stack.md` and `conductor/product-guidelines.md` reflect this strict styling hierarchy and component usage rule.

### 2.4 Automated Governance & Verification Tests
- **Automated Test Suite**:
  - Implement unit/governance test(s) in `tests/` verifying that:
    1. Newly created/refactored views and components do not rely on deprecated custom CSS classes.
    2. PrimeVue components and Tailwind utility patterns are used for core structural elements and buttons.
    3. `conductor/code_styleguides/vue.md` enforces the Tailwind + PrimeVue requirement.

---

## 3. Non-Functional Requirements
- **Visual Parity**: Existing dark obsidian aesthetic, color contrast, typography (`Meiryo UI`, `DM Sans`, `Manrope`), and responsive layouts must remain visually cohesive or improved.
- **Maintainability & Readability**: Code readability must improve by replacing arbitrary class names with standard Tailwind utilities and official PrimeVue component APIs.
- **Bundle & Performance**: Leverage Tailwind CSS 4's high-speed Vite compiler without introducing redundant CSS bloat.
- **Full Type Safety**: All PrimeVue component bindings and event emissions must pass strict TypeScript (`vue-tsc --noEmit`) checking.

---

## 4. Acceptance Criteria
1. `conductor/code_styleguides/vue.md` defines Tailwind CSS 4 and PrimeVue as the default UI construction standard with explicit rules and anti-patterns.
2. Settings views (`src/views/Settings.vue` and `src/views/settings/*.vue`) and key dashboard elements utilize PrimeVue components and Tailwind utility classes instead of bespoke custom CSS classes.
3. Obsolete custom CSS classes replaced by Tailwind utilities are cleanly pruned from component `<style>` blocks.
4. Governance tests validate that code styleguide requirements and PrimeVue component adoptions are upheld.
5. All automated tests pass (`tsx --test`) and production build succeeds (`pnpm run build`) with zero TypeScript errors.

---

## 5. Out of Scope
- Rewriting custom SVG chart rendering engines (`TrendChart.vue`, Donut charts) which require direct SVG vector math.
- Altering core financial, OCR parsing, or offline sync business logic.
