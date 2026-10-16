<script setup lang="ts">
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
} from "lucide-vue-next";
import type { Category } from "@/lib/types";
defineProps<{ category: Category }>();
const icons = {
  Groceries: ShoppingBasket,
  Petrol: Fuel,
  Shopping: ShoppingBag,
  Rent: House,
  Bills: Zap,
  Taxes: Landmark,
  "Eating out": Utensils,
  Health: HeartPulse,
  Travel: Plane,
  Other: Ellipsis,
};
</script>
<template>
  <span class="category-icon" :data-category="category"
    ><component :is="icons[category]" :size="19" aria-hidden="true"
  /></span>
</template>
