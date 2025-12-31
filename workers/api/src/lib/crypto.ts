// workers/api/src/lib/crypto.ts
//
// Works in Cloudflare Workers + modern browsers.
//
// Provides:
//  - generateId()
//  - generateToken()
//  - hashToken() / sha256Hex()
//  - encryptAES() / decryptAES() using PBKDF2 + AES-GCM

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// PBKDF2 + AES-GCM params
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH: AlgorithmIdentifier = "SHA-256";
const SALT_LEN = 16; // bytes
const IV_LEN = 12; // bytes (AES-GCM standard)

/**
 * Create a random ID.
 * Example: generateId("tok") => "tok_2f6c9c0a6f0e4d0ea6e7c0d0c8b7a1d3"
 */
export function generateId(prefix = "id"): string {
  const uuid = crypto.randomUUID().replace(/-/g, "");
  return `${prefix}_${uuid}`;
}

/**
 * Generate a random API token (base64url, no padding).
 */
export function generateToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return toBase64Url(buf);
}

/**
 * Hash a token with SHA-256 and return hex.
 * (Useful to store in DB instead of the raw token.)
 */
export async function hashToken(token: string): Promise<string> {
  return sha256Hex(token);
}

/**
 * SHA-256 hex helper.
 */
export async function sha256Hex(input: string): Promise<string> {
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

/**
 * Encrypt plaintext using AES-GCM.
 *
 * Output format (base64):
 *   [salt (16 bytes)] [iv (12 bytes)] [ciphertext (... bytes)]
 *
 * encryptionKey is a passphrase/secret (ENV.ENCRYPTION_KEY).
 */
export async function encryptAES(
  plaintext: string,
  encryptionKey: string
): Promise<string> {
  const salt = new Uint8Array(SALT_LEN);
  crypto.getRandomValues(salt);

  const iv = new Uint8Array(IV_LEN);
  crypto.getRandomValues(iv);

  const key = await deriveAesKey(encryptionKey, salt);
  const ptBytes = encoder.encode(plaintext);

  const ctBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv) },
    key,
    ptBytes
  );

  const ctBytes = new Uint8Array(ctBuffer);

  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(SALT_LEN + IV_LEN + ctBytes.length);
  combined.set(salt, 0);
  combined.set(iv, SALT_LEN);
  combined.set(ctBytes, SALT_LEN + IV_LEN);

  return bytesToBase64(combined);
}

/**
 * Decrypt ciphertext produced by encryptAES().
 */
export async function decryptAES(
  encryptedData: string,
  encryptionKey: string
): Promise<string> {
  const combined = base64ToBytes(encryptedData);

  if (combined.length < SALT_LEN + IV_LEN + 1) {
    throw new Error("Invalid encrypted payload (too short).");
  }

  const salt = combined.subarray(0, SALT_LEN);
  const iv = combined.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const ciphertext = combined.subarray(SALT_LEN + IV_LEN);

  const key = await deriveAesKey(encryptionKey, salt);

  const ptBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv) },
    key,
    asArrayBuffer(ciphertext)
  );

  return decoder.decode(ptBuffer);
}

/* ------------------------- internal helpers ------------------------- */

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000; // 32KB
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/**
 * Fixes TS BufferSource typing issues by forcing ArrayBuffer.
 */
function asArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const buf = u8.buffer as ArrayBuffer;
  return buf.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}
