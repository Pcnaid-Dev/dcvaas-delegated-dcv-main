import type { Env } from '../env';

/**
 * Sign webhook payload with HMAC-SHA256
 */
async function signPayload(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Dispatch webhook to all enabled endpoints for an organization that have subscribed to the event
 */
export async function dispatchWebhook(
  env: Env,
  orgId: string,
  event: string,
  payload: any
): Promise<void> {
  // Fetch all enabled webhooks for this org
  const webhooks = await env.DB.prepare(
    `SELECT id, url, secret, events
     FROM webhook_endpoints
     WHERE org_id = ? AND enabled = 1`
  ).bind(orgId).all<{ id: string; url: string; secret: string; events: string }>();

  if (!webhooks.results || webhooks.results.length === 0) {
    return;
  }

  const payloadString = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);

  // Dispatch to each webhook in parallel
  const promises = webhooks.results.map(async (webhook) => {
    try {
      const events = JSON.parse(webhook.events);
      
      // Check if this webhook is subscribed to this event
      if (!events.includes(event)) {
        return;
      }

      // Create signature
      const signedPayload = `${timestamp}.${payloadString}`;
      const signature = await signPayload(webhook.secret, signedPayload);

      // Send webhook request
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DCVaaS-Signature': `t=${timestamp},v1=${signature}`,
          'X-DCVaaS-Event': event,
          'User-Agent': 'DCVaaS-Webhook/1.0',
        },
        body: payloadString,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        console.error(`Webhook ${webhook.id} delivery failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to dispatch webhook ${webhook.id}:`, error);
    }
  });

  // Wait for all webhooks to be dispatched (but don't fail if some fail)
  await Promise.allSettled(promises);
}
