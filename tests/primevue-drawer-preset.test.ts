import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Theme } from "@primeuix/themes";
import DrawerStyle from "primevue/drawer/style";
import { DrawerPreset, ExpensesTheme } from "../src/theme/preset.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const presetTsPath = path.resolve(__dirname, "../src/theme/preset.ts");
const mainTsPath = path.resolve(__dirname, "../src/main.ts");

test("src/theme/preset.ts defines PrimeVue Drawer modifications using definePreset on an external file", () => {
  const content = fs.readFileSync(presetTsPath, "utf-8");

  // Must import definePreset from @primeuix/themes
  assert.match(
    content,
    /import\s+.*?\bdefinePreset\b.*?from\s+["']@primeuix\/themes["']/,
    "preset.ts must import definePreset from @primeuix/themes"
  );

  // Must define preset with components.drawer.css
  assert.match(
    content,
    /components:\s*\{[\s\S]*?drawer:\s*\{[\s\S]*?css:\s*\(/,
    "preset.ts must configure drawer component css via definePreset"
  );
});

test("PrimeVue Drawer preset removes bottom, left, and right borders", () => {
  const content = fs.readFileSync(presetTsPath, "utf-8");

  assert.match(
    content,
    /border-bottom:\s*none/i,
    "Drawer preset must remove border-bottom"
  );
  assert.match(
    content,
    /border-left:\s*none/i,
    "Drawer preset must remove border-left"
  );
  assert.match(
    content,
    /border-right:\s*none/i,
    "Drawer preset must remove border-right"
  );
});

test("PrimeVue Drawer preset adds a border bottom for the header using theme border tokens", () => {
  const content = fs.readFileSync(presetTsPath, "utf-8");

  assert.match(
    content,
    /\.p-drawer-header\s*\{[\s\S]*?border-bottom:\s*1px\s+solid\s+\$\{dt\(["']drawer\.border\.color["']\)\}/,
    "Drawer preset must add border-bottom to .p-drawer-header using dt('drawer.border.color')"
  );
});

test("src/main.ts imports and incorporates DrawerPreset into PrimeVue theme", () => {
  const mainTs = fs.readFileSync(mainTsPath, "utf-8");

  assert.match(
    mainTs,
    /import\s+.*?\bDrawerPreset\b.*?from\s+["']@\/theme/i,
    "main.ts must import DrawerPreset from @/theme"
  );

  assert.match(
    mainTs,
    /\.\.\.DrawerPreset/,
    "main.ts must apply DrawerPreset into the PrimeVue preset"
  );
});

test("PrimeVue Theme engine compiles Drawer preset styles correctly", () => {
  Theme.setTheme({ preset: ExpensesTheme });
  const theme = DrawerStyle.getComponentTheme(undefined, Theme);

  assert.ok(theme.style, "Drawer component theme must generate style rules");
  assert.ok(
    theme.style.includes("border-bottom: none"),
    "Compiled style must contain border-bottom: none"
  );
  assert.ok(
    theme.style.includes("border-left: none"),
    "Compiled style must contain border-left: none"
  );
  assert.ok(
    theme.style.includes("border-right: none"),
    "Compiled style must contain border-right: none"
  );
  assert.ok(
    theme.style.includes(".p-drawer-header"),
    "Compiled style must target .p-drawer-header"
  );
  assert.ok(
    theme.style.includes("border-bottom: 1px solid var(--p-drawer-border-color)"),
    "Compiled style must resolve header border-bottom using var(--p-drawer-border-color)"
  );
});
