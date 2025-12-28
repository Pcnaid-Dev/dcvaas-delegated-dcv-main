/**
 * Brand Resolution System (Frontend)
 * 
 * Resolves the current brand based on hostname or override parameters.
 * Supports 3 brands with distinct marketing and app subdomains.
 * 
 * Brands:
 * - AutoCertify: autocertify.net (marketing), wizard.autocertify.net (app)
 * - DelegatedSSL: delegatedssl.com (marketing), portal.delegatedssl.com (app)
 * - KeylessSSL: keylessssl.dev (marketing), app.keylessssl.dev (app)
 */

export type BrandId = 'autocertify.net' | 'delegatedssl.com' | 'keylessssl.dev';

export interface BrandConfig {
  brandId: BrandId;
  brandName: string;
  marketingHost: string;
  appHost: string;
  isMarketingHost: boolean;
  isAppHost: boolean;
  preferredHost: string;
}

interface BrandDefinition {
  brandId: BrandId;
  brandName: string;
  marketingHost: string;
  appHost: string;
}

const BRAND_DEFINITIONS: BrandDefinition[] = [
  {
    brandId: 'autocertify.net',
    brandName: 'AutoCertify',
    marketingHost: 'autocertify.net',
    appHost: 'wizard.autocertify.net',
  },
  {
    brandId: 'delegatedssl.com',
    brandName: 'DelegatedSSL',
    marketingHost: 'delegatedssl.com',
    appHost: 'portal.delegatedssl.com',
  },
  {
    brandId: 'keylessssl.dev',
    brandName: 'KeylessSSL',
    marketingHost: 'keylessssl.dev',
    appHost: 'app.keylessssl.dev',
  },
];

/**
 * Normalize hostname by stripping www. prefix
 */
function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, '').toLowerCase();
}

/**
 * Get brand override from URL query parameter or environment variable
 */
function getBrandOverride(): BrandId | null {
  // Check URL query parameter first
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const brandParam = params.get('brand');
    if (brandParam) {
      const normalized = normalizeHostname(brandParam);
      const brand = BRAND_DEFINITIONS.find(b => b.brandId === normalized);
      if (brand) {
        return brand.brandId;
      }
    }
  }

  // Check environment variable (Vite uses import.meta.env)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BRAND_OVERRIDE) {
    const envBrand = normalizeHostname(import.meta.env.VITE_BRAND_OVERRIDE as string);
    const brand = BRAND_DEFINITIONS.find(b => b.brandId === envBrand);
    if (brand) {
      return brand.brandId;
    }
  }

  return null;
}

/**
 * Resolve brand from hostname
 */
function resolveBrandFromHostname(hostname: string): BrandDefinition | null {
  const normalized = normalizeHostname(hostname);

  // Check if it matches marketing host
  for (const brand of BRAND_DEFINITIONS) {
    if (normalized === brand.marketingHost || normalized === `www.${brand.marketingHost}`) {
      return brand;
    }
  }

  // Check if it matches app host
  for (const brand of BRAND_DEFINITIONS) {
    if (normalized === brand.appHost) {
      return brand;
    }
  }

  return null;
}

/**
 * Resolve current brand configuration
 * 
 * Resolution order:
 * 1. URL query parameter (?brand=keylessssl.dev)
 * 2. Environment variable (VITE_BRAND_OVERRIDE)
 * 3. Current hostname
 * 4. Default to KeylessSSL for local development
 */
export function resolveBrand(): BrandConfig {
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  
  // Check for override first
  const override = getBrandOverride();
  if (override) {
    const brand = BRAND_DEFINITIONS.find(b => b.brandId === override)!;
    const normalizedHostname = normalizeHostname(currentHostname);
    const isMarketingHost = normalizedHostname === brand.marketingHost || normalizedHostname === `www.${brand.marketingHost}`;
    const isAppHost = normalizedHostname === brand.appHost;

    return {
      brandId: brand.brandId,
      brandName: brand.brandName,
      marketingHost: brand.marketingHost,
      appHost: brand.appHost,
      isMarketingHost,
      isAppHost,
      preferredHost: brand.marketingHost,
    };
  }

  // Resolve from hostname
  const resolved = resolveBrandFromHostname(currentHostname);
  
  if (resolved) {
    const normalizedHostname = normalizeHostname(currentHostname);
    const isMarketingHost = normalizedHostname === resolved.marketingHost || normalizedHostname === `www.${resolved.marketingHost}`;
    const isAppHost = normalizedHostname === resolved.appHost;

    return {
      brandId: resolved.brandId,
      brandName: resolved.brandName,
      marketingHost: resolved.marketingHost,
      appHost: resolved.appHost,
      isMarketingHost,
      isAppHost,
      preferredHost: resolved.marketingHost,
    };
  }

  // Default to KeylessSSL for local development
  const defaultBrand = BRAND_DEFINITIONS.find(b => b.brandId === 'keylessssl.dev')!;
  return {
    brandId: defaultBrand.brandId,
    brandName: defaultBrand.brandName,
    marketingHost: defaultBrand.marketingHost,
    appHost: defaultBrand.appHost,
    isMarketingHost: false,
    isAppHost: false,
    preferredHost: defaultBrand.marketingHost,
  };
}

/**
 * Get all available brands
 */
export function getAllBrands(): BrandDefinition[] {
  return [...BRAND_DEFINITIONS];
}

/**
 * Check if a hostname belongs to any brand (marketing or app)
 */
export function isBrandHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return BRAND_DEFINITIONS.some(
    b => normalized === b.marketingHost || 
         normalized === `www.${b.marketingHost}` || 
         normalized === b.appHost
  );
}
