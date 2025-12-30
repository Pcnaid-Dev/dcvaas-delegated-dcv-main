/**
 * Microcopy System
 * 
 * Loads brand-specific microcopy from JSON files.
 * Provides type-safe access to brand-specific text strings.
 */

import { type BrandId } from './brand-resolver';

// Microcopy types based on the JSON structure
export interface Microcopy {
  // Hero section
  hero_headline?: string;
  hero_subhead_line1?: string;
  hero_subhead_line2?: string;
  hero_subheadline?: string;
  hero_primary_cta?: string;
  hero_secondary_cta?: string;
  hero_cta_note?: string;
  hero_trust_note?: string;

  // Reassurance
  reassurance_chips?: string[];

  // Benefits
  benefit_instant?: string;
  benefit_downtime?: string;
  benefit_compatibility?: string;
  benefit_monitoring?: string;

  // How-to
  howto_title?: string;
  howto_step1?: string;
  howto_step2?: string;
  howto_step3?: string;
  howto_support_note?: string;

  // Pricing
  pricing_line?: string;
  pricing_agency?: string;
  pricing_enterprise?: string;
  plan_name?: string;
  plan_includes?: string;
  pricing_cta?: string;

  // Value propositions
  value_stop_sprawl?: string;
  value_protect_margins?: string;
  value_white_label?: string;
  profit_center_headline?: string;
  profit_center_body?: string;

  // FAQ
  faq_legit_q?: string;
  faq_legit_a?: string;
  faq_steps_q?: string;
  faq_steps_a?: string;
  faq_downtime_q?: string;
  faq_downtime_a?: string;
  faq_builder_q?: string;
  faq_builder_a?: string;
  faq_howknow_q?: string;
  faq_howknow_a?: string;

  // Portal/Dashboard
  portal_secure?: string;
  portal_action_needed?: string;
  portal_check_button?: string;
  portal_help_widget?: string;
  portal_banner_action?: string;
  portal_banner_reassurance?: string;
  portal_dns_timing?: string;
  portal_title?: string;
  portal_step1?: string;
  portal_step2?: string;
  portal_confirmation?: string;
  portal_helper?: string;

  // Overview
  'overview.empty'?: string;
  'overview.alert'?: string;

  // Domains
  'domains.search_placeholder'?: string;
  'domains.empty'?: string;
  'domains.no_action_needed'?: string;

  // Status messages
  status_active?: string;
  status_action_needed?: string;
  status_blocked?: string;
  status_pending?: string;
  status_error?: string;
  tooltip_action_needed?: string;
  tooltip_blocked?: string;

  // Dashboard
  dashboard_header?: string;
  'add_domain.placeholder'?: string;
  'add_domain.instruction'?: string;
  'api_token.notice'?: string;

  // Toast messages
  toast_copied?: string;
  toast_saved?: string;
  toast_domain_queued?: string;

  // Errors
  error_not_found?: string;
  error_dns_delay?: string;

  // Any other custom strings
  [key: string]: string | string[] | undefined;
}

// Cache for loaded microcopy
const microcopyCache = new Map<BrandId, Microcopy>();

/**
 * Load microcopy for a specific brand
 */
export async function loadMicrocopy(brandId: BrandId): Promise<Microcopy> {
  // Check cache first
  if (microcopyCache.has(brandId)) {
    return microcopyCache.get(brandId)!;
  }

  try {
    // Dynamically import the brand-specific microcopy JSON
    let microcopy: Microcopy;

    switch (brandId) {
      case 'autocertify.net':
        microcopy = (await import('../../autocertify/microcopy.json')).default;
        break;
      case 'delegatedssl.com':
        microcopy = (await import('../../delegatedssl/microcopy.json')).default;
        break;
      case 'keylessssl.dev':
        microcopy = (await import('../../keylessssl/microcopy.json')).default;
        break;
      default:
        // Default to keylessssl if unknown brand
        microcopy = (await import('../../keylessssl/microcopy.json')).default;
    }

    // Cache it
    microcopyCache.set(brandId, microcopy);

    return microcopy;
  } catch (error) {
    console.error(`Failed to load microcopy for brand ${brandId}:`, error);
    // Return empty microcopy object as fallback
    return {};
  }
}

/**
 * Get a specific microcopy string with fallback
 */
export function getMicrocopyString(
  microcopy: Microcopy,
  key: string,
  fallback: string = ''
): string {
  const value = microcopy[key];
  if (typeof value === 'string') {
    return value;
  }
  return fallback;
}

/**
 * Get a microcopy array with fallback
 */
export function getMicrocopyArray(
  microcopy: Microcopy,
  key: string,
  fallback: string[] = []
): string[] {
  const value = microcopy[key];
  if (Array.isArray(value)) {
    return value;
  }
  return fallback;
}
