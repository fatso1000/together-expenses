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
import { useExpenses } from "@/stores/expenses";

const props = withDefaults(
  defineProps<{
    category: Category;
    size?: number;
  }>(),
  {
    size: 19,
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
  // Standard category name aliases
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
  if (definition.value?.icon && iconMap[definition.value.icon]) {
    return iconMap[definition.value.icon];
  }
  return iconMap[props.category] || Tag;
});

const iconStyle = computed(() => {
  if (definition.value?.color) {
    const hex = definition.value.color;
    return {
      backgroundColor: hex.startsWith("#") ? `${hex}20` : hex,
      color: hex,
    };
  }
  return undefined;
});
</script>

<template>
  <span
    class="category-icon"
    :data-category="category"
    :style="iconStyle"
  >
    <component :is="resolvedIcon" :size="size" aria-hidden="true" />
  </span>
</template>
