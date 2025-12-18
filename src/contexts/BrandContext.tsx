// src/contexts/BrandContext.tsx
import { createContext, useContext, ReactNode, useMemo } from 'react';
import { detectBrand, type BrandConfig } from '@/lib/brands';

type BrandContextType = {
  brand: BrandConfig;
};

const BrandContext = createContext<BrandContextType | undefined>(undefined);

type BrandProviderProps = {
  children: ReactNode;
};

export function BrandProvider({ children }: BrandProviderProps) {
  // Detect brand once on mount
  const brand = useMemo(() => detectBrand(), []);
  
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
