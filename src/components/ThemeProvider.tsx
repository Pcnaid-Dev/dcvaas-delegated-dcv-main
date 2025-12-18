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

  // Apply brand theme tokens
  useEffect(() => {
    const root = document.documentElement;
    
    if (brand?.theme) {
      // Apply brand-specific CSS variables
      root.style.setProperty('--brand-font-sans', brand.theme.fontSans);
      root.style.setProperty('--brand-font-mono', brand.theme.fontMono);
      root.style.setProperty('--brand-color-primary', brand.theme.colorPrimary);
      root.style.setProperty('--brand-color-accent', brand.theme.colorAccent);
      root.style.setProperty('--brand-color-success', brand.theme.colorSuccess);
      root.style.setProperty('--brand-color-warning', brand.theme.colorWarning);
      root.style.setProperty('--brand-color-danger', brand.theme.colorDanger);
      root.style.setProperty('--brand-radius', brand.theme.radius);
      
      // Set brand-specific primary color
      root.style.setProperty('--primary-color', brand.theme.colorPrimary);
    }
  }, [brand]);

  useEffect(() => {
    const root = document.documentElement;
    
    if (currentOrg?.brandColor && /^#[0-9a-fA-F]{6}$/.test(currentOrg.brandColor)) {
      // Apply custom brand color (validated hex) - org-level override
      root.style.setProperty('--primary-color', currentOrg.brandColor);
    } else if (brand?.theme) {
      // Use brand default if no org override
      root.style.setProperty('--primary-color', brand.theme.colorPrimary);
    } else {
      // Revert to system default
      root.style.removeProperty('--primary-color');
    }
  }, [currentOrg?.brandColor, brand]);

  return <>{children}</>;
}
