export type DNSCheckResult = {
  success: boolean;
  found: boolean;
  target?: string;
  error?: string;
};

export async function checkCNAME(
  domain: string,
  expectedTarget: string
): Promise<DNSCheckResult> {
  try {
    const recordName = `_acme-challenge.${domain}`;
    
    const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
      recordName
    )}&type=CNAME`;
    
    const response = await fetch(dohUrl, {
      headers: {
        Accept: 'application/dns-json',
      },
    });
    
    if (!response.ok) {
      return {
        success: false,
        found: false,
        error: 'DNS query failed',
      };
    }
    
    const data = await response.json();
    
    if (data.Answer && data.Answer.length > 0) {
      const cnameRecord = data.Answer.find((r: any) => r.type === 5);
      
      if (cnameRecord) {
        const target = cnameRecord.data.replace(/\.$/, '');
        const matches = target === expectedTarget;
        
        return {
          success: matches,
          found: true,
          target,
          error: matches ? undefined : `CNAME points to ${target}, expected ${expectedTarget}`,
        };
      }
    }
    
    return {
      success: false,
      found: false,
      error: 'CNAME record not found',
    };
  } catch (error) {
    return {
      success: false,
      found: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function generateTXTChallengeValue(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function formatDNSInstruction(domain: string, cnameTarget: string): string {
  return `_acme-challenge.${domain} CNAME ${cnameTarget}`;
}

/**
 * CAA Record lookup result
 */
export type CAALookupResult = {
  success: boolean;
  found: boolean;
  records: string[];
  error?: string;
};

/**
 * Query CAA records for a domain using DNS-over-HTTPS
 */
export async function lookupCAA(domain: string): Promise<CAALookupResult> {
  try {
    const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
      domain
    )}&type=CAA`;
    
    const response = await fetch(dohUrl, {
      headers: {
        Accept: 'application/dns-json',
      },
    });
    
    if (!response.ok) {
      return {
        success: false,
        found: false,
        records: [],
        error: 'DNS query failed',
      };
    }
    
    const data = await response.json();
    
    if (data.Answer && data.Answer.length > 0) {
      // CAA record type is 257
      const caaRecords = data.Answer.filter((r: any) => r.type === 257);
      
      if (caaRecords.length > 0) {
        const records = caaRecords.map((r: any) => r.data);
        
        return {
          success: true,
          found: true,
          records,
        };
      }
    }
    
    // No CAA records found
    return {
      success: true,
      found: false,
      records: [],
    };
  } catch (error) {
    return {
      success: false,
      found: false,
      records: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
