import type { Env } from '../env';
import type { SyncStatusJob } from '../lib/types';
import { getCustomHostname } from '../lib/cloudflare';
import { buildCertificateIssuedEmail } from '../lib/email-templates';

export async function handleSyncStatus(job: SyncStatusJob, env: Env) {
  const domain = await env.DB.prepare('SELECT * FROM domains WHERE id = ?').bind(job.domain_id).first<any>();
  if (!domain || !domain.cf_custom_hostname_id) return;

  const previousStatus = domain.status;
  const cfData = await getCustomHostname(env, domain.cf_custom_hostname_id);

  // Store the old status before updating
  const oldStatus = domain.status;

  let internalStatus = 'pending_cname';
  if (cfData.status === 'active' && cfData.ssl.status === 'active') {
    internalStatus = 'active';
  } else if (cfData.ssl.status === 'validation_failed') {
    internalStatus = 'error';
  } else if (cfData.status === 'pending_validation') {
    internalStatus = 'issuing'; // Or 'pending_validation'
  }

  await env.DB.prepare(`
    UPDATE domains
    SET status = ?, cf_status = ?, cf_ssl_status = ?, cf_verification_errors = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    internalStatus,
    cfData.status,
    cfData.ssl.status,
    JSON.stringify(cfData.ssl.validation_errors || []),
    domain.id
  ).run();

  // Dispatch webhook if domain became active (fire and forget - don't await)
  if (oldStatus !== 'active' && internalStatus === 'active') {
    dispatchWebhook(env, domain.org_id, 'domain.active', {
      domain_id: domain.id,
      domain_name: domain.domain_name,
      status: internalStatus,
      expires_at: domain.expires_at,
    }).catch((err) => console.error('Failed to dispatch domain.active webhook:', err));
  }

  // Dispatch webhook if domain went into error state (fire and forget - don't await)
  if (oldStatus !== 'error' && internalStatus === 'error') {
    dispatchWebhook(env, domain.org_id, 'domain.error', {
      domain_id: domain.id,
      domain_name: domain.domain_name,
      status: internalStatus,
      error_message: cfData.ssl.validation_errors?.[0] || 'Unknown error',
    }).catch((err) => console.error('Failed to dispatch domain.error webhook:', err));
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
