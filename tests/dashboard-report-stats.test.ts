import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, "../src");
const dashboardPath = path.join(srcDir, "views/Dashboard.vue");
const stylesPath = path.join(srcDir, "styles.css");
const totalCardComponentPath = path.join(srcDir, "components/cards/TotalCard.vue");

test("Dashboard.vue imports Card from primevue/card", () => {
  const content = fs.readFileSync(dashboardPath, "utf-8");

  assert.match(
    content,
    /import\s+Card\s+from\s+["']primevue\/card["']/,
    "Dashboard.vue should import Card from 'primevue/card'"
  );
});

test("Dashboard.vue removes custom legacy classes (report-stats, panel, muted, hero-number) from monthly summary section", () => {
  const content = fs.readFileSync(dashboardPath, "utf-8");

  const summarySectionMatch = content.match(
    /<section[^>]*:aria-label=["']t\(['"]dashboard\.monthlySummary['"]\)["'][^>]*>([\s\S]*?)<\/section>/
  );

  assert.ok(summarySectionMatch, "Dashboard.vue should contain section with monthlySummary aria-label");
  const summaryContent = summarySectionMatch[1];

  // Legacy container class should be removed in favor of Tailwind grid
  assert.doesNotMatch(
    summarySectionMatch[0],
    /class=["'][^"']*\breport-stats\b[^"']*["']/,
    "section should not use custom .report-stats class"
  );

  // Legacy panel class should be removed from cards
  assert.doesNotMatch(
    summaryContent,
    /class=["'][^"']*\bpanel\b[^"']*["']/,
    "Cards in monthly summary section should not use legacy .panel class"
  );

  // Legacy muted class should be removed
  assert.doesNotMatch(
    summaryContent,
    /class=["'][^"']*\bmuted\b[^"']*["']/,
    "Cards should not use legacy .muted class"
  );

  // Legacy hero-number class should be removed
  assert.doesNotMatch(
    summaryContent,
    /class=["'][^"']*\bhero-number\b[^"']*["']/,
    "Cards should not use legacy .hero-number class"
  );
});

test("Dashboard.vue renders a highlighted first card and normal PrimeVue cards for the other two", () => {
  const content = fs.readFileSync(dashboardPath, "utf-8");

  const summarySectionMatch = content.match(
    /<section[^>]*:aria-label=["']t\(['"]dashboard\.monthlySummary['"]\)["'][^>]*>([\s\S]*?)<\/section>/
  );

  assert.ok(summarySectionMatch, "Dashboard.vue should contain monthlySummary section");
  const summaryContent = summarySectionMatch[1];

  // 3 PrimeVue Card instances
  const cardMatches = summaryContent.match(/<Card\b/g);
  assert.equal(
    cardMatches?.length,
    3,
    "Summary section should render 3 PrimeVue <Card> instances"
  );

  // First card is highlighted
  assert.match(
    summaryContent,
    /<Card[^>]*class=["'][^"']*\bhighlighted\b[^"']*["']/,
    "First card should be a highlighted PrimeVue card"
  );

  // The other two cards are normal cards without custom classes
  const normalCardMatches = summaryContent.match(/<Card(?:\s*>|\s+[^>]*>)/g);
  const cardsWithoutCustomClasses = normalCardMatches?.filter(
    (tag) => !tag.includes("class=") || tag.includes('class=""')
  );
  assert.ok(
    (cardsWithoutCustomClasses?.length ?? 0) >= 2,
    "The other two cards should be normal PrimeVue cards without custom classes"
  );
});

test("Dashboard.vue uses PrimeVue slots (#subtitle and #content or #title) for card labels and metrics", () => {
  const content = fs.readFileSync(dashboardPath, "utf-8");

  const summarySectionMatch = content.match(
    /<section[^>]*:aria-label=["']t\(['"]dashboard\.monthlySummary['"]\)["'][^>]*>([\s\S]*?)<\/section>/
  );

  assert.ok(summarySectionMatch, "Dashboard.vue should contain monthlySummary section");
  const summaryContent = summarySectionMatch[1];

  // Should use #subtitle for labels
  const subtitleMatches = summaryContent.match(/#subtitle\b/g);
  assert.equal(
    subtitleMatches?.length,
    3,
    "All 3 cards should use #subtitle slot for their labels"
  );

  // Should use PrimeVue content or title slot for metric values
  assert.ok(
    /#content\b|#title\b/.test(summaryContent),
    "Cards should use PrimeVue #content or #title slot for metrics"
  );
});

test("styles.css defines PrimeVue version of highlighted / total-card styles", () => {
  const styles = fs.readFileSync(stylesPath, "utf-8");

  // PrimeVue Card selector for highlighted / total-card
  assert.match(
    styles,
    /\.p-card\.highlighted|\.p-card\.total-card/,
    "styles.css should define styles for .p-card.highlighted or .p-card.total-card"
  );

  // Body and content layout for highlighted card
  assert.match(
    styles,
    /(?:\.p-card\.highlighted|\.p-card\.total-card)\s+\.p-card-body/,
    "styles.css should define body padding/layout for highlighted card"
  );
});

test("styles.css defines an outlined version of the card", () => {
  const styles = fs.readFileSync(stylesPath, "utf-8");

  // Outlined card selectors
  assert.match(
    styles,
    /\.total-card--outlined|\.p-card\.highlighted\[variant="outlined"\]|\.p-card\.total-card\[variant="outlined"\]/,
    "styles.css should define outlined variant for highlighted card"
  );

  // Outlined styles should have transparent background and border
  const outlinedBlock = styles.match(
    /(?:\.p-card\.(?:highlighted|total-card)[^{]*\.total-card--outlined|\.total-card--outlined)[^{]*\{([^}]+)\}/s
  );
  assert.ok(outlinedBlock, "styles.css should contain an outlined card rule block");
  assert.match(outlinedBlock[1], /background:\s*transparent/);
  assert.match(outlinedBlock[1], /border:/);
});

test("styles.css defines a general outlined card version (.p-card--outlined or [variant='outlined'])", () => {
  const styles = fs.readFileSync(stylesPath, "utf-8");

  assert.match(
    styles,
    /\.p-card--outlined|\.p-card\[variant="outlined"\]/,
    "styles.css should define general outlined variant for PrimeVue cards"
  );
});

test("styles.css defines base PrimeVue card (.p-card) styles with a border lighter than the background", () => {
  const styles = fs.readFileSync(stylesPath, "utf-8");

  // Base PrimeVue .p-card rule
  assert.match(
    styles,
    /(?:^|\n)\.p-card\s*\{/,
    "styles.css should define base styles for .p-card"
  );

  const baseCardMatch = styles.match(/(?:^|\n)\.p-card\s*\{([^}]+)\}/);
  assert.ok(baseCardMatch, ".p-card rule block should exist in styles.css");
  assert.match(
    baseCardMatch[1],
    /border:\s*(?:var\(--glass-card-border\)|1px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.1[0-9]\))/,
    ".p-card should define a border property lighter than the background"
  );
});

test("TotalCard reusable component wraps PrimeVue Card with outlined support", () => {
  assert.equal(
    fs.existsSync(totalCardComponentPath),
    true,
    "TotalCard.vue should exist in src/components/cards"
  );

  const content = fs.readFileSync(totalCardComponentPath, "utf-8");

  // Imports PrimeVue Card
  assert.match(
    content,
    /import\s+Card\s+from\s+["']primevue\/card["']/,
    "TotalCard should import Card from 'primevue/card'"
  );

  // Outlined prop definition
  assert.match(
    content,
    /outlined\??:\s*boolean/,
    "TotalCard should define an outlined boolean prop"
  );
});
