import type { Env } from '../env';
import type { JobMessage } from '../lib/types';
import { getCustomHostname } from '../lib/cloudflare';

export async function handleSyncStatus(job: JobMessage, env: Env) {
  const domain = await env.DB.prepare('SELECT * FROM domains WHERE id = ?').bind(job.domain_id).first<any>();
  if (!domain || !domain.cf_custom_hostname_id) return;

  const cfData = await getCustomHostname(env, domain.cf_custom_hostname_id);
  const previousStatus = domain.status;

  let internalStatus = 'pending_cname';
  if (cfData.status === 'active' && cfData.ssl.status === 'active') {
    internalStatus = 'active';
  } else if (cfData.ssl.status === 'validation_failed') {
    internalStatus = 'error';
  } else if (cfData.status === 'pending_validation') {
    internalStatus = 'issuing'; // Or 'pending_validation'
  }

  // Extract certificate expiry and issued dates
  const expiresAt = cfData.ssl.expires_on || null;
  const lastIssuedAt = cfData.ssl.issued_on || null;
  
  // Extract error message from validation errors
  const errorMessage = cfData.ssl.validation_errors && cfData.ssl.validation_errors.length > 0
    ? cfData.ssl.validation_errors[0].message
    : null;

  await env.DB.prepare(`
    UPDATE domains
    SET status = ?, 
        cf_status = ?, 
        cf_ssl_status = ?, 
        cf_verification_errors = ?, 
        expires_at = ?,
        last_issued_at = ?,
        error_message = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    internalStatus,
    cfData.status,
    cfData.ssl.status,
    JSON.stringify(cfData.ssl.validation_errors || []),
    expiresAt,
    lastIssuedAt,
    errorMessage,
    domain.id
  ).run();

  // Dispatch webhooks for status transitions
  await dispatchStatusTransitionWebhooks(env, domain, previousStatus, internalStatus, cfData);
}

/**
 * Dispatch webhooks when domain status changes
 */
async function dispatchStatusTransitionWebhooks(
  env: Env,
  domain: any,
  previousStatus: string,
  newStatus: string,
  cfData: any
) {
  // Detect status transitions
  const transitions: { event: string; payload: any }[] = [];

  // domain.active event
  if (previousStatus !== 'active' && newStatus === 'active') {
    transitions.push({
      event: 'domain.active',
      payload: {
        domainId: domain.id,
        domainName: domain.domain_name,
        orgId: domain.org_id,
        status: newStatus,
        cfStatus: cfData.status,
        cfSslStatus: cfData.ssl.status,
        expiresAt: cfData.ssl.expires_on,
        issuedAt: cfData.ssl.issued_on,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // domain.error event
  if (previousStatus !== 'error' && newStatus === 'error') {
    transitions.push({
      event: 'domain.error',
      payload: {
        domainId: domain.id,
        domainName: domain.domain_name,
        orgId: domain.org_id,
        status: newStatus,
        cfStatus: cfData.status,
        cfSslStatus: cfData.ssl.status,
        errors: cfData.ssl.validation_errors || [],
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Dispatch all transitions
  for (const { event, payload } of transitions) {
    try {
      await dispatchWebhook(env, domain.org_id, event, payload);
    } catch (err) {
      console.error(`Failed to dispatch webhook for ${event}:`, err);
      // Don't fail the sync if webhook dispatch fails
    }
  }
}

/**
 * Dispatch a webhook event to all subscribed endpoints
 */
async function dispatchWebhook(
  env: Env,
  orgId: string,
  event: string,
  payload: Record<string, any>
) {
  // Find all enabled webhooks for this org that subscribe to this event
  const { results: webhooks } = await env.DB
    .prepare(
      `SELECT * FROM webhook_endpoints 
       WHERE org_id = ? AND enabled = 1`
    )
    .bind(orgId)
    .all<any>();

  if (!webhooks || webhooks.length === 0) {
    return;
  }

  // Filter webhooks that subscribe to this event
  const relevantWebhooks = webhooks.filter((webhook: any) => {
    const events = JSON.parse(webhook.events) as string[];
    return events.includes(event);
  });

  // Dispatch to each webhook
  const dispatches = relevantWebhooks.map(async (webhook: any) => {
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
