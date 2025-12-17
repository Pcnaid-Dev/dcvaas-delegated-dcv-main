import type { Env } from '../env';
import type { JobMessage } from '../lib/types';
import { getCustomHostname } from '../lib/cloudflare';
import { dispatchWebhook } from '../lib/webhooks';

export async function handleSyncStatus(job: JobMessage, env: Env) {
  const domain = await env.DB.prepare('SELECT * FROM domains WHERE id = ?').bind(job.domain_id).first<any>();
  if (!domain || !domain.cf_custom_hostname_id) return;

  const previousStatus = domain.status;
  const cfData = await getCustomHostname(env, domain.cf_custom_hostname_id);

  let internalStatus = 'pending_cname';
  if (cfData.status === 'active' && cfData.ssl.status === 'active') {
    internalStatus = 'active';
  } else if (cfData.ssl.status === 'validation_failed') {
    internalStatus = 'error';
  } else if (cfData.status === 'pending_validation') {
    internalStatus = 'issuing'; // Or 'pending_validation'
  }

  // Extract expires_at from SSL certificate if available
  let expiresAt = domain.expires_at;
  if (cfData.ssl?.certificate && cfData.ssl.certificate.expires_on) {
    expiresAt = cfData.ssl.certificate.expires_on;
  }

  await env.DB.prepare(`
    UPDATE domains
    SET status = ?, cf_status = ?, cf_ssl_status = ?, cf_verification_errors = ?, expires_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    internalStatus,
    cfData.status,
    cfData.ssl.status,
    JSON.stringify(cfData.ssl.validation_errors || []),
    expiresAt,
    domain.id
  ).run();

  // Dispatch webhook if status changed to active
  if (previousStatus !== 'active' && internalStatus === 'active') {
    await dispatchWebhook(env, domain.org_id, 'domain.active', {
      domain: {
        id: domain.id,
        domainName: domain.domain_name,
        status: internalStatus,
        expiresAt,
      },
      timestamp: new Date().toISOString(),
    }).catch(err => {
      console.error('Failed to dispatch webhook:', err);
      // Don't fail the job if webhook dispatch fails
    });
  }

  // Dispatch webhook if status changed to error
  if (previousStatus !== 'error' && internalStatus === 'error') {
    await dispatchWebhook(env, domain.org_id, 'domain.error', {
      domain: {
        id: domain.id,
        domainName: domain.domain_name,
        status: internalStatus,
        errors: cfData.ssl.validation_errors || [],
      },
      timestamp: new Date().toISOString(),
    }).catch(err => {
      console.error('Failed to dispatch webhook:', err);
      // Don't fail the job if webhook dispatch fails
    });
  }
}
