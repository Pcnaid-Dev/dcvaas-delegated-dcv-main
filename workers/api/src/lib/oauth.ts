// workers/api/src/lib/oauth.ts
import type { Env } from '../env';
import { encryptSecret, decryptSecret } from './crypto';

export type OAuthProvider = 'cloudflare' | 'godaddy' | 'route53' | 'other';

export type OAuthConnectionRow = {
  id: string;
  org_id: string;
  provider: string;
  encrypted_access_token: string;
  encrypted_refresh_token: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Exchange OAuth code for tokens and store encrypted
 * This is a stub implementation that marks the connection as pending
 */
export async function exchangeOAuthCode(
  env: Env,
  orgId: string,
  provider: OAuthProvider,
  code: string,
  redirectUri: string
) {
  // For now, this is a stub that stores a placeholder
  // In production, you would:
  // 1. Exchange the code with the OAuth provider
  // 2. Get access_token and refresh_token
  // 3. Encrypt and store them

  if (!env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured - cannot store OAuth tokens');
  }

  // Stub: Create a deterministic placeholder from the code
  const placeholder = `stub-token-${provider}-${code.substring(0, 8)}`;
  const encryptedAccessToken = await encryptSecret(placeholder, env.ENCRYPTION_KEY);
  
  const id = crypto.randomUUID();
  
  // Upsert: update if exists, insert if not
  const existing = await env.DB
    .prepare(`SELECT id FROM oauth_connections WHERE org_id = ? AND provider = ?`)
    .bind(orgId, provider)
    .first<{ id: string }>();

  if (existing) {
    // Update existing connection
    await env.DB
      .prepare(
        `UPDATE oauth_connections 
         SET encrypted_access_token = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(encryptedAccessToken, existing.id)
      .run();
    
    return {
      id: existing.id,
      orgId,
      provider,
      status: 'updated',
      note: 'OAuth connection updated with stub token - full implementation pending',
    };
  } else {
    // Insert new connection
    await env.DB
      .prepare(
        `INSERT INTO oauth_connections (id, org_id, provider, encrypted_access_token, created_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(id, orgId, provider, encryptedAccessToken)
      .run();
    
    return {
      id,
      orgId,
      provider,
      status: 'created',
      note: 'OAuth connection created with stub token - full implementation pending',
    };
  }
}

/**
 * Get OAuth connection for an organization and provider
 */
export async function getOAuthConnection(
  env: Env,
  orgId: string,
  provider: OAuthProvider
): Promise<OAuthConnectionRow | null> {
  const row = await env.DB
    .prepare(`SELECT * FROM oauth_connections WHERE org_id = ? AND provider = ?`)
    .bind(orgId, provider)
    .first<OAuthConnectionRow>();

  return row;
}

/**
 * List all OAuth connections for an organization
 */
export async function listOAuthConnections(env: Env, orgId: string) {
  const { results } = await env.DB
    .prepare(`SELECT id, org_id, provider, expires_at, created_at, updated_at FROM oauth_connections WHERE org_id = ?`)
    .bind(orgId)
    .all<Omit<OAuthConnectionRow, 'encrypted_access_token' | 'encrypted_refresh_token'>>();

  return results.map((row) => ({
    id: row.id,
    orgId: row.org_id,
    provider: row.provider,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Delete an OAuth connection
 */
export async function deleteOAuthConnection(
  env: Env,
  orgId: string,
  connectionId: string
) {
  await env.DB
    .prepare(`DELETE FROM oauth_connections WHERE id = ? AND org_id = ?`)
    .bind(connectionId, orgId)
    .run();
}
