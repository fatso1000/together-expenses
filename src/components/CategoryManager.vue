<template>
  <div class="grid gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-bold text-text m-0">{{ t("categories.managerTitle") }}</h3>
        <p class="text-xs text-muted m-0">
          {{ t("categories.subtitle") }}
        </p>
      </div>
      <Button
        v-if="!showEditor"
        severity="secondary"
        size="small"
        type="button"
        class="inline-flex items-center gap-1.5"
        @click="startNew"
      >
        <Plus :size="16" />
        <span>{{ t("categories.newCategory") }}</span>
      </Button>
    </div>

    <!-- Category Editor Form -->
    <div
      v-if="showEditor"
      class="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] grid gap-3.5"
    >
      <h4 class="text-sm font-bold text-text m-0">
        {{ editing ? t("categories.editCategory") : t("categories.newCategory") }}
      </h4>

      <form class="grid gap-4" @submit.prevent="save">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("categories.categoryName") }}</span>
          <InputText
            v-model="name"
            maxlength="50"
            placeholder="e.g. Gym & Fitness"
            required
            autofocus
            fluid
          />
        </label>

        <!-- Live Preview -->
        <div class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <span class="text-xs text-muted font-medium">{{ t("categories.previewLabel") }}</span>
          <div
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            :style="previewStyle"
          >
            <CategoryIcon :category="name || 'Category'" :size="18" />
            <span>{{ name || "Category name" }}</span>
          </div>
        </div>

        <!-- Icon Picker -->
        <fieldset class="border-0 p-0 m-0 grid gap-2">
          <legend class="text-xs font-semibold text-text mb-1">{{ t("categories.chooseIcon") }}</legend>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(42px,1fr))] gap-1.5 max-h-40 overflow-y-auto p-1.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border)]">
            <Button
              v-for="icon in availableIcons"
              :key="icon.name"
              type="button"
              :severity="selectedIcon === icon.name ? 'primary' : 'secondary'"
              :variant="selectedIcon === icon.name ? undefined : 'text'"
              class="w-10! h-10! p-0! flex items-center justify-center"
              :aria-label="icon.label"
              :title="icon.label"
              @click="selectedIcon = icon.name"
            >
              <component :is="icon.component" :size="20" />
            </Button>
          </div>
        </fieldset>

        <!-- Color Picker -->
        <fieldset class="border-0 p-0 m-0 grid gap-2">
          <legend class="text-xs font-semibold text-text mb-1">{{ t("categories.chooseColor") }}</legend>
          <div class="flex flex-wrap items-center gap-2">
            <Button
              v-for="color in curatedColors"
              :key="color"
              type="button"
              rounded
              class="w-8! h-8! p-0! flex items-center justify-center transition-transform"
              :class="selectedColor === color ? 'ring-2 ring-accent scale-110' : ''"
              :style="{ backgroundColor: color, borderColor: 'transparent' }"
              :aria-label="`Color ${color}`"
              @click="selectedColor = color"
            >
              <Check v-if="selectedColor === color" :size="14" class="text-white" />
            </Button>
            <div class="inline-flex items-center gap-1.5" :title="t('categories.customColour')">
              <ColorPicker v-model="pickerColor" format="hex" />
            </div>
          </div>
        </fieldset>

        <Message v-if="error" severity="error" :closable="false">
          {{ error }}
        </Message>

        <div class="flex flex-wrap items-center gap-3">
          <Button type="submit" severity="primary" :disabled="busy || !name.trim()">
            {{ busy ? t("common.saving") : t("categories.saveCategory") }}
          </Button>
          <Button type="button" severity="secondary" variant="outlined" @click="cancelEdit">
            {{ t("common.cancel") }}
          </Button>
        </div>
      </form>
    </div>

    <!-- Category List -->
    <div class="grid gap-2">
      <div
        v-for="cat in store.categoryDefinitions"
        :key="cat.id"
        class="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
      >
        <div class="flex items-center gap-3">
          <CategoryIcon :category="cat.name" :size="20" />
          <div class="flex items-center gap-2">
            <strong class="text-sm font-semibold text-text">
              {{ cat.isDefault ? categoryLabel(cat.name) : cat.name }}
            </strong>
            <Tag
              :value="cat.isDefault ? t('categories.preset') : t('categories.custom')"
              :severity="cat.isDefault ? 'secondary' : 'success'"
            />
          </div>
        </div>

        <div v-if="!cat.isDefault" class="flex items-center gap-1">
          <Button
            variant="text"
            severity="secondary"
            rounded
            size="small"
            :aria-label="`Edit category ${cat.name}`"
            type="button"
            @click="startEdit(cat)"
          >
            <Pencil :size="16" />
          </Button>
          <Button
            variant="text"
            severity="danger"
            rounded
            size="small"
            :aria-label="`Delete category ${cat.name}`"
            type="button"
            @click="removingId = cat.id"
          >
            <Trash2 :size="16" />
          </Button>
        </div>

        <!-- Inline delete confirmation -->
        <div
          v-if="removingId === cat.id"
          class="w-full mt-2 p-3 rounded-xl bg-[var(--pill-bg)] border border-[var(--border)] grid gap-2"
        >
          <p class="text-xs text-text m-0">
            {{ t("categories.confirmDelete", { name: cat.name }) }}
          </p>
          <div class="flex items-center gap-2">
            <Button
              severity="secondary"
              size="small"
              type="button"
              @click="removingId = ''"
            >
              {{ t("common.cancel") }}
            </Button>
            <Button
              severity="danger"
              size="small"
              type="button"
              :disabled="busy"
              @click="remove(cat.id)"
            >
              {{ t("common.delete") }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  Tag as TagIcon,
  ShoppingBasket,
  Fuel,
  ShoppingBag,
  House,
  Zap,
  Landmark,
  Utensils,
  HeartPulse,
  Plane,
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
  Ellipsis,
} from "lucide-vue-next";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import ColorPicker from "primevue/colorpicker";
import Tag from "primevue/tag";
import Message from "primevue/message";
import { useExpenses, friendlyError } from "@/stores/expenses";
import type { CategoryDefinition } from "@/lib/types";
import CategoryIcon from "@/components/CategoryIcon.vue";
import { t, categoryLabel } from "@/lib/i18n";

const emit = defineEmits<{
  close: [];
  created: [categoryName: string];
}>();

const store = useExpenses();

const availableIcons = [
  { name: "ShoppingBasket", label: "Basket", component: ShoppingBasket },
  { name: "Fuel", label: "Fuel", component: Fuel },
  { name: "ShoppingBag", label: "Shopping", component: ShoppingBag },
  { name: "House", label: "Home", component: House },
  { name: "Zap", label: "Utilities", component: Zap },
  { name: "Landmark", label: "Bank/Tax", component: Landmark },
  { name: "Utensils", label: "Dining", component: Utensils },
  { name: "Coffee", label: "Cafe", component: Coffee },
  { name: "HeartPulse", label: "Health", component: HeartPulse },
  { name: "Plane", label: "Travel", component: Plane },
  { name: "Car", label: "Transport", component: Car },
  { name: "Bus", label: "Transit", component: Bus },
  { name: "Film", label: "Cinema", component: Film },
  { name: "Tv", label: "Media", component: Tv },
  { name: "Music", label: "Music", component: Music },
  { name: "BookOpen", label: "Books", component: BookOpen },
  { name: "GraduationCap", label: "Education", component: GraduationCap },
  { name: "Sparkles", label: "Personal Care", component: Sparkles },
  { name: "Baby", label: "Kids", component: Baby },
  { name: "PawPrint", label: "Pets", component: PawPrint },
  { name: "Dumbbell", label: "Fitness", component: Dumbbell },
  { name: "Scissors", label: "Salon", component: Scissors },
  { name: "Gift", label: "Gifts", component: Gift },
  { name: "Briefcase", label: "Work", component: Briefcase },
  { name: "CreditCard", label: "Finance", component: CreditCard },
  { name: "Coins", label: "Savings", component: Coins },
  { name: "Wrench", label: "Repairs", component: Wrench },
  { name: "Shield", label: "Insurance", component: Shield },
  { name: "Smartphone", label: "Mobile", component: Smartphone },
  { name: "Shirt", label: "Apparel", component: Shirt },
  { name: "Package", label: "Delivery", component: Package },
  { name: "Tag", label: "General", component: TagIcon },
  { name: "Smile", label: "Fun", component: Smile },
  { name: "Ellipsis", label: "Other", component: Ellipsis },
];

const curatedColors = [
  "#3b7a57",
  "#75974e",
  "#2b72a8",
  "#4a90e2",
  "#5c52a8",
  "#8b7ba9",
  "#b8436b",
  "#c0392b",
  "#b6816b",
  "#b18b60",
  "#b49c4c",
  "#298d85",
  "#2c3e50",
  "#718469",
];

const props = defineProps<{
  startInCreateMode?: boolean;
}>();

const editing = ref<CategoryDefinition | null>(null);
const isCreating = ref(props.startInCreateMode ?? false);
const showEditor = computed(() => editing.value !== null || isCreating.value);
const name = ref("");
const selectedIcon = ref("Tag");
const selectedColor = ref("#3b7a57");
const error = ref("");
const busy = ref(false);
const removingId = ref("");

const pickerColor = computed<string>({
  get() {
    return selectedColor.value.replace(/^#/, "");
  },
  set(val: string) {
    if (!val) return;
    selectedColor.value = val.startsWith("#") ? val : `#${val}`;
  },
});

function startNew() {
  isCreating.value = true;
  editing.value = null;
  name.value = "";
  selectedIcon.value = "Tag";
  selectedColor.value = "#3b7a57";
  error.value = "";
}

function startEdit(cat: CategoryDefinition) {
  isCreating.value = false;
  editing.value = cat;
  name.value = cat.name;
  selectedIcon.value = cat.icon;
  selectedColor.value = cat.color;
  error.value = "";
}

function cancelEdit() {
  isCreating.value = false;
  editing.value = null;
  name.value = "";
  error.value = "";
}

const previewStyle = computed(() => ({
  backgroundColor: `${selectedColor.value}20`,
  color: selectedColor.value,
}));

async function save() {
  const trimmed = name.value.trim();
  if (!trimmed) {
    error.value = "Enter a category name.";
    return;
  }

  const isDefaultConflict = store.categoryDefinitions.some(
    (c) =>
      c.isDefault &&
      c.name.toLowerCase() === trimmed.toLowerCase() &&
      editing.value?.name.toLowerCase() !== trimmed.toLowerCase(),
  );
  if (isDefaultConflict) {
    error.value = `"${trimmed}" is already a default category.`;
    return;
  }

  busy.value = true;
  error.value = "";
  try {
    const payload: CategoryDefinition = {
      id: editing.value?.id || crypto.randomUUID(),
      name: trimmed,
      icon: selectedIcon.value,
      color: selectedColor.value,
    };
    await store.saveCategory(payload);
    emit("created", trimmed);
    cancelEdit();
  } catch (reason) {
    error.value = friendlyError(reason);
  } finally {
    busy.value = false;
  }
}

async function remove(id: string) {
  busy.value = true;
  error.value = "";
  try {
    await store.removeCategory(id);
    removingId.value = "";
  } catch (reason) {
    error.value = friendlyError(reason);
  } finally {
    busy.value = false;
  }
}
</script>
