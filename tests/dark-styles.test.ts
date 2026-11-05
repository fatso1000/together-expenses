import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stylesCssPath = path.resolve(__dirname, "../src/styles.css");

test("src/styles.css establishes obsidian dark mode as native :root default", () => {
  const content = fs.readFileSync(stylesCssPath, "utf-8");

  // :root must define dark defaults directly
  assert.match(
    content,
    /:root[^{]*\{[^}]*background:\s*#0b1412/s,
    ":root must define dark background #0b1412"
  );
  assert.match(
    content,
    /:root[^{]*\{[^}]*color:\s*#e2ede8/s,
    ":root must define dark text color #e2ede8"
  );
  assert.match(
    content,
    /:root[^{]*\{[^}]*--glass-card-bg:\s*#14241f/s,
    ":root must define dark --glass-card-bg #14241f"
  );
  assert.match(
    content,
    /:root[^{]*\{[^}]*--glass-elevated-bg:\s*#182c26/s,
    ":root must define dark --glass-elevated-bg #182c26"
  );
  assert.match(
    content,
    /:root[^{]*\{[^}]*--input-bg:\s*#182c26/s,
    ":root must define dark --input-bg #182c26"
  );
  assert.match(
    content,
    /:root[^{]*\{[^}]*--pill-bg:\s*#1e362f/s,
    ":root must define dark --pill-bg #1e362f"
  );

  // Light defaults must not be present in :root
  assert.doesNotMatch(
    content,
    /:root[^{]*\{[^}]*background:\s*#f3f7f5/s,
    ":root must not contain light background #f3f7f5"
  );
  assert.doesNotMatch(
    content,
    /:root[^{]*\{[^}]*color:\s*#1e3a32/s,
    ":root must not contain light text #1e3a32"
  );
});

test("src/styles.css base component classes adopt dark styling directly", () => {
  const content = fs.readFileSync(stylesCssPath, "utf-8");

  // .total-card base class uses dark gradient
  assert.match(
    content,
    /\.total-card\s*\{[^}]*rgba\(16,\s*48,\s*40/s,
    ".total-card must have dark background gradient by default"
  );

  // Notes default to dark styling
  assert.match(
    content,
    /\.error-note\s*\{[^}]*rgba\(220,\s*38,\s*38/s,
    ".error-note must have dark styling by default"
  );
  assert.match(
    content,
    /\.success-note\s*\{[^}]*rgba\(34,\s*197,\s*94/s,
    ".success-note must have dark styling by default"
  );
});
