import { ScheduledEvent, ExecutionContext, Queue, D1Database } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  QUEUE: Queue;
}

interface DomainRow {
  id: string;
  org_id: string;
  domain_name: string;
  status: string;
  cf_custom_hostname_id?: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // 1. Find domains that are NOT active yet (stuck in pending/issuing)
    const res = await env.DB.prepare(
      `SELECT * FROM domains WHERE status != 'active'`
    ).all<DomainRow>();

    const domains = res.results ?? [];

    for (const domain of domains) {
      // 2. Queue a "sync_status" job instead of "renewal"
      // You will need to ensure your consumer handles this type
      const jobId = crypto.randomUUID();
      await env.QUEUE.send({
        id: jobId,
        type: 'sync_status', // NEW JOB TYPE
        domain_id: domain.id,
        attempts: 0,
      });
    }
  },
};