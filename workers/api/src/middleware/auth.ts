import type { Env } from '../env';
import { sha256Hex } from '../lib/crypto';

export type Auth = { orgId: string; tokenId: string };

export async function authenticate(req: Request, env: Env): Promise<Auth | null> {
  const header = req.headers.get('Authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;

  const raw = m[1].trim();
  if (!raw) return null;

  const hash = await sha256Hex(raw);

  const row = await env.DB
    .prepare(
      `SELECT id, org_id
       FROM api_tokens
       WHERE token_hash = ?
         AND (expires_at IS NULL OR expires_at > datetime('now'))`,
    )
    .bind(hash)
    .first<{ id: string; org_id: string }>();

  if (!row) return null;

  // best-effort last_used_at
  env.DB.prepare(`UPDATE api_tokens SET last_used_at = datetime('now') WHERE id = ?`)
    .bind(row.id)
    .run()
    .catch(() => {});

  return { orgId: row.org_id, tokenId: row.id };
}
