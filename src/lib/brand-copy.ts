// src/lib/brand-copy.ts
// Brand-specific copy for AutoCertify and DCVaaS

import type { Brand } from '@/hooks/useBrandTheme';

export interface BrandCopy {
  // Site Identity
  brandName: string;
  tagline: string;
  
  // Hero Section
  heroHeadline: string;
  heroSubheadPrimary: string;
  heroSubheadSecondary: string;
  heroPrimaryCTA: string;
  heroSecondaryCTA: string;
  heroCTAMicrocopy: string;
  
  // Reassurance Chips
  reassuranceChips: string[];
  
  // Benefits
  benefits: Array<{
    title: string;
    description: string;
  }>;
  
  // How It Works
  howItWorksTitle: string;
  howItWorksSupportMicrocopy: string;
  steps: Array<{
    label: string;
    description: string;
  }>;
  
  // Pricing
  pricingLine: string;
  pricingPlanName: string;
  pricingFeatures: string[];
  pricingCTA: string;
  
  // FAQ
  faqTitle: string;
  faqSubtitle: string;
  faqItems: Array<{
    question: string;
    answer: string;
  }>;
  
  // Trust Bar
  trustBarText: string;
  trustBarSecure: string;
}

export const AUTOCERTIFY_COPY: BrandCopy = {
  brandName: 'AutoCertify',
  tagline: 'Instant SSL/TLS Security',
  
  heroHeadline: 'Fix the "Not Secure" Warning on Your Website Instantly',
  heroSubheadPrimary: 'Don\'t lose customers to a security error. Get the Green Padlock in less than 5 minutes. No coding required.',
  heroSubheadSecondary: 'We know how alarming that "Not Secure" warning is. We\'ll guide you step-by-step.',
  heroPrimaryCTA: 'Secure My Site Now',
  heroSecondaryCTA: 'Check my site first',
  heroCTAMicrocopy: 'No credit card surprises. Cancel anytime. You\'ll see progress immediately.',
  
  reassuranceChips: [
    '✅ Zero Downtime',
    '✅ Works with Everything',
    '✅ Set up in under 5 minutes',
    '✅ 24/7 monitoring',
  ],
  
  benefits: [
    {
      title: 'Instant Security Fix',
      description: 'Turn the warning off fast—without digging into settings.',
    },
    {
      title: 'Zero Downtime',
      description: 'We verify everything before you switch, so your site stays live.',
    },
    {
      title: 'Works with Everything',
      description: 'WordPress, Shopify, Wix, ClickFunnels, custom sites—if it\'s a website, we can secure it.',
    },
    {
      title: '24/7 Automatic Protection',
      description: 'We keep watch so you don\'t have to think about it again.',
    },
  ],
  
  howItWorksTitle: 'Secure your site in 3 simple steps',
  howItWorksSupportMicrocopy: 'Stuck? We\'ll walk you through it in chat—24/7.',
  steps: [
    {
      label: 'Sign up',
      description: 'Enter your domain and email.',
    },
    {
      label: 'Add one record (we guide you)',
      description: 'We show you exactly what to paste, with a "Copy" button.',
    },
    {
      label: 'You\'re secure',
      description: 'Big green check: Your site is safe now.',
    },
  ],
  
  pricingLine: 'Just $15/month for peace of mind — secure up to 50 sites.',
  pricingPlanName: 'Business Pro ($15/mo)',
  pricingFeatures: [
    '✅ Instant setup',
    '✅ Automatic renewals',
    '✅ 24/7 monitoring',
    '✅ Guided setup (chat support)',
  ],
  pricingCTA: 'Secure My Site Now',
  
  faqTitle: 'Common Questions',
  faqSubtitle: 'Everything you need to know about securing your site',
  faqItems: [
    {
      question: 'Is this legit?',
      answer: 'Yes. We use industry-standard SSL and best practices to secure your connection. You get the same "secure" experience visitors expect.',
    },
    {
      question: 'What do I need to do?',
      answer: 'Usually just add one record (we show you exactly what to paste). No coding.',
    },
    {
      question: 'Will my site go down?',
      answer: 'No — Zero Downtime. We verify the setup before switching.',
    },
    {
      question: 'Will it work with my website builder / host?',
      answer: 'Works with Everything. WordPress, Shopify, Wix, ClickFunnels, and custom sites.',
    },
    {
      question: 'How will I know it\'s fixed?',
      answer: 'We show a live status, and you\'ll see the green padlock once it\'s active.',
    },
  ],
  
  trustBarText: 'Need help? Chat 24/7 · support@autocertify.com',
  trustBarSecure: '🔒 Secure & private',
};

export const DCVAAS_COPY: BrandCopy = {
  brandName: 'DCVaaS',
  tagline: 'Delegated DCV as a Service',
  
  heroHeadline: 'Secure SSL/TLS Automation via Delegated DCV',
  heroSubheadPrimary: 'Delegate once with CNAME. We\'ll handle every ACME DNS-01 challenge securely—no root DNS API keys on your servers. Zero-touch renewals for the era of 47-day certificates.',
  heroSubheadSecondary: '',
  heroPrimaryCTA: 'Get Started Free',
  heroSecondaryCTA: 'Read Documentation',
  heroCTAMicrocopy: '',
  
  reassuranceChips: [],
  
  benefits: [
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
  
  howItWorksTitle: 'How It Works',
  howItWorksSupportMicrocopy: '',
  steps: [
    {
      label: 'Add Your Domain',
      description: 'Enter your domain in the DCVaaS dashboard',
    },
    {
      label: 'Create CNAME Record',
      description: 'Add the CNAME record to your DNS provider',
    },
    {
      label: 'Verify & Issue',
      description: 'We verify and issue your certificate',
    },
    {
      label: 'Auto-Renewal',
      description: 'Certificates renew automatically',
    },
  ],
  
  pricingLine: 'Flexible plans for teams of all sizes',
  pricingPlanName: '',
  pricingFeatures: [],
  pricingCTA: 'View Pricing',
  
  faqTitle: 'Frequently Asked Questions',
  faqSubtitle: 'Everything you need to know about DCVaaS',
  faqItems: [
    {
      question: 'What is delegated DNS-01 validation?',
      answer: 'Delegated DNS-01 validation allows you to prove domain ownership by creating a single CNAME record that points to our service. We then handle all ACME challenges without requiring your root DNS API keys, significantly improving security.',
    },
    {
      question: 'Do I need to provide DNS API credentials?',
      answer: 'No! That\'s the beauty of delegated validation. You only need to create a single CNAME record in your DNS. Our service handles all ACME challenges without accessing your DNS provider\'s API.',
    },
    {
      question: 'How often are certificates renewed?',
      answer: 'Certificates are automatically renewed 30 days before expiration. With the upcoming shift to 47-day certificate lifetimes, our automated renewal system ensures you\'ll never have an expired certificate.',
    },
    {
      question: 'What DNS providers are supported?',
      answer: 'All DNS providers are supported! Since you only need to create a CNAME record, DCVaaS works with any DNS provider including Cloudflare, Route 53, Google Cloud DNS, and traditional registrar DNS services.',
    },
    {
      question: 'Is there a free tier?',
      answer: 'Yes! Our free tier includes 3 domains with automated certificate issuance and renewal. Perfect for personal projects or trying out the service before upgrading to Pro or Agency plans.',
    },
    {
      question: 'Can I use this for wildcard certificates?',
      answer: 'Yes! DCVaaS supports both single-domain and wildcard certificates. Wildcard certificates require DNS-01 validation, which is exactly what our delegated validation system is designed for.',
    },
  ],
  
  trustBarText: '',
  trustBarSecure: '',
};

export function getBrandCopy(brand: Brand): BrandCopy {
  return brand === 'autocertify' ? AUTOCERTIFY_COPY : DCVAAS_COPY;
}
