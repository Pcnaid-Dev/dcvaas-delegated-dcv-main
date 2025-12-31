import type { Env } from './env';
import type { JobMessage, SendEmailJob } from './lib/types';
import { handleSyncStatus } from './handlers/sync-status';
import { handleSendEmail } from './handlers/send-email';
import { MessageBatch } from '@cloudflare/workers-types';

export default {
  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    const promises = batch.messages.map(async (message) => {
      const job = message.body;
      try {
switch (job.type) {
  case "send_email": {
    // ...
    break;
  }

  default: {
    const unknownType = (job as any)?.type ?? "unknown";
    console.error("Unknown job type:", unknownType);
    break;
  }
}

        message.ack();
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error);
        
        // Prevent infinite loops for DLQ notifications
        if (job.type === 'send_email' && (job as SendEmailJob).isDLQNotification) {
          message.ack();
        } else {
          message.retry();
        }
      }
    });

    await Promise.allSettled(promises);
  },
};