// workers/shared/webhook-dispatch.ts
// Shared webhook dispatch logic for API and Consumer workers

export type WebhookEvent = 'domain.active' | 'domain.error' | 'domain.expiring_soon' | 'domain.renewed' | 'domain.added' | 'domain.removed' | 'dns.verified';

export interface WebhookEndpointRow {
  id: string;
  org_id: string;
  url: string;
  secret: string;
  events: string; // JSON string array
  enabled: number;
}

export interface DB {
  prepare(query: string): {
    bind(...values: any[]): {
      all<T>(): Promise<{ results: T[] }>;
      first<T>(): Promise<T | null>;
      run(): Promise<any>;
    };
  };
}

/**
 * Dispatch a webhook event to all subscribed endpoints
 * Optimized to filter webhooks at database level using JSON queries
 */
export async function dispatchWebhook(
  db: DB,
  orgId: string,
  event: WebhookEvent,
  payload: Record<string, any>
) {
  // Query webhooks filtered by event at database level
  // SQLite's json_each can be used to check if event is in the events array
  const { results: webhooks } = await db
    .prepare(
      `SELECT * FROM webhook_endpoints 
       WHERE org_id = ? 
         AND enabled = 1 
         AND EXISTS (
           SELECT 1 FROM json_each(webhook_endpoints.events) 
           WHERE json_each.value = ?
         )`
    )
    .bind(orgId, event)
    .all<WebhookEndpointRow>();

  if (!webhooks || webhooks.length === 0) {
    return;
  }

  // Dispatch to each webhook in parallel
  const dispatches = webhooks.map(async (webhook) => {
    try {
      await dispatchToEndpoint(webhook.url, webhook.secret, event, payload);
    } catch (err) {
      console.error(`Failed to dispatch webhook to ${webhook.url}:`, err);
      // Don't throw - continue dispatching to other endpoints
    }
  });

  await Promise.allSettled(dispatches);
}

/**
 * Dispatch to a single webhook endpoint with HMAC signature
 */
async function dispatchToEndpoint(
  url: string,
  secret: string,
  event: string,
  payload: Record<string, any>
) {
  const body = JSON.stringify(payload);

  // Sign with HMAC-SHA256
  const signature = await hmacSha256(secret, body);

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DCVaaS-Signature': signature,
      'X-DCVaaS-Event': event,
    },
    body,
  });
}

/**
 * Generate HMAC-SHA256 signature
 */
async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
