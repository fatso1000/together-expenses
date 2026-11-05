# Specification: Permanent Dark Mode, Scroll Reset, and PrimeVue UI Adaptation

## 1. Overview
This track modernizes the user interface by establishing an obsidian dark-mode design system by default and permanently removing all light-mode toggling logic. In addition, it enforces a reliable scroll-to-top reset on every route navigation and adapts foundational interactive elements (buttons, text inputs, number inputs, textareas, selects) to PrimeVue / PrimeUI components without breaking existing behavior, validation, or accessibility.

---

## 2. Functional Requirements

### 2.1 Permanent Dark Mode & Light Mode Removal
- **Header Actions**: Remove the theme toggle button (`theme-toggle-btn`) and associated Lucide icons (`Sun`, `Moon`) from `App.vue`.
- **State & Storage**: Remove `isDark`, `applyTheme`, `onThemeToggle`, and all `localStorage` theme-switching logic.
- **Root Element Configuration**: Permanently apply the `.p-dark` class and `data-theme="dark"` attribute to the root document (`<html>`) upon startup and in `index.html`.
- **PrimeVue Configuration**: Ensure PrimeVue is configured in `main.ts` with the Aura preset and active dark mode selector.

### 2.2 Dark-First CSS & Style Audit
- **CSS Token Consolidation**: Promote the dark obsidian palette directly into `:root` in `src/styles.css`.
- **Light Theme Decommissioning**: Deprecate and remove redundant light-mode CSS variable definitions and overrides.
- **Component Palette Audit**: Systematically audit all views, components, modals, and tables for hardcoded light backgrounds (`#ffffff`, `bg-white`, light border tints) and convert them to dark semantic tokens (`--surface`, `--glass-card-bg`, `--border`, `--muted`, `--text`).

### 2.3 Scroll-to-Top Navigation Reset
- **Router Configuration**: Implement `scrollBehavior` in Vue Router (`src/main.ts`) to return `{ top: 0, left: 0 }` on every route change.
- **Container Scroll Reset**: Ensure the `.workspace` container (and `window`/`document.documentElement`) resets scroll position to `(0, 0)` synchronously or on `router.afterEach`.

### 2.4 PrimeVue / PrimeUI Basic Adaptation
- **Form Inputs & Buttons**:
  - Replace raw inputs and buttons in major forms and toolbars (`ExpenseForm.vue`, `ItemEditor.vue`, filters, quick actions) with PrimeVue `Button`, `InputText`, `InputNumber`, `Textarea`, and `Select`.
- **Integrity Guarantee**:
  - Preserve all existing `v-model` bindings, event handlers, keyboard shortcuts, validation states, and accessibility attributes.
  - Maintain the existing visual layout, padding, and responsive drawer behavior.

---

## 3. Non-Functional Requirements
- **Visual Stability**: Prevent any flash of light mode (FOUC) during initial load or client hydration.
- **Accessibility & Contrast**: Ensure text contrast meets WCAG 2.2 AA standards across all dark surfaces.
- **Performance**: Zero regression in interaction speed, drawer opening performance, or memory footprint.
- **Test Integrity**: Maintain test suite pass rates across unit and component tests.

---

## 4. Acceptance Criteria
1. The app renders exclusively in dark mode from first paint, with no toggle button visible in the header.
2. Navigating to any view immediately resets page and workspace container scroll to the top.
3. All views, modals, cards, and inputs display consistent dark styling without unstyled white containers or illegible text.
4. Core input elements in `ExpenseForm` and filter toolbars use PrimeVue components seamlessly.
5. Automated test suite runs and passes cleanly.

---

## 5. Out of Scope
- Complete overhaul of custom SVG/Canvas charts (e.g. TrendChart, Donut charts) beyond palette and token alignment.
- Replacing the OCR worker or camera feed modals with PrimeVue widgets.
- Adding new feature workflows or modifying financial calculation logic.
