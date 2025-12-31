/**
 * SEO Safety Module for Multi-Brand Platform
 * 
 * Implements SEO safety requirements from the SEO_SAFETY_SPEC.md:
 * - X-Robots-Tag headers for app subdomains
 * - Per-brand robots.txt generation
 * - Per-brand sitemap.xml generation
 * - Canonical URL enforcement (self-referencing, no cross-domain)
 * - WWW to non-WWW redirects
 */

import { resolveBrandFromRequest, getCanonicalURL, getRedirectTarget, type BrandConfig } from '../../../shared/brand-resolver';


/**
 * Check if request is for app subdomain and add noindex header
 */
export function addAppNoindexHeader(request: Request, headers: Headers): Headers {
  const brand = resolveBrandFromRequest(request);
  
  if (brand && brand.isAppHost) {
    headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  
  return headers;
}

/**
 * Generate robots.txt for a specific brand
 */
export function generateRobotsTxt(request: Request): Response {
  const brand = resolveBrandFromRequest(request);
  
  if (!brand) {
    return new Response('Not Found', { status: 404 });
  }

  const url = new URL(request.url);
  const protocol = url.protocol;
  const host = url.hostname;

  // For marketing hosts: allow crawling
  // For app hosts: disallow all
  const robotsTxt = brand.isAppHost
    ? `# Robots.txt for ${brand.brandName} App (${brand.appHost})
# This is the application subdomain - not for public indexing

User-agent: *
Disallow: /

# No sitemap for app subdomain
`
    : `# Robots.txt for ${brand.brandName} (${brand.marketingHost})
# Marketing site - allow indexing

User-agent: *
Allow: /

# Brand-specific sitemap
Sitemap: ${protocol}//${host}/sitemap.xml
`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

/**
 * Generate sitemap.xml for a specific brand
 * Only includes marketing pages from the same host
 */
export function generateSitemapXml(request: Request): Response {
  const brand = resolveBrandFromRequest(request);
  
  if (!brand) {
    return new Response('Not Found', { status: 404 });
  }

  // App hosts don't have sitemaps
  if (brand.isAppHost) {
    return new Response('Not Found - App subdomain has no sitemap', { 
      status: 404,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  const url = new URL(request.url);
  const protocol = url.protocol;
  
  // Marketing pages (brand-specific, NO cross-brand URLs, NO app URLs)
  const pages = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
    { path: '/docs', priority: '0.8', changefreq: 'weekly' },
    { path: '/blog', priority: '0.7', changefreq: 'daily' },
  ];

  const now = new Date().toISOString().split('T')[0];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${protocol}//${brand.marketingHost}${page.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

/**
 * Handle www to non-www redirect
 * Returns redirect response if needed, null otherwise
 */
export function handleWwwRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  const redirectTarget = getRedirectTarget(url.hostname);
  
  if (redirectTarget) {
    // Build redirect URL with same protocol, path, and query
    const redirectUrl = `${url.protocol}//${redirectTarget}${url.pathname}${url.search}`;
    
    return new Response(null, {
      status: 308, // Permanent Redirect (preserves method)
      headers: {
        'Location': redirectUrl,
        'Cache-Control': 'public, max-age=31536000', // Cache redirect for 1 year
      },
    });
  }
  
  return null;
}

/**
 * Add canonical link to HTML response
 */
export function addCanonicalLink(html: string, request: Request): string {
  const brand = resolveBrandFromRequest(request);
  
  if (!brand) {
    return html;
  }

  const url = new URL(request.url);
  const canonicalUrl = getCanonicalURL(url.hostname, url.pathname);

  // Check if canonical already exists
  if (html.includes('rel="canonical"')) {
    // Replace existing canonical
    return html.replace(
      /<link[^>]+rel="canonical"[^>]*>/i,
      `<link rel="canonical" href="${canonicalUrl}" />`
    );
  }

  // Add canonical before </head>
  return html.replace(
    '</head>',
    `  <link rel="canonical" href="${canonicalUrl}" />\n</head>`
  );
}

/**
 * Add brand-specific meta tags to HTML
 */
export function addBrandMetaTags(html: string, request: Request): string {
  const brand = resolveBrandFromRequest(request);
  
  if (!brand) {
    return html;
  }

  const url = new URL(request.url);
  const canonicalUrl = getCanonicalURL(url.hostname, url.pathname);

  // For app hosts, add noindex meta tag as backup
  if (brand.isAppHost) {
    if (!html.includes('name="robots"')) {
      html = html.replace(
        '</head>',
        `  <meta name="robots" content="noindex, nofollow" />\n</head>`
      );
    }
  }

  // Add Open Graph tags with brand-specific URLs (self-referencing)
  if (!html.includes('property="og:url"')) {
    html = html.replace(
      '</head>',
      `  <meta property="og:url" content="${canonicalUrl}" />\n</head>`
    );
  }

  return html;
}

/**
 * Comprehensive SEO safety middleware
 * Applies all SEO safety measures to responses
 */
export async function applySeoSafety(request: Request, response: Response): Promise<Response> {
  const brand = resolveBrandFromRequest(request);
  
  if (!brand) {
    return response;
  }

  // Clone response to modify headers
  const headers = new Headers(response.headers);

  // Add X-Robots-Tag for app subdomains
  if (brand.isAppHost) {
    headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  // For HTML responses, process content
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    // Read the response body
    const html = await response.text();
    
    // Apply HTML transformations
    let modifiedHtml = html;
    modifiedHtml = addCanonicalLink(modifiedHtml, request);
    modifiedHtml = addBrandMetaTags(modifiedHtml, request);
    
    // Return new response with modified HTML and headers
    return new Response(modifiedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
