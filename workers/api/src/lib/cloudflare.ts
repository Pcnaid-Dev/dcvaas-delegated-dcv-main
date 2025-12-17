import type { Env } from '../env';

// Types based on Cloudflare API response
export interface CustomHostname {
  id: string;
  hostname: string;
  status: string;
  ssl: {
    status: string;
    method: string;
    type: string;
    expires_on?: string;
    validation_errors?: { message: string }[];
    // Information needed for TXT verification if CNAME isn't used immediately
    ownership_verification?: {
        name: string;
        value: string;
        type: string; 
    };
  };
}

export async function createCustomHostname(env: Env, domain: string): Promise<CustomHostname> {
  const url = `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames`;
  
  const body = {
    hostname: domain,
    ssl: {
      method: 'http', // Use 'http' if they CNAME to you, or 'txt' for pre-validation
      type: 'dv',
      settings: {
        min_tls_version: '1.2'
      }
    }
  };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data: any = await response.json();
  if (!data.success) {
    throw new Error(data.errors[0]?.message || 'Failed to create custom hostname');
  }
  return data.result;
}

// Configuration constants for retry logic
const MAX_DELAY = 30000; // Cap at 30 seconds
const MAX_RATE_LIMIT_RETRIES = 3; // Maximum retries for rate limit responses

// Helper function for retry with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  let rateLimitRetries = 0;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If rate limited, wait and retry (but count against a separate budget)
      if (response.status === 429) {
        if (rateLimitRetries >= MAX_RATE_LIMIT_RETRIES) {
          throw new Error(`Rate limit retry budget exhausted (${rateLimitRetries}/${MAX_RATE_LIMIT_RETRIES} attempts)`);
        }
        rateLimitRetries++;
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      // Check for client errors (4xx) that shouldn't be retried
      if (response.status >= 400 && response.status < 500) {
        // Client errors like 400, 401, 403, 404 won't resolve with retries
        return response;
      }
      
      // Check for server errors (5xx) that should be retried
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        // Exponential backoff with cap: 1s, 2s, 4s (max 30s)
        const delay = Math.min(Math.pow(2, attempt) * 1000, MAX_DELAY);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch after retries');
}

export async function getCustomHostname(env: Env, hostnameId: string): Promise<CustomHostname> {
  const url = `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${hostnameId}`;
  
  const response = await fetchWithRetry(url, {
    headers: {
      'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  const data: any = await response.json();
  return data.result;
}

export async function deleteCustomHostname(env: Env, hostnameId: string): Promise<void> {
  const url = `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${hostnameId}`;
  
  await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}