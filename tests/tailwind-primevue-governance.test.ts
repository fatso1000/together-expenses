import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const styleguidePath = path.resolve(__dirname, "../conductor/code_styleguides/vue.md");
const techStackPath = path.resolve(__dirname, "../conductor/tech-stack.md");
const productGuidelinesPath = path.resolve(__dirname, "../conductor/product-guidelines.md");

test("vue code styleguide mandates Tailwind CSS 4 and PrimeVue for UI construction and bans new custom CSS", () => {
  assert.ok(fs.existsSync(styleguidePath), "conductor/code_styleguides/vue.md must exist");
  const content = fs.readFileSync(styleguidePath, "utf-8");

  assert.match(
    content,
    /Default UI Construction:\s*Tailwind CSS 4\s*&?\s*PrimeVue/i,
    "Styleguide must have a dedicated section for Default UI Construction with Tailwind CSS 4 and PrimeVue",
  );

  assert.match(
    content,
    /prohibit(ed)?\s*.*new\s+custom\s+css|do\s+not\s+(write|create)\s+new\s+custom\s+css/i,
    "Styleguide must explicitly forbid authoring new custom CSS selectors or classes",
  );

  assert.match(
    content,
    /PrimeVue\s+(components|library)/i,
    "Styleguide must mandate using PrimeVue components for buttons, inputs, panels, dialogs",
  );
});

test("tech-stack.md and product-guidelines.md establish Tailwind and PrimeVue as mandatory default UI standard", () => {
  const techStack = fs.readFileSync(techStackPath, "utf-8");
  const productGuidelines = fs.readFileSync(productGuidelinesPath, "utf-8");

  assert.match(
    techStack,
    /mandatory\s+default|default\s+UI\s+construction/i,
    "tech-stack.md must designate Tailwind & PrimeVue as mandatory default UI construction standard",
  );

  assert.match(
    productGuidelines,
    /Tailwind|PrimeVue/i,
    "product-guidelines.md must reference Tailwind and PrimeVue for UI construction",
  );
});

test("Settings views adopt Tailwind utility classes and PrimeVue Button components instead of custom CSS", () => {
  const accountsPath = path.resolve(__dirname, "../src/views/settings/AccountsSettings.vue");
  const dataPath = path.resolve(__dirname, "../src/views/settings/DataSettings.vue");
  const aiPath = path.resolve(__dirname, "../src/views/settings/AiSettings.vue");
  const settingsHubPath = path.resolve(__dirname, "../src/views/Settings.vue");

  const accountsContent = fs.readFileSync(accountsPath, "utf-8");
  const dataContent = fs.readFileSync(dataPath, "utf-8");
  const aiContent = fs.readFileSync(aiPath, "utf-8");
  const hubContent = fs.readFileSync(settingsHubPath, "utf-8");

  // AccountsSettings
  assert.match(accountsContent, /import\s+Button\s+from\s+["']primevue\/button["']/, "AccountsSettings must import PrimeVue Button");
  assert.match(accountsContent, /<Button\b[^>]*type="submit"/, "AccountsSettings must use PrimeVue Button for submit");
  assert.doesNotMatch(accountsContent, /class="[^"]*\baccounts-config-panel\b[^"]*"/, "AccountsSettings must not use legacy accounts-config-panel class");
  assert.doesNotMatch(accountsContent, /class="[^"]*\bform-pair\b[^"]*"/, "AccountsSettings must replace form-pair with Tailwind grid/flex");

  // DataSettings
  assert.match(dataContent, /import\s+Button\s+from\s+["']primevue\/button["']/, "DataSettings must import PrimeVue Button");
  assert.match(dataContent, /<Button\b[^>]*@click="backup"/, "DataSettings must use PrimeVue Button for backup action");
  assert.match(dataContent, /<Button\b[^>]*@click="clear"/, "DataSettings must use PrimeVue Button for clear action");

  // AiSettings
  assert.match(aiContent, /import\s+Button\s+from\s+["']primevue\/button["']/, "AiSettings must import PrimeVue Button");
  assert.match(aiContent, /<Button\b[^>]*@click="testOllama"/, "AiSettings must use PrimeVue Button for testOllama");
  assert.doesNotMatch(aiContent, /class="[^"]*\bollama-config-panel\b[^"]*"/, "AiSettings must not use legacy ollama-config-panel class");

  // Settings Hub
  assert.match(hubContent, /class="[^"]*\bgrid\b[^"]*"/, "Settings Hub must use Tailwind grid");
  assert.doesNotMatch(hubContent, /<style\s+scoped>/, "Settings Hub must use pure Tailwind utilities without custom scoped styles");
});

test("Dashboard.vue follows SFC block order and migrates containers to Tailwind utilities", () => {
  const dashboardPath = path.resolve(__dirname, "../src/views/Dashboard.vue");
  const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");

  // Strict SFC block order: <template> first
  const templateIdx = dashboardContent.indexOf("<template>");
  const scriptIdx = dashboardContent.indexOf("<script");
  assert.ok(templateIdx < scriptIdx, "Dashboard.vue must place <template> before <script>");

  // Legacy panel class removed from dashboard sections
  assert.doesNotMatch(
    dashboardContent,
    /<section[^>]*class="[^"]*\bpanel\b[^"]*"[^>]*>\s*<h2>\{\{\s*t\(['"]dashboard\.recentExpenses['"]\)/,
    "recentExpenses section should not use legacy .panel class",
  );
  assert.doesNotMatch(
    dashboardContent,
    /<section[^>]*class="[^"]*\bpanel\b[^"]*"[^>]*>\s*<h2>\{\{\s*t\(['"]dashboard\.byCategory['"]\)/,
    "byCategory section should not use legacy .panel class",
  );
  assert.doesNotMatch(
    dashboardContent,
    /<section[^>]*class="[^"]*\bpanel\b[^"]*"[^>]*>\s*<h2>\{\{\s*t\(['"]dashboard\.weeklySpending['"]\)/,
    "weeklySpending section should not use legacy .panel class",
  );

  // Scoped styles for alert removed in favor of Tailwind
  assert.doesNotMatch(
    dashboardContent,
    /\.compact-limit-alert\s*\{/,
    "Dashboard.vue should not use custom CSS for compact-limit-alert",
  );
});

function walkVueFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkVueFiles(fullPath));
    } else if (entry.name.endsWith(".vue")) {
      files.push(fullPath);
    }
  }
  return files;
}

test("all Vue SFCs in src/ place <template> before <script> and replace legacy native controls with PrimeVue components", () => {
  const srcDir = path.resolve(__dirname, "../src");
  const vueFiles = walkVueFiles(srcDir);
  assert.ok(vueFiles.length > 0, "Expected Vue SFC files in src/");

  for (const file of vueFiles) {
    const rel = path.relative(srcDir, file);
    const content = fs.readFileSync(file, "utf-8");

    const templateIdx = content.indexOf("<template>");
    const scriptIdx = content.indexOf("<script");
    assert.ok(
      templateIdx !== -1 && scriptIdx !== -1 && templateIdx < scriptIdx,
      `${rel} must place <template> before <script>`,
    );

    assert.doesNotMatch(
      content,
      /<button\b/,
      `${rel} must use PrimeVue <Button> instead of raw <button>`,
    );
    assert.doesNotMatch(
      content,
      /<select\b/,
      `${rel} must use PrimeVue <Select> instead of raw <select>`,
    );
    assert.doesNotMatch(
      content,
      /<textarea\b/,
      `${rel} must use PrimeVue <Textarea> instead of raw <textarea>`,
    );
    assert.doesNotMatch(
      content,
      /<dialog\b/,
      `${rel} must use PrimeVue <Drawer> or <Dialog> instead of raw <dialog>`,
    );

    const rawInputs = [...content.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]);
    const nonFileInputs = rawInputs.filter(
      (tag) => !/type=["']file["']/.test(tag),
    );
    assert.equal(
      nonFileInputs.length,
      0,
      `${rel} must not contain raw <input> elements (found: ${nonFileInputs.join(", ")})`,
    );
  }
});
