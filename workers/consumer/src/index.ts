import type { Env } from './env';
import type { JobMessage } from './lib/types';
import { handleSyncStatus } from './handlers/sync-status';
import { handleSendEmail } from './handlers/send-email';
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
          case 'send_email':
            await handleSendEmail(job, env);
            break;
          // case 'dns_check':
          //   await handleDnsCheck(job, env);
          //   break;
          default:
            // Unknown job type - throw error so it gets sent to DLQ
            const unknownType = 'type' in job ? job.type : 'unknown';
            console.error(`Unknown job type: ${unknownType}. Throwing error to send to DLQ.`);
            throw new Error(`Unknown job type: ${unknownType}`);
        }
        message.ack();
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error);
        
        // If this is a DLQ notification email that failed, just ack it to prevent infinite loops
        if (job.type === 'send_email' && job.isDLQNotification) {
          console.error('DLQ notification email failed - acknowledging to prevent infinite loop');
          message.ack();
        } else {
          message.retry();
          throw error;
        }
      }
    });

    // Wait for all messages to be processed and log any failures
    const results = await Promise.allSettled(promises);
    
    // Check for any failures and log them
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.error(`Batch processing completed with ${failures.length} failures out of ${results.length} messages`);
      failures.forEach((failure, idx) => {
        console.error(`Message ${idx} failed:`, failure.reason);
      });
    }
  },
};
