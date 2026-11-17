# Vue.js & Front-End Code Style Guide

This document outlines the standard coding practices and rules for Vue 3 SFCs, PrimeVue, and Tailwind CSS in this project.

## 1. Strict SFC Block Order Rule

In all `.vue` Single File Components, the top-level blocks **MUST** follow this exact order:

1. **`<template>`** (First)
2. **`<script setup lang="ts">`** (Second)
3. **`<style>`** (Third, if present, scoped)

### Correct Example:
```vue
<template>
  <div class="flex items-center justify-between p-4 bg-surface rounded-lg border border-border">
    <span class="text-sm text-muted font-medium">{{ title }}</span>
    <Button icon="pi pi-check" severity="success" size="small" @click="handleConfirm" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Button from "primevue/button";

const props = defineProps<{
  title: string;
}>();

const emit = defineEmits<{
  (e: "confirm"): void;
}>();

function handleConfirm(): void {
  emit("confirm");
}
</script>
```

### Prohibited Example:
Do **NOT** place `<script>` before `<template>`. Any PR or new component placing `<script>` above `<template>` violates this rule.

---

## 2. Vue 3 Composition API & `<script setup lang="ts">`

- **Always `<script setup lang="ts">`**: Never use the Options API.
- **Explicit Types**: Use TypeScript interfaces/types for props and emits:
  - `defineProps<{ ... }>()`
  - `defineEmits<{ ... }>()`
- **Minimal Local State**: Use `ref` for primitive values, `reactive` sparingly for grouped forms, and derive state using `computed` instead of redundant watchers or re-assignment.
- **Composables**: Extract stateful, asynchronous, or shared logic into `src/composables/use<Feature>.ts` or `src/lib/`.
- **Declarative Templates**: Avoid complex nested expressions or inline calculations in `<template>`; extract to `computed` properties.

---

## 3. PrimeVue & Dark Mode Architecture

- **PrimeVue 5 Components**: Use official PrimeVue components (`Button`, `DatePicker`, `Select`, `Dialog`, `Drawer`, etc.) styled with Aura theme presets.
- **Obsidian Dark-Mode Native**:
  - Always design for the dark palette by default: background `#0b1412`, card surface `#101c18` / `var(--surface)`, border `var(--border)`, emerald accent `var(--accent)` (`#38e2ab`).
  - Use `.p-dark` compatible semantic color tokens.
  - Avoid stark white backgrounds or light mode flickers.
- **PrimeIcons & Lucide**: Use Lucide icons (`lucide-vue-next`) for modern UI icons and `@primeicons/vue` where tightly coupled with PrimeVue props.

---

## 4. Tailwind CSS Utility Practices

- **Utility Classes**: Use Tailwind CSS utility classes for layout, flexbox, grid, spacing, and positioning.
- **Theme Color Tokens**: Use configured CSS variables (`bg-surface`, `text-muted`, `border-border`, `text-accent`) rather than arbitrary hex values to ensure dark-mode consistency.
- **Responsive & Ergonomic Layouts**: Mobile-first design; minimum touch target size of 44x44px for tap elements.
- **Sub-16ms Transitions**: Use native CSS transitions (`transition-colors duration-150`, `ease-out`) and avoid continuous GPU/CPU-taxing animations.

---

## 5. Front-End Component Boundaries & Quality

- **Component Granularity**:
  - Keep route view components (`src/views/*.vue`) as lightweight composition surfaces.
  - Break features into cohesive subcomponents (containers, forms, cards, list rows).
- **Accessibility (WCAG 2.2)**:
  - Always provide `aria-label` or accessible names for icon-only buttons.
  - Ensure visible keyboard `:focus-visible` styling with ring offsets.
  - Maintain readable color contrast against dark surfaces.

---

## 6. Default UI Construction: Tailwind CSS 4 & PrimeVue

- **Mandatory Default**: All new or refactored UI construction MUST use Tailwind CSS 4 utility classes and PrimeVue components.
- **Prohibited New Custom CSS**: You MUST NOT write or create new custom CSS classes, custom class blocks, or element selectors in `src/styles.css` or component `<style>` blocks. Any styling need that can be satisfied with Tailwind utility classes or PrimeVue theme tokens must not use custom CSS.
- **PrimeVue Component Adoption**: Always prefer official PrimeVue components (`Button`, `InputText`, `Select`, `DatePicker`, `Card`, `Panel`, `Dialog`, `Drawer`, `Badge`) over raw HTML equivalents.
- **Tailwind-First Layouts**: Construct containers, grids, flexboxes, margins, padding, and typography using Tailwind utilities:
  - Containers: `rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-sm`
  - Two-column responsive forms: `grid grid-cols-1 md:grid-cols-2 gap-4`
  - Header actions and toolbars: `flex items-center justify-between gap-3`
  - Action buttons: `<Button class="w-full sm:w-auto" severity="primary" ... />`

### Correct Pattern:
```vue
<template>
  <div class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
    <div class="flex items-center gap-3">
      <Wallet class="text-accent" :size="20" />
      <h2 class="text-lg font-bold text-text">{{ title }}</h2>
    </div>
    <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="submit">
      <div class="space-y-1">
        <label class="text-xs font-semibold uppercase tracking-wider text-muted">Amount</label>
        <InputText v-model="amount" class="w-full" placeholder="0.00" />
      </div>
      <div class="flex items-end">
        <Button type="submit" label="Save Changes" severity="primary" class="w-full" />
      </div>
    </form>
  </div>
</template>
```

### Prohibited Anti-Pattern:
```vue
<!-- DO NOT write bespoke custom CSS classes or scoped style blocks for standard layouts -->
<template>
  <div class="my-custom-box">
    <button class="my-custom-btn">Save</button>
  </div>
</template>

<style scoped>
.my-custom-box { display: flex; padding: 20px; background: #121212; }
.my-custom-btn { background: green; color: white; border-radius: 8px; }
</style>
```

