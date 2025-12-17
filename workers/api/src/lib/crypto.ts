export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypt plaintext using AES-GCM with a provided encryption key
 * Returns base64-encoded ciphertext with IV prepended
 * Format: base64(iv + encrypted_data)
 */
export async function encryptSecret(plaintext: string, encryptionKey: string): Promise<string> {
  // Derive a proper AES key from the encryption key string
  const keyMaterial = new TextEncoder().encode(encryptionKey);
  const keyHash = await crypto.subtle.digest('SHA-256', keyMaterial);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Generate a random 12-byte IV (recommended for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the plaintext
  const encodedPlaintext = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedPlaintext
  );

  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Convert to base64 - use loop to avoid stack overflow on large payloads
  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Decrypt ciphertext using AES-GCM with a provided encryption key
 * Expects base64-encoded ciphertext with IV prepended (format from encryptSecret)
 */
export async function decryptSecret(ciphertext: string, encryptionKey: string): Promise<string> {
  // Derive the same AES key from the encryption key string
  const keyMaterial = new TextEncoder().encode(encryptionKey);
  const keyHash = await crypto.subtle.digest('SHA-256', keyMaterial);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Decode from base64
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  
  // Extract IV (first 12 bytes) and encrypted data
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  );

  return new TextDecoder().decode(decrypted);
}
