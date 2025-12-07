import type { Env, JobMessage } from '../lib/types';

export async function handleRenewal(job: JobMessage, env: Env): Promise<unknown> {
  // TODO: Replace stub with real ACME renewal logic.
  await env.DB.prepare(
    `
    UPDATE domains
    SET last_issued_at = datetime('now'),
        expires_at = datetime('now', '+90 days'),
        updated_at = datetime('now')
    WHERE id = ?
  `
  )
    .bind(job.domain_id)
    .run();

  return { success: true, stubbed: true };
}
