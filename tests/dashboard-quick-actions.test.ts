import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashboardPath = path.resolve(__dirname, "../src/views/Dashboard.vue");

const stylesPath = path.resolve(__dirname, "../src/styles.css");
const rectangleButtonPath = path.resolve(
  __dirname,
  "../src/components/inputs/RectangleButton.vue"
);

test("styles.css removes all quick-entry-actions styles", () => {
  const styles = fs.readFileSync(stylesPath, "utf-8");

  assert.equal(
    styles.includes(".quick-entry-actions"),
    false,
    "styles.css should not define .quick-entry-actions"
  );
});

test("Dashboard.vue imports RectangleButton component", () => {
  const content = fs.readFileSync(dashboardPath, "utf-8");

  assert.match(
    content,
    /import\s+RectangleButton\s+from\s+["']@\/components\/inputs\/RectangleButton\.vue["']/,
    "Dashboard.vue should import RectangleButton from '@/components/inputs/RectangleButton.vue'"
  );
});

test("Dashboard.vue replaces quick-entry-actions class with Tailwind utility classes", () => {
  const content = fs.readFileSync(dashboardPath, "utf-8");

  // Legacy class should not be used on container
  assert.doesNotMatch(
    content,
    /class=["'][^"']*quick-entry-actions[^"']*["']/,
    "Dashboard.vue should not use quick-entry-actions class"
  );

  // Tailwind grid classes should be present
  assert.match(
    content,
    /grid\s+grid-cols-3/,
    "Dashboard.vue should use Tailwind grid grid-cols-3"
  );
  assert.match(
    content,
    /gap-2\s+sm:gap-2\.5/,
    "Dashboard.vue should use responsive gap utilities"
  );
  assert.match(
    content,
    /mb-5/,
    "Dashboard.vue should use Tailwind margin bottom utility"
  );
});

test("RectangleButton.vue encapsulates base styling for vertical shape and touch targets without animations or effects", () => {
  const content = fs.readFileSync(rectangleButtonPath, "utf-8");

  // Enforces vertical class and styling
  assert.match(content, /rectangle-button--vertical/);
  assert.match(content, /min-height:\s*68px/);
  assert.match(content, /min-height:\s*62px/);
  assert.match(content, /padding:\s*12px\s+8px/);

  // Animations and effects should be removed
  assert.doesNotMatch(content, /transform:\s*translateY/);
  assert.doesNotMatch(content, /transform:\s*scale/);
  assert.doesNotMatch(content, /box-shadow/);
  assert.doesNotMatch(content, /transition:\s*all/);
});

test("Dashboard.vue configures severities (secondary, secondary, primary) and action handlers", () => {
  const content = fs.readFileSync(dashboardPath, "utf-8");

  // Three RectangleButtons rendered
  const matches = content.match(/<RectangleButton\b/g);
  assert.equal(matches?.length, 3, "Dashboard.vue should render 3 RectangleButton instances");

  // Should configure iconPos="top" and fluid
  assert.match(
    content,
    /iconPos="top"/,
    "RectangleButton should configure iconPos='top' to stack icon and label vertically"
  );
  assert.match(
    content,
    /\bfluid\b/,
    "RectangleButton should configure fluid prop for full column width"
  );

  // Severities must be secondary, secondary, primary
  const severityMatches = [...content.matchAll(/severity=["'](primary|secondary)["']/g)].map(
    (m) => m[1]
  );
  assert.deepEqual(
    severityMatches,
    ["secondary", "secondary", "primary"],
    "Severities must be configured in order: secondary, secondary, primary"
  );

  // Should bind store.openExpense modes
  assert.match(content, /@click="store\.openExpense\('quick'\)"/);
  assert.match(content, /@click="store\.openExpense\('items'\)"/);
  assert.match(content, /@click="store\.openExpense\('receipt'\)"/);
});
