import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appVuePath = path.resolve(__dirname, "../src/App.vue");
const mainTsPath = path.resolve(__dirname, "../src/main.ts");
const settingsVuePath = path.resolve(__dirname, "../src/views/Settings.vue");
const settingsViewsDir = path.resolve(__dirname, "../src/views/settings");
const enLocalePath = path.resolve(__dirname, "../src/locales/en.json");
const esLocalePath = path.resolve(__dirname, "../src/locales/es.json");

test("App.vue imports SidebarGroupLabel and icons for settings sidebar navigation", () => {
  const content = fs.readFileSync(appVuePath, "utf-8");

  assert.match(
    content,
    /import\s+SidebarGroupLabel\s+from\s+["']primevue\/sidebargrouplabel["']/,
    "App.vue must import SidebarGroupLabel from primevue/sidebargrouplabel",
  );

  assert.match(
    content,
    /Wallet/,
    "App.vue must import Wallet icon for Accounts setting",
  );
  assert.match(
    content,
    /Tags/,
    "App.vue must import Tags icon for Categories setting",
  );
  assert.match(
    content,
    /CalendarClock/,
    "App.vue must import CalendarClock icon for Frequent Payments setting",
  );
  assert.match(
    content,
    /Bot/,
    "App.vue must import Bot icon for AI setting",
  );
  assert.match(
    content,
    /Database/,
    "App.vue must import Database icon for Data setting",
  );
});

test("App.vue defines settings navigation and renders Settings SidebarGroup with label", () => {
  const content = fs.readFileSync(appVuePath, "utf-8");

  assert.match(
    content,
    /const\s+settingsNavigation\s*=\s*computed/,
    "App.vue must define settingsNavigation computed property",
  );
  assert.match(
    content,
    /\/settings\/accounts/,
    "settingsNavigation must contain /settings/accounts",
  );
  assert.match(
    content,
    /\/settings\/categories/,
    "settingsNavigation must contain /settings/categories",
  );
  assert.match(
    content,
    /\/settings\/frequent/,
    "settingsNavigation must contain /settings/frequent",
  );
  assert.match(
    content,
    /\/settings\/ai/,
    "settingsNavigation must contain /settings/ai",
  );
  assert.match(
    content,
    /\/settings\/data/,
    "settingsNavigation must contain /settings/data",
  );

  assert.match(
    content,
    /<SidebarGroupLabel/,
    "App.vue template must render <SidebarGroupLabel>",
  );
  assert.match(
    content,
    /settingsNavigation/,
    "App.vue template must iterate over settingsNavigation",
  );
});

test("App.vue hides month and currency selectors across all /settings subroutes", () => {
  const content = fs.readFileSync(appVuePath, "utf-8");

  assert.match(
    content,
    /!route\.path\.startsWith\(["']\/settings["']\)/,
    "App.vue must suppress month and currency selectors on all /settings/* routes",
  );
});

test("App.vue sync link routes to /settings/data", () => {
  const content = fs.readFileSync(appVuePath, "utf-8");

  assert.match(
    content,
    /to=["']\/settings\/data["']/,
    "App.vue sync link must route to /settings/data",
  );
});

test("main.ts imports all settings views and registers routes with metadata", () => {
  const content = fs.readFileSync(mainTsPath, "utf-8");

  assert.match(
    content,
    /import\s+AccountsSettings\s+from\s+["']@\/views\/settings\/AccountsSettings\.vue["']/,
  );
  assert.match(
    content,
    /import\s+CategoriesSettings\s+from\s+["']@\/views\/settings\/CategoriesSettings\.vue["']/,
  );
  assert.match(
    content,
    /import\s+FrequentPaymentsSettings\s+from\s+["']@\/views\/settings\/FrequentPaymentsSettings\.vue["']/,
  );
  assert.match(
    content,
    /import\s+AiSettings\s+from\s+["']@\/views\/settings\/AiSettings\.vue["']/,
  );
  assert.match(
    content,
    /import\s+DataSettings\s+from\s+["']@\/views\/settings\/DataSettings\.vue["']/,
  );

  assert.match(content, /path:\s*["']\/settings["']/);
  assert.match(content, /path:\s*["']\/settings\/accounts["']/);
  assert.match(content, /path:\s*["']\/settings\/categories["']/);
  assert.match(content, /path:\s*["']\/settings\/frequent["']/);
  assert.match(content, /path:\s*["']\/settings\/ai["']/);
  assert.match(content, /path:\s*["']\/settings\/data["']/);
});

test("Settings view files exist in src/views/settings/", () => {
  const requiredFiles = [
    "AccountsSettings.vue",
    "CategoriesSettings.vue",
    "FrequentPaymentsSettings.vue",
    "AiSettings.vue",
    "DataSettings.vue",
  ];

  for (const file of requiredFiles) {
    const fullPath = path.join(settingsViewsDir, file);
    assert.ok(fs.existsSync(fullPath), `Expected ${file} to exist in src/views/settings/`);
    const fileContent = fs.readFileSync(fullPath, "utf-8");
    assert.ok(fileContent.length > 50, `${file} should not be empty`);
  }
});

test("Settings.vue acts as Settings Hub overview with cards linking to subpages", () => {
  const content = fs.readFileSync(settingsVuePath, "utf-8");

  assert.match(content, /\/settings\/accounts/);
  assert.match(content, /\/settings\/categories/);
  assert.match(content, /\/settings\/frequent/);
  assert.match(content, /\/settings\/ai/);
  assert.match(content, /\/settings\/data/);
  assert.match(content, /settings-hub/);
});

test("locales define navigation keys for settings group and subpages", () => {
  const en = JSON.parse(fs.readFileSync(enLocalePath, "utf-8"));
  const es = JSON.parse(fs.readFileSync(esLocalePath, "utf-8"));

  assert.ok(en.nav.settingsGroup, "en.nav.settingsGroup must be defined");
  assert.ok(en.nav.settingsAccounts, "en.nav.settingsAccounts must be defined");
  assert.ok(en.nav.settingsCategories, "en.nav.settingsCategories must be defined");
  assert.ok(en.nav.settingsFrequent, "en.nav.settingsFrequent must be defined");
  assert.ok(en.nav.settingsAi, "en.nav.settingsAi must be defined");
  assert.ok(en.nav.settingsData, "en.nav.settingsData must be defined");

  assert.ok(es.nav.settingsGroup, "es.nav.settingsGroup must be defined");
  assert.ok(es.nav.settingsAccounts, "es.nav.settingsAccounts must be defined");
  assert.ok(es.nav.settingsCategories, "es.nav.settingsCategories must be defined");
  assert.ok(es.nav.settingsFrequent, "es.nav.settingsFrequent must be defined");
  assert.ok(es.nav.settingsAi, "es.nav.settingsAi must be defined");
  assert.ok(es.nav.settingsData, "es.nav.settingsData must be defined");
});
