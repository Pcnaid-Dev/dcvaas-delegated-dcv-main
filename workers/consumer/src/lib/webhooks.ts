// Webhook Dispatch for Consumer Worker
// Note: This is a simplified version focused on dispatch functionality
// Full webhook management is in workers/api/src/lib/webhooks.ts
import type { Env } from '../env';

interface WebhookEndpointRow {
  id: string;
  org_id: string;
  url: string;
  secret: string;
  events: string; // JSON array
  enabled: number; // SQLite boolean (0 or 1)
  created_at: string;
}

/**
 * Create HMAC-SHA256 signature for webhook payload
 */
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Dispatch webhook to all enabled endpoints for an organization
 * that are subscribed to the given event
 */
export async function dispatchWebhook(
  env: Env,
  orgId: string,
  event: string,
  payload: Record<string, any>
): Promise<void> {
  // Get all enabled endpoints for this org that subscribe to this event
  const result = await env.DB.prepare(`
    SELECT * FROM webhook_endpoints 
    WHERE org_id = ? AND enabled = 1
  `).bind(orgId).all<WebhookEndpointRow>();
  
  const endpoints = (result.results || []).filter((row) => {
    try {
      const events = JSON.parse(row.events);
      return events.includes(event);
    } catch {
      return false;
    }
  });

  if (endpoints.length === 0) {
    console.log(`No webhook endpoints enabled for event ${event} in org ${orgId}`);
    return;
  }

  // Prepare the webhook payload
  const webhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  };

  const payloadString = JSON.stringify(webhookPayload);

  // Dispatch to all endpoints in parallel
  const promises = endpoints.map(async (row) => {
    try {
      const signature = await signPayload(payloadString, row.secret);

      const response = await fetch(row.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DCVaaS-Signature': signature,
          'X-DCVaaS-Event': event,
          'User-Agent': 'DCVaaS-Webhooks/1.0',
        },
        body: payloadString,
        // Set a timeout to prevent hanging
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.error(
          `Webhook delivery failed to ${row.url}: ${response.status} ${response.statusText}`
        );
      } else {
        console.log(`Webhook delivered successfully to ${row.url} for event ${event}`);
      }
    } catch (err) {
      console.error(`Failed to dispatch webhook to ${row.url}:`, err);
    }
  });

  // Wait for all webhooks to be dispatched (or fail)
  await Promise.allSettled(promises);
}
