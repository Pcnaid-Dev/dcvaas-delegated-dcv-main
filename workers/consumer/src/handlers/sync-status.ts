import type { Env } from '../env';
import type { JobMessage } from '../lib/types';
import { getCustomHostname } from '../lib/cloudflare';
import { dispatchWebhook } from '../../../api/src/lib/webhooks';

export async function handleSyncStatus(job: JobMessage, env: Env) {
  const domain = await env.DB.prepare('SELECT * FROM domains WHERE id = ?').bind(job.domain_id).first<any>();
  if (!domain || !domain.cf_custom_hostname_id) return;

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
  }
}
