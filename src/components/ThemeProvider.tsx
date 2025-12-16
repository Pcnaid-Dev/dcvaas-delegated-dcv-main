// src/components/ThemeProvider.tsx
import { useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { currentOrg } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    
    if (currentOrg?.brandColor) {
      // Apply custom brand color
      root.style.setProperty('--primary-color', currentOrg.brandColor);
    } else {
      // Revert to default
      root.style.setProperty('--primary-color', '#2563eb');
    }
  }, [currentOrg?.brandColor]);

  return <>{children}</>;
}
