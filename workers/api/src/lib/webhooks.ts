import type { Env } from '../env';

export interface WebhookEndpointRow {
  id: string;
  org_id: string;
  url: string;
  secret: string;
  events: string; // JSON array
  enabled: number; // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

export interface WebhookEndpointDTO {
  id: string;
  orgId: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Generate a webhook secret
 */
export function generateWebhookSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return `whsec_${Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * List all webhook endpoints for an organization
 */
export async function listWebhookEndpoints(env: Env, orgId: string): Promise<WebhookEndpointDTO[]> {
  const result = await env.DB.prepare(
    `SELECT id, org_id, url, secret, events, enabled, created_at, updated_at
     FROM webhook_endpoints
     WHERE org_id = ?
     ORDER BY created_at DESC`
  ).bind(orgId).all<WebhookEndpointRow>();

  const webhooks = result.results || [];
  return webhooks.map(row => ({
    id: row.id,
    orgId: row.org_id,
    url: row.url,
    secret: row.secret,
    events: JSON.parse(row.events),
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Create a new webhook endpoint
 */
export async function createWebhookEndpoint(
  env: Env,
  orgId: string,
  url: string,
  events: string[]
): Promise<WebhookEndpointDTO> {
  const id = crypto.randomUUID();
  const secret = generateWebhookSecret();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO webhook_endpoints (id, org_id, url, secret, events, enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, orgId, url, secret, JSON.stringify(events), 1, now, now).run();

  return {
    id,
    orgId,
    url,
    secret,
    events,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update a webhook endpoint
 */
export async function updateWebhookEndpoint(
  env: Env,
  orgId: string,
  webhookId: string,
  url?: string,
  events?: string[],
  enabled?: boolean
): Promise<WebhookEndpointDTO | null> {
  // First check if webhook exists and belongs to org
  const existing = await env.DB.prepare(
    `SELECT * FROM webhook_endpoints WHERE id = ? AND org_id = ?`
  ).bind(webhookId, orgId).first<WebhookEndpointRow>();

  if (!existing) return null;

  const now = new Date().toISOString();
  const updates: string[] = [];
  const bindings: any[] = [];

  if (url !== undefined) {
    updates.push('url = ?');
    bindings.push(url);
  }
  if (events !== undefined) {
    updates.push('events = ?');
    bindings.push(JSON.stringify(events));
  }
  if (enabled !== undefined) {
    updates.push('enabled = ?');
    bindings.push(enabled ? 1 : 0);
  }
  
  updates.push('updated_at = ?');
  bindings.push(now);
  bindings.push(webhookId, orgId);

  await env.DB.prepare(
    `UPDATE webhook_endpoints 
     SET ${updates.join(', ')}
     WHERE id = ? AND org_id = ?`
  ).bind(...bindings).run();

  // Fetch and return updated webhook
  const updated = await env.DB.prepare(
    `SELECT * FROM webhook_endpoints WHERE id = ? AND org_id = ?`
  ).bind(webhookId, orgId).first<WebhookEndpointRow>();

  if (!updated) return null;

  return {
    id: updated.id,
    orgId: updated.org_id,
    url: updated.url,
    secret: updated.secret,
    events: JSON.parse(updated.events),
    enabled: updated.enabled === 1,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

/**
 * Delete a webhook endpoint
 */
export async function deleteWebhookEndpoint(env: Env, orgId: string, webhookId: string): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM webhook_endpoints WHERE id = ? AND org_id = ?`
  ).bind(webhookId, orgId).run();
}

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
