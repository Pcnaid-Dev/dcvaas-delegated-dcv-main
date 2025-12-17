// workers/api/src/lib/members.ts
import type { Env } from '../env';
import type { MemberRole } from '../middleware/auth';

export type MemberRow = {
  id: string;
  org_id: string;
  user_id: string;
  email: string;
  role: MemberRole;
  status: 'active' | 'invited' | 'suspended';
  created_at: string;
  updated_at: string;
};

export type MemberResponse = {
  id: string;
  orgId: string;
  userId: string;
  email: string;
  role: MemberRole;
  status: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * List all members of an organization
 */
export async function listMembers(env: Env, orgId: string): Promise<MemberResponse[]> {
  const { results } = await env.DB
    .prepare(`SELECT * FROM organization_members WHERE org_id = ? ORDER BY created_at ASC`)
    .bind(orgId)
    .all<MemberRow>();

  return results.map(rowToResponse);
}

/**
 * Get a specific member
 */
export async function getMember(env: Env, orgId: string, userId: string): Promise<MemberResponse | null> {
  const row = await env.DB
    .prepare(`SELECT * FROM organization_members WHERE org_id = ? AND user_id = ? LIMIT 1`)
    .bind(orgId, userId)
    .first<MemberRow>();

  if (!row) return null;
  return rowToResponse(row);
}

/**
 * Invite a new member by email
 */
export async function inviteMember(
  env: Env, 
  orgId: string, 
  email: string, 
  role: MemberRole = 'member'
): Promise<MemberResponse> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Use UUID-based temporary user_id for pending invitations
  const tempUserId = `pending_${crypto.randomUUID()}`;

  // Check if already invited or active
  // Check for any non-suspended memberships for this email in the org
  const existingMembers = await env.DB
    .prepare(`SELECT * FROM organization_members WHERE org_id = ? AND email = ? AND status != 'suspended'`)
    .bind(orgId, email)
    .all<MemberRow>();

  if (existingMembers.results && existingMembers.results.length > 0) {
    // If any active membership exists, do not allow another
    const activeMember = existingMembers.results.find(m => m.status === 'active');
    if (activeMember) {
      throw new Error('User is already a member');
    }
    // If any invitation exists, return the first one
    const invitedMember = existingMembers.results.find(m => m.status === 'invited');
    if (invitedMember) {
      return rowToResponse(invitedMember);
    }
    // (Should not happen, but if other statuses exist, fall through to create new invitation)
  }

  await env.DB
    .prepare(
      `INSERT INTO organization_members 
       (id, org_id, user_id, email, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'invited', ?, ?)`
    )
    .bind(id, orgId, tempUserId, email, role, now, now)
    .run();

  const member = await env.DB
    .prepare(`SELECT * FROM organization_members WHERE id = ?`)
    .bind(id)
    .first<MemberRow>();

  if (!member) throw new Error('Failed to create member invitation');
  return rowToResponse(member);
}

/**
 * Accept an invitation (called during login)
 * Updates pending invitations with the user's actual ID
 */
export async function acceptInvitation(env: Env, userId: string, email: string): Promise<void> {
  await env.DB
    .prepare(
      `UPDATE organization_members 
       SET user_id = ?, status = 'active', updated_at = datetime('now')
       WHERE email = ? AND status = 'invited'`
    )
    .bind(userId, email)
    .run();
}

/**
 * Get count of active owners in an organization
 */
async function getActiveOwnerCount(env: Env, orgId: string): Promise<number> {
  const result = await env.DB
    .prepare(`SELECT COUNT(*) as count FROM organization_members WHERE org_id = ? AND role = 'owner' AND status = 'active'`)
    .bind(orgId)
    .first<{ count: number }>();
  
  return result?.count ?? 0;
}

/**
 * Remove a member from an organization
 */
export async function removeMember(env: Env, orgId: string, userId: string): Promise<void> {
  const member = await getMember(env, orgId, userId);
  
  // Don't allow removing the last owner
  if (member?.role === 'owner') {
    const ownerCount = await getActiveOwnerCount(env, orgId);
    if (ownerCount <= 1) {
      throw new Error('Cannot remove the last owner');
    }
  }

  await env.DB
    .prepare(`DELETE FROM organization_members WHERE org_id = ? AND user_id = ?`)
    .bind(orgId, userId)
    .run();
}

/**
 * Update member role
 */
export async function updateMemberRole(
  env: Env, 
  orgId: string, 
  userId: string, 
  newRole: MemberRole
): Promise<MemberResponse> {
  // Don't allow changing the last owner
  if (newRole !== 'owner') {
    const member = await getMember(env, orgId, userId);
    if (member?.role === 'owner') {
      const ownerCount = await getActiveOwnerCount(env, orgId);
      if (ownerCount <= 1) {
        throw new Error('Cannot change role of the last owner');
      }
    }
  }

  await env.DB
    .prepare(
      `UPDATE organization_members 
       SET role = ?, updated_at = datetime('now')
       WHERE org_id = ? AND user_id = ?`
    )
    .bind(newRole, orgId, userId)
    .run();

  const updated = await getMember(env, orgId, userId);
  if (!updated) throw new Error('Failed to update member role');
  return updated;
}

/**
 * Get user's role in an organization
 */
export async function getUserRole(env: Env, orgId: string, userId: string): Promise<MemberRole | null> {
  const row = await env.DB
    .prepare(`SELECT role FROM organization_members WHERE org_id = ? AND user_id = ? AND status = 'active'`)
    .bind(orgId, userId)
    .first<{ role: MemberRole }>();

  return row?.role || null;
}

// Helper function to convert DB row to API response
function rowToResponse(row: MemberRow): MemberResponse {
  return {
    id: row.id,
    orgId: row.org_id,
    userId: row.user_id,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
