// src/lib/http01-tester.ts
// HTTP-01 Reachability Tester for ACME challenges

export interface RedirectStep {
  url: string;
  status: number;
  headers: Record<string, string>;
}

export interface HTTP01TestResult {
  success: boolean;
  finalUrl: string;
  finalStatus: number;
  bodyPreview: string;
  redirectChain: RedirectStep[];
  flags: {
    forcedHttps: boolean;
    is403: boolean;
    is404: boolean;
    blockedPath: boolean;
    wrongVhost: boolean;
    hasCaching: boolean;
    hasWafChallenge: boolean;
  };
  error?: string;
  suggestions: string[];
}

/**
 * Test HTTP-01 challenge reachability
 * @param domain - The domain to test (e.g., "example.com")
 * @param token - The token filename (or "test" for placeholder)
 */
export async function testHTTP01Reachability(
  domain: string,
  token: string
): Promise<HTTP01TestResult> {
  const testToken = token === 'test' || token === '' ? 'test-placeholder-token' : token;
  const testUrl = `http://${domain}/.well-known/acme-challenge/${testToken}`;
  
  const result: HTTP01TestResult = {
    success: false,
    finalUrl: testUrl,
    finalStatus: 0,
    bodyPreview: '',
    redirectChain: [],
    flags: {
      forcedHttps: false,
      is403: false,
      is404: false,
      blockedPath: false,
      wrongVhost: false,
      hasCaching: false,
      hasWafChallenge: false,
    },
    suggestions: [],
  };

  try {
    // Follow redirects manually to build redirect chain
    let currentUrl = testUrl;
    let redirectCount = 0;
    const maxRedirects = 10;
    
    while (redirectCount < maxRedirects) {
      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual', // Don't follow redirects automatically
        headers: {
          'User-Agent': 'DCVaaS-HTTP01-Tester/1.0',
        },
      });

      // Record redirect step
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      result.redirectChain.push({
        url: currentUrl,
        status: response.status,
        headers,
      });

      // Check for redirect
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          result.error = `Redirect status ${response.status} but no Location header`;
          break;
        }

        // Check if redirect forced HTTPS
        if (currentUrl.startsWith('http://') && location.startsWith('https://')) {
          result.flags.forcedHttps = true;
        }

        // Resolve relative URLs
        currentUrl = new URL(location, currentUrl).toString();
        redirectCount++;
        continue;
      }

      // We've reached the final response
      result.finalUrl = currentUrl;
      result.finalStatus = response.status;

      // Check response status
      if (response.status === 403) {
        result.flags.is403 = true;
        result.suggestions.push('Server returned 403 Forbidden. Check if .well-known path is accessible.');
      } else if (response.status === 404) {
        result.flags.is404 = true;
        result.suggestions.push('Server returned 404 Not Found. The challenge file may not exist or path is blocked.');
      }

      // Read body (limit to first 1KB for preview)
      const bodyText = await response.text();
      result.bodyPreview = bodyText.substring(0, 1000);

      // Detect WAF challenge pages
      if (
        bodyText.toLowerCase().includes('cloudflare') ||
        bodyText.toLowerCase().includes('captcha') ||
        bodyText.toLowerCase().includes('checking your browser')
      ) {
        result.flags.hasWafChallenge = true;
        result.suggestions.push('WAF or security challenge detected. May block ACME validation.');
      }

      // Detect HTML error pages (likely wrong vhost or blocked path)
      if (
        response.headers.get('content-type')?.includes('text/html') &&
        (bodyText.includes('<!DOCTYPE') || bodyText.includes('<html'))
      ) {
        result.flags.wrongVhost = true;
        result.suggestions.push('Received HTML instead of plain text. Check virtual host configuration.');
      }

      // Check caching headers
      const cacheControl = headers['cache-control'];
      if (cacheControl && !cacheControl.includes('no-cache') && !cacheControl.includes('no-store')) {
        result.flags.hasCaching = true;
        result.suggestions.push('Caching headers detected. May interfere with ACME validation.');
      }

      // Check if path appears to be blocked
      if (response.status === 403 || response.status === 404) {
        result.flags.blockedPath = true;
      }

      // Success if we got a 200 OK
      if (response.status === 200) {
        result.success = true;
      }

      break;
    }

    if (redirectCount >= maxRedirects) {
      result.error = 'Too many redirects (exceeded 10)';
      result.suggestions.push('Redirect loop detected. Check server configuration.');
    }

    // Add suggestion for forced HTTPS
    if (result.flags.forcedHttps) {
      result.suggestions.push(
        'HTTP requests are redirected to HTTPS. This may work for HTTP-01 challenges, but DNS-01 is more reliable.'
      );
    }

    // If there are any issues, suggest DNS validation
    if (!result.success || result.flags.is403 || result.flags.is404 || result.flags.hasWafChallenge) {
      result.suggestions.push('💡 Switch to DNS-01 validation for better reliability and avoid HTTP configuration issues.');
    }

  } catch (error: any) {
    result.error = error.message || 'Unknown error';
    result.suggestions.push('Network error occurred. Check if domain is reachable.');
    result.suggestions.push('💡 DNS-01 validation does not require HTTP accessibility.');
  }

  return result;
}
