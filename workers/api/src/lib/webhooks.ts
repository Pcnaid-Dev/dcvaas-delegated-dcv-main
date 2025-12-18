import type { Env } from '../env';
import type { WebhookEndpointRow, WebhookEndpointDTO } from './types';

/**
 * Converts a webhook row from the database to a DTO for API responses
 */
export function rowToWebhookDTO(row: WebhookEndpointRow): WebhookEndpointDTO {
  return {
    id: row.id,
    orgId: row.org_id,
    url: row.url,
    secret: row.secret,
    events: JSON.parse(row.events),
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

/**
 * Fetches all webhook endpoints for a given organization
 */
export async function listWebhooks(env: Env, orgId: string): Promise<WebhookEndpointDTO[]> {
  const rows = await env.DB.prepare(
    'SELECT * FROM webhook_endpoints WHERE org_id = ? ORDER BY created_at DESC'
  )
    .bind(orgId)
    .all<WebhookEndpointRow>();

  return (rows.results || []).map(rowToWebhookDTO);
}

/**
 * Creates a new webhook endpoint for an organization
 */
export async function createWebhook(
  env: Env,
  orgId: string,
  url: string,
  secret: string,
  events: string[]
): Promise<WebhookEndpointDTO> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    'INSERT INTO webhook_endpoints (id, org_id, url, secret, events, enabled, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
  )
    .bind(id, orgId, url, secret, JSON.stringify(events), now)
    .run();

  return {
    id,
    orgId,
    url,
    secret,
    events,
    enabled: true,
    createdAt: now,
  };
}

/**
 * Deletes a webhook endpoint
 */
export async function deleteWebhook(env: Env, orgId: string, webhookId: string): Promise<void> {
  await env.DB.prepare('DELETE FROM webhook_endpoints WHERE id = ? AND org_id = ?')
    .bind(webhookId, orgId)
    .run();
}

/**
 * Updates the enabled status of a webhook endpoint
 */
export async function updateWebhookEnabled(
  env: Env,
  orgId: string,
  webhookId: string,
  enabled: boolean
): Promise<void> {
  await env.DB.prepare('UPDATE webhook_endpoints SET enabled = ? WHERE id = ? AND org_id = ?')
    .bind(enabled ? 1 : 0, webhookId, orgId)
    .run();
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
  const { results: subscribedWebhooks } = await env.DB.prepare(
    "SELECT * FROM webhook_endpoints WHERE org_id = ? AND enabled = 1 AND INSTR(events, ?)"
  )
    .bind(orgId, `\"${event}\"`)
    .all<WebhookEndpointRow>();

  if (!subscribedWebhooks || subscribedWebhooks.length === 0) {
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
