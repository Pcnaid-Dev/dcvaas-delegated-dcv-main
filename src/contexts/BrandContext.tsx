// src/contexts/BrandContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { BrandConfig, getCurrentBrand } from '@/config/brands';

type BrandContextValue = {
  brand: BrandConfig;
};

const BrandContext = createContext<BrandContextValue | undefined>(undefined);

type BrandProviderProps = {
  children: ReactNode;
};

export function BrandProvider({ children }: BrandProviderProps) {
  const brand = getCurrentBrand();

  return (
    <BrandContext.Provider value={{ brand }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}
