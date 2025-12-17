// Webhook Management and Dispatch
import type { Env } from '../env';

export interface WebhookEndpointRow {
  id: string;
  org_id: string;
  url: string;
  secret: string;
  events: string; // JSON array
  enabled: number; // SQLite boolean (0 or 1)
  created_at: string;
}

export interface WebhookEndpointDTO {
  id: string;
  orgId: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
}

/**
 * Convert database row to DTO
 */
function rowToDTO(row: WebhookEndpointRow): WebhookEndpointDTO {
  let events: string[] = [];
  try {
    events = JSON.parse(row.events);
  } catch {
    events = [];
  }

  return {
    id: row.id,
    orgId: row.org_id,
    url: row.url,
    secret: row.secret,
    events,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

/**
 * Generate a secure webhook secret
 */
export function generateWebhookSecret(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
 * List all webhook endpoints for an organization
 */
export async function listWebhookEndpoints(env: Env, orgId: string): Promise<WebhookEndpointDTO[]> {
  const result = await env.DB.prepare(`
    SELECT * FROM webhook_endpoints 
    WHERE org_id = ? 
    ORDER BY created_at DESC
  `).bind(orgId).all<WebhookEndpointRow>();

  return (result.results || []).map(rowToDTO);
}

/**
 * Get a single webhook endpoint
 */
export async function getWebhookEndpoint(
  env: Env,
  orgId: string,
  webhookId: string
): Promise<WebhookEndpointDTO | null> {
  const row = await env.DB.prepare(`
    SELECT * FROM webhook_endpoints 
    WHERE id = ? AND org_id = ?
  `).bind(webhookId, orgId).first<WebhookEndpointRow>();

  if (!row) return null;
  return rowToDTO(row);
}

/**
 * Create a new webhook endpoint
 */
export async function createWebhookEndpoint(
  env: Env,
  orgId: string,
  url: string,
  events: string[],
  secret?: string
): Promise<WebhookEndpointDTO> {
  const id = crypto.randomUUID();
  const webhookSecret = secret || generateWebhookSecret();

  await env.DB.prepare(`
    INSERT INTO webhook_endpoints (id, org_id, url, secret, events, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
  `).bind(id, orgId, url, webhookSecret, JSON.stringify(events)).run();

  const row = await env.DB.prepare(`
    SELECT * FROM webhook_endpoints WHERE id = ?
  `).bind(id).first<WebhookEndpointRow>();

  if (!row) {
    throw new Error('Failed to create webhook endpoint');
  }

  return rowToDTO(row);
}

/**
 * Update webhook endpoint enabled status
 */
export async function updateWebhookEndpoint(
  env: Env,
  orgId: string,
  webhookId: string,
  enabled: boolean
): Promise<WebhookEndpointDTO | null> {
  await env.DB.prepare(`
    UPDATE webhook_endpoints 
    SET enabled = ? 
    WHERE id = ? AND org_id = ?
  `).bind(enabled ? 1 : 0, webhookId, orgId).run();

  return getWebhookEndpoint(env, orgId, webhookId);
}

/**
 * Delete a webhook endpoint
 */
export async function deleteWebhookEndpoint(
  env: Env,
  orgId: string,
  webhookId: string
): Promise<boolean> {
  const result = await env.DB.prepare(`
    DELETE FROM webhook_endpoints 
    WHERE id = ? AND org_id = ?
  `).bind(webhookId, orgId).run();

  return (result.meta.changes || 0) > 0;
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
  // Get all enabled endpoints for this org
  const endpoints = await listWebhookEndpoints(env, orgId);
  const enabledEndpoints = endpoints.filter(
    (endpoint) => endpoint.enabled && endpoint.events.includes(event)
  );

  if (enabledEndpoints.length === 0) {
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
  const promises = enabledEndpoints.map(async (endpoint) => {
    try {
      const signature = await signPayload(payloadString, endpoint.secret);

      const response = await fetch(endpoint.url, {
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
          `Webhook delivery failed to ${endpoint.url}: ${response.status} ${response.statusText}`
        );
      } else {
        console.log(`Webhook delivered successfully to ${endpoint.url} for event ${event}`);
      }
    } catch (err) {
      console.error(`Failed to dispatch webhook to ${endpoint.url}:`, err);
    }
  });

  // Wait for all webhooks to be dispatched (or fail)
  await Promise.allSettled(promises);
}
