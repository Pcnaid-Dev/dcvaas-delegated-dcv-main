/**
 * Stripe pricing constants
 * 
 * These price IDs should be replaced with actual Stripe price IDs
 * from your Stripe dashboard via environment variables.
 * 
 * Set VITE_STRIPE_PRICE_PRO and VITE_STRIPE_PRICE_AGENCY in your .env file.
 */

export const STRIPE_PRICE_IDS = {
  pro: import.meta.env.VITE_STRIPE_PRICE_PRO || '',
  agency: import.meta.env.VITE_STRIPE_PRICE_AGENCY || '',
} as const;

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return !!STRIPE_PRICE_IDS.pro && !!STRIPE_PRICE_IDS.agency;
}

export type StripePriceTier = keyof typeof STRIPE_PRICE_IDS;
