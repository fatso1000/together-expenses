# Implementation Plan: Default UI Construction with Tailwind CSS 4 & PrimeVue

## Phase 1: Code Styleguides & Governance Testing (TDD Setup)

- [ ] Task: Create failing governance tests for UI architecture standards
  - [ ] Create `tests/tailwind-primevue-governance.test.ts` to validate that styleguides explicitly mandate Tailwind & PrimeVue and ban new custom CSS
  - [ ] Run `npx tsx --test tests/tailwind-primevue-governance.test.ts` and confirm failure (Red Phase)
- [ ] Task: Update styleguides and architectural documentation
  - [ ] Update `conductor/code_styleguides/vue.md` with explicit rules, anti-patterns, and code examples for Tailwind CSS 4 and PrimeVue 5 UI construction
  - [ ] Synchronize `conductor/tech-stack.md` and `conductor/product-guidelines.md` to reinforce the standard
  - [ ] Re-run governance test and confirm it passes (Green Phase)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Settings Views Tailwind & PrimeVue Migration

- [ ] Task: Write failing tests for Settings views Tailwind and PrimeVue adoption
  - [ ] Add assertions in `tests/tailwind-primevue-governance.test.ts` verifying that `AccountsSettings.vue`, `AiSettings.vue`, `DataSettings.vue`, and `Settings.vue` replace legacy custom classes with Tailwind utilities and PrimeVue components
  - [ ] Run test to confirm failures on unmigrated components (Red Phase)
- [ ] Task: Migrate `AccountsSettings.vue` and `DataSettings.vue`
  - [ ] Refactor form layouts, buttons, and rate rows to Tailwind utility classes and PrimeVue `<Button>`
  - [ ] Prune redundant custom scoped CSS blocks
  - [ ] Verify component behavior and reactivity
- [ ] Task: Migrate `AiSettings.vue` and `Settings.vue` Hub
  - [ ] Refactor Ollama status banner, actions row, and form controls to Tailwind classes
  - [ ] Refactor `Settings.vue` hub grid and card layouts to Tailwind utilities
  - [ ] Prune obsolete custom scoped styles
  - [ ] Re-run tests to confirm all Settings assertions pass (Green Phase)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Shared Container Cleanup & Styling Audit

- [ ] Task: Write failing tests for legacy panel and container class pruning
  - [ ] Add test cases verifying that key view containers use Tailwind utilities instead of legacy `.panel` classes
  - [ ] Run test to confirm failure (Red Phase)
- [ ] Task: Refactor legacy container patterns and prune unused custom CSS
  - [ ] Audit `src/views/Dashboard.vue` and shared views for legacy styling
  - [ ] Apply Tailwind utilities (`rounded-2xl`, `border`, `bg-[var(--surface)]`, `p-4`)
  - [ ] Prune superseded rules from `src/styles.css`
  - [ ] Re-run tests to confirm pass (Green Phase)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Full Suite Verification & Build Validation

- [ ] Task: Comprehensive test suite and build validation
  - [ ] Run full test suite: `npx tsx --test tests/*.test.ts`
  - [ ] Run production build and typecheck: `pnpm run build`
  - [ ] Verify zero regressions in visual presentation or component functionality
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
