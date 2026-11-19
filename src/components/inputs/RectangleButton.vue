<template>
  <Button
    :type="type"
    :severity="severity"
    :variant="variant"
    :size="size"
    :fluid="fluid"
    :disabled="disabled"
    :loading="loading"
    :class="buttonClasses"
    @click="handleClick"
  >
    <div
      class="rectangle-button__content inline-flex items-center justify-center gap-2"
      :class="layoutClass"
    >
      <!-- Icon rendered before label (left / top) -->
      <template v-if="iconPos === 'left' || iconPos === 'top'">
        <slot name="icon">
          <component
            :is="icon"
            v-if="isComponentIcon"
            :class="['rectangle-button__icon shrink-0', iconClass]"
            aria-hidden="true"
          />
          <i
            v-else-if="typeof icon === 'string'"
            :class="['rectangle-button__icon shrink-0', icon, iconClass]"
            aria-hidden="true"
          />
        </slot>
      </template>

      <!-- Label / Default slot -->
      <span v-if="$slots.default || label" class="rectangle-button__label">
        <slot>{{ label }}</slot>
      </span>

      <!-- Icon rendered after label (right / bottom) -->
      <template v-if="iconPos === 'right' || iconPos === 'bottom'">
        <slot name="icon">
          <component
            :is="icon"
            v-if="isComponentIcon"
            :class="['rectangle-button__icon shrink-0', iconClass]"
            aria-hidden="true"
          />
          <i
            v-else-if="typeof icon === 'string'"
            :class="['rectangle-button__icon shrink-0', icon, iconClass]"
            aria-hidden="true"
          />
        </slot>
      </template>
    </div>
  </Button>
</template>

<script setup lang="ts">
import { computed, type Component } from "vue";
import Button from "primevue/button";

export interface RectangleButtonProps {
  /** Optional button text label. */
  label?: string;
  /** Optional icon: either a Vue component (e.g. Lucide icon) or a CSS class string. */
  icon?: Component | string;
  /** Position of the icon relative to the label. Defaults to 'left'. */
  iconPos?: "left" | "right" | "top" | "bottom";
  /** Optional additional CSS class for the icon element. */
  iconClass?: string | Record<string, boolean> | Array<string | Record<string, boolean>>;
  /** Visual severity tone from PrimeVue presets. */
  severity?:
    | "primary"
    | "secondary"
    | "success"
    | "info"
    | "warn"
    | "help"
    | "danger"
    | "contrast";
  /** Style variant. */
  variant?: "outlined" | "text" | "link";
  /** Size variant. */
  size?: "small" | "large";
  /** Full width block button. */
  fluid?: boolean;
  /** Disabled state. */
  disabled?: boolean;
  /** Loading state with spinner. */
  loading?: boolean;
  /** HTML button element type. Defaults to 'button'. */
  type?: "button" | "submit" | "reset";
  /** Square footprint for icon-only rectangle buttons. */
  square?: boolean;
}

const props = withDefaults(defineProps<RectangleButtonProps>(), {
  label: undefined,
  icon: undefined,
  iconPos: "left",
  iconClass: undefined,
  severity: undefined,
  variant: undefined,
  size: undefined,
  fluid: false,
  disabled: false,
  loading: false,
  type: "button",
  square: false,
});

const emit = defineEmits<{
  (e: "click", event: MouseEvent): void;
}>();

const isComponentIcon = computed(() => {
  return (
    typeof props.icon === "object" ||
    typeof props.icon === "function"
  );
});

const layoutClass = computed(() => {
  switch (props.iconPos) {
    case "right":
      return "flex-row";
    case "top":
      return "flex-col";
    case "bottom":
      return "flex-col-reverse";
    case "left":
    default:
      return "flex-row";
  }
});

const buttonClasses = computed(() => {
  return [
    "rectangle-button",
    {
      "rectangle-button--square": props.square,
      "rectangle-button--fluid": props.fluid,
      "rectangle-button--vertical":
        props.iconPos === "top" || props.iconPos === "bottom",
      "w-full": props.fluid,
    },
  ];
});

function handleClick(event: MouseEvent) {
  if (props.disabled || props.loading) {
    event.preventDefault();
    return;
  }
  emit("click", event);
}
</script>

<style scoped>
.rectangle-button {
  /* Enforce rectangular shape with consistent subtle radius, avoiding pill rounding */
  border-radius: var(--radius-sm, 12px) !important;
  font-weight: 600;
}

.rectangle-button--vertical {
  min-height: 68px;
  padding: 12px 8px;
  font-size: 13px;
  line-height: 1.2;
}

@media (max-width: 640px) {
  .rectangle-button--vertical {
    min-height: 62px;
    padding: 10px 4px;
    font-size: 11.5px;
  }
}

.rectangle-button--square {
  padding: 0;
  width: 42px;
  height: 42px;
  aspect-ratio: 1 / 1;
}

.rectangle-button--fluid {
  width: 100%;
}

.rectangle-button__content {
  width: 100%;
}

.rectangle-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.rectangle-button__label {
  text-align: center;
  white-space: normal;
}
</style>
