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
