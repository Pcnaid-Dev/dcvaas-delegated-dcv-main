// src/lib/brands.ts
/**
 * Brand configuration system for domain-based theming
 * Detects brand by hostname and provides theme tokens and content
 */

export type BrandConfig = {
  id: string;
  name: string;
  domain: string;
  
  // Target audience & positioning
  targetPersona: string;
  valueProposition: string;
  brandVoice: string;
  
  // Visual theme tokens
  theme: {
    fontSans: string;
    fontMono: string;
    colorPrimary: string;
    colorAccent: string;
    colorSuccess: string;
    colorWarning: string;
    colorDanger: string;
    radius: string;
  };
  
  // Marketing copy
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
  };
  
  // Pricing
  pricing: {
    planName: string;
    price: string;
    period: string;
    description: string;
    features: string[];
  };
  
  // Dashboard UI copy
  dashboard: {
    secureStatus: string;
    actionNeeded: string;
    checkConnection: string;
  };
  
  // SEO keywords
  keywords: {
    primary: string[];
    secondary: string[];
  };
};

// Default DCVaaS brand (enterprise/developer-focused)
const DEFAULT_BRAND: BrandConfig = {
  id: 'dcvaas',
  name: 'DCVaaS',
  domain: 'dcv.pcnaid.com',
  
  targetPersona: 'DevOps engineers, SysAdmins, Technical teams',
  valueProposition: 'Automated SSL/TLS certificate management via delegated DNS-01 validation',
  brandVoice: 'Technical, precise, enterprise-grade',
  
  theme: {
    fontSans: 'Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    fontMono: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    colorPrimary: '#2563EB',
    colorAccent: '#3B82F6',
    colorSuccess: '#22C55E',
    colorWarning: '#F59E0B',
    colorDanger: '#EF4444',
    radius: '0.5rem',
  },
  
  hero: {
    headline: 'Secure SSL/TLS Automation via Delegated DCV',
    subheadline: 'Enterprise-grade certificate management with zero-touch renewals and delegated DNS-01 validation',
    cta: 'Get Started',
  },
  
  pricing: {
    planName: 'Pro',
    price: '$29',
    period: 'per month',
    description: 'For growing businesses and teams',
    features: [
      'Up to 15 domains',
      'Automatic renewals',
      'API access',
      'Email support',
      'Priority renewals',
    ],
  },
  
  dashboard: {
    secureStatus: 'Domain is active and secure',
    actionNeeded: 'Action required: Add CNAME record',
    checkConnection: 'Verify DNS',
  },
  
  keywords: {
    primary: ['ssl automation', 'certificate management', 'dns-01 validation'],
    secondary: ['wildcard certificates', 'acme protocol', 'zero-touch renewals'],
  },
};

// AutoCertify brand (small business/merchant-focused)
const AUTOCERTIFY_BRAND: BrandConfig = {
  id: 'autocertify',
  name: 'AutoCertify',
  domain: 'autocertify.net',
  
  targetPersona: 'Small business owners, Merchants, Non-technical founders',
  valueProposition: 'Instant fix for "Not Secure" warnings - Get the green padlock in minutes',
  brandVoice: 'Trust-oriented, calming, simple, urgency without jargon',
  
  theme: {
    fontSans: 'Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    fontMono: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    colorPrimary: '#2563EB',
    colorAccent: '#22C55E',
    colorSuccess: '#22C55E',
    colorWarning: '#F59E0B',
    colorDanger: '#EF4444',
    radius: '10px',
  },
  
  hero: {
    headline: 'Fix the "Not Secure" Warning on Your Website Instantly',
    subheadline: "Don't lose customers to a security error. Get the Green Padlock in less than 5 minutes. No coding required.",
    cta: 'Secure My Site Now',
  },
  
  pricing: {
    planName: 'Business Pro',
    price: '$15',
    period: 'per month',
    description: 'Perfect for small businesses and online merchants',
    features: [
      'Secure up to 50 custom domains',
      'Instant setup',
      '24/7 Monitoring',
      'Automatic renewal - never expires',
      'Works with WordPress, ClickFunnels, and more',
      'Zero downtime',
    ],
  },
  
  dashboard: {
    secureStatus: 'Your Site is Secure',
    actionNeeded: 'Action Needed: Please login to your domain registrar (like GoDaddy) and add this one record',
    checkConnection: 'Check Connection',
  },
  
  keywords: {
    primary: ['fix not secure site', 'auto renew ssl', 'secure my website'],
    secondary: [
      'ssl certificate for website',
      'https site not secure',
      'wordpress ssl plugin',
      'buy ssl certificate',
    ],
  },
};

// Brand registry
const BRANDS: BrandConfig[] = [
  DEFAULT_BRAND,
  AUTOCERTIFY_BRAND,
];

/**
 * Detect brand based on current hostname
 */
export function detectBrand(): BrandConfig {
  const hostname = window.location.hostname;
  
  // Match brand by domain
  const brand = BRANDS.find(b => {
    // Exact match or subdomain match
    return hostname === b.domain || hostname.endsWith(`.${b.domain}`);
  });
  
  // Return matched brand or default
  return brand || DEFAULT_BRAND;
}

/**
 * Get brand by ID
 */
export function getBrandById(id: string): BrandConfig | undefined {
  return BRANDS.find(b => b.id === id);
}

/**
 * Get all available brands
 */
export function getAllBrands(): BrandConfig[] {
  return BRANDS;
}
