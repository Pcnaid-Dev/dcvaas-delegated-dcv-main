/**
 * Stripe pricing constants for backend
 * 
 * These price IDs should be replaced with actual Stripe price IDs
 * from your Stripe dashboard before deploying to production.
 */

export const STRIPE_PRICE_IDS = {
  pro: 'price_pro_monthly',
  agency: 'price_agency_monthly',
} as const;

/**
 * Map Stripe price IDs to subscription tiers
 */
export const PRICE_ID_TO_TIER: Record<string, 'free' | 'pro' | 'agency'> = {
  [STRIPE_PRICE_IDS.pro]: 'pro',
  [STRIPE_PRICE_IDS.agency]: 'agency',
};

/**
 * Get tier from price ID
 * Defaults to 'pro' for unknown price IDs
 */
export function getTierFromPriceId(priceId: string): 'free' | 'pro' | 'agency' {
  const tier = PRICE_ID_TO_TIER[priceId];
  if (!tier) {
    console.warn(`Unknown Stripe price ID: ${priceId}. Defaulting to 'pro' tier.`);
    return 'pro';
  }
  return tier;
}
