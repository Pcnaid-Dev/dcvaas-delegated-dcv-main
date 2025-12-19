// src/components/ThemeProvider.tsx
import { useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { currentOrg } = useAuth();

  // Apply KeylessSSL branding by default (dark-first infra UI)
  useEffect(() => {
    const root = document.documentElement;
    
    // Always apply KeylessSSL brand
    root.setAttribute('data-brand', 'keylessssl.dev');
    
    // KeylessSSL is dark-first, always apply dark mode
    root.classList.add('dark');
  }, []);

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
