import type { Env } from './env';
import type { JobMessage } from './lib/types';
import { handleSyncStatus } from './handlers/sync-status';

export default {
  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
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
    }
  },
};
