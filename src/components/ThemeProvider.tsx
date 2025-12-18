// src/components/ThemeProvider.tsx
import { useEffect, ReactNode, createContext, useContext, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { detectBrand, BrandConfig } from '@/lib/brands';

type ThemeProviderProps = {
  children: ReactNode;
};

type BrandContextType = {
  brand: BrandConfig;
};

const BrandContext = createContext<BrandContextType | null>(null);

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { currentOrg } = useAuth();
  const [brand] = useState<BrandConfig>(() => detectBrand());

  // Apply brand-based theme
  useEffect(() => {
    const root = document.documentElement;
    const theme = brand.theme;
    
    // Apply brand theme CSS variables
    root.style.setProperty('--brand-primary', theme.primary);
    root.style.setProperty('--brand-accent', theme.accent);
    root.style.setProperty('--brand-background', theme.background);
    root.style.setProperty('--brand-surface', theme.surface);
    root.style.setProperty('--brand-text', theme.text);
    root.style.setProperty('--brand-muted', theme.muted);
    root.style.setProperty('--brand-success', theme.success);
    root.style.setProperty('--brand-warning', theme.warning);
    root.style.setProperty('--brand-danger', theme.danger);
    root.style.setProperty('--brand-radius', theme.radius);

    // Add brand-specific class for KeylessSSL dark theme
    if (brand.id === 'keylessssl') {
      root.classList.add('dark');
      root.classList.add('brand-keylessssl');
    } else {
      root.classList.remove('brand-keylessssl');
    }
  }, [brand]);

  // Apply dark mode based on system preference for DCVaaS brand
  useEffect(() => {
    if (brand.id === 'dcvaas') {
      const root = document.documentElement;
      
      // Check system preference for dark mode
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Listen for changes in system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [brand.id]);

  useEffect(() => {
    const root = document.documentElement;
    
    if (currentOrg?.brandColor && /^#[0-9a-fA-F]{6}$/.test(currentOrg.brandColor)) {
      // Apply custom brand color (validated hex)
      root.style.setProperty('--primary-color', currentOrg.brandColor);
    } else {
      // Revert to default by removing the inline style
      root.style.removeProperty('--primary-color');
    }
  }, [currentOrg?.brandColor]);

  return (
    <BrandContext.Provider value={{ brand }}>
      {children}
    </BrandContext.Provider>
  );
}
