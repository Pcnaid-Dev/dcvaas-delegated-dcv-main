import type { Env } from '../env';

type CFResponse<T> = { success: boolean; errors: any[]; messages: any[]; result: T };

export type CFCustomHostname = {
  id: string;
  hostname: string;
  status?: string;
  verification_errors?: string[];
  ownership_verification?: { type?: string; name?: string; value?: string };
  ssl?: {
    status?: string;
    method?: string;
    type?: string;
    validation_records?: Array<{
      txt_name?: string;
      txt_value?: string;
      http_url?: string;
      http_body?: string;
    }>;
  };
};

async function cfApi<T>(env: Env, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json().catch(() => null)) as CFResponse<T> | null;

  if (!res.ok || !data || data.success !== true) {
    const msg =
      data?.errors?.[0]?.message ||
      data?.messages?.[0]?.message ||
      `Cloudflare API error (${res.status})`;
    throw new Error(msg);
  }

  return data.result;
}

export async function getDcvDelegationUuid(env: Env): Promise<string> {
  const result = await cfApi<{ uuid: string }>(
    env,
    'GET',
    `/zones/${env.CLOUDFLARE_ZONE_ID}/dcv_delegation/uuid`,
  );
  return result.uuid;
}

export async function createCustomHostname(env: Env, hostname: string, metadata?: Record<string, any>) {
  return cfApi<CFCustomHostname>(env, 'POST', `/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames`, {
    hostname,
    ssl: { method: 'txt', type: 'dv' },
    custom_metadata: metadata || {},
  });
}

export async function getCustomHostname(env: Env, id: string) {
  return cfApi<CFCustomHostname>(env, 'GET', `/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${id}`);
}

// PATCH with same SSL config can trigger DCV re-check 
export async function recheckCustomHostname(env: Env, id: string) {
  return cfApi<CFCustomHostname>(env, 'PATCH', `/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${id}`, {
    ssl: { method: 'txt', type: 'dv' },
  });
}

export async function deleteCustomHostname(env: Env, id: string) {
  return cfApi<{ id: string }>(env, 'DELETE', `/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${id}`);
}
