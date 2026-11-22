<template>
  <nav
    :aria-label="label"
    data-testid="mobile-dock-bar"
    class="fixed inset-x-0 bottom-0 z-[14] px-2.5 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pointer-events-none"
  >
    <div
      class="pointer-events-auto mx-auto flex max-w-lg items-center justify-around gap-0.5 rounded-[24px] border border-white/14 bg-[var(--surface-drawer)]/95 px-1.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.65)] backdrop-blur-md"
    >
      <RouterLink
        v-for="item in items"
        :key="item.path"
        :to="item.path"
        :aria-label="item.label"
        :aria-current="isItemActive(item.path) ? 'page' : undefined"
        :class="getLinkClasses(item.path)"
      >
        <component
          :is="item.icon"
          :size="19"
          class="shrink-0 transition-transform duration-150"
          :class="isItemActive(item.path) ? 'scale-105' : ''"
        />
        <span class="text-[10px] font-medium leading-none tracking-tight truncate max-w-full">
          {{ item.label }}
        </span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import { RouterLink } from "vue-router";

export interface MobileDockItem {
  path: string;
  label: string;
  icon: Component;
}

const props = defineProps<{
  items: readonly MobileDockItem[];
  currentPath: string;
  label: string;
}>();

function isItemActive(path: string): boolean {
  if (path === "/settings") {
    return props.currentPath.startsWith("/settings");
  }
  return props.currentPath === path;
}

function getLinkClasses(path: string): string[] {
  const baseClasses = [
    "flex",
    "min-w-0",
    "flex-1",
    "flex-col",
    "items-center",
    "justify-center",
    "gap-1",
    "rounded-2xl",
    "px-1",
    "py-1.5",
    "min-h-[46px]",
    "no-underline",
    "transition-colors",
    "duration-150",
  ];

  if (isItemActive(path)) {
    return [
      ...baseClasses,
      "bg-[var(--success-bg)]",
      "text-[var(--accent)]",
      "shadow-[inset_0_0_0_1px_var(--success-border)]",
    ];
  }

  return [
    ...baseClasses,
    "text-[var(--text-muted)]",
    "hover:text-[var(--text-primary)]",
    "hover:bg-white/5",
  ];
}
</script>
