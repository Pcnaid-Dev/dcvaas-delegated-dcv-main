// src/components/BrandLayout.tsx
import { ReactNode } from 'react';
import { useBrand } from '@/contexts/BrandContext';
import { KeylessLayout } from './layouts/KeylessLayout';
import { AgencyLayout } from './layouts/AgencyLayout';
import { WizardLayout } from './layouts/WizardLayout';

export function BrandLayout({ children, onNavigate, currentPage }: { children: ReactNode; onNavigate?: (page: string) => void; currentPage?: string }) {
  const { brand } = useBrand();

  if (brand.brandId === 'keylessssl.dev') {
    return <KeylessLayout currentPage={currentPage}>{children}</KeylessLayout>;
  }

  if (brand.brandId === 'delegatedssl.com') {
    return <AgencyLayout onNavigate={onNavigate} currentPage={currentPage}>{children}</AgencyLayout>;
  }

  // Default to AutoCertify (Wizard)
  return <WizardLayout currentPage={currentPage}>{children}</WizardLayout>;
}