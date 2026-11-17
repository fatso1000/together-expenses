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
