/**
 * OAuth provider integrations for token exchange
 */

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

/**
 * Exchange authorization code for tokens with Cloudflare
 */
export async function exchangeCloudflareToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<OAuthTokenResponse> {
  const response = await fetch('https://dash.cloudflare.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudflare OAuth token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Exchange authorization code for tokens with GoDaddy
 */
export async function exchangeGoDaddyToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<OAuthTokenResponse> {
  const response = await fetch('https://api.godaddy.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GoDaddy OAuth token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Generic token exchange function that routes to the correct provider
 */
export async function exchangeOAuthToken(
  provider: string,
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<OAuthTokenResponse> {
  switch (provider) {
    case 'cloudflare':
      return exchangeCloudflareToken(code, redirectUri, clientId, clientSecret);
    case 'godaddy':
      return exchangeGoDaddyToken(code, redirectUri, clientId, clientSecret);
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}
