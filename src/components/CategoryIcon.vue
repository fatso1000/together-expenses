<template>
  <span
    :class="bare ? 'inline-flex items-center justify-center shrink-0' : 'category-icon'"
    :data-category="category"
    :style="iconStyle"
  >
    <component :is="resolvedIcon" :size="size" aria-hidden="true" />
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  ShoppingBasket,
  Fuel,
  ShoppingBag,
  House,
  Zap,
  Landmark,
  Utensils,
  HeartPulse,
  Plane,
  Ellipsis,
  Film,
  BookOpen,
  Tv,
  Sparkles,
  Coffee,
  Baby,
  PawPrint,
  Dumbbell,
  Music,
  CreditCard,
  Tag,
  GraduationCap,
  Wrench,
  Smile,
  Gift,
  Car,
  Bus,
  Briefcase,
  Shield,
  Coins,
  Scissors,
  Smartphone,
  Shirt,
  Package,
} from "lucide-vue-next";
import type { Category } from "@/lib/types";
import { withHexAlpha } from "@/lib/category-style";
import { useExpenses } from "@/stores/expenses";

const props = withDefaults(
  defineProps<{
    category: Category;
    size?: number;
    bare?: boolean;
    icon?: string;
    color?: string;
  }>(),
  {
    size: 19,
    bare: false,
  },
);

const iconMap: Record<string, any> = {
  ShoppingBasket,
  Fuel,
  ShoppingBag,
  House,
  Zap,
  Landmark,
  Utensils,
  HeartPulse,
  Plane,
  Ellipsis,
  Film,
  BookOpen,
  Tv,
  Sparkles,
  Coffee,
  Baby,
  PawPrint,
  Dumbbell,
  Music,
  CreditCard,
  Tag,
  GraduationCap,
  Wrench,
  Smile,
  Gift,
  Car,
  Bus,
  Briefcase,
  Shield,
  Coins,
  Scissors,
  Smartphone,
  Shirt,
  Package,
  Groceries: ShoppingBasket,
  Petrol: Fuel,
  Shopping: ShoppingBag,
  Rent: House,
  Bills: Zap,
  Taxes: Landmark,
  "Eating out": Utensils,
  Health: HeartPulse,
  Travel: Plane,
  Entertainment: Film,
  Education: BookOpen,
  Subscriptions: Tv,
  "Personal Care": Sparkles,
  Other: Ellipsis,
};

const store = useExpenses();

const definition = computed(() => {
  return store.categoryDefinitions.find(
    (def) => def.name.toLowerCase() === (props.category || "").toLowerCase(),
  );
});

const resolvedIcon = computed(() => {
  if (props.icon && iconMap[props.icon]) {
    return iconMap[props.icon];
  }
  if (definition.value?.icon && iconMap[definition.value.icon]) {
    return iconMap[definition.value.icon];
  }
  return iconMap[props.category] || Tag;
});

const iconStyle = computed(() => {
  const hex = props.color || definition.value?.color;
  if (props.bare) {
    return hex ? { color: hex } : undefined;
  }
  if (hex) {
    return {
      backgroundColor: withHexAlpha(hex, "20"),
      color: hex,
    };
  }
  return undefined;
});
</script>
