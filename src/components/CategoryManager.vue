<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Tag,
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
import { useExpenses, friendlyError } from "@/stores/expenses";
import type { CategoryDefinition } from "@/lib/types";
import CategoryIcon from "@/components/CategoryIcon.vue";

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
  { name: "Tag", label: "General", component: Tag },
  { name: "Smile", label: "Fun", component: Smile },
  { name: "Ellipsis", label: "Other", component: Ellipsis },
];

const curatedColors = [
  "#3b7a57", // Forest green
  "#75974e", // Olive / sage
  "#2b72a8", // Deep blue
  "#4a90e2", // Sky blue
  "#5c52a8", // Indigo
  "#8b7ba9", // Lavender
  "#b8436b", // Rose berry
  "#c0392b", // Crimson
  "#b6816b", // Terracotta
  "#b18b60", // Copper
  "#b49c4c", // Amber gold
  "#298d85", // Teal
  "#2c3e50", // Charcoal
  "#718469", // Gray-green
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
const customColor = ref("#3b7a57");
const error = ref("");
const busy = ref(false);
const removingId = ref("");

function startNew() {
  isCreating.value = true;
  editing.value = null;
  name.value = "";
  selectedIcon.value = "Tag";
  selectedColor.value = "#3b7a57";
  customColor.value = "#3b7a57";
  error.value = "";
}

function startEdit(cat: CategoryDefinition) {
  isCreating.value = false;
  editing.value = cat;
  name.value = cat.name;
  selectedIcon.value = cat.icon;
  selectedColor.value = cat.color;
  customColor.value = cat.color;
  error.value = "";
}

function cancelEdit() {
  isCreating.value = false;
  editing.value = null;
  name.value = "";
  error.value = "";
}

function onCustomColorChange(event: Event) {
  const hex = (event.target as HTMLInputElement).value;
  selectedColor.value = hex;
  customColor.value = hex;
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

  // Check if name conflicts with default categories (unless editing itself)
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

<template>
  <div class="category-manager">
    <div class="manager-header">
      <div>
        <h3>Manage Categories</h3>
        <p class="small muted">
          Personalize categories with custom icons and colors.
        </p>
      </div>
      <button
        v-if="!showEditor"
        class="secondary compact-btn"
        type="button"
        @click="startNew"
      >
        <Plus :size="16" />New category
      </button>
    </div>

    <!-- Category Editor Form -->
    <div v-if="showEditor" class="category-editor-panel">
      <h4>{{ editing ? "Edit category" : "New category" }}</h4>

      <form @submit.prevent="save">
        <label>
          Category name
          <input
            v-model="name"
            maxlength="50"
            placeholder="e.g. Gym & Fitness"
            required
            autofocus
          />
        </label>

        <!-- Live Preview -->
        <div class="category-preview-bar">
          <span class="preview-label">Live Preview:</span>
          <div class="preview-badge" :style="previewStyle">
            <CategoryIcon :category="name || 'Category'" :size="18" />
            <span>{{ name || "Category name" }}</span>
          </div>
        </div>

        <!-- Icon Picker -->
        <fieldset class="icon-picker">
          <legend>Choose Icon</legend>
          <div class="icon-grid">
            <button
              v-for="icon in availableIcons"
              :key="icon.name"
              type="button"
              class="icon-choice"
              :class="{ selected: selectedIcon === icon.name }"
              :aria-label="icon.label"
              :title="icon.label"
              @click="selectedIcon = icon.name"
            >
              <component :is="icon.component" :size="20" />
            </button>
          </div>
        </fieldset>

        <!-- Color Picker -->
        <fieldset class="color-picker">
          <legend>Choose Colour</legend>
          <div class="color-swatches">
            <button
              v-for="color in curatedColors"
              :key="color"
              type="button"
              class="color-swatch"
              :class="{ selected: selectedColor === color }"
              :style="{ backgroundColor: color }"
              :aria-label="`Color ${color}`"
              @click="selectedColor = color"
            >
              <Check v-if="selectedColor === color" :size="14" class="check-icon" />
            </button>
            <label class="custom-color-picker" title="Pick custom color">
              <span class="sr-only">Custom colour</span>
              <input
                type="color"
                :value="customColor"
                @input="onCustomColorChange"
              />
              <span class="custom-color-indicator" :style="{ backgroundColor: selectedColor }" />
            </label>
          </div>
        </fieldset>

        <p v-if="error" class="error-note" role="alert">{{ error }}</p>

        <div class="entry-actions">
          <button class="primary" :disabled="busy || !name.trim()">
            {{ busy ? "Saving…" : "Save category" }}
          </button>
          <button type="button" class="secondary" @click="cancelEdit">
            Cancel
          </button>
        </div>
      </form>
    </div>

    <!-- Category List -->
    <div class="categories-list">
      <div
        v-for="cat in store.categoryDefinitions"
        :key="cat.id"
        class="category-list-item"
        :class="{ 'is-custom': !cat.isDefault }"
      >
        <div class="cat-info">
          <CategoryIcon :category="cat.name" :size="20" />
          <div class="cat-details">
            <strong>{{ cat.name }}</strong>
            <span v-if="cat.isDefault" class="badge muted-badge">Preset</span>
            <span v-else class="badge custom-badge">Custom</span>
          </div>
        </div>

        <div v-if="!cat.isDefault" class="row-actions">
          <button
            class="icon-button"
            :aria-label="`Edit category ${cat.name}`"
            type="button"
            @click="startEdit(cat)"
          >
            <Pencil :size="16" />
          </button>
          <button
            class="icon-button"
            :aria-label="`Delete category ${cat.name}`"
            type="button"
            @click="removingId = cat.id"
          >
            <Trash2 :size="16" />
          </button>
        </div>

        <!-- Inline delete confirmation -->
        <div v-if="removingId === cat.id" class="inline-confirm full-width">
          <p class="small">
            Delete "{{ cat.name }}"? Past expenses with this category will stay intact.
          </p>
          <div class="confirm-actions">
            <button class="secondary compact-btn" type="button" @click="removingId = ''">
              Cancel
            </button>
            <button
              class="secondary danger compact-btn"
              type="button"
              :disabled="busy"
              @click="remove(cat.id)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-manager {
  display: grid;
  gap: 16px;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.manager-header h3 {
  font-size: 17px;
  font-weight: 700;
}

.compact-btn {
  padding: 8px 14px;
  font-size: 13px;
  min-height: auto;
}

.category-editor-panel {
  background: #f8faf9;
  border: 1px solid #e1e7e4;
  border-radius: 16px;
  padding: 16px;
  display: grid;
  gap: 14px;
}

.category-preview-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid #e4eae7;
  border-radius: 12px;
}

.preview-label {
  font-size: 12px;
  color: #6d7f78;
  font-weight: 500;
}

.preview-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.icon-picker legend,
.color-picker legend {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
  padding: 6px;
  background: #ffffff;
  border: 1px solid #e2e8e4;
  border-radius: 10px;
}

.icon-choice {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #4b6058;
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-choice:hover {
  background: #eff5f2;
}

.icon-choice.selected {
  background: #153d35;
  color: #ffffff;
  border-color: #153d35;
}

.color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease;
}

.color-swatch:hover {
  transform: scale(1.1);
}

.color-swatch.selected {
  border-color: #153d35;
  transform: scale(1.15);
  box-shadow: 0 0 0 2px #ffffff;
}

.color-swatch .check-icon {
  color: #ffffff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
}

.custom-color-picker {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 32px;
  cursor: pointer;
}

.custom-color-picker input[type="color"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.custom-color-indicator {
  display: block;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px dashed #97a8a1;
}

.categories-list {
  display: grid;
  gap: 8px;
}

.category-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid #e7ede9;
  border-radius: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.cat-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cat-details {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cat-details strong {
  font-size: 14px;
  font-weight: 600;
}

.badge {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 10px;
  font-weight: 500;
}

.muted-badge {
  background: #f0f3f1;
  color: #72847c;
}

.custom-badge {
  background: #e6f4ea;
  color: #1e7e40;
}

.full-width {
  width: 100%;
  margin-top: 8px;
}

.confirm-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
</style>
