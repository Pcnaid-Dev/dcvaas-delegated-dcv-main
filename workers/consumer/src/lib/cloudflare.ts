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
    ownership_verification?: {
        name: string;
        value: string;
        type: string; 
    };
    // Certificate information
    expires_on?: string;  // ISO 8601 date when certificate expires
    issued_on?: string;   // ISO 8601 date when certificate was issued
  };
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
