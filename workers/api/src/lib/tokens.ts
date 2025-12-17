import type { Env } from '../env';
import { sha256Hex } from './crypto';

export interface APITokenRow {
  id: string;
  org_id: string;
  name: string;
  token_hash: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface APITokenDTO {
  id: string;
  orgId: string;
  name: string;
  tokenHash: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/**
 * Generate a secure random API token
 */
export function generateAPIToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * List all API tokens for an organization (returns masked tokens)
 */
export async function listAPITokens(env: Env, orgId: string): Promise<APITokenDTO[]> {
  const result = await env.DB.prepare(
    `SELECT id, org_id, name, token_hash, last_used_at, expires_at, created_at
     FROM api_tokens
     WHERE org_id = ?
     ORDER BY created_at DESC`
  ).bind(orgId).all<APITokenRow>();

  const tokens = result.results || [];
  return tokens.map(row => ({
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    tokenHash: row.token_hash, // This is already hashed, safe to return
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

/**
 * Create a new API token
 * Returns both the token DTO and the plaintext token (only returned once!)
 */
export async function createAPIToken(
  env: Env,
  orgId: string,
  name: string,
  expiresAt?: string
): Promise<{ token: APITokenDTO; plaintext: string }> {
  const id = crypto.randomUUID();
  const plaintext = generateAPIToken();
  const tokenHash = await sha256Hex(plaintext);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO api_tokens (id, org_id, name, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, orgId, name, tokenHash, expiresAt || null, now).run();

  return {
    token: {
      id,
      orgId,
      name,
      tokenHash,
      lastUsedAt: null,
      expiresAt: expiresAt || null,
      createdAt: now,
    },
    plaintext,
  };
}

/**
 * Delete an API token
 */
export async function deleteAPIToken(env: Env, orgId: string, tokenId: string): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM api_tokens WHERE id = ? AND org_id = ?`
  ).bind(tokenId, orgId).run();
}
