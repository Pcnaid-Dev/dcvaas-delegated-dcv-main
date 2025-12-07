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

  const response = await fetch(url, {
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

export async function getCustomHostname(env: Env, hostnameId: string): Promise<CustomHostname> {
  const url = `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${hostnameId}`;
  
  const response = await fetch(url, {
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