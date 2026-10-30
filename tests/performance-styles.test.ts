import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, "../src");
const stylesPath = path.join(srcDir, "styles.css");

test("performance styles: no heavy ambient fluid mesh or orb keyframes in styles.css", () => {
  const styles = fs.readFileSync(stylesPath, "utf-8");

  assert.equal(
    styles.includes(".ambient-fluid-mesh"),
    false,
    "styles.css should not define .ambient-fluid-mesh"
  );
  assert.equal(
    styles.includes(".fluid-orb"),
    false,
    "styles.css should not define .fluid-orb"
  );
  assert.equal(
    /floatOrb\d/.test(styles),
    false,
    "styles.css should not contain floatOrb keyframe animations"
  );
});

test("performance styles: no heavy backdrop-filter blurs in styles.css tokens", () => {
  const styles = fs.readFileSync(stylesPath, "utf-8");

  assert.equal(
    styles.includes("var(--glass-card-blur)"),
    false,
    "styles.css should not apply --glass-card-blur"
  );
  assert.equal(
    styles.includes("var(--glass-elevated-blur)"),
    false,
    "styles.css should not apply --glass-elevated-blur"
  );
  assert.equal(
    /--glass-(card|elevated)-blur:\s*blur\(/.test(styles),
    false,
    "styles.css should not define blur() filters on glass tokens"
  );
});

test("performance styles: drawer dialogs and backdrops do not use backdrop-filter", () => {
  const styles = fs.readFileSync(stylesPath, "utf-8");

  // Check expense drawer dialog rules
  const drawerRuleMatch = styles.match(/\.expense-drawer-dialog\s*\{([^}]+)\}/);
  if (drawerRuleMatch) {
    assert.equal(
      drawerRuleMatch[1].includes("backdrop-filter"),
      false,
      ".expense-drawer-dialog must not use backdrop-filter"
    );
  }

  // Check expense drawer backdrop
  const backdropMatch = styles.match(/\.expense-drawer-dialog::backdrop\s*\{([^}]+)\}/);
  if (backdropMatch) {
    assert.equal(
      backdropMatch[1].includes("backdrop-filter"),
      false,
      ".expense-drawer-dialog::backdrop must not use backdrop-filter"
    );
  }
});
