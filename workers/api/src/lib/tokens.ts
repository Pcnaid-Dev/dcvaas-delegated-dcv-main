// workers/api/src/lib/tokens.ts
import type { Env } from '../env';
import { sha256Hex } from './crypto';

export type APITokenRow = {
  id: string;
  org_id: string;
  label: string | null;
  token_hash: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

/**
 * Generate a secure random API token (32 random bytes as hex)
 */
export function generateAPIToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * List API tokens for an organization
 */
export async function listAPITokens(env: Env, orgId: string) {
  const { results } = await env.DB
    .prepare(
      `SELECT id, org_id, label, last_used_at, expires_at, created_at
       FROM api_tokens
       WHERE org_id = ?
       ORDER BY created_at DESC`
    )
    .bind(orgId)
    .all<APITokenRow>();

  return results.map((row) => ({
    id: row.id,
    orgId: row.org_id,
    name: row.label || 'Unnamed Token',
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

/**
 * Create a new API token
 */
export async function createAPIToken(
  env: Env,
  orgId: string,
  name: string,
  expiresAt?: string | null
) {
  const id = crypto.randomUUID();
  const plainToken = generateAPIToken();
  const tokenHash = await sha256Hex(plainToken);

  await env.DB
    .prepare(
      `INSERT INTO api_tokens (id, org_id, label, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(id, orgId, name, tokenHash, expiresAt || null)
    .run();

  return {
    token: plainToken,
    tokenMeta: {
      id,
      orgId,
      name,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
    },
  };
}

/**
 * Delete an API token
 */
export async function deleteAPIToken(env: Env, orgId: string, tokenId: string) {
  await env.DB
    .prepare(`DELETE FROM api_tokens WHERE id = ? AND org_id = ?`)
    .bind(tokenId, orgId)
    .run();
}
