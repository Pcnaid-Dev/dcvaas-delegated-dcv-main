import type { Env, JobMessage, JobRow } from './lib/types';
import { handleDNSCheck } from './handlers/dns-check';
import { handleStartIssuance } from './handlers/issuance';
import { handleRenewal } from './handlers/renewal';

type MessageBatch<T> = {
  messages: {
    body: T;
    ack: () => void;
    retry: (opts?: { delaySeconds?: number }) => void;
  }[];
};

export default {
  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const job = message.body;
      try {
        // Mark running
        await env.DB.prepare(
          'UPDATE jobs SET status = ?, updated_at = datetime("now") WHERE id = ?'
        )
          .bind('running', job.id)
          .run();

        let result: unknown;
        switch (job.type) {
          case 'dns_check':
            result = await handleDNSCheck(job, env);
            break;
          case 'start_issuance':
            result = await handleStartIssuance(job, env);
            break;
          case 'renewal':
            result = await handleRenewal(job, env);
            break;
          default:
            throw new Error(`Unknown job type: ${job.type}`);
        }

        await env.DB.prepare(
          `
          UPDATE jobs
          SET status = 'succeeded',
              result = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `
        )
          .bind(JSON.stringify(result ?? {}), job.id)
          .run();

        message.ack();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';

        const existing = await env.DB.prepare(
          'SELECT * FROM jobs WHERE id = ?'
        )
          .bind(job.id)
          .first<JobRow>();

        const attempts = (existing?.attempts ?? job.attempts) + 1;

        if (attempts >= 3) {
          await env.DB.prepare(
            `
            UPDATE jobs
            SET status = 'failed',
                attempts = ?,
                last_error = ?,
                updated_at = datetime('now')
            WHERE id = ?
          `
          )
            .bind(attempts, errorMessage, job.id)
            .run();

          await env.DLQ.send({ ...job, attempts });

          message.ack();
        } else {
          await env.DB.prepare(
            `
            UPDATE jobs
            SET attempts = ?,
                last_error = ?,
                updated_at = datetime('now')
            WHERE id = ?
          `
          )
            .bind(attempts, errorMessage, job.id)
            .run();

          const delaySeconds = Math.pow(2, attempts) * 60; // 2, 4, 8min
          message.retry({ delaySeconds });
        }
      }
    }
  },
};
