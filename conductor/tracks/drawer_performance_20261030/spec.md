# Specification: Fix Performance Drop on Drawer Open & Remove Complex Animations

## Overview
When opening the expense drawer (or other bottom drawers/modals like Quick Compare, Savings, Frequent Payments, Category Manager), users experience noticeable frame drops and rendering latency. This is caused by compounding GPU overhead from continuous ambient fluid mesh orb animations (with 85px Gaussian blurs), nested `backdrop-filter: blur(28px..40px)` multi-pass optical caustics, and blurred dialog backdrops during DOM mounting and slide-in transitions.

This track removes all 3D/complex animations, background canvas/mesh shaders, and heavy backdrop filters across the application, replacing them with performant, native HTML, CSS, Vue, and Tailwind styles. Drawer interactions will use lightweight, hardware-accelerated native CSS transitions over crisp, solid/semi-solid backdrops with zero frame drops (target 60fps).

## Functional Requirements
- **FR-1**: Strip all floating orb background elements (`.ambient-fluid-mesh`, `.fluid-orb`, `@keyframes floatOrb*`) and heavy continuous animation loops from `styles.css` and views.
- **FR-2**: Replace multi-pass `backdrop-filter` and `-webkit-backdrop-filter` chains (`blur(14px..40px)` and saturation filters) across the entire application (drawers, dialogs, cards, navigation bars, headers, toasts, pills) with crisp, accessible solid/semi-opaque surface colors in both light and dark modes.
- **FR-3**: Streamline drawer opening transitions (`ExpenseForm`, `AccountsOverview`, `WeeklyLimit`, `FrequentPayments`, `QuickCompare`, `BulkEntry`) to use lightweight, single-pass hardware-accelerated transforms (`translateY`) or native CSS transitions without composite blur calculations.
- **FR-4**: Update drawer/dialog backdrop overlays (`::backdrop` and `.drawer-backdrop`) to use clean semi-transparent color fills (`rgba(0, 0, 0, 0.45)`) with zero `backdrop-filter` blur.
- **FR-5**: Maintain all existing layout structures, form controls, responsive columns, drag handles, close buttons, accessibility roles/ARIA attributes, and business logic intact.
- **FR-6**: Verify dark mode visual parity using native CSS custom properties (`--surface-drawer`, `--surface-backdrop`, `--surface-card`, etc.) without visual regressions.

## Non-Functional & Performance Requirements
- **NFR-1 (Frame Rate)**: Drawer open/close transition must sustain 60fps without noticeable stutter or frame drops on low-to-mid-tier devices.
- **NFR-2 (GPU & CPU Consumption)**: Eliminate continuous idle GPU/CPU consumption caused by background `@keyframes` loops when the app or drawer is open.
- **NFR-3 (Standards & Tooling)**: Pure native HTML, CSS, Vue 3, and Tailwind utility styling; zero additional external animation or 3D dependencies.

## Acceptance Criteria
- [ ] Opening any drawer (Expense Form, Quick Compare, Salary/Budget, Savings, Frequent Payments) does not drop frames or lag the UI.
- [ ] No `backdrop-filter` or `-webkit-backdrop-filter` remain on drawers, backdrops, or main content cards.
- [ ] Floating fluid mesh orb styles and animations are completely removed from `styles.css`.
- [ ] Dark mode toggle continues to work cleanly with clear contrast, crisp borders, and accessible colors.
- [ ] All existing automated unit tests (`pnpm test`) pass with 0 errors.
- [ ] All Playwright E2E tests (`pnpm test:e2e`) pass with 0 errors, specifically drawer open/close and navigation specs.

## Out of Scope
- Architectural changes to Pinia stores or backend Firebase synchronization.
- Changing expense data schema, calculations, currency conversions, or Tesseract OCR pipelines.
- Redesigning form fields, input validations, or business logic.
