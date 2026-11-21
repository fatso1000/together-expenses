<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-1">
        <div class="flex items-center gap-2.5">
          <Tags :size="20" class="text-accent shrink-0" />
          <h2 class="text-xl font-bold text-text m-0">
            {{ t("onboarding.categoriesTitle") }}
          </h2>
        </div>
        <p class="text-xs sm:text-sm text-muted m-0 leading-relaxed">
          {{ t("onboarding.categoriesSubtitle") }}
        </p>
      </div>

      <Button
        v-if="!showEditor"
        type="button"
        severity="secondary"
        size="small"
        class="inline-flex items-center gap-1.5 min-h-10"
        @click="startNew"
      >
        <Plus :size="15" />
        <span>{{ t("onboarding.categoriesAddCustom") }}</span>
      </Button>
    </div>

    <!-- Inline Custom Category Editor -->
    <div
      v-if="showEditor"
      class="rounded-2xl border border-[var(--border)] bg-black/25 p-4 space-y-4"
    >
      <h3 class="text-sm font-bold text-text m-0">
        {{ editingId ? t("categories.editCategory") : t("categories.newCategory") }}
      </h3>

      <div class="space-y-4">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <span>{{ t("categories.categoryName") }}</span>
          <InputText
            v-model="name"
            maxlength="50"
            placeholder="e.g. Gym & Fitness"
            fluid
          />
        </label>

        <!-- Live Preview -->
        <div class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <span class="text-xs text-muted font-medium">{{ t("categories.previewLabel") }}</span>
          <div
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold text-text"
            :style="previewStyle"
          >
            <CategoryIcon
              :category="name.trim() || 'Category'"
              :icon="selectedIcon"
              :color="selectedColor"
              :size="16"
              bare
            />
            <span>{{ name.trim() || "Category name" }}</span>
          </div>
        </div>

        <!-- Icon Picker -->
        <fieldset class="border-0 p-0 m-0 grid gap-2">
          <legend class="text-xs font-semibold text-text mb-1">
            {{ t("categories.chooseIcon") }}
          </legend>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border)]">
            <Button
              v-for="icon in categoryIconOptions"
              :key="icon.name"
              type="button"
              :severity="selectedIcon === icon.name ? 'primary' : 'secondary'"
              :variant="selectedIcon === icon.name ? undefined : 'text'"
              class="w-10! h-10! p-0! flex items-center justify-center"
              :aria-label="icon.label"
              :title="icon.label"
              @click="selectedIcon = icon.name"
            >
              <component :is="icon.component" :size="18" />
            </Button>
          </div>
        </fieldset>

        <!-- Color Picker -->
        <fieldset class="border-0 p-0 m-0 grid gap-2">
          <legend class="text-xs font-semibold text-text mb-1">
            {{ t("categories.chooseColor") }}
          </legend>
          <div class="flex flex-wrap items-center gap-2">
            <Button
              v-for="color in curatedCategoryColors"
              :key="color"
              type="button"
              rounded
              class="w-8! h-8! p-0! flex items-center justify-center"
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

        <Message v-if="formError" severity="error" :closable="false">
          {{ formError }}
        </Message>

        <div class="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            severity="primary"
            size="small"
            :disabled="!name.trim()"
            @click="saveCategory"
          >
            {{ t("categories.saveCategory") }}
          </Button>
          <Button
            type="button"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="cancelEdit"
          >
            {{ t("common.cancel") }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Staged Custom Categories -->
    <div class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-wider text-muted m-0">
        {{ t("onboarding.categoriesCustomLabel", { count: setup.customCategories.value.length }) }}
      </p>

      <div v-if="setup.customCategories.value.length" class="grid gap-2">
        <div
          v-for="cat in setup.customCategories.value"
          :key="cat.id"
          class="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border"
          :style="categorySurfaceStyle(cat.color)"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <CategoryIcon
              :category="cat.name"
              :icon="cat.icon"
              :color="cat.color"
              :size="18"
              bare
            />
            <strong class="text-sm font-semibold text-text truncate">{{ cat.name }}</strong>
            <Tag :value="t('categories.custom')" severity="success" />
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="text"
              severity="secondary"
              rounded
              size="small"
              :aria-label="`Edit ${cat.name}`"
              @click="startEdit(cat)"
            >
              <Pencil :size="15" />
            </Button>
            <Button
              type="button"
              variant="text"
              severity="danger"
              rounded
              size="small"
              :aria-label="`Remove ${cat.name}`"
              @click="setup.removeCustomCategory(cat.id)"
            >
              <Trash2 :size="15" />
            </Button>
          </div>
        </div>
      </div>
      <p v-else class="text-xs text-muted m-0">
        {{ t("onboarding.categoriesNoneCustom") }}
      </p>
    </div>

    <!-- Built-In Preset Categories Overview -->
    <div class="space-y-2 pt-1">
      <p class="text-xs font-semibold uppercase tracking-wider text-muted m-0">
        {{ t("onboarding.categoriesPresetsLabel") }}
      </p>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="cat in defaultCategoryDefinitions"
          :key="cat.id"
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium text-text"
          :style="categorySurfaceStyle(cat.color)"
        >
          <CategoryIcon :category="cat.name" :size="15" bare />
          <span>{{ categoryLabel(cat.name) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { Check, Pencil, Plus, Tags, Trash2 } from "lucide-vue-next";
import Button from "primevue/button";
import ColorPicker from "primevue/colorpicker";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Tag from "primevue/tag";
import CategoryIcon from "@/components/CategoryIcon.vue";
import { defaultCategoryDefinitions } from "@/stores/expenses";
import {
  categoryIconOptions,
  curatedCategoryColors,
} from "@/lib/category-presets";
import { categorySurfaceStyle } from "@/lib/category-style";
import { useI18n } from "@/lib/i18n";
import type { CategoryDefinition } from "@/lib/types";
import type { OnboardingSetupContext } from "@/composables/useOnboardingSetup";

const props = defineProps<{
  setup: OnboardingSetupContext;
}>();

const { t, categoryLabel } = useI18n();

const showEditor = shallowRef(false);
const editingId = shallowRef<string | null>(null);
const name = shallowRef("");
const selectedIcon = shallowRef("Tag");
const selectedColor = shallowRef("#3b7a57");
const formError = shallowRef("");

const pickerColor = computed<string>({
  get() {
    return selectedColor.value.replace(/^#/, "");
  },
  set(val: string) {
    if (!val) return;
    selectedColor.value = val.startsWith("#") ? val : `#${val}`;
  },
});

const previewStyle = computed(() => categorySurfaceStyle(selectedColor.value));

function startNew() {
  editingId.value = null;
  name.value = "";
  selectedIcon.value = "Tag";
  selectedColor.value = "#3b7a57";
  formError.value = "";
  showEditor.value = true;
}

function startEdit(cat: CategoryDefinition) {
  editingId.value = cat.id;
  name.value = cat.name;
  selectedIcon.value = cat.icon;
  selectedColor.value = cat.color;
  formError.value = "";
  showEditor.value = true;
}

function cancelEdit() {
  showEditor.value = false;
  editingId.value = null;
  name.value = "";
  formError.value = "";
}

function saveCategory() {
  const trimmed = name.value.trim();
  if (!trimmed) {
    formError.value = "Enter a category name.";
    return;
  }

  const lower = trimmed.toLowerCase();
  const isDefaultConflict = defaultCategoryDefinitions.some(
    (cat) => cat.name.toLowerCase() === lower,
  );
  if (isDefaultConflict) {
    formError.value = `"${trimmed}" is already a default category.`;
    return;
  }

  const isDuplicateCustom = props.setup.customCategories.value.some(
    (cat) => cat.name.toLowerCase() === lower && cat.id !== editingId.value,
  );
  if (isDuplicateCustom) {
    formError.value = `"${trimmed}" is already in your custom categories.`;
    return;
  }

  props.setup.saveCustomCategory({
    id: editingId.value || crypto.randomUUID(),
    name: trimmed,
    icon: selectedIcon.value,
    color: selectedColor.value,
  });

  cancelEdit();
}
</script>
