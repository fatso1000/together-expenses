import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stylesPath = path.resolve(__dirname, "../src/styles.css");
const mainTsPath = path.resolve(__dirname, "../src/main.ts");

test("styles.css configures Meiryo UI for normal text and Richmond Display for display titles", () => {
  const styles = fs.readFileSync(stylesPath, "utf-8");

  // Check Tailwind theme font definitions
  assert.match(
    styles,
    /--font-sans:\s*["']Meiryo UI["']/i,
    "styles.css @theme must define --font-sans with 'Meiryo UI'"
  );
  assert.match(
    styles,
    /--font-heading:\s*["']Richmond Display["']/i,
    "styles.css @theme must define --font-heading with 'Richmond Display'"
  );

  // Check :root font-family
  const rootBlock = styles.match(/:root[^{]*\{([^}]+)\}/);
  assert.ok(rootBlock, ":root rule must exist");
  assert.match(
    rootBlock[1],
    /font-family:\s*["']Meiryo UI["']/i,
    ":root must specify Meiryo UI as base font family"
  );

  // Check body font-family
  const bodyBlock = styles.match(/body\s*\{([^}]+)\}/);
  assert.ok(bodyBlock, "body rule must exist");
  assert.match(
    bodyBlock[1],
    /font-family:\s*["']Meiryo UI["']/i,
    "body must specify Meiryo UI as font family"
  );

  // Check display titles (h1, h2, h3, etc.)
  assert.match(
    styles,
    /h1,\s*h2,\s*h3[^;{}]*\{[^}]*font-family:\s*["']Richmond Display["']/i,
    "Display titles (h1, h2, h3) must use 'Richmond Display'"
  );
});

test("PrimeVue typography is adapted to Meiryo UI for components and Richmond Display for titles", () => {
  const mainTs = fs.readFileSync(mainTsPath, "utf-8");
  const styles = fs.readFileSync(stylesPath, "utf-8");

  // Check main.ts defines PrimeVue preset with Meiryo UI typography
  assert.match(
    mainTs,
    /definePreset\s*\(\s*Aura\s*,\s*\{[\s\S]*?typography:\s*\{[\s\S]*?fontFamily:\s*["'].*?Meiryo UI.*?["']/i,
    "main.ts must configure PrimeVue preset with Meiryo UI typography"
  );

  // Check styles.css PrimeVue component font-family overrides
  assert.match(
    styles,
    /\.p-component\s*\{[^}]*font-family:\s*["']Meiryo UI["']/i,
    "styles.css must set .p-component font-family to Meiryo UI"
  );
  assert.match(
    styles,
    /\.p-card-title[^;{}]*\{[^}]*font-family:\s*["']Richmond Display["']/i,
    "styles.css must set PrimeVue title components to Richmond Display"
  );
});
