// src/lib/brand.ts
// Brand detection and configuration utility

export type BrandName = 'dcvaas' | 'keylessssl.dev';

export interface BrandConfig {
  name: string;
  domain: string;
  displayName: string;
  tagline: string;
  features: {
    heroCopy: string;
    problemTitle: string;
    architectureTitle: string;
    pricingCta: string;
  };
}

const BRAND_CONFIGS: Record<BrandName, BrandConfig> = {
  dcvaas: {
    name: 'dcvaas',
    domain: 'dcvaas.dev',
    displayName: 'DCVaaS',
    tagline: 'Delegated Certificate Validation as a Service',
    features: {
      heroCopy: 'Secure SSL/TLS Automation via Delegated DCV',
      problemTitle: 'Why Delegated Validation?',
      architectureTitle: 'How It Works',
      pricingCta: 'Get Started',
    },
  },
  'keylessssl.dev': {
    name: 'keylessssl.dev',
    domain: 'keylessssl.dev',
    displayName: 'KeylessSSL',
    tagline: 'Stop leaking your DNS root keys to production servers',
    features: {
      heroCopy: 'Stop leaking your DNS root keys to production servers',
      problemTitle: 'Root Key Vulnerability',
      architectureTitle: 'Delegated DCV, not delegated trust',
      pricingCta: 'Get API Key — Free for 3 Domains',
    },
  },
};

/**
 * Detect brand from hostname
 */
export function detectBrand(): BrandName {
  if (typeof window === 'undefined') {
    return 'dcvaas';
  }

  const hostname = window.location.hostname.toLowerCase();

  // Check for keylessssl.dev
  if (hostname.includes('keylessssl.dev')) {
    return 'keylessssl.dev';
  }

  // Default to dcvaas
  return 'dcvaas';
}

/**
 * Get brand configuration
 */
export function getBrandConfig(brand?: BrandName): BrandConfig {
  const brandName = brand || detectBrand();
  return BRAND_CONFIGS[brandName];
}

/**
 * Apply brand theme to document
 */
export function applyBrandTheme(brand?: BrandName): void {
  const brandName = brand || detectBrand();
  const root = document.documentElement;

  // Set data-brand attribute
  root.setAttribute('data-brand', brandName);

  // Apply dark class for KeylessSSL
  if (brandName === 'keylessssl.dev') {
    root.classList.add('dark');
  }
}

/**
 * Get current brand
 */
export function getCurrentBrand(): BrandName {
  return detectBrand();
}

/**
 * Check if current brand is KeylessSSL
 */
export function isKeylessSSL(): boolean {
  return detectBrand() === 'keylessssl.dev';
}
