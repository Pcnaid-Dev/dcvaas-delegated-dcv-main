/**
 * SPA Worker with Multi-Brand SEO Safety
 * 
 * Handles:
 * - Static asset serving from /dist
 * - Brand-aware robots.txt generation
 * - Brand-aware sitemap.xml generation
 * - WWW to non-WWW redirects
 * - X-Robots-Tag headers for app subdomains
 * - Canonical URL enforcement
 */

import { 
  resolveBrandFromHostname, 
  getRedirectTarget,
  getCanonicalURL,
  type BrandConfig
} from './shared/brand-resolver';

function handleWwwRedirect(url: URL): Response | null {
  const redirectTarget = getRedirectTarget(url.hostname);
  if (redirectTarget) {
    const redirectUrl = `${url.protocol}//${redirectTarget}${url.pathname}${url.search}`;
    return new Response(null, {
      status: 308,
      headers: {
        'Location': redirectUrl,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  }
  return null;
}

function generateRobotsTxt(brand: BrandConfig, protocol: string, hostname: string): Response {
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
Sitemap: ${protocol}//${hostname}/sitemap.xml
`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function generateSitemapXml(brand: BrandConfig, protocol: string): Response {
  if (brand.isAppHost) {
    return new Response('Not Found - App subdomain has no sitemap', {
      status: 404,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  // Brand-specific pages per seo_safety_rules.json
  let pages;
  if (brand.brandId === 'autocertify.net') {
    pages = [
      { path: '/', priority: '1.0', changefreq: 'weekly' },
      { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
      { path: '/guides', priority: '0.8', changefreq: 'weekly' },
      { path: '/blog', priority: '0.7', changefreq: 'daily' },
    ];
  } else {
    // KeylessSSL and DelegatedSSL use /docs
    pages = [
      { path: '/', priority: '1.0', changefreq: 'weekly' },
      { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
      { path: '/docs', priority: '0.8', changefreq: 'weekly' },
      { path: '/blog', priority: '0.7', changefreq: 'daily' },
    ];
  }

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
 * Inject canonical and meta tags into HTML
 */
async function injectSEOTags(response: Response, brand: BrandConfig, url: URL): Promise<Response> {
  const contentType = response.headers.get('content-type') || '';
  
  // Only process HTML responses
  if (!contentType.includes('text/html')) {
    return response;
  }

  // Read the HTML content
  let html = await response.text();
  
  // Generate canonical URL
  const canonicalUrl = getCanonicalURL(url.hostname, url.pathname);
  
  // Inject canonical tag if not already present
  if (!html.includes('rel="canonical"')) {
    html = html.replace(
      '</head>',
      `  <link rel="canonical" href="${canonicalUrl}" />\n</head>`
    );
  } else {
    // Replace existing canonical with correct one
    html = html.replace(
      /<link[^>]+rel="canonical"[^>]*>/i,
      `<link rel="canonical" href="${canonicalUrl}" />`
    );
  }
  
  // For app subdomains, inject noindex meta tag as backup
  if (brand && brand.isAppHost) {
    if (!html.includes('name="robots"')) {
      html = html.replace(
        '</head>',
        `  <meta name="robots" content="noindex, nofollow" />\n</head>`
      );
    }
  }
  
  // Create new response with modified HTML
  const headers = new Headers(response.headers);
  headers.set('Content-Length', new Blob([html]).size.toString());
  
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const brand = resolveBrandFromHostname(url.hostname);

    // Handle WWW to non-WWW redirect
    const redirect = handleWwwRedirect(url);
    if (redirect) return redirect;

    // Handle robots.txt per brand
    if (url.pathname === '/robots.txt') {
      if (!brand) {
        return new Response('Not Found', { status: 404 });
      }
      return generateRobotsTxt(brand, url.protocol, url.hostname);
    }

    // Handle sitemap.xml per brand
    if (url.pathname === '/sitemap.xml') {
      if (!brand) {
        return new Response('Not Found', { status: 404 });
      }
      return generateSitemapXml(brand, url.protocol);
    }

    // Try to fetch the requested asset (e.g. /main.js, /logo.png) directly
    let response = await env.ASSETS.fetch(request);

    // If the asset is not found (404), and it's not a file in /assets/,
    // serve index.html instead. This fixes "Page Not Found" on refresh.
    if (response.status === 404 && !url.pathname.startsWith('/assets/')) {
      response = await env.ASSETS.fetch(new URL("/index.html", request.url));
    }

    // Inject canonical and meta tags into HTML
    if (brand) {
      response = await injectSEOTags(response, brand, url);
    }

    // Add X-Robots-Tag header for app subdomains
    if (brand && brand.isAppHost) {
      const headers = new Headers(response.headers);
      headers.set('X-Robots-Tag', 'noindex, nofollow');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  }
};