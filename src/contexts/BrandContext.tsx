/**
 * Brand Context
 * 
 * Provides brand configuration and microcopy to all React components.
 * Automatically resolves brand based on hostname or override parameters.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { resolveBrand, type BrandConfig } from '@/lib/brand-resolver';
import { loadMicrocopy, type Microcopy } from '@/lib/microcopy';

interface BrandContextValue {
  brand: BrandConfig;
  microcopy: Microcopy;
  isLoading: boolean;
}

const BrandContext = createContext<BrandContextValue | null>(null);

interface BrandProviderProps {
  children: ReactNode;
}

export function BrandProvider({ children }: BrandProviderProps) {
  const [brand] = useState<BrandConfig>(() => resolveBrand());
  const [microcopy, setMicrocopy] = useState<Microcopy>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load microcopy for the resolved brand
    loadMicrocopy(brand.brandId)
      .then((mc) => {
        setMicrocopy(mc);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load brand microcopy:', error);
        setIsLoading(false);
      });

    // Set data-brand attribute on HTML element for CSS theming
    document.documentElement.setAttribute('data-brand', brand.brandId);

    // Update page title with brand name
    const baseTitle = document.title;
    if (!baseTitle.includes(brand.brandName)) {
      document.title = `${brand.brandName} - SSL/TLS Certificate Automation`;
    }
  }, [brand]);

  return (
    <BrandContext.Provider value={{ brand, microcopy, isLoading }}>
      {children}
    </BrandContext.Provider>
  );
}

/**
 * Hook to access brand configuration and microcopy
 */
export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}
