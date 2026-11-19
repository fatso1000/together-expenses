import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, "../src");
const componentPath = path.join(srcDir, "components/inputs/RectangleButton.vue");

test("RectangleButton component exists in src/components/inputs", () => {
  assert.equal(
    fs.existsSync(componentPath),
    true,
    "RectangleButton.vue should exist in src/components/inputs"
  );
});

test("RectangleButton imports and wraps PrimeVue Button component", () => {
  const content = fs.readFileSync(componentPath, "utf-8");

  assert.match(
    content,
    /from\s+["']primevue\/button["']/,
    "RectangleButton should import Button from 'primevue/button'"
  );
  assert.match(
    content,
    /<Button\b/,
    "RectangleButton template should render PrimeVue <Button"
  );
});

test("RectangleButton defines props for label, icon, and position", () => {
  const content = fs.readFileSync(componentPath, "utf-8");

  assert.match(content, /label\??:\s*string/);
  assert.match(content, /icon\??:\s*(Component|string|any)/);
  assert.match(content, /iconPos\??:/);
  assert.match(content, /defineProps</);
});

test("RectangleButton provides default and icon slots", () => {
  const content = fs.readFileSync(componentPath, "utf-8");

  assert.match(content, /<slot\s+name=["']icon["']>/);
  assert.match(content, /<slot>/);
});

test("RectangleButton enforces rectangular styling without pill radius", () => {
  const content = fs.readFileSync(componentPath, "utf-8");

  assert.match(
    content,
    /rectangle-button/,
    "RectangleButton should apply a rectangle-button class or style"
  );
  assert.equal(
    content.includes("rounded-full"),
    false,
    "RectangleButton should not default to rounded-full / pill shape"
  );
});

test("RectangleButton does not define animation or effect styles", () => {
  const content = fs.readFileSync(componentPath, "utf-8");

  assert.doesNotMatch(content, /transform:/);
  assert.doesNotMatch(content, /transition:\s*all/);
  assert.doesNotMatch(content, /box-shadow:/);
});
