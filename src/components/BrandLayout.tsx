// src/components/BrandLayout.tsx
import { ReactNode } from 'react';
import { useBrand } from '@/contexts/BrandContext';
import { KeylessLayout } from './layouts/KeylessLayout';
import { AgencyLayout } from './layouts/AgencyLayout';
import { WizardLayout } from './layouts/WizardLayout';

export function BrandLayout({ children, onNavigate }: { children: ReactNode; onNavigate?: (page: string) => void }) {
  const { brand } = useBrand();

  if (brand.brandId === 'keylessssl.dev') {
    return <KeylessLayout>{children}</KeylessLayout>;
  }

  if (brand.brandId === 'delegatedssl.com') {
    return <AgencyLayout onNavigate={onNavigate}>{children}</AgencyLayout>;
  }

  // Default to AutoCertify (Wizard)
  return <WizardLayout>{children}</WizardLayout>;
}