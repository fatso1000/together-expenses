# Implementation Plan: Fix Performance Drop on Drawer Open & Remove Complex Animations

## Phase 1: Baseline Verification & Test Assertions [checkpoint: a904228]
- [x] Task: Baseline Test Suite Verification & Performance Assertions a904228
  - [x] Run existing unit tests (`pnpm test`) and E2E drawer specs (`pnpm test:e2e`) to verify healthy baseline.
  - [x] Add/update test assertions to verify that drawer and backdrop elements do not require `backdrop-filter` and that no animated fluid orbs are rendered.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) a904228

## Phase 2: Purge Ambient Fluid Shaders & Orb Animations [checkpoint: febfe62]
- [x] Task: Remove Ambient Mesh and Orb Animations from CSS & Templates febfe62
  - [x] Remove `.ambient-fluid-mesh`, `.fluid-orb`, and `@keyframes floatOrb*` from `together/src/styles.css`.
  - [x] Clean up redundant `--liquid-mesh-*` CSS variables in light and dark mode `:root`.
  - [x] Verify `App.vue` and `index.html` contain no orphaned mesh markup.
- [x] Task: Verify Orb Removal febfe62
  - [x] Run test suite to ensure clean build and no visual/structural regressions.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) febfe62

## Phase 3: Eliminate Heavy Backdrop Filters Across All Surfaces [checkpoint: 4c92d2a]
- [x] Task: Refactor Surface & Blur Tokens in `styles.css` 4c92d2a
  - [x] Replace `--glass-card-blur` and `--glass-elevated-blur` tokens with `none` and remove all `backdrop-filter` declarations.
  - [x] Adjust surface color tokens (`--glass-card-bg`, `--glass-elevated-bg`, `--surface-drawer`, etc.) to clean, solid/semi-opaque colors with high contrast for both light and dark themes.
- [x] Task: Purge Component-Level Backdrop Filters and Heavy Blurs 4c92d2a
  - [x] Update `ExpenseForm.vue`, `WeeklyLimit.vue`, `AccountsOverview.vue`, `FrequentPayments.vue`, `QuickCompare.vue`, and `BulkEntry.vue`.
  - [x] Set dialog and drawer backdrops (`::backdrop` and `.drawer-backdrop`) to flat `rgba(0, 0, 0, 0.45)` without blur filters.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) 4c92d2a

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
