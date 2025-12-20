// src/hooks/useBrandTheme.ts
// Hook to detect and apply brand theme based on hostname

import { useEffect } from 'react';

export type Brand = 'dcvaas' | 'autocertify';

export function useBrandTheme(): Brand {
  useEffect(() => {
    const hostname = window.location.hostname;
    let brand: Brand = 'dcvaas';

    // Check if hostname is autocertify domain
    if (hostname === 'autocertify.net' || hostname === 'www.autocertify.net' || hostname.endsWith('.autocertify.net')) {
      brand = 'autocertify';
      document.documentElement.dataset.brand = hostname === 'www.autocertify.net' ? 'www.autocertify.net' : 'autocertify.net';
    } else {
      // Default to dcvaas
      delete document.documentElement.dataset.brand;
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  const hostname = window.location.hostname;
  if (hostname === 'autocertify.net' || hostname === 'www.autocertify.net' || hostname.endsWith('.autocertify.net')) {
    return 'autocertify';
  }
  return 'dcvaas';
}

export function getBrand(): Brand {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (hostname === 'autocertify.net' || hostname === 'www.autocertify.net' || hostname.endsWith('.autocertify.net')) {
    return 'autocertify';
  }
  return 'dcvaas';
}
