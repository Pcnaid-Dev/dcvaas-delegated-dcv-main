import type { Env } from '../env';

export type Organization = {
  id: string;
  name: string;
  owner_id: string;
  subscription_tier: 'free' | 'pro' | 'agency';
  created_at: string;
};

/**
 * Get organization by ID
 * @param env Environment with DB binding
 * @param orgId Organization ID
 * @returns Organization or null if not found
 */
export async function getOrganization(env: Env, orgId: string): Promise<Organization | null> {
  const org = await env.DB
    .prepare(
      `SELECT id, name, owner_id, subscription_tier, created_at
       FROM organizations
       WHERE id = ?`
    )
    .bind(orgId)
    .first<Organization>();

  return org;
}

/**
 * Update organization subscription tier
 * @param env Environment with DB binding
 * @param orgId Organization ID
 * @param tier New subscription tier
 */
export async function updateSubscriptionTier(
  env: Env,
  orgId: string,
  tier: 'free' | 'pro' | 'agency'
): Promise<void> {
  await env.DB
    .prepare('UPDATE organizations SET subscription_tier = ? WHERE id = ?')
    .bind(tier, orgId)
    .run();
}
