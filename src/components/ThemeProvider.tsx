// src/components/ThemeProvider.tsx
import { useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { applyBrandTheme } from '@/lib/brand';

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { currentOrg } = useAuth();

  // Apply brand theme on mount
  useEffect(() => {
    applyBrandTheme();
  }, []);

  // Apply custom brand colors for organization if available
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
