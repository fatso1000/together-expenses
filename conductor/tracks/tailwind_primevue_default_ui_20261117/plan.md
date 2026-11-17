# Implementation Plan: Default UI Construction with Tailwind CSS 4 & PrimeVue

## Phase 1: Code Styleguides & Governance Testing (TDD Setup) [checkpoint: c4d2004]

- [x] Task: Create failing governance tests for UI architecture standards (c4d2004)
  - [x] Create `tests/tailwind-primevue-governance.test.ts` to validate that styleguides explicitly mandate Tailwind & PrimeVue and ban new custom CSS
  - [x] Run `npx tsx --test tests/tailwind-primevue-governance.test.ts` and confirm failure (Red Phase)
- [x] Task: Update styleguides and architectural documentation (c4d2004)
  - [x] Update `conductor/code_styleguides/vue.md` with explicit rules, anti-patterns, and code examples for Tailwind CSS 4 and PrimeVue 5 UI construction
  - [x] Synchronize `conductor/tech-stack.md` and `conductor/product-guidelines.md` to reinforce the standard
  - [x] Re-run governance test and confirm it passes (Green Phase)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (c4d2004)

## Phase 2: Settings Views Tailwind & PrimeVue Migration [checkpoint: 50c1fd4]

- [x] Task: Write failing tests for Settings views Tailwind and PrimeVue adoption (b47366c)
  - [x] Add assertions in `tests/tailwind-primevue-governance.test.ts` verifying that `AccountsSettings.vue`, `AiSettings.vue`, `DataSettings.vue`, and `Settings.vue` replace legacy custom classes with Tailwind utilities and PrimeVue components
  - [x] Run test to confirm failures on unmigrated components (Red Phase)
- [x] Task: Migrate `AccountsSettings.vue` and `DataSettings.vue` (50c1fd4)
  - [x] Refactor form layouts, buttons, and rate rows to Tailwind utility classes and PrimeVue `<Button>`
  - [x] Prune redundant custom scoped CSS blocks
  - [x] Verify component behavior and reactivity
- [x] Task: Migrate `AiSettings.vue` and `Settings.vue` Hub (50c1fd4)
  - [x] Refactor Ollama status banner, actions row, and form controls to Tailwind classes
  - [x] Refactor `Settings.vue` hub grid and card layouts to Tailwind utilities
  - [x] Prune obsolete custom scoped styles
  - [x] Re-run tests to confirm all Settings assertions pass (Green Phase)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (50c1fd4)

## Phase 3: Shared Container Cleanup & Styling Audit [checkpoint: 686e027]

- [x] Task: Write failing tests for legacy panel and container class pruning (8eb009e)
  - [x] Add test cases verifying that key view containers use Tailwind utilities instead of legacy `.panel` classes
  - [x] Run test to confirm failure (Red Phase)
- [x] Task: Refactor legacy container patterns and prune unused custom CSS (686e027)
  - [x] Audit `src/views/Dashboard.vue` and shared views for legacy styling
  - [x] Apply Tailwind utilities (`rounded-2xl`, `border`, `bg-[var(--surface)]`, `p-4`)
  - [x] Prune superseded rules from `src/styles.css`
  - [x] Re-run tests to confirm pass (Green Phase)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (686e027)

## Phase 4: Full Suite Verification & Build Validation [checkpoint: 5ce7d4f]

- [x] Task: Comprehensive test suite and build validation (5ce7d4f)
  - [x] Run full test suite: `npx tsx --test tests/*.test.ts`
  - [x] Run production build and typecheck: `pnpm run build`
  - [x] Verify zero regressions in visual presentation or component functionality
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (5ce7d4f)
