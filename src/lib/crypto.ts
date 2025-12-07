export async function generateId(): Promise<string> {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${randomPart}`;
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  
  const combined = new Uint8Array(
    exportedKey.byteLength + iv.byteLength + encrypted.byteLength
  );
  combined.set(new Uint8Array(exportedKey), 0);
  combined.set(iv, exportedKey.byteLength);
  combined.set(new Uint8Array(encrypted), exportedKey.byteLength + iv.byteLength);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decryptSecret(ciphertext: string): Promise<string> {
  try {
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    
    const keyData = combined.slice(0, 32);
    const iv = combined.slice(32, 44);
    const encrypted = combined.slice(44);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt secret');
  }
}

export function generateCNAMETarget(domainId: string): string {
  const hash = domainId.substring(0, 12);
  return `${hash}.acme.dcvaas-verify.com`;
}

export function generateWebhookSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return `whsec_${Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
