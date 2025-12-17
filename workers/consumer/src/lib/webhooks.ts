import type { Env } from '../env';

interface WebhookEndpointRow {
  id: string;
  org_id: string;
  url: string;
  secret: string;
  events: string; // JSON string
  enabled: number; // SQLite boolean (0 or 1)
  created_at: string;
}

/**
 * Signs a webhook payload using HMAC-SHA256
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
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Dispatches a webhook event to all enabled endpoints subscribed to the event
 */
export async function dispatchWebhook(
  env: Env,
  orgId: string,
  event: string,
  payload: Record<string, any>
): Promise<void> {
  // Fetch enabled webhooks for this org that are subscribed to this event
  const webhooks = await env.DB.prepare(
    'SELECT * FROM webhook_endpoints WHERE org_id = ? AND enabled = 1'
  )
    .bind(orgId)
    .all<WebhookEndpointRow>();

  if (!webhooks.results || webhooks.results.length === 0) {
    return;
  }

  // Filter webhooks that are subscribed to this event
  // Parse events once per webhook to avoid repeated parsing
  const subscribedWebhooks = webhooks.results
    .map((wh) => ({ ...wh, parsedEvents: JSON.parse(wh.events) }))
    .filter((wh) => wh.parsedEvents.includes(event));

  if (subscribedWebhooks.length === 0) {
    return;
  }

  // Build the webhook payload
  const webhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  };

  const payloadString = JSON.stringify(webhookPayload);

  // Dispatch to all subscribed webhooks (fire and forget)
  const promises = subscribedWebhooks.map(async (webhook) => {
    try {
      const signature = await signPayload(payloadString, webhook.secret);

      await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DCVaaS-Signature': signature,
          'User-Agent': 'DCVaaS-Webhooks/1.0',
        },
        body: payloadString,
      });

      // Note: We intentionally don't await or check the response
      // This is fire-and-forget to avoid blocking the main operation
    } catch (error) {
      // Log error but don't throw - webhook failures shouldn't break the main flow
      console.error(`Failed to dispatch webhook to ${webhook.url}:`, error);
    }
  });

  // Fire all webhooks in parallel but don't wait for them
  Promise.all(promises).catch((err) => {
    console.error('Error dispatching webhooks:', err);
  });
}
