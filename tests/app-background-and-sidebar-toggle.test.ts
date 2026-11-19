import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appVuePath = path.resolve(__dirname, "../src/App.vue");
const enLocalePath = path.resolve(__dirname, "../src/locales/en.json");
const esLocalePath = path.resolve(__dirname, "../src/locales/es.json");

test("App.vue applies a subtle grey, light grey, green, and accent gradient background with a native SVG grain texture", () => {
  const content = fs.readFileSync(appVuePath, "utf-8");

  // Binds appBackgroundStyle to SidebarLayout
  assert.match(
    content,
    /<SidebarLayout[^>]*:style="appBackgroundStyle"/,
    "SidebarLayout must bind :style=\"appBackgroundStyle\"",
  );

  // Uses native tileable SVG feTurbulence fractalNoise grain data-URI
  assert.match(
    content,
    /feTurbulence\s+type='fractalNoise'[^"]*stitchTiles='stitch'/,
    "App.vue must define a native tileable SVG feTurbulence fractalNoise grain filter",
  );

  // Mixes grey, light grey, green (var(--green)), and accent (var(--accent)) colours in a subtle gradient
  assert.match(
    content,
    /var\(--green\)/,
    "appBackgroundStyle must incorporate var(--green)",
  );
  assert.match(
    content,
    /var\(--accent\)/,
    "appBackgroundStyle must incorporate var(--accent)",
  );
  assert.match(
    content,
    /radial-gradient/,
    "appBackgroundStyle must use native CSS radial-gradient layers",
  );
  assert.match(
    content,
    /linear-gradient/,
    "appBackgroundStyle must use a native CSS linear-gradient base degrade",
  );
});

test("App.vue provides a PrimeVue SidebarTrigger button to expand and shrink the sidebar", () => {
  const content = fs.readFileSync(appVuePath, "utf-8");
  const en = JSON.parse(fs.readFileSync(enLocalePath, "utf-8"));
  const es = JSON.parse(fs.readFileSync(esLocalePath, "utf-8"));

  assert.match(
    content,
    /import\s+SidebarTrigger\s+from\s+["']primevue\/sidebartrigger["']/,
    "App.vue must import SidebarTrigger from primevue/sidebartrigger",
  );

  assert.match(
    content,
    /<SidebarTrigger[^>]*target="menu-demo"/,
    "App.vue must render <SidebarTrigger target=\"menu-demo\">",
  );

  assert.match(
    content,
    /PanelLeftClose/,
    "App.vue must render PanelLeftClose icon when sidebar is expanded",
  );
  assert.match(
    content,
    /PanelLeftOpen/,
    "App.vue must render PanelLeftOpen icon when sidebar is shrunk",
  );

  assert.ok(en.nav.expandSidebar, "en.nav.expandSidebar must be defined");
  assert.ok(en.nav.collapseSidebar, "en.nav.collapseSidebar must be defined");
  assert.ok(es.nav.expandSidebar, "es.nav.expandSidebar must be defined");
  assert.ok(es.nav.collapseSidebar, "es.nav.collapseSidebar must be defined");
});
