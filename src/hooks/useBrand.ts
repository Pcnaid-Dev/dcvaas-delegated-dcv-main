// src/hooks/useBrand.ts
import { getCurrentBrand } from '@/lib/brand';
import { useMemo } from 'react';

export type Brand = 'delegatedssl' | 'dcvaas' | 'default';

export function useBrand(): Brand {
  const brand = useMemo(() => {
    const currentBrand = getCurrentBrand();
    if (currentBrand === 'delegatedssl.com') {
      return 'delegatedssl' as const;
    }
    return 'dcvaas' as const;
  }, []);

  return brand;
}

export const BRAND_CONFIG = {
  delegatedssl: {
    name: 'DelegatedSSL',
    tagline: 'The Set-and-Forget SSL Dashboard for Agencies',
    primaryCTA: 'Start Your Agency Trial',
    secondaryCTA: 'Schedule a Demo',
    trustLine: 'No credit card. 10-minute setup. Cancel anytime.',
    searchPlaceholder: 'Search domains, clients...',
    emptyStateHealthy: 'No urgent issues. You\'re green.',
    emptyStateAlert: (count: number) => `${count} domains need client verification to go live.`,
    emptyStateDomains: 'No domains yet. Import a list to get your first dashboard.',
  },
  dcvaas: {
    name: 'DCVaaS',
    tagline: 'Automated Certificate Management via Delegated DCV',
    primaryCTA: 'Get Started',
    secondaryCTA: 'View Documentation',
    trustLine: 'Free tier available. No credit card required.',
    searchPlaceholder: 'Search domains...',
    emptyStateHealthy: 'All domains are healthy.',
    emptyStateAlert: (count: number) => `${count} domains need attention.`,
    emptyStateDomains: 'No domains yet. Add your first domain to get started.',
  },
};

export function getBrandConfig(brand: Brand) {
  return BRAND_CONFIG[brand] || BRAND_CONFIG.dcvaas;
}
