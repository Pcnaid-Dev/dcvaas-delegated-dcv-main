import type { Env } from '../env';
import { sha256Hex } from '../lib/crypto';

export type MemberRole = 'owner' | 'admin' | 'member';

export type Auth = { 
  orgId: string; 
  tokenId: string;
  userId?: string;
  role?: MemberRole;
};

/**
 * Update placeholder email with real email from auth token
 * This fixes the issue where migrations create placeholder emails like owner@orgid.local
 */
async function updatePlaceholderEmail(env: Env, userId: string, orgId: string, realEmail: string): Promise<void> {
  try {
    // Check if user has a placeholder email pattern
    const member = await env.DB
      .prepare(
        `SELECT email FROM organization_members 
         WHERE user_id = ? AND org_id = ? AND email LIKE '%@%.local'`
      )
      .bind(userId, orgId)
      .first<{ email: string }>();

    if (member) {
      // Update with real email
      await env.DB
        .prepare(
          `UPDATE organization_members 
           SET email = ?, updated_at = datetime('now') 
           WHERE user_id = ? AND org_id = ?`
        )
        .bind(realEmail, userId, orgId)
        .run();
      
      console.log(`Updated placeholder email for user ${userId} in org ${orgId} to ${realEmail}`);
    }
  } catch (err) {
    console.error('Failed to update placeholder email:', err);
    // Non-fatal error, continue
  }
}

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

  // API tokens are assumed to have full owner privileges for their organization
  // This allows API token holders to perform all operations including member management
  return { orgId: row.org_id, tokenId: row.id, role: 'owner' };
}

/**
 * Authenticate with user-based auth (for Auth0 integration)
 * Checks if the user is a member of the organization
 * Also updates placeholder emails with real emails from auth token
 */
export async function authenticateUser(req: Request, env: Env, userId: string, orgId: string, userEmail?: string): Promise<Auth | null> {
  const member = await env.DB
    .prepare(
      `SELECT user_id, role, status
       FROM organization_members
       WHERE user_id = ? AND org_id = ? AND status = 'active'`,
    )
    .bind(userId, orgId)
    .first<{ user_id: string; role: MemberRole; status: string }>();

  if (!member) return null;

  // Update placeholder email if real email is provided
  if (userEmail) {
    // Fire and forget - don't block auth on email update
    updatePlaceholderEmail(env, userId, orgId, userEmail).catch(() => {});
  }

  return { 
    orgId, 
    tokenId: '', // No token for user auth
    userId: member.user_id,
    role: member.role
  };
}

/**
 * Check if authenticated user has required role
 */
export function hasRole(auth: Auth, requiredRole: MemberRole | MemberRole[]): boolean {
  if (!auth.role) return false;
  
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(auth.role);
}

/**
 * Check if authenticated user is owner or admin
 */
export function isOwnerOrAdmin(auth: Auth): boolean {
  return hasRole(auth, ['owner', 'admin']);
}
