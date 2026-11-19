<template>
  <TotalCard v-bind="$props">
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <template v-if="$slots.subtitle" #subtitle>
      <slot name="subtitle" />
    </template>
    <template #content>
      <slot name="content">
        <slot />
      </slot>
    </template>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </TotalCard>
</template>

<script setup lang="ts">
import TotalCard, { type TotalCardProps } from "@/components/cards/TotalCard.vue";

defineProps<TotalCardProps>();
</script>
