import type { Env } from '../env';
import type { SyncStatusJob } from '../lib/types';
import { getCustomHostname } from '../lib/cloudflare';
import { buildCertificateIssuedEmail } from '../lib/email-templates';

export async function handleSyncStatus(job: SyncStatusJob, env: Env) {
  const domain = await env.DB.prepare('SELECT * FROM domains WHERE id = ?').bind(job.domain_id).first<any>();
  if (!domain || !domain.cf_custom_hostname_id) return;

  const previousStatus = domain.status;
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
 * Uses shared dispatch logic with database-level event filtering
 */
async function dispatchWebhook(
  env: Env,
  orgId: string,
  event: string,
  payload: Record<string, any>
) {
  // Use shared webhook dispatch module
  const { dispatchWebhook: sharedDispatch } = await import('../../shared/webhook-dispatch');
  await sharedDispatch(env.DB, orgId, event as any, payload);
  // Send email notification when certificate becomes active
  if (previousStatus !== 'active' && internalStatus === 'active') {
    await sendCertificateIssuedNotification(env, domain);
  }
}

async function sendCertificateIssuedNotification(env: Env, domain: any): Promise<void> {
  try {
    // Get organization details
    const org = await env.DB.prepare('SELECT * FROM organizations WHERE id = ?')
      .bind(domain.org_id)
      .first<any>();
    
    if (!org) return;

    // Get all active members of the organization
    const members = await env.DB.prepare(
      `SELECT email FROM organization_members 
       WHERE org_id = ? AND status = 'active'`
    ).bind(domain.org_id).all<{ email: string }>();

    const emails = members.results?.map(m => m.email).filter(Boolean) || [];
    
    if (emails.length === 0) return;

    // Build email HTML
    const html = buildCertificateIssuedEmail(domain.domain_name, org.name);

    // Queue email notification
    await env.QUEUE.send({
      id: crypto.randomUUID(),
      type: 'send_email',
      emailParams: {
        to: emails,
        subject: `Certificate Issued: ${domain.domain_name}`,
        html,
      },
      attempts: 0,
    });

    console.log(`Queued certificate issued notification for domain ${domain.domain_name} to ${emails.length} recipients`);
  } catch (error) {
    console.error('Failed to queue certificate issued notification:', error);
    // Don't throw - we don't want to fail the job if email queueing fails
  }
}
