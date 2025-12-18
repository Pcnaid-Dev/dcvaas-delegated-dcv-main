/**
 * Stripe pricing constants
 * 
 * These price IDs should be replaced with actual Stripe price IDs
 * from your Stripe dashboard before deploying to production.
 */

export const STRIPE_PRICE_IDS = {
  pro: 'price_pro_monthly',
  agency: 'price_agency_monthly',
  delegatedssl_agency: 'price_delegatedssl_agency_monthly',
  delegatedssl_enterprise: 'price_delegatedssl_enterprise_monthly',
} as const;

export type StripePriceTier = keyof typeof STRIPE_PRICE_IDS;
