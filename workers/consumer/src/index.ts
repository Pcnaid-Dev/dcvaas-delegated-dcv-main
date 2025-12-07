// workers/consumer/src/index.ts
import type { Env, JobMessage } from './lib/types';
// We removed issuance/renewal handlers. 
// We will only keep a stub or a sync handler here.

export default {
  async queue(batch: any, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const job = message.body;
      try {
        console.log(`Processing job ${job.type} for ${job.domain_id}`);
        
        // Mark job as running
        await env.DB.prepare(
          'UPDATE jobs SET status = ?, updated_at = datetime("now") WHERE id = ?'
        ).bind('running', job.id).run();

        // Since we moved to Cloudflare for SaaS, we don't need to do complex ACME work here.
        // We just mark it as succeeded to clear the queue.
        // (In a future update, you can wire this to "syncDomain" if you want background syncing)
        
        await env.DB.prepare(
          'UPDATE jobs SET status = ?, result = ?, updated_at = datetime("now") WHERE id = ?'
        ).bind('succeeded', JSON.stringify({ message: "Handled by Cloudflare SaaS" }), job.id).run();

        message.ack();
      } catch (err: any) {
        console.error(err);
        message.retry();
      }
    }
  },
};
