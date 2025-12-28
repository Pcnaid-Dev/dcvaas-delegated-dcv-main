/**
 * Brand Resolution System (Backend/Workers)
 * 
 * Resolves the current brand based on request hostname.
 * Used by Cloudflare Workers to determine brand context for:
 * - SEO safety (robots.txt, sitemap.xml, X-Robots-Tag)
 * - Canonical URL generation
 * - Cross-brand link enforcement
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
 * Resolve brand from Request object
 */
export function resolveBrandFromRequest(request: Request): BrandConfig | null {
  const url = new URL(request.url);
  const hostname = url.hostname;

  return resolveBrandFromHostname(hostname);
}

/**
 * Resolve brand from hostname string
 */
export function resolveBrandFromHostname(hostname: string): BrandConfig | null {
  const normalized = normalizeHostname(hostname);

  // Check if it matches marketing host
  for (const brand of BRAND_DEFINITIONS) {
    if (normalized === brand.marketingHost || normalized === `www.${brand.marketingHost}`) {
      return {
        brandId: brand.brandId,
        brandName: brand.brandName,
        marketingHost: brand.marketingHost,
        appHost: brand.appHost,
        isMarketingHost: true,
        isAppHost: false,
        preferredHost: brand.marketingHost,
      };
    }
  }

  // Check if it matches app host
  for (const brand of BRAND_DEFINITIONS) {
    if (normalized === brand.appHost) {
      return {
        brandId: brand.brandId,
        brandName: brand.brandName,
        marketingHost: brand.marketingHost,
        appHost: brand.appHost,
        isMarketingHost: false,
        isAppHost: true,
        preferredHost: brand.marketingHost,
      };
    }
  }

  return null;
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

/**
 * Check if hostname should be redirected to preferred host (non-www)
 * Returns the redirect target if redirect is needed, null otherwise
 */
export function getRedirectTarget(hostname: string): string | null {
  const normalized = normalizeHostname(hostname);
  
  // If hostname starts with www., redirect to non-www
  if (hostname.startsWith('www.')) {
    for (const brand of BRAND_DEFINITIONS) {
      if (normalized === brand.marketingHost) {
        return brand.marketingHost;
      }
    }
  }

  return null;
}

/**
 * Get canonical URL for a given path and hostname
 * Always returns self-referencing canonical (same host)
 */
export function getCanonicalURL(hostname: string, pathname: string): string {
  const normalized = normalizeHostname(hostname);
  
  // Use non-www version as canonical
  for (const brand of BRAND_DEFINITIONS) {
    if (normalized === brand.marketingHost || hostname === `www.${brand.marketingHost}`) {
      // Clean up pathname (remove trailing slash except for root)
      const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
      return `https://${brand.marketingHost}${cleanPath}`;
    }
  }

  // For app hosts, return as-is
  for (const brand of BRAND_DEFINITIONS) {
    if (normalized === brand.appHost) {
      const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
      return `https://${brand.appHost}${cleanPath}`;
    }
  }

  // Fallback
  const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  return `https://${normalized}${cleanPath}`;
}
