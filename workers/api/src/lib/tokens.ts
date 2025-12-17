// workers/api/src/lib/tokens.ts
import type { Env } from '../env';
import { sha256Hex } from './crypto';
import { logAudit } from './audit';

export type TokenRow = {
  id: string;
  org_id: string;
  name: string;
  token_hash: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type TokenResponse = {
  id: string;
  orgId: string;
  name: string;
  token?: string; // Only included on creation
  maskedToken?: string; // For listing
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

/**
 * Generate a secure random token
 * Format: dcv_<32 random hex characters>
 */
export function generateSecureToken(): string {
  const randomBytes = new Uint8Array(16); // 16 bytes = 128 bits
  crypto.getRandomValues(randomBytes);
  const hexToken = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `dcv_${hexToken}`;
}

/**
 * Mask a token for display
 * Shows prefix and last 4 characters: dcv_****...****abcd
 */
export function maskToken(token: string): string {
  if (token.length <= 8) return token;
  const prefix = token.substring(0, 7); // "dcv_***"
  const suffix = token.substring(token.length - 4); // last 4 chars
  return `${prefix}...${suffix}`;
}

/**
 * List all tokens for an organization (with masked values)
 */
export async function listTokens(env: Env, orgId: string): Promise<TokenResponse[]> {
  const { results } = await env.DB
    .prepare(`SELECT * FROM api_tokens WHERE org_id = ? ORDER BY created_at DESC`)
    .bind(orgId)
    .all<TokenRow>();

  return results.map((row) => ({
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    maskedToken: 'dcv_••••••••••••••••', // Generic masked value since we don't store plaintext
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

/**
 * Create a new API token
 * Returns the plaintext token ONCE - must be saved by the client
 */
export async function createToken(
  env: Env,
  orgId: string,
  name: string,
  expiresAt?: string,
  userId?: string
): Promise<TokenResponse> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Generate secure random token
  const token = generateSecureToken();
  
  // Hash the token for storage
  const tokenHash = await sha256Hex(token);

  // Insert into database
  await env.DB.prepare(
    `INSERT INTO api_tokens 
      (id, org_id, name, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(id, orgId, name, tokenHash, expiresAt ?? null, now)
    .run();

  // Log audit trail
  await logAudit(env, {
    org_id: orgId,
    user_id: userId ?? null,
    action: 'token.created',
    entity_type: 'api_token',
    entity_id: id,
    details: { name, has_expiry: !!expiresAt },
  });

  // Return with plaintext token (only time it's exposed)
  return {
    id,
    orgId,
    name,
    token, // Plaintext - only returned once!
    lastUsedAt: null,
    expiresAt: expiresAt ?? null,
    createdAt: now,
  };
}

/**
 * Delete/revoke an API token
 */
export async function deleteToken(
  env: Env,
  orgId: string,
  tokenId: string,
  userId?: string
): Promise<void> {
  // Verify the token belongs to this org before deleting
  const existing = await env.DB
    .prepare(`SELECT id, name FROM api_tokens WHERE id = ? AND org_id = ? LIMIT 1`)
    .bind(tokenId, orgId)
    .first<{ id: string; name: string }>();

  if (!existing) {
    throw new Error('Token not found');
  }

  // Delete the token
  await env.DB
    .prepare(`DELETE FROM api_tokens WHERE id = ? AND org_id = ?`)
    .bind(tokenId, orgId)
    .run();

  // Log audit trail
  await logAudit(env, {
    org_id: orgId,
    user_id: userId ?? null,
    action: 'token.deleted',
    entity_type: 'api_token',
    entity_id: tokenId,
    details: { name: existing.name },
  });
}
