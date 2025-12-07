// workers/consumer/src/handlers/sync-status.ts (New Handler)

export async function handleSyncStatus(job: JobMessage, env: Env) {
  const domain = await env.DB.prepare('SELECT * FROM domains WHERE id = ?').bind(job.domain_id).first();
  
  if (!domain || !domain.cf_custom_hostname_id) return;

  const cfData = await getCustomHostname(env, domain.cf_custom_hostname_id);

  // Map Cloudflare status to your internal status
  let internalStatus = 'pending_cname';
  if (cfData.status === 'active' && cfData.ssl.status === 'active') {
    internalStatus = 'active';
  } else if (cfData.ssl.status === 'validation_failed') {
    internalStatus = 'error';
  } else if (cfData.ssl.status === 'initializing' || cfData.ssl.status === 'pending_validation') {
    internalStatus = 'issuing';
  }

  await env.DB.prepare(`
    UPDATE domains 
    SET status = ?, cf_status = ?, cf_ssl_status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(internalStatus, cfData.status, cfData.ssl.status, domain.id).run();
}