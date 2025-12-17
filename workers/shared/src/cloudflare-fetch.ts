// Shared Cloudflare API fetch utilities with retry logic
// Used across API, Consumer, and Cron workers

// Configuration constants for retry logic
const MAX_DELAY = 30000; // Cap at 30 seconds
const MAX_RATE_LIMIT_RETRIES = 3; // Maximum retries for rate limit responses
const DEFAULT_RATE_LIMIT_RETRY_AFTER = 5; // Default seconds to wait if no Retry-After header

/**
 * Helper function for fetch with retry logic and exponential backoff
 * Handles rate limiting (429) and server errors (5xx) with automatic retries
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum number of retries (default: 3)
 * @returns Promise<Response>
 */
export async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  let rateLimitRetries = 0;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If rate limited, wait and retry (doesn't count against main retry budget)
      if (response.status === 429) {
        if (rateLimitRetries >= MAX_RATE_LIMIT_RETRIES) {
          throw new Error(`Rate limit retry budget exhausted (${rateLimitRetries}/${MAX_RATE_LIMIT_RETRIES} attempts)`);
        }
        rateLimitRetries++;
        const retryAfter = parseInt(response.headers.get('Retry-After') || String(DEFAULT_RATE_LIMIT_RETRY_AFTER), 10);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        // Don't increment attempt counter for rate limits - retry without consuming retry budget
        attempt--;
        continue;
      }
      
      // Reset rate limit counter on successful non-429 response
      rateLimitRetries = 0;
      
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
