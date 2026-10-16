export function newSyncKey(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export function validSyncKey(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}
function bytes(value: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(
    value.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)),
  );
}
export async function databaseId(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes(secret));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
async function encryptionKey(secret: string) {
  if (!validSyncKey(secret)) throw new Error("The connection link is invalid.");
  return crypto.subtle.importKey("raw", bytes(secret), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
export async function encrypt(
  secret: string,
  value: unknown,
  recordId: string,
) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(secret);
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(recordId) },
    key,
    plaintext,
  );
  const payload = new Uint8Array(iv.length + ciphertext.byteLength);
  payload.set(iv);
  payload.set(new Uint8Array(ciphertext), iv.length);
  let binary = "";
  for (const byte of payload) binary += String.fromCharCode(byte);
  return btoa(binary);
}
export async function decrypt(
  secret: string,
  payload: string,
  recordId: string,
): Promise<unknown> {
  const binary = atob(payload);
  const data = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const key = await encryptionKey(secret);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: data.slice(0, 12),
      additionalData: new TextEncoder().encode(recordId),
    },
    key,
    data.slice(12),
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}
