// Brand configuration for domain-based theming

export type BrandId = 'dcvaas' | 'keylessssl';

export interface BrandTheme {
  // CSS variable values (without var() wrapper)
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
}

export interface BrandConfig {
  id: BrandId;
  name: string;
  domain: string;
  // Hero section
  hero: {
    title: string;
    subtitle: string;
    cta: string;
  };
  // Problem/Solution messaging
  problem: {
    title: string;
    description: string;
  };
  solution: {
    title: string;
    pillars: Array<{
      title: string;
      description: string;
    }>;
  };
  // Pricing
  pricing: {
    free: {
      name: string;
      price: string;
      domains: number;
      features: string[];
    };
    pro: {
      name: string;
      price: string;
      domains: number;
      features: string[];
    };
  };
  // SEO
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  // UI copy
  ui: {
    cnameTarget: string;
    dashboardHeader: string[];
    addDomainInstruction: string;
  };
  // Theme (CSS variables)
  theme: BrandTheme;
}

// KeylessSSL Brand Configuration
export const KEYLESSSSL_BRAND: BrandConfig = {
  id: 'keylessssl',
  name: 'KeylessSSL',
  domain: 'keylessssl.dev',
  hero: {
    title: 'Stop Leaking Your DNS Root Keys to Production Servers',
    subtitle: 'Automate wildcard SSL for your SaaS using Delegated DCV. No certbot race conditions. No rate limits. Just one CNAME record.',
    cta: 'Get API Key (Free for 3 Domains)',
  },
  problem: {
    title: 'The DNS Key Security Problem',
    description: 'To automate Wildcard SSL today, you have to put your AWS Route53 or Cloudflare Global API keys on your web servers. If one server is compromised, your entire DNS zone is gone. That is a security failure.',
  },
  solution: {
    title: 'The Architecture',
    pillars: [
      {
        title: 'Air-Gapped Validation',
        description: 'You delegate only the _acme-challenge subdomain to us via CNAME. We handle the ACME challenge. Your root DNS keys never leave your vault.',
      },
      {
        title: 'The 47-Day Future',
        description: 'Browser vendors are pushing for 47-day certificate lifespans by 2029. Manual cron jobs will break. Our infrastructure is ready for the 8x renewal velocity.',
      },
      {
        title: 'Cloudflare Arbitrage',
        description: 'We run on Cloudflare\'s Edge. You get Enterprise-grade reliability without the Enterprise price tag.',
      },
    ],
  },
  pricing: {
    free: {
      name: 'Hacker',
      price: 'Free',
      domains: 3,
      features: ['3 Domains', 'Wildcards Included', 'Unlimited Renewals', 'Community Support'],
    },
    pro: {
      name: 'Pro',
      price: '$15/mo',
      domains: 50,
      features: ['50 Domains', 'API Access', 'Priority Queues', 'Email Support', "Cheaper than BrandSSL's $29/mo starter"],
    },
  },
  seo: {
    title: 'KeylessSSL - Secure SSL Automation via Delegated DCV',
    description: 'Automate wildcard SSL certificates without exposing DNS root keys. API-first, developer-focused, secure by design.',
    keywords: [
      'ssl certificate api',
      'wildcard ssl automation',
      'certbot alternative',
      'acme client',
      'acme protocol',
      'automate lets encrypt',
      'dns-01 challenge',
      'ssl monitoring api',
    ],
  },
  ui: {
    cnameTarget: 'custom.dcv.keylessssl.dev',
    dashboardHeader: ['Active Domains', 'Pending Verification', 'Rate Limit Status'],
    addDomainInstruction: 'Add this CNAME record to your DNS provider once. We will handle rotations forever.',
  },
  theme: {
    primary: '#2D7FF9',
    accent: '#A855F7',
    background: '#0B1020',
    surface: '#111A33',
    text: '#E8EEFF',
    muted: '#A8B3D8',
    success: '#2ECC71',
    warning: '#F1C40F',
    danger: '#FF4D4D',
    radius: '8px',
  },
};

// Default DCVaaS Brand Configuration
export const DCVAAS_BRAND: BrandConfig = {
  id: 'dcvaas',
  name: 'DCVaaS',
  domain: 'dcvaas.com',
  hero: {
    title: 'Secure SSL/TLS Automation via Delegated DCV',
    subtitle: "Delegate once with CNAME. We'll handle every ACME DNS-01 challenge securely—no root DNS API keys on your servers. Zero-touch renewals for the era of 47-day certificates.",
    cta: 'Get Started Free',
  },
  problem: {
    title: 'Why Delegated DCV?',
    description: 'Certificate lifetimes are shrinking—from 90 days today to 47 days by 2029. Manual renewals are unsustainable. DCVaaS provides the automation you need without compromising security.',
  },
  solution: {
    title: 'How It Works',
    pillars: [
      {
        title: 'Enhanced Security',
        description: 'No root DNS API keys on your servers. CNAME delegation isolates ACME challenges to a controlled subdomain, minimizing attack surface.',
      },
      {
        title: 'Zero-Touch Renewals',
        description: 'Set it and forget it. Our orchestrator monitors expiration and triggers renewals automatically, with retry logic and dead-letter queue for reliability.',
      },
      {
        title: 'Works with Any DNS Provider',
        description: 'Simply create a CNAME record in your existing DNS setup. No migrations, no nameserver changes. Premium tier offers single-click setup via OAuth.',
      },
    ],
  },
  pricing: {
    free: {
      name: 'Free',
      price: 'Free',
      domains: 3,
      features: ['3 Domains', 'Automated Renewals', 'Community Support'],
    },
    pro: {
      name: 'Pro',
      price: '$15/mo',
      domains: 15,
      features: ['15 Domains', 'API Access', 'Priority Support', 'Advanced Features'],
    },
  },
  seo: {
    title: 'DCVaaS - Delegated Certificate Validation as a Service',
    description: 'Automated SSL/TLS certificate management via delegated DNS-01 validation. Secure, scalable, and simple.',
    keywords: [
      'ssl automation',
      'certificate management',
      'dns-01 validation',
      'acme automation',
      'lets encrypt automation',
    ],
  },
  ui: {
    cnameTarget: 'custom.dcv.pcnaid.com',
    dashboardHeader: ['Domains', 'Status', 'Actions'],
    addDomainInstruction: 'Add the CNAME record to your DNS provider to begin validation.',
  },
  theme: {
    primary: '#2563eb',
    accent: '#8b5cf6',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    muted: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    radius: '8px',
  },
};

// Brand registry
const BRANDS: Record<BrandId, BrandConfig> = {
  dcvaas: DCVAAS_BRAND,
  keylessssl: KEYLESSSSL_BRAND,
};

/**
 * Detect brand based on hostname
 * @param hostname - window.location.hostname or custom hostname
 * @returns BrandConfig
 */
export function detectBrand(hostname?: string): BrandConfig {
  const host = hostname || window.location.hostname;
  
  // Check for keylessssl.dev domain
  if (host.includes('keylessssl.dev')) {
    return KEYLESSSSL_BRAND;
  }
  
  // Default to DCVaaS brand
  return DCVAAS_BRAND;
}

/**
 * Get brand configuration by ID
 */
export function getBrand(brandId: BrandId): BrandConfig {
  return BRANDS[brandId];
}

/**
 * Get all available brands
 */
export function getAllBrands(): BrandConfig[] {
  return Object.values(BRANDS);
}
