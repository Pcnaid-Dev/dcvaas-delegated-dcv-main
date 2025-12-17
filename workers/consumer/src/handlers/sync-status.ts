import type { Env } from '../env';
import type { JobMessage } from '../lib/types';
import { getCustomHostname } from '../lib/cloudflare';
import { dispatchWebhook } from '../lib/webhooks';

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

  // Extract expires_at from Cloudflare data if available
  const expiresAt = cfData.ssl?.expires_on || domain.expires_at;

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

  // Dispatch webhook if status changed to 'active'
  if (internalStatus === 'active' && previousStatus !== 'active') {
    try {
      await dispatchWebhook(env, domain.org_id, 'domain.active', {
        domain_id: domain.id,
        domain_name: domain.domain_name,
        status: internalStatus,
        expires_at: expiresAt,
      });
    } catch (err) {
      console.error('Failed to dispatch webhook:', err);
      // Don't fail the job if webhook dispatch fails
    }
  }

  // Dispatch webhook if status changed to 'error'
  if (internalStatus === 'error' && previousStatus !== 'error') {
    try {
      await dispatchWebhook(env, domain.org_id, 'domain.error', {
        domain_id: domain.id,
        domain_name: domain.domain_name,
        status: internalStatus,
        error_message: domain.error_message,
        verification_errors: cfData.ssl.validation_errors || [],
      });
    } catch (err) {
      console.error('Failed to dispatch webhook:', err);
    }
  }
}
