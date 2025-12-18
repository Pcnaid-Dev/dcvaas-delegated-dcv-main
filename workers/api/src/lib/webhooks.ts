// workers/api/src/lib/webhooks.ts
import type { Env } from '../env';
import { sha256Hex } from './crypto';

export type WebhookEndpointRow = {
  id: string;
  org_id: string;
  url: string;
  secret: string;
  events: string; // JSON string array
  enabled: number;
  created_at: string;
  updated_at: string;
};

export type WebhookEvent = 'domain.active' | 'domain.error' | 'domain.expiring_soon' | 'domain.renewed' | 'domain.added' | 'domain.removed' | 'dns.verified';

/**
 * Generate a secure webhook secret (32 random bytes as hex)
 */
export function generateWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * List webhook endpoints for an organization
 */
export async function listWebhooks(env: Env, orgId: string) {
  const { results } = await env.DB
    .prepare(`SELECT * FROM webhook_endpoints WHERE org_id = ? ORDER BY created_at DESC`)
    .bind(orgId)
    .all<WebhookEndpointRow>();

  return results.map((row) => ({
    id: row.id,
    orgId: row.org_id,
    url: row.url,
    events: JSON.parse(row.events) as string[],
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Create a new webhook endpoint
 */
export async function createWebhook(env: Env, orgId: string, url: string, events: string[]) {
  // Validate URL
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('URL must use http or https protocol');
    }
  } catch (err) {
    throw new Error('Invalid URL format');
  }

  // Validate events
  if (!events || events.length === 0) {
    throw new Error('At least one event must be specified');
  }

  const id = crypto.randomUUID();
  const secret = generateWebhookSecret();
  const eventsJson = JSON.stringify(events);

  await env.DB
    .prepare(
      `INSERT INTO webhook_endpoints (id, org_id, url, secret, events, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    )
    .bind(id, orgId, url, secret, eventsJson)
    .run();

  return {
    id,
    orgId,
    url,
    secret,
    events,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update a webhook endpoint
 */
export async function updateWebhook(
  env: Env,
  orgId: string,
  webhookId: string,
  updates: { url?: string; events?: string[]; enabled?: boolean }
) {
  // Verify ownership
  const existing = await env.DB
    .prepare(`SELECT * FROM webhook_endpoints WHERE id = ? AND org_id = ?`)
    .bind(webhookId, orgId)
    .first<WebhookEndpointRow>();

  if (!existing) {
    throw new Error('Webhook not found');
  }

  // Build update query dynamically
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.url !== undefined) {
    // Validate URL
    try {
      const parsedUrl = new URL(updates.url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('URL must use http or https protocol');
      }
    } catch (err) {
      throw new Error('Invalid URL format');
    }
    fields.push('url = ?');
    values.push(updates.url);
  }

  if (updates.events !== undefined) {
    if (updates.events.length === 0) {
      throw new Error('At least one event must be specified');
    }
    fields.push('events = ?');
    values.push(JSON.stringify(updates.events));
  }

  if (updates.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(updates.enabled ? 1 : 0);
  }

  if (fields.length === 0) {
    throw new Error('No updates provided');
  }

  fields.push('updated_at = datetime("now")');

  const query = `UPDATE webhook_endpoints SET ${fields.join(', ')} WHERE id = ? AND org_id = ?`;
  values.push(webhookId, orgId);

  await env.DB.prepare(query).bind(...values).run();
}

/**
 * Delete a webhook endpoint
 */
export async function deleteWebhook(env: Env, orgId: string, webhookId: string) {
  await env.DB
    .prepare(`DELETE FROM webhook_endpoints WHERE id = ? AND org_id = ?`)
    .bind(webhookId, orgId)
    .run();
}

/**
 * Dispatch a webhook event to all subscribed endpoints
 * Uses shared dispatch logic with database-level event filtering
 */
export async function dispatchWebhook(
  env: Env,
  orgId: string,
  event: WebhookEvent,
  payload: Record<string, any>
) {
  // Use shared webhook dispatch module
  const { dispatchWebhook: sharedDispatch } = await import('../../shared/webhook-dispatch');
  await sharedDispatch(env.DB, orgId, event, payload);
}
