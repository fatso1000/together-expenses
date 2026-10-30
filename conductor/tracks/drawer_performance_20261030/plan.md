# Implementation Plan: Fix Performance Drop on Drawer Open & Remove Complex Animations

## Phase 1: Baseline Verification & Test Assertions
- [ ] Task: Baseline Test Suite Verification & Performance Assertions
  - [ ] Run existing unit tests (`pnpm test`) and E2E drawer specs (`pnpm test:e2e`) to verify healthy baseline.
  - [ ] Add/update test assertions to verify that drawer and backdrop elements do not require `backdrop-filter` and that no animated fluid orbs are rendered.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Purge Ambient Fluid Shaders & Orb Animations
- [ ] Task: Remove Ambient Mesh and Orb Animations from CSS & Templates
  - [ ] Remove `.ambient-fluid-mesh`, `.fluid-orb`, and `@keyframes floatOrb*` from `together/src/styles.css`.
  - [ ] Clean up redundant `--liquid-mesh-*` CSS variables in light and dark mode `:root`.
  - [ ] Verify `App.vue` and `index.html` contain no orphaned mesh markup.
- [ ] Task: Verify Orb Removal
  - [ ] Run test suite to ensure clean build and no visual/structural regressions.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Eliminate Heavy Backdrop Filters Across All Surfaces
- [ ] Task: Refactor Surface & Blur Tokens in `styles.css`
  - [ ] Replace `--glass-card-blur` and `--glass-elevated-blur` tokens with `none` and remove all `backdrop-filter` declarations.
  - [ ] Adjust surface color tokens (`--glass-card-bg`, `--glass-elevated-bg`, `--surface-drawer`, etc.) to clean, solid/semi-opaque colors with high contrast for both light and dark themes.
- [ ] Task: Purge Component-Level Backdrop Filters and Heavy Blurs
  - [ ] Update `ExpenseForm.vue`, `WeeklyLimit.vue`, `AccountsOverview.vue`, `FrequentPayments.vue`, `QuickCompare.vue`, and `BulkEntry.vue`.
  - [ ] Set dialog and drawer backdrops (`::backdrop` and `.drawer-backdrop`) to flat `rgba(0, 0, 0, 0.45)` without blur filters.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Optimize Drawer Opening Transitions
- [ ] Task: Streamline Drawer Animation & Hardware Acceleration
  - [ ] Optimize drawer `@keyframes slideUp` across all components to use lightweight single-pass `translateY` transforms with `will-change: transform`.
  - [ ] Simplify heavy multi-layered box-shadows on drawers to minimize rasterization costs during animation.
  - [ ] Verify drag handle responsiveness, body scrolling, and dialog accessibility attributes.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Verification & Full Regression Pass
- [ ] Task: Run Comprehensive Automated Test Suites
  - [ ] Run all unit tests (`pnpm test`) and confirm all tests pass.
  - [ ] Run all Playwright E2E tests (`pnpm test:e2e`) and confirm 100% pass rate.
  - [ ] Verify light mode and dark mode visual fidelity and 60fps drawer opening.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
