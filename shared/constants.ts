/**
 * Shared constants for DCVaaS
 * This module is safe for both frontend and worker runtime (no browser-only imports)
 */

/**
 * Plan limits for different subscription tiers
 */
export const PLAN_LIMITS = {
  free: 3,
  pro: 15,
  agency: 50,
} as const;

/**
 * Valid job types for background processing
 */
export const VALID_JOB_TYPES = [
  'dns_check',
  'start_issuance',
  'renewal',
  'sync_status',
] as const;

/**
 * Job type union from VALID_JOB_TYPES array
 */
export type JobType = typeof VALID_JOB_TYPES[number];
