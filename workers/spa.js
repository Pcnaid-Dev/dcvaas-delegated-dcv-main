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

// Import brand resolver (inline since we can't import TypeScript in .js)
// We'll inline the necessary functions

const BRAND_DEFINITIONS = [
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

function normalizeHostname(hostname) {
  return hostname.replace(/^www\./, '').toLowerCase();
}

function resolveBrandFromHostname(hostname) {
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

function handleWwwRedirect(url) {
  if (url.hostname.startsWith('www.')) {
    const normalized = normalizeHostname(url.hostname);
    for (const brand of BRAND_DEFINITIONS) {
      if (normalized === brand.marketingHost) {
        const redirectUrl = `${url.protocol}//${brand.marketingHost}${url.pathname}${url.search}`;
        return new Response(null, {
          status: 308,
          headers: {
            'Location': redirectUrl,
            'Cache-Control': 'public, max-age=31536000',
          },
        });
      }
    }
  }
  return null;
}

function generateRobotsTxt(brand, protocol, hostname) {
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

function generateSitemapXml(brand, protocol) {
  if (brand.isAppHost) {
    return new Response('Not Found - App subdomain has no sitemap', {
      status: 404,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

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

export default {
  async fetch(request, env) {
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