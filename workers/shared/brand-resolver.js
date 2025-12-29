/**
 * Brand Resolution System (Shared - JavaScript)
 * 
 * Shared brand resolver that can be imported by both TypeScript and JavaScript workers.
 * Single source of truth for brand definitions and resolution logic.
 */

export const BRAND_DEFINITIONS = [
  {
    brandId: 'autocertify.net',
    brandName: 'AutoCertify',
    marketingHost: 'autocertify.net',
    appHost: 'wizard.autocertify.net',
    marketingPages: ['/', '/pricing', '/guides', '/blog'],
  },
  {
    brandId: 'delegatedssl.com',
    brandName: 'DelegatedSSL',
    marketingHost: 'delegatedssl.com',
    appHost: 'portal.delegatedssl.com',
    marketingPages: ['/', '/pricing', '/docs', '/blog'],
  },
  {
    brandId: 'keylessssl.dev',
    brandName: 'KeylessSSL',
    marketingHost: 'keylessssl.dev',
    appHost: 'app.keylessssl.dev',
    marketingPages: ['/', '/pricing', '/docs', '/blog'],
  },
];

/**
 * Normalize hostname by stripping www. prefix
 */
export function normalizeHostname(hostname) {
  return hostname.replace(/^www\./, '').toLowerCase();
}

/**
 * Resolve brand from hostname string
 */
export function resolveBrandFromHostname(hostname) {
  const normalized = normalizeHostname(hostname);

  // Check if it matches marketing host
  for (const brand of BRAND_DEFINITIONS) {
    if (normalized === brand.marketingHost || normalized === `www.${brand.marketingHost}`) {
      return {
        ...brand,
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
        ...brand,
        isMarketingHost: false,
        isAppHost: true,
        preferredHost: brand.marketingHost,
      };
    }
  }

  return null;
}

/**
 * Resolve brand from Request object
 */
export function resolveBrandFromRequest(request) {
  const url = new URL(request.url);
  return resolveBrandFromHostname(url.hostname);
}

/**
 * Check if hostname should be redirected to preferred host (non-www)
 */
export function getRedirectTarget(hostname) {
  const normalized = normalizeHostname(hostname);
  
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
 */
export function getCanonicalURL(hostname, pathname) {
  const normalized = normalizeHostname(hostname);
  
  for (const brand of BRAND_DEFINITIONS) {
    if (normalized === brand.marketingHost || hostname === `www.${brand.marketingHost}`) {
      const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
      return `https://${brand.marketingHost}${cleanPath}`;
    }
  }

  for (const brand of BRAND_DEFINITIONS) {
    if (normalized === brand.appHost) {
      const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
      return `https://${brand.appHost}${cleanPath}`;
    }
  }

  const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  return `https://${normalized}${cleanPath}`;
}
