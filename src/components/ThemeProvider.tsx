// src/components/ThemeProvider.tsx
import { useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBrand } from '@/contexts/BrandContext';

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { currentOrg } = useAuth();
  const { brand } = useBrand();

  // Apply dark mode based on system preference
  useEffect(() => {
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
  }, []);

  // Apply brand theme colors
  useEffect(() => {
    const root = document.documentElement;
    
    if (brand?.theme) {
      // Apply brand-specific theme colors
      root.style.setProperty('--brand-primary', brand.theme.primary);
      root.style.setProperty('--brand-accent', brand.theme.accent);
      root.style.setProperty('--brand-success', brand.theme.success);
      root.style.setProperty('--brand-warning', brand.theme.warning);
      root.style.setProperty('--brand-danger', brand.theme.danger);
      root.style.setProperty('--brand-radius', brand.theme.radius);
    }
  }, [brand]);

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

  return <>{children}</>;
}
