import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appVuePath = path.resolve(__dirname, "../src/App.vue");
const indexHtmlPath = path.resolve(__dirname, "../index.html");
const mainTsPath = path.resolve(__dirname, "../src/main.ts");

test("App.vue has completely removed light/dark theme toggle logic and controls", () => {
  const content = fs.readFileSync(appVuePath, "utf-8");

  // No theme toggle button in template
  assert.doesNotMatch(
    content,
    /theme-toggle-btn/,
    "App.vue must not render a theme toggle button"
  );
  assert.doesNotMatch(
    content,
    /@click="onThemeToggle"/,
    "App.vue must not have an onThemeToggle handler"
  );

  // No Sun or Moon icons imported
  assert.doesNotMatch(
    content,
    /\bSun\b/,
    "App.vue must not import or reference the Sun icon"
  );
  assert.doesNotMatch(
    content,
    /\bMoon\b/,
    "App.vue must not import or reference the Moon icon"
  );

  // No dynamic isDark / applyTheme functions or localStorage theme switching
  assert.doesNotMatch(
    content,
    /\bisDark\b/,
    "App.vue must not track isDark ref"
  );
  assert.doesNotMatch(
    content,
    /function\s+applyTheme\b/,
    "App.vue must not define applyTheme function"
  );
  assert.doesNotMatch(
    content,
    /function\s+onThemeToggle\b/,
    "App.vue must not define onThemeToggle function"
  );
  assert.doesNotMatch(
    content,
    /expenses-theme/,
    "App.vue must not get or set expenses-theme in localStorage"
  );
});

test("index.html permanently enforces dark mode and PrimeVue p-dark class on root element", () => {
  const content = fs.readFileSync(indexHtmlPath, "utf-8");

  // HTML root element must have p-dark class and data-theme="dark"
  assert.match(
    content,
    /<html\b[^>]*\bclass="[^"]*\bp-dark\b[^"]*"/,
    "index.html <html> must include 'p-dark' class"
  );
  assert.match(
    content,
    /<html\b[^>]*\bdata-theme="dark"/,
    "index.html <html> must include data-theme='dark'"
  );
});

test("src/main.ts configures PrimeVue theme with Aura and dark mode selector", () => {
  const content = fs.readFileSync(mainTsPath, "utf-8");

  assert.match(
    content,
    /import\s+PrimeVue\s+from\s+["']primevue\/config["']/,
    "main.ts must import PrimeVue"
  );
  assert.match(
    content,
    /import\s+Aura\s+from\s+["']@primeuix\/themes\/aura["']/,
    "main.ts must import Aura preset"
  );
  assert.match(
    content,
    /darkModeSelector:\s*["']\.p-dark["']/,
    "main.ts must configure darkModeSelector as '.p-dark'"
  );
});
