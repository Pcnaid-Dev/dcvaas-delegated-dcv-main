import type { Env } from '../env';
import type { CustomHostname } from '../../../shared/src/types';
import { fetchWithRetry } from '../../../shared/src/cloudflare-fetch';

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
