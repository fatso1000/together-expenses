import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTemplate } from "vue/compiler-sfc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const accountsOverviewPath = path.resolve(
  __dirname,
  "../src/components/AccountsOverview.vue",
);

test("AccountsOverview.vue places both deposit Drawers inside Card #content slot so PrimeVue Card renders them", () => {
  const source = fs.readFileSync(accountsOverviewPath, "utf-8");
  const templateMatch = source.match(/<template>([\s\S]*?)<\/template>\s*<script/);
  assert.ok(templateMatch, "AccountsOverview.vue must have a <template> block");

  const template = templateMatch[1];
  const contentSlotStart = template.indexOf("<template #content>");
  assert.notEqual(contentSlotStart, -1, "Card must define <template #content>");

  // Find the matching </template> for #content by tracking nested <template> tags
  let depth = 0;
  let contentSlotEnd = -1;
  const tagRegex = /<\/?template\b[^>]*>/g;
  tagRegex.lastIndex = contentSlotStart;
  for (let match = tagRegex.exec(template); match; match = tagRegex.exec(template)) {
    if (match[0].startsWith("</template")) {
      depth -= 1;
      if (depth === 0) {
        contentSlotEnd = match.index;
        break;
      }
    } else {
      depth += 1;
    }
  }
  assert.notEqual(contentSlotEnd, -1, "Card #content slot must have a closing </template>");

  const contentSlotMarkup = template.slice(contentSlotStart, contentSlotEnd);
  const depositDrawerIdx = contentSlotMarkup.indexOf('v-model:visible="showDepositModal"');
  const manageDrawerIdx = contentSlotMarkup.indexOf('v-model:visible="showManageDepositsModal"');

  assert.notEqual(
    depositDrawerIdx,
    -1,
    "Add/Edit deposit Drawer must be inside Card <template #content>",
  );
  assert.notEqual(
    manageDrawerIdx,
    -1,
    "Manage deposits Drawer must be inside Card <template #content>",
  );

  // Also ensure the template compiles cleanly without v-if/v-else pairing errors
  const compiled = compileTemplate({
    source: template,
    filename: accountsOverviewPath,
    id: "accounts-overview-test",
  });
  assert.equal(compiled.errors.length, 0, `Template compile errors: ${compiled.errors.join(", ")}`);

  // Ensure manageDepositsError Message does not sit between empty-state v-if and list v-else
  const emptyIdx = contentSlotMarkup.indexOf('v-if="!store.savingsRecords.length"');
  const errorIdx = contentSlotMarkup.indexOf('v-if="manageDepositsError"');
  const listIdx = contentSlotMarkup.indexOf("<ul v-else");
  assert.ok(
    errorIdx !== -1 && emptyIdx !== -1 && listIdx !== -1 && errorIdx < emptyIdx && emptyIdx < listIdx,
    "manageDepositsError Message must appear before the empty-state v-if / deposits list v-else pair",
  );
});
