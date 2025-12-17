// API Token Management
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
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  // token is only returned on creation
  token?: string;
  // masked version for listing
  maskedToken?: string;
}

/**
 * Generate a cryptographically secure random token
 * Format: dcv_live_<32 random hex characters>
 */
export function generateToken(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `dcv_live_${hex}`;
}

/**
 * Mask a token for display (show first 12 and last 4 chars)
 */
export function maskToken(token: string): string {
  if (token.length < 16) return '***';
  return `${token.slice(0, 12)}...${token.slice(-4)}`;
}

/**
 * Convert database row to DTO
 */
function rowToDTO(row: APITokenRow, includeToken?: string): APITokenDTO {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    token: includeToken,
    maskedToken: includeToken ? maskToken(includeToken) : undefined,
  };
}

/**
 * Create a new API token
 */
export async function createAPIToken(
  env: Env,
  orgId: string,
  name: string,
  expiresAt?: string
): Promise<APITokenDTO> {
  const token = generateToken();
  const tokenHash = await sha256Hex(token);
  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO api_tokens (id, org_id, name, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).bind(id, orgId, name, tokenHash, expiresAt || null).run();

  const row = await env.DB.prepare(`
    SELECT * FROM api_tokens WHERE id = ?
  `).bind(id).first<APITokenRow>();

  if (!row) {
    throw new Error('Failed to create token');
  }

  // Return the token ONLY on creation
  return rowToDTO(row, token);
}

/**
 * List all tokens for an organization (with masked tokens)
 */
export async function listAPITokens(env: Env, orgId: string): Promise<APITokenDTO[]> {
  const result = await env.DB.prepare(`
    SELECT * FROM api_tokens 
    WHERE org_id = ? 
    ORDER BY created_at DESC
  `).bind(orgId).all<APITokenRow>();

  return (result.results || []).map((row) => ({
    ...rowToDTO(row),
    maskedToken: maskToken('dcv_live_' + '0'.repeat(32)), // Generic mask since we don't store plaintext
  }));
}

/**
 * Get a single token by ID
 */
export async function getAPIToken(env: Env, orgId: string, tokenId: string): Promise<APITokenDTO | null> {
  const row = await env.DB.prepare(`
    SELECT * FROM api_tokens 
    WHERE id = ? AND org_id = ?
  `).bind(tokenId, orgId).first<APITokenRow>();

  if (!row) return null;

  return rowToDTO(row);
}

/**
 * Delete (revoke) a token
 */
export async function deleteAPIToken(env: Env, orgId: string, tokenId: string): Promise<boolean> {
  const result = await env.DB.prepare(`
    DELETE FROM api_tokens 
    WHERE id = ? AND org_id = ?
  `).bind(tokenId, orgId).run();

  return (result.meta.changes || 0) > 0;
}
