// src/components/ThemeProvider.tsx
import { useEffect, ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';

type ThemeProviderProps = {
  children: ReactNode;
};

function BrandColorApplier() {
  const { currentOrg } = useAuth();

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

  return null;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <BrandColorApplier />
      {children}
    </NextThemesProvider>
  );
}
