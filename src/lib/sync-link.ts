import { validSyncKey } from "@/lib/encryption";

export type SyncInputStatus = "empty" | "valid" | "invalid";

export interface SyncInputInspection {
  status: SyncInputStatus;
  key: string | null;
  maskedKey: string;
}

/**
 * Extracts a 64-character lowercase hex sync key from:
 * - A full private connection URL (e.g. https://.../#/settings/data?connect=<key> or legacy #/settings?connect=<key>)
 * - A hash/query fragment (e.g. ?connect=<key> or connect=<key>)
 * - A raw 64-character hex sync key (trimmed and case-insensitive)
 */
export function extractSyncKey(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return null;
  }

  let candidate = trimmed;

  if (trimmed.includes("?") || trimmed.toLowerCase().startsWith("connect=")) {
    const queryPart = trimmed.includes("?")
      ? trimmed.slice(trimmed.lastIndexOf("?") + 1)
      : trimmed;
    const params = new URLSearchParams(queryPart);
    const paramKey = params.get("connect");
    candidate = paramKey ? paramKey.trim() : "";
  }

  const normalized = candidate.toLowerCase();
  return validSyncKey(normalized) ? normalized : null;
}

/**
 * Builds the canonical private connection link targeting the Data & Backup settings page.
 */
export function buildPrivateSyncLink(
  syncKey: string,
  origin: string,
  pathname: string,
): string {
  const normalizedPathname = pathname || "/";
  return `${origin}${normalizedPathname}#/settings/data?connect=${syncKey}`;
}

/**
 * Formats a compact visual fingerprint of a sync key without revealing the secret.
 */
export function maskSyncKey(syncKey: string): string {
  const normalized = syncKey.trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= 6) {
    return normalized;
  }
  return `••••${normalized.slice(-6)}`;
}

/**
 * Inspects user-entered link/key text to drive real-time validation feedback in the UI.
 */
export function inspectSyncInput(rawInput: string): SyncInputInspection {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      status: "empty",
      key: null,
      maskedKey: "",
    };
  }

  const key = extractSyncKey(trimmed);
  if (!key) {
    return {
      status: "invalid",
      key: null,
      maskedKey: "",
    };
  }

  return {
    status: "valid",
    key,
    maskedKey: maskSyncKey(key),
  };
}
