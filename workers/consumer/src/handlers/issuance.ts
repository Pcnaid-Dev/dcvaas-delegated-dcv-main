import type { Env, JobMessage } from '../lib/types';

export async function handleStartIssuance(job: JobMessage, env: Env): Promise<unknown> {
  // TODO: Replace stub with real ACME flow using acme-client and Cloudflare DNS.
  await env.DB.prepare(
    `
    UPDATE domains
    SET status = 'active',
        last_issued_at = datetime('now'),
        expires_at = datetime('now', '+90 days'),
        updated_at = datetime('now'),
        error_message = NULL
    WHERE id = ?
  `
  )
    .bind(job.domain_id)
    .run();

  return { success: true, stubbed: true };
}
