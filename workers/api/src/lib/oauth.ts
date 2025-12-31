/**
 * OAuth connections management
 */

import type { Env } from '../env';
import { encryptAES, decryptAES } from './crypto';
import { exchangeOAuthToken } from './oauth-providers';

/**
 * Provider configuration map for OAuth credentials
 */
const PROVIDER_CONFIG = {
  cloudflare: {
    clientIdKey: 'CLOUDFLARE_CLIENT_ID',
    clientSecretKey: 'CLOUDFLARE_CLIENT_SECRET',
  },
  godaddy: {
    clientIdKey: 'GODADDY_CLIENT_ID',
    clientSecretKey: 'GODADDY_CLIENT_SECRET',
  },
} as const;

export interface OAuthConnection {
  id: string;
  org_id: string;
  provider: string;
  encrypted_access_token: string;
  encrypted_refresh_token?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DecryptedOAuthConnection extends Omit<OAuthConnection, 'encrypted_access_token' | 'encrypted_refresh_token'> {
  access_token: string;
  refresh_token?: string;
}

/**
 * Generate a simple ID (UUID-like)
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Exchange OAuth code for tokens and store encrypted in database
 */
export async function createOAuthConnection(
  env: Env,
  orgId: string,
  provider: string,
  code: string,
  redirectUri: string
): Promise<OAuthConnection> {
  // Get provider configuration
  const providerConfig = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];
  if (!providerConfig) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  // Get OAuth client credentials from environment
  const clientId = env[providerConfig.clientIdKey as keyof Env] as string;
  const clientSecret = env[providerConfig.clientSecretKey as keyof Env] as string;

  if (!clientId || !clientSecret) {
    throw new Error(`OAuth credentials not configured for provider: ${provider}`);
  }

  // Exchange code for tokens
  const tokens = await exchangeOAuthToken(provider, code, redirectUri, clientId, clientSecret);

  // Encrypt tokens
  const encryptedAccessToken = await encryptAES(tokens.access_token, env.ENCRYPTION_KEY);
  const encryptedRefreshToken = tokens.refresh_token
    ? await encryptAES(tokens.refresh_token, env.ENCRYPTION_KEY)
    : undefined;

  // Calculate expiration time
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : undefined;

  const id = generateId();
  const now = new Date().toISOString();

  // Check if connection already exists for this org and provider
  const existing = await env.DB.prepare(
    'SELECT id FROM oauth_connections WHERE org_id = ? AND provider = ?'
  ).bind(orgId, provider).first();

  if (existing) {
    // Update existing connection
    await env.DB.prepare(`
      UPDATE oauth_connections
      SET encrypted_access_token = ?,
          encrypted_refresh_token = ?,
          expires_at = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(
      encryptedAccessToken,
      encryptedRefreshToken || null,
      expiresAt || null,
      now,
      existing.id
    ).run();

    const updated = await env.DB.prepare(
      'SELECT * FROM oauth_connections WHERE id = ?'
    ).bind(existing.id).first();

    return updated as unknown as OAuthConnection; // Added 'unknown' cast
  } else {
    // Create new connection
    await env.DB.prepare(`
      INSERT INTO oauth_connections (id, org_id, provider, encrypted_access_token, encrypted_refresh_token, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      orgId,
      provider,
      encryptedAccessToken,
      encryptedRefreshToken || null,
      expiresAt || null,
      now,
      now
    ).run();

    const created = await env.DB.prepare(
      'SELECT * FROM oauth_connections WHERE id = ?'
    ).bind(id).first();

    return created as unknown as OAuthConnection; // Added 'unknown' cast
  }
}

/**
 * Get OAuth connection for an organization and provider
 */
export async function getOAuthConnection(
  env: Env,
  orgId: string,
  provider: string
): Promise<OAuthConnection | null> {
  const result = await env.DB.prepare(
    'SELECT * FROM oauth_connections WHERE org_id = ? AND provider = ?'
  ).bind(orgId, provider).first();

  return result as OAuthConnection | null;
}

/**
 * Get OAuth connection with decrypted tokens
 */
export async function getDecryptedOAuthConnection(
  env: Env,
  orgId: string,
  provider: string
): Promise<DecryptedOAuthConnection | null> {
  const connection = await getOAuthConnection(env, orgId, provider);
  if (!connection) return null;

  const access_token = await decryptAES(connection.encrypted_access_token, env.ENCRYPTION_KEY);
  const refresh_token = connection.encrypted_refresh_token
    ? await decryptAES(connection.encrypted_refresh_token, env.ENCRYPTION_KEY)
    : undefined;

  return {
    ...connection,
    access_token,
    refresh_token,
  };
}

/**
 * List all OAuth connections for an organization
 */
export async function listOAuthConnections(
  env: Env,
  orgId: string
): Promise<OAuthConnection[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM oauth_connections WHERE org_id = ? ORDER BY created_at DESC'
  ).bind(orgId).all();

  return (result.results || []) as unknown as OAuthConnection[]; // Added 'unknown' cast
}

/**
 * Delete OAuth connection
 */
export async function deleteOAuthConnection(
  env: Env,
  orgId: string,
  provider: string
): Promise<void> {
  await env.DB.prepare(
    'DELETE FROM oauth_connections WHERE org_id = ? AND provider = ?'
  ).bind(orgId, provider).run();
}
