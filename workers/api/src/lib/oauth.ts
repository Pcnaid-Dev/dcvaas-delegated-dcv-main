// OAuth Connection Management
import type { Env } from '../env';

export interface OAuthConnectionRow {
  id: string;
  org_id: string;
  provider: string;
  encrypted_access_token: string;
  encrypted_refresh_token: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OAuthConnectionDTO {
  id: string;
  orgId: string;
  provider: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert database row to DTO (never expose encrypted tokens)
 */
function rowToDTO(row: OAuthConnectionRow): OAuthConnectionDTO {
  return {
    id: row.id,
    orgId: row.org_id,
    provider: row.provider,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Encrypt data using AES-GCM
 * Returns base64-encoded: iv:ciphertext:authTag
 */
async function encrypt(plaintext: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Derive a key from the provided key string
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key.padEnd(32, '0').slice(0, 32)), // Ensure 32 bytes
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Generate a deterministic salt from the key itself for consistency
  // This allows decryption with the same key while still being unpredictable
  const saltSource = await crypto.subtle.digest('SHA-256', encoder.encode(key));
  const salt = new Uint8Array(saltSource).slice(0, 16);
  
  const cryptoKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(plaintext)
  );

  // Combine IV and ciphertext, encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * List OAuth connections for an organization
 */
export async function listOAuthConnections(env: Env, orgId: string): Promise<OAuthConnectionDTO[]> {
  const result = await env.DB.prepare(`
    SELECT * FROM oauth_connections 
    WHERE org_id = ? 
    ORDER BY created_at DESC
  `).bind(orgId).all<OAuthConnectionRow>();

  return (result.results || []).map(rowToDTO);
}

/**
 * Exchange OAuth code for access token with provider
 */
async function exchangeCodeWithProvider(
  provider: string,
  code: string,
  redirectUri: string,
  env: Env
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  // This is a stub - in production, you would implement real OAuth exchanges
  // For each provider (Cloudflare, GoDaddy, Route53, etc.)
  
  if (provider === 'cloudflare') {
    // Example Cloudflare OAuth exchange
    // Would need CLOUDFLARE_CLIENT_ID and CLOUDFLARE_CLIENT_SECRET in env
    throw new Error('Cloudflare OAuth exchange not yet implemented');
  }
  
  if (provider === 'godaddy') {
    // Example GoDaddy OAuth exchange
    throw new Error('GoDaddy OAuth exchange not yet implemented');
  }
  
  if (provider === 'route53') {
    // Route53 doesn't use OAuth, it uses AWS credentials
    throw new Error('Route53 uses AWS credentials, not OAuth');
  }
  
  throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * Create or update an OAuth connection
 */
export async function exchangeOAuthCode(
  env: Env,
  orgId: string,
  provider: string,
  code: string,
  redirectUri: string
): Promise<OAuthConnectionDTO> {
  // Exchange code with provider
  const tokens = await exchangeCodeWithProvider(provider, code, redirectUri, env);
  
  // Get encryption key from environment
  if (!env.OAUTH_ENCRYPTION_KEY) {
    throw new Error('OAUTH_ENCRYPTION_KEY environment variable must be set for OAuth connections');
  }
  const encryptionKey = env.OAUTH_ENCRYPTION_KEY;
  
  // Encrypt tokens
  const encryptedAccessToken = await encrypt(tokens.accessToken, encryptionKey);
  const encryptedRefreshToken = tokens.refreshToken 
    ? await encrypt(tokens.refreshToken, encryptionKey)
    : null;
  
  // Calculate expiration
  const expiresAt = tokens.expiresIn
    ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
    : null;
  
  // Check if connection already exists
  const existing = await env.DB.prepare(`
    SELECT id FROM oauth_connections 
    WHERE org_id = ? AND provider = ?
  `).bind(orgId, provider).first<{ id: string }>();
  
  if (existing) {
    // Update existing connection
    await env.DB.prepare(`
      UPDATE oauth_connections 
      SET encrypted_access_token = ?,
          encrypted_refresh_token = ?,
          expires_at = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      existing.id
    ).run();
    
    const updated = await env.DB.prepare(`
      SELECT * FROM oauth_connections WHERE id = ?
    `).bind(existing.id).first<OAuthConnectionRow>();
    
    if (!updated) throw new Error('Failed to update OAuth connection');
    return rowToDTO(updated);
  } else {
    // Create new connection
    const id = crypto.randomUUID();
    
    await env.DB.prepare(`
      INSERT INTO oauth_connections (
        id, org_id, provider, 
        encrypted_access_token, encrypted_refresh_token, 
        expires_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      id,
      orgId,
      provider,
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt
    ).run();
    
    const created = await env.DB.prepare(`
      SELECT * FROM oauth_connections WHERE id = ?
    `).bind(id).first<OAuthConnectionRow>();
    
    if (!created) throw new Error('Failed to create OAuth connection');
    return rowToDTO(created);
  }
}

/**
 * Delete an OAuth connection
 */
export async function deleteOAuthConnection(
  env: Env,
  orgId: string,
  connectionId: string
): Promise<boolean> {
  const result = await env.DB.prepare(`
    DELETE FROM oauth_connections 
    WHERE id = ? AND org_id = ?
  `).bind(connectionId, orgId).run();

  return (result.meta.changes || 0) > 0;
}
