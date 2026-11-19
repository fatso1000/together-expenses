<template>
  <Card
    class="highlighted total-card"
    :class="{ 'total-card--outlined': props.outlined }"
    :variant="props.outlined ? 'outlined' : undefined"
  >
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
  </Card>
</template>

<script setup lang="ts">
import Card from "primevue/card";

export interface TotalCardProps {
  /** Renders the outlined version of the total card. */
  outlined?: boolean;
}

const props = withDefaults(defineProps<TotalCardProps>(), {
  outlined: false,
});
</script>
