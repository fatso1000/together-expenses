import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPrivateSyncLink,
  extractSyncKey,
  inspectSyncInput,
  maskSyncKey,
} from "../src/lib/sync-link.ts";

const VALID_KEY = "a".repeat(58) + "1234ef";

test("extractSyncKey accepts canonical /settings/data?connect= URLs", () => {
  const url = `https://expenses.example.com/#/settings/data?connect=${VALID_KEY}`;
  assert.equal(extractSyncKey(url), VALID_KEY);
});

test("extractSyncKey accepts legacy /settings?connect= URLs and query fragments", () => {
  assert.equal(
    extractSyncKey(`https://expenses.example.com/#/settings?connect=${VALID_KEY}`),
    VALID_KEY,
  );
  assert.equal(extractSyncKey(`?connect=${VALID_KEY}`), VALID_KEY);
  assert.equal(extractSyncKey(`connect=${VALID_KEY}`), VALID_KEY);
});

test("extractSyncKey accepts raw 64-char hex keys with whitespace and uppercase normalization", () => {
  assert.equal(
    extractSyncKey(`  ${VALID_KEY.toUpperCase()}  `),
    VALID_KEY,
  );
});

test("extractSyncKey rejects empty, truncated, or malformed values", () => {
  assert.equal(extractSyncKey(""), null);
  assert.equal(extractSyncKey("   "), null);
  assert.equal(extractSyncKey("abc123"), null);
  assert.equal(extractSyncKey("https://example.com/#/settings/data?connect=short"), null);
  assert.equal(extractSyncKey("z".repeat(64)), null);
});

test("buildPrivateSyncLink targets #/settings/data?connect=", () => {
  const link = buildPrivateSyncLink(VALID_KEY, "https://app.test", "/");
  assert.equal(link, `https://app.test/#/settings/data?connect=${VALID_KEY}`);
});

test("maskSyncKey hides secret prefix and keeps last 6 characters", () => {
  assert.equal(maskSyncKey(VALID_KEY), "••••1234ef");
  assert.equal(maskSyncKey(""), "");
});

test("inspectSyncInput reports empty, valid, and invalid states accurately", () => {
  assert.deepEqual(inspectSyncInput(""), {
    status: "empty",
    key: null,
    maskedKey: "",
  });

  assert.deepEqual(inspectSyncInput("not-a-valid-key"), {
    status: "invalid",
    key: null,
    maskedKey: "",
  });

  assert.deepEqual(
    inspectSyncInput(`https://app.test/#/settings/data?connect=${VALID_KEY}`),
    {
      status: "valid",
      key: VALID_KEY,
      maskedKey: "••••1234ef",
    },
  );
});
