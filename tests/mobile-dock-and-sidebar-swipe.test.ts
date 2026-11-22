import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateSidebarSwipeGesture } from "../src/composables/useSidebarSwipe.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appVuePath = path.resolve(__dirname, "../src/App.vue");
const dockVuePath = path.resolve(__dirname, "../src/components/MobileDockBar.vue");
const enLocalePath = path.resolve(__dirname, "../src/locales/en.json");
const esLocalePath = path.resolve(__dirname, "../src/locales/es.json");

test("evaluateSidebarSwipeGesture opens closed sidebar on rightward horizontal swipe", () => {
  const action = evaluateSidebarSwipeGesture({
    deltaX: 84,
    deltaY: 12,
    isOpen: false,
  });
  assert.equal(action, "open");
});

test("evaluateSidebarSwipeGesture closes open sidebar on leftward horizontal swipe", () => {
  const action = evaluateSidebarSwipeGesture({
    deltaX: -90,
    deltaY: -10,
    isOpen: true,
  });
  assert.equal(action, "close");
});

test("evaluateSidebarSwipeGesture ignores short swipes below threshold", () => {
  assert.equal(
    evaluateSidebarSwipeGesture({ deltaX: 35, deltaY: 0, isOpen: false }),
    "none",
  );
  assert.equal(
    evaluateSidebarSwipeGesture({ deltaX: -40, deltaY: 0, isOpen: true }),
    "none",
  );
});

test("evaluateSidebarSwipeGesture ignores vertical scrolling and steep diagonals", () => {
  assert.equal(
    evaluateSidebarSwipeGesture({ deltaX: 70, deltaY: 120, isOpen: false }),
    "none",
  );
  assert.equal(
    evaluateSidebarSwipeGesture({ deltaX: -70, deltaY: 65, isOpen: true }),
    "none",
  );
});

test("evaluateSidebarSwipeGesture is a no-op when swiping in the direction of current state", () => {
  assert.equal(
    evaluateSidebarSwipeGesture({ deltaX: 100, deltaY: 0, isOpen: true }),
    "none",
  );
  assert.equal(
    evaluateSidebarSwipeGesture({ deltaX: -100, deltaY: 0, isOpen: false }),
    "none",
  );
});

test("App.vue places desktop sidebar toggle inside SidebarHeader next to app icon and hamburger Menu on mobile", () => {
  const content = fs.readFileSync(appVuePath, "utf-8");

  const headerMatch = content.match(/<SidebarHeader>([\s\S]*?)<\/SidebarHeader>/);
  assert.ok(headerMatch, "App.vue must render <SidebarHeader>");
  const headerHtml = headerMatch[1];

  assert.match(headerHtml, /src="\/icon\.svg"/, "SidebarHeader must contain the app icon");
  assert.match(
    headerHtml,
    /<SidebarTrigger[^>]*v-if="!isMobile"[^>]*target="menu-demo"/,
    "Desktop SidebarTrigger must live inside SidebarHeader next to the app icon",
  );
  assert.match(headerHtml, /PanelLeftClose/, "Desktop toggle must use PanelLeftClose when open");
  assert.match(headerHtml, /PanelLeftOpen/, "Desktop toggle must use PanelLeftOpen when collapsed");

  const headingMatch = content.match(/<div[^>]*page-heading[\s\S]*?<\/h1>/);
  assert.ok(headingMatch, "App.vue must render .page-heading");
  const headingHtml = headingMatch[0];

  assert.match(
    headingHtml,
    /<SidebarTrigger[^>]*v-if="isMobile"[^>]*target="menu-demo"/,
    "Mobile SidebarTrigger must render in .page-heading when on mobile",
  );
  assert.match(
    headingHtml,
    /<Menu\b/,
    "Mobile SidebarTrigger must display the hamburger Menu icon",
  );
  assert.match(
    content,
    /import\s*\{[\s\S]*\bMenu\b[\s\S]*\}\s*from\s*["']lucide-vue-next["']/,
    "App.vue must import Menu icon from lucide-vue-next",
  );
});

test("App.vue wires MobileDockBar and useSidebarSwipe for mobile quick access and gestures", () => {
  const content = fs.readFileSync(appVuePath, "utf-8");

  assert.match(
    content,
    /import\s+MobileDockBar\s+from\s+["']@\/components\/MobileDockBar\.vue["']/,
    "App.vue must import MobileDockBar",
  );
  assert.match(
    content,
    /<MobileDockBar[^>]*v-if="isMobile"/,
    "App.vue must render MobileDockBar on mobile viewports",
  );
  assert.match(
    content,
    /import\s*\{\s*useSidebarSwipe\s*\}\s*from\s*["']@\/composables\/useSidebarSwipe["']/,
    "App.vue must import useSidebarSwipe composable",
  );
  assert.match(
    content,
    /useSidebarSwipe\s*\(/,
    "App.vue must invoke useSidebarSwipe",
  );
});

test("MobileDockBar.vue follows project conventions and exposes accessible navigation", () => {
  assert.ok(fs.existsSync(dockVuePath), "MobileDockBar.vue must exist");
  const content = fs.readFileSync(dockVuePath, "utf-8");

  assert.ok(
    content.indexOf("<template>") < content.indexOf("<script"),
    "MobileDockBar.vue must place <template> before <script>",
  );
  assert.match(content, /<nav\b/, "MobileDockBar.vue must use semantic <nav>");
  assert.match(content, /aria-current=/, "MobileDockBar.vue must expose aria-current on active link");
  assert.match(content, /data-testid="mobile-dock-bar"/, "MobileDockBar.vue must include data-testid");
  assert.doesNotMatch(content, /<style\b/, "MobileDockBar.vue must use Tailwind utilities without custom CSS");

  const en = JSON.parse(fs.readFileSync(enLocalePath, "utf-8"));
  const es = JSON.parse(fs.readFileSync(esLocalePath, "utf-8"));
  assert.ok(en.nav.mobileDockLabel, "en.nav.mobileDockLabel must be defined");
  assert.ok(es.nav.mobileDockLabel, "es.nav.mobileDockLabel must be defined");
});
