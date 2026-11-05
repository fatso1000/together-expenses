import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mainTsPath = path.resolve(__dirname, "../src/main.ts");
const appVuePath = path.resolve(__dirname, "../src/App.vue");

test("src/main.ts configures router scrollBehavior to reset coordinates to top on navigation", () => {
  const content = fs.readFileSync(mainTsPath, "utf-8");

  // scrollBehavior configuration must be present in createRouter
  assert.match(
    content,
    /scrollBehavior\s*\(/,
    "main.ts router must configure scrollBehavior"
  );
  assert.match(
    content,
    /top:\s*0/,
    "scrollBehavior must return top: 0"
  );
  assert.match(
    content,
    /left:\s*0/,
    "scrollBehavior must return left: 0"
  );
});

test("src/main.ts or App.vue ensures the workspace container scroll resets to (0, 0) on route change", () => {
  const mainContent = fs.readFileSync(mainTsPath, "utf-8");
  const appContent = fs.readFileSync(appVuePath, "utf-8");

  const hasWorkspaceReset =
    /workspace[^;{}]*scroll(Top\s*=\s*0|To\s*\(\s*0\s*,\s*0\s*\))/i.test(mainContent) ||
    /workspace[^;{}]*scroll(Top\s*=\s*0|To\s*\(\s*0\s*,\s*0\s*\))/i.test(appContent) ||
    /window\.scrollTo\(\s*0\s*,\s*0\s*\)/.test(mainContent) ||
    /window\.scrollTo\(\s*0\s*,\s*0\s*\)/.test(appContent);

  assert.ok(
    hasWorkspaceReset,
    "Either main.ts afterEach or App.vue watcher must reset scroll to (0,0) on navigation"
  );
});
