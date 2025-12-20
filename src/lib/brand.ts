// src/lib/brand.ts
/**
 * Brand detection and initialization
 * Sets the data-brand attribute on the document root based on hostname
 */

export function initializeBrand() {
  const hostname = window.location.hostname;
  
  // Map hostnames to brand identifiers
  const brandMap: Record<string, string> = {
    'delegatedssl.com': 'delegatedssl.com',
    'www.delegatedssl.com': 'delegatedssl.com',
    // Add more brands here as needed
  };
  
  // Check if hostname matches a brand
  const brand = brandMap[hostname];
  
  if (brand) {
    document.documentElement.dataset.brand = brand;
  }
  
  // For localhost development, you can enable a brand with query param: ?brand=delegatedssl.com
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
    const params = new URLSearchParams(window.location.search);
    const brandParam = params.get('brand');
    if (brandParam && Object.values(brandMap).includes(brandParam)) {
      document.documentElement.dataset.brand = brandParam;
    }
  }
}

export function getCurrentBrand(): string | undefined {
  return document.documentElement.dataset.brand;
}
