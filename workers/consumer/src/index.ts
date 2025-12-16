import type { Env } from './env';
import type { JobMessage } from './lib/types';
import { handleSyncStatus } from './handlers/sync-status';
import { MessageBatch } from '@cloudflare/workers-types';

export default {
  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    // Process messages in parallel for better throughput
    const promises = batch.messages.map(async (message) => {
      const job = message.body;
      try {
        switch (job.type) {
          case 'sync_status':
            await handleSyncStatus(job, env);
            break;
          // case 'dns_check':
          //   await handleDnsCheck(job, env);
          //   break;
          default:
            console.warn(`Unknown job type: ${job.type}`);
        }
        message.ack();
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error);
        message.retry();
      }
    });

    // Wait for all messages to be processed
    await Promise.allSettled(promises);
  },
};
