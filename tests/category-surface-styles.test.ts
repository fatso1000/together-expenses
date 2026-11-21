import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_CATEGORY_COLOR,
  categorySurfaceStyle,
  resolveCategoryColor,
  withHexAlpha,
} from "../src/lib/category-style.ts";
import type { CategoryDefinition } from "../src/lib/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcRoot = path.resolve(__dirname, "../src");

const sampleDefinitions: CategoryDefinition[] = [
  { id: "groceries", name: "Groceries", icon: "ShoppingBasket", color: "#75974e", isDefault: true },
  { id: "gym", name: "Gym & Fitness", icon: "Dumbbell", color: "#298d85" },
];

test("withHexAlpha appends alpha to 6-digit hex and expands 3-digit hex", () => {
  assert.equal(withHexAlpha("#75974e", "22"), "#75974e22");
  assert.equal(withHexAlpha("#abc", "3d"), "#aabbcc3d");
  assert.equal(withHexAlpha("var(--muted-colour)", "22"), "var(--muted-colour)");
});

test("resolveCategoryColor matches case-insensitively and falls back to default", () => {
  assert.equal(resolveCategoryColor("groceries", sampleDefinitions), "#75974e");
  assert.equal(resolveCategoryColor("  Gym & Fitness ", sampleDefinitions), "#298d85");
  assert.equal(resolveCategoryColor("Unknown", sampleDefinitions), DEFAULT_CATEGORY_COLOR);
  assert.equal(resolveCategoryColor("", sampleDefinitions), DEFAULT_CATEGORY_COLOR);
});

test("categorySurfaceStyle tints card/button background and strengthens selected state", () => {
  const normal = categorySurfaceStyle("#75974e");
  assert.equal(normal.backgroundColor, "#75974e22");
  assert.equal(normal.borderColor, "#75974e4d");
  assert.equal(normal.boxShadow, undefined);

  const selected = categorySurfaceStyle("#75974e", { selected: true });
  assert.equal(selected.backgroundColor, "#75974e3d");
  assert.equal(selected.borderColor, "#75974ecc");
  assert.equal(selected.boxShadow, "0 0 0 2px #75974e55");
});

test("CategoryIcon supports bare mode without icon badge background", () => {
  const content = fs.readFileSync(
    path.join(srcRoot, "components/CategoryIcon.vue"),
    "utf-8",
  );
  assert.match(content, /bare\?:\s*boolean/);
  assert.match(content, /:class="bare\s*\?/);
  assert.match(content, /if\s*\(props\.bare\)/);
});

test("category cards and buttons apply categorySurfaceStyle to their container and use bare CategoryIcon", () => {
  const componentFiles = [
    "components/ExpenseForm.vue",
    "components/CategoryManager.vue",
    "components/CategoryBreakdown.vue",
    "components/WeeklyLimit.vue",
    "components/reports/BudgetVarianceChart.vue",
    "components/reports/CategoryDonutChart.vue",
    "components/onboarding/OnboardingCategoriesStep.vue",
    "components/onboarding/OnboardingBudgetStep.vue",
  ];

  for (const relPath of componentFiles) {
    const content = fs.readFileSync(path.join(srcRoot, relPath), "utf-8");
    assert.match(
      content,
      /categorySurfaceStyle\(/,
      `${relPath} must apply categorySurfaceStyle to category cards or buttons`,
    );
    assert.match(
      content,
      /<CategoryIcon\b[^>]*\bbare\b/,
      `${relPath} must render bare CategoryIcon without an icon background box`,
    );
  }
});
