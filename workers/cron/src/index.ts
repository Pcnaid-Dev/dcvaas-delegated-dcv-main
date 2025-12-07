import type { Env, JobMessage } from './lib/types';

interface DomainRow {
  id: string;
  org_id: string;
  domain_name: string;
  status: 'pending_cname' | 'issuing' | 'active' | 'error';
  expires_at: string | null;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Starting daily renewal check:', new Date().toISOString());

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const res = await env.DB.prepare(
      `
      SELECT * FROM domains
      WHERE status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at < ?
    `
    )
      .bind(thirtyDaysFromNow.toISOString())
      .all<DomainRow>();

    const domains = res.results ?? [];
    console.log(`Found ${domains.length} expiring domains`);

    for (const domain of domains) {
      const jobId = crypto.randomUUID();
      const now = new Date().toISOString();

      await env.DB.prepare(
        `
        INSERT INTO jobs
          (id, type, domain_id, status, attempts, created_at, updated_at)
        VALUES (?, 'renewal', ?, 'queued', 0, ?, ?)
      `
      )
        .bind(jobId, domain.id, now, now)
        .run();

      const msg: JobMessage = {
        id: jobId,
        type: 'renewal',
        domain_id: domain.id,
        attempts: 0,
      };

      await env.QUEUE.send(msg);
    }
  },
};
