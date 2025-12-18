// src/config/brands.ts
// Brand configuration for domain-based theming

export type BrandConfig = {
  name: string;
  domain: string;
  tagline: string;
  description: string;
  
  // Hero section
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
    secondaryCta?: string;
  };
  
  // Value propositions
  valueProps: {
    title: string;
    description: string;
  }[];
  
  // Pricing
  pricing: {
    plans: {
      name: string;
      price: string;
      period: string;
      description: string;
      features: string[];
      cta: string;
      highlighted: boolean;
    }[];
  };
  
  // Marketing copy
  marketing: {
    profitCenterHeadline?: string;
    profitCenterBody?: string;
  };
  
  // Theme colors
  theme: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
    success: string;
    warning: string;
    danger: string;
    radius: string;
  };
  
  // Voice & tone
  voice: {
    tone: string; // e.g., "Authoritative, operational, margin-focused"
    style: string; // e.g., "Agency operations dashboard"
  };
  
  // SEO
  seo: {
    keywords: string[];
  };
};

// DelegatedSSL Brand Configuration
export const DELEGATED_SSL_BRAND: BrandConfig = {
  name: 'DelegatedSSL',
  domain: 'delegatedssl.com',
  tagline: 'The "Set and Forget" SSL Dashboard for Agencies',
  description: 'Manage 1,000+ client domains in one place. Stop the 3 AM "Certificate Expired" panic calls.',
  
  hero: {
    headline: 'The "Set and Forget" SSL Dashboard for Agencies',
    subheadline: 'Manage 1,000+ client domains in one place. Stop the 3 AM "Certificate Expired" panic calls.',
    cta: 'Start Agency Trial',
    secondaryCta: 'See the Dashboard',
  },
  
  valueProps: [
    {
      title: 'Stop Certificate Sprawl',
      description: 'You have clients on GoDaddy, Namecheap, and Cloudflare. We give you a single "Green Light" dashboard for all of them.',
    },
    {
      title: 'Protect Your Margins',
      description: 'Competitors charge per-domain overages that punish your growth. Our flat-rate Agency Plan lets you scale profitably.',
    },
    {
      title: '100% White Label',
      description: 'Your clients see your brand on the validation instructions, not ours. Position SSL management as a premium service you provide.',
    },
  ],
  
  pricing: {
    plans: [
      {
        name: 'Agency Plan',
        price: '$79',
        period: 'per month',
        description: 'Flat rate for growing agencies',
        features: [
          'Up to 250 Domains',
          'Flat rate - no overages',
          'Single "Green Light" dashboard',
          'Team management',
          'White-label client portal',
          'Email support',
        ],
        cta: 'Start Agency Trial',
        highlighted: true,
      },
      {
        name: 'Enterprise',
        price: '$299',
        period: 'per month',
        description: 'For large-scale operations',
        features: [
          '2,000+ Domains',
          'Everything in Agency Plan',
          'SLA guarantees',
          'Priority support',
          'Custom integrations',
          'Dedicated account manager',
        ],
        cta: 'Request Enterprise',
        highlighted: false,
      },
    ],
  },
  
  marketing: {
    profitCenterHeadline: 'Turn SSL from a Cost Center into a Profit Center',
    profitCenterBody: 'Most agencies absorb the cost of SSL management. With DelegatedSSL, you can bundle "Premium Security Monitoring" into your maintenance packages. Our flat rate costs you pennies per domain; you charge clients $10/mo for peace of mind.',
  },
  
  theme: {
    primary: '#0F4C81', // Authoritative blue
    accent: '#14B8A6', // Teal for success/active states
    background: '#F7FAFC',
    surface: '#FFFFFF',
    text: '#0B1220',
    muted: '#5B677A',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    radius: '6px',
  },
  
  voice: {
    tone: 'Authoritative, operational, margin-focused',
    style: 'Agency operations dashboard',
  },
  
  seo: {
    keywords: [
      'white label ssl',
      'saas custom domains',
      'manage client ssl',
      'custom domain https',
      'manage client ssl certificates',
      'ssl for saas',
      'vanity domain ssl',
      'cname ssl verification',
    ],
  },
};

// Default DCVaaS Brand (for fallback)
export const DEFAULT_BRAND: BrandConfig = {
  name: 'DCVaaS',
  domain: 'dcvaas.com',
  tagline: 'Delegated DCV-as-a-Service',
  description: 'Secure SSL/TLS automation via delegated DNS-01 validation',
  
  hero: {
    headline: 'Secure SSL/TLS Automation via Delegated DCV',
    subheadline: 'One-time CNAME setup. Zero-touch renewals. Enterprise-grade reliability for shrinking certificate lifetimes.',
    cta: 'Get Started Free',
    secondaryCta: 'View Docs',
  },
  
  valueProps: [
    {
      title: 'One-Time Setup',
      description: 'Create a single CNAME record and delegate validation authority without sharing root DNS credentials.',
    },
    {
      title: 'Automated Renewals',
      description: 'Certificates automatically renew 30 days before expiration. No manual intervention required.',
    },
    {
      title: 'Enterprise Security',
      description: 'Never expose your DNS API keys. Comprehensive audit logs for compliance and forensics.',
    },
  ],
  
  pricing: {
    plans: [
      {
        name: 'Free',
        price: '$0',
        period: 'forever',
        description: 'Perfect for developers and small projects',
        features: [
          'Up to 3 domains',
          'Automatic renewals',
          'DNS-01 validation',
          'Community support',
          'Basic audit logs',
        ],
        cta: 'Get Started',
        highlighted: false,
      },
      {
        name: 'Pro',
        price: '$29',
        period: 'per month',
        description: 'For growing businesses and teams',
        features: [
          'Up to 15 domains',
          'All Free features',
          'API access',
          'Email support',
          'Priority renewals',
          'Custom CA support',
        ],
        cta: 'Start Trial',
        highlighted: true,
      },
      {
        name: 'Agency',
        price: '$99',
        period: 'per month',
        description: 'For agencies and enterprises',
        features: [
          'Up to 50 domains',
          'All Pro features',
          'Team management & RBAC',
          'Single-click CNAME setup (OAuth)',
          'White-label branding',
          'Full audit logs',
          'Priority support',
          'Custom domain',
        ],
        cta: 'Contact Sales',
        highlighted: false,
      },
    ],
  },
  
  marketing: {},
  
  theme: {
    primary: '#0F4C81',
    accent: '#14B8A6',
    background: '#F7FAFC',
    surface: '#FFFFFF',
    text: '#0B1220',
    muted: '#5B677A',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    radius: '6px',
  },
  
  voice: {
    tone: 'Professional, technical, security-focused',
    style: 'Enterprise control plane',
  },
  
  seo: {
    keywords: [
      'ssl automation',
      'delegated dns validation',
      'certificate management',
      'acme dns-01',
      'wildcard certificates',
    ],
  },
};

// Brand registry - maps hostname patterns to brand configs
const BRAND_REGISTRY: Record<string, BrandConfig> = {
  'delegatedssl.com': DELEGATED_SSL_BRAND,
  'localhost': DEFAULT_BRAND, // For development
};

/**
 * Get the current brand configuration based on hostname
 */
export function getCurrentBrand(): BrandConfig {
  const hostname = window.location.hostname;
  
  // Check for exact match
  if (BRAND_REGISTRY[hostname]) {
    return BRAND_REGISTRY[hostname];
  }
  
  // Check for subdomain match (e.g., app.delegatedssl.com)
  for (const [domain, config] of Object.entries(BRAND_REGISTRY)) {
    if (hostname.endsWith(`.${domain}`) || hostname === domain) {
      return config;
    }
  }
  
  // Default fallback
  return DEFAULT_BRAND;
}

/**
 * Check if current brand is DelegatedSSL
 */
export function isDelegatedSSL(): boolean {
  return getCurrentBrand().domain === 'delegatedssl.com';
}
