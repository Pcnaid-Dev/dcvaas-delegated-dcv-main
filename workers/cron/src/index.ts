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
    // Use LIMIT to avoid overwhelming the queue with large batches
    const BATCH_SIZE = 100;
  const res = await env.DB.prepare(
    `SELECT * FROM domains 
     WHERE status IN ('pending_cname', 'issuing')
     ORDER BY updated_at ASC 
     LIMIT ?`
  ).bind(BATCH_SIZE).all<DomainRow>();

  const domains = res.results ?? [];
  console.log(`Cron: Processing ${domains.length} pending/issuing domains`);

  // Batch send to queue for better performance
  const messages = domains.map(domain => ({
    body: { // <--- THIS FIXES THE TYPE ERROR
      id: crypto.randomUUID(),
      type: 'sync_status' as const,
      domain_id: domain.id,
      attempts: 0
    }
  }));

  // Send messages in batches
  if (messages.length > 0) {
    await env.QUEUE.sendBatch(messages);
  }
    },
  };