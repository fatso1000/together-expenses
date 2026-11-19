import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appVuePath = path.resolve(__dirname, "../src/App.vue");
const stylesPath = path.resolve(__dirname, "../src/styles.css");

test("App.vue configures sticky page heading with blurred background and border bottom", () => {
  const content = fs.readFileSync(appVuePath, "utf-8");

  // Locates the page-heading element
  const headingMatch = content.match(/<div[^>]*class="[^"]*page-heading[^"]*"[^>]*>/);
  assert.ok(headingMatch, "App.vue must contain a .page-heading element");

  const headingTag = headingMatch[0];
  assert.match(headingTag, /\bsticky\b/, "page-heading must have sticky class");
  assert.match(headingTag, /\btop-0\b/, "page-heading must stick to top-0");
  assert.match(headingTag, /\bbackdrop-blur/, "page-heading must have blurred background");
  assert.match(headingTag, /\bborder-b\b/, "page-heading must have border bottom");
  assert.doesNotMatch(headingTag, /\bmt-(?!0)\d+/, "page-heading must not have positive margin top class");
});

test("styles.css enforces sticky positioning, blur, border bottom, and zero margin top on .page-heading", () => {
  const styles = fs.readFileSync(stylesPath, "utf-8");

  const headingBlock = styles.match(/\.page-heading\s*\{([^}]+)\}/);
  assert.ok(headingBlock, "styles.css must define .page-heading");

  const css = headingBlock[1];
  assert.match(css, /position:\s*sticky/, ".page-heading must have position: sticky");
  assert.match(css, /top:\s*0/, ".page-heading must have top: 0");
  assert.match(css, /backdrop-filter:\s*blur/, ".page-heading must have backdrop-filter blur");
  assert.match(css, /border-bottom:/, ".page-heading must define border-bottom");
  assert.match(css, /margin-top:\s*0/, ".page-heading must have margin-top: 0");

  // Verify responsive media queries do not reintroduce margin-top
  const mediaHeadingMatches = styles.matchAll(/@media[^{]+\{[^}]*?\.page-heading\s*\{([^}]+)\}/g);
  for (const match of mediaHeadingMatches) {
    const mediaCss = match[1];
    assert.doesNotMatch(
      mediaCss,
      /margin:\s*[1-9]\d*px/,
      "Media queries must not reintroduce positive top margin on .page-heading"
    );
  }
});
