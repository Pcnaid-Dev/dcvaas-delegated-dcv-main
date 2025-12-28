// src/lib/redirect-analyzer.ts
// Redirect Chain Analyzer - Detects redirect chains and identifies validation breaks

export interface RedirectHop {
  url: string;
  statusCode: number;
  location?: string;
  protocol: string;
  host: string;
  error?: string;
}

export interface RedirectAnalysis {
  inputUrl: string;
  normalizedInput: string;
  hops: RedirectHop[];
  finalUrl: string;
  totalHops: number;
  hasHostChange: boolean;
  hasProtocolChange: boolean;
  validationBreaks: string[];
  warnings: string[];
  recommendation: string;
}

/**
 * Normalizes a domain or URL input
 * Adds http:// protocol if missing
 */
function normalizeUrl(input: string): string {
  input = input.trim();
  
  // Remove trailing slash
  input = input.replace(/\/+$/, '');
  
  // If it already has a protocol, return as is
  if (input.match(/^https?:\/\//i)) {
    return input;
  }
  
  // Add http:// protocol (we'll detect redirects to https)
  return `http://${input}`;
}

/**
 * Extracts the host from a URL
 */
function getHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/**
 * Extracts the protocol from a URL
 */
function getProtocol(url: string): string {
  try {
    return new URL(url).protocol.replace(':', '');
  } catch {
    return '';
  }
}

/**
 * Follows redirect chain for a given URL
 * Returns array of redirect hops with details
 */
async function followRedirects(startUrl: string, maxHops: number = 10): Promise<RedirectHop[]> {
  // Validate maxHops parameter
  if (maxHops <= 0 || maxHops > 50) {
    throw new Error('maxHops must be between 1 and 50');
  }
  const hops: RedirectHop[] = [];
  let currentUrl = startUrl;
  let hopCount = 0;

  while (hopCount < maxHops) {
    try {
      const response = await fetch(currentUrl, {
        method: 'HEAD', // Use HEAD to avoid downloading full response
        redirect: 'manual', // Don't auto-follow redirects
        headers: {
          'User-Agent': 'DCVaaS-RedirectAnalyzer/1.0',
        },
      });

      const hop: RedirectHop = {
        url: currentUrl,
        statusCode: response.status,
        protocol: getProtocol(currentUrl),
        host: getHost(currentUrl),
      };

      // Check for redirect status codes
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          hop.location = location;
          
          // Handle relative URLs
          if (!location.match(/^https?:\/\//i)) {
            const base = new URL(currentUrl);
            currentUrl = new URL(location, base).href;
          } else {
            currentUrl = location;
          }
          
          hops.push(hop);
          hopCount++;
          continue;
        }
      }

      // Final destination (no redirect)
      hops.push(hop);
      break;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      hops.push({
        url: currentUrl,
        statusCode: 0,
        protocol: getProtocol(currentUrl),
        host: getHost(currentUrl),
        error: errorMessage,
      });
      break;
    }
  }

  // Check if we hit max hops (redirect loop)
  if (hopCount >= maxHops) {
    hops.push({
      url: currentUrl,
      statusCode: 0,
      protocol: getProtocol(currentUrl),
      host: getHost(currentUrl),
      error: `Redirect loop detected (${maxHops}+ redirects)`,
    });
  }

  return hops;
}

/**
 * Analyzes redirect chain and identifies validation breaks
 */
export async function analyzeRedirectChain(input: string): Promise<RedirectAnalysis> {
  const normalizedInput = normalizeUrl(input);
  const hops = await followRedirects(normalizedInput);
  
  const validationBreaks: string[] = [];
  const warnings: string[] = [];
  
  // Analyze hops for validation breaks
  let hasHostChange = false;
  let hasProtocolChange = false;
  const initialHost = hops.length > 0 ? hops[0].host : '';
  const initialProtocol = hops.length > 0 ? hops[0].protocol : '';

  for (let i = 1; i < hops.length; i++) {
    const prevHop = hops[i - 1];
    const currentHop = hops[i];

    // Check for host change
    if (prevHop.host !== currentHop.host) {
      hasHostChange = true;
      validationBreaks.push(
        `Host changed from ${prevHop.host} to ${currentHop.host} at hop ${i + 1}. ` +
        `HTTP-01 validation will fail because the validation request won't follow this redirect.`
      );
    }

    // Check for protocol change (http to https is common and expected)
    if (prevHop.protocol !== currentHop.protocol) {
      hasProtocolChange = true;
      if (prevHop.protocol === 'http' && currentHop.protocol === 'https') {
        warnings.push(
          `Redirects from HTTP to HTTPS at hop ${i + 1}. ` +
          `This is safe for HTTP-01 if the host remains the same.`
        );
      }
    }

    // Check for error states
    if (currentHop.error) {
      validationBreaks.push(
        `Error at hop ${i + 1}: ${currentHop.error}. ` +
        `Certificate validation cannot complete.`
      );
    }
  }

  // Check for redirect loops
  if (hops.some(h => h.error?.includes('Redirect loop detected'))) {
    validationBreaks.push(
      'Redirect loop detected. Certificate validation will timeout and fail.'
    );
  }

  // Apex to www or www to apex redirects across same domain
  if (hops.length > 1 && hasHostChange) {
    const firstHost = hops[0].host;
    const lastHost = hops[hops.length - 1].host;
    
    // Check if it's www <-> apex redirect
    if (
      (firstHost.startsWith('www.') && lastHost === firstHost.substring(4)) ||
      (lastHost.startsWith('www.') && firstHost === lastHost.substring(4))
    ) {
      warnings.push(
        `Detected apex ↔ www redirect between ${firstHost} and ${lastHost}. ` +
        `Even though these are the same domain, HTTP-01 validation may fail.`
      );
    }
  }

  // Generate recommendation
  let recommendation = '';
  if (validationBreaks.length > 0) {
    recommendation = 
      '⚠️ **Use DCVaaS DNS-01 Method**: Your redirect chain will break HTTP-01 validation. ' +
      'DNS-01 validation is immune to redirect issues because it validates domain ownership ' +
      'via DNS records, not HTTP requests. DCVaaS provides automated DNS-01 validation with ' +
      'a simple one-time CNAME setup.';
  } else if (warnings.length > 0) {
    recommendation = 
      '✓ Your redirect chain should work with HTTP-01, but DNS-01 is more reliable. ' +
      'Consider DCVaaS for zero-touch certificate management with DNS-01 validation.';
  } else {
    recommendation = 
      '✓ No redirect issues detected. However, DNS-01 validation is still recommended for ' +
      'wildcard certificates and more reliable validation. Try DCVaaS for automated certificate management.';
  }

  const finalUrl = hops.length > 0 ? hops[hops.length - 1].url : normalizedInput;

  return {
    inputUrl: input,
    normalizedInput,
    hops,
    finalUrl,
    totalHops: hops.length,
    hasHostChange,
    hasProtocolChange,
    validationBreaks,
    warnings,
    recommendation,
  };
}
