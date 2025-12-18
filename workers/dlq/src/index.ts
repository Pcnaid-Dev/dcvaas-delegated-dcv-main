import type { Env } from './env';
import { MessageBatch } from '@cloudflare/workers-types';
import { buildJobFailedEmail } from './lib/email-templates';

interface JobMessage {
  id: string;
  type: string;
  domain_id?: string;
  attempts: number;
  [key: string]: any;
}

interface OrgRow {
  id: string;
  name: string;
}

interface MemberRow {
  email: string;
}

interface DomainRow {
  id: string;
  org_id: string;
  domain_name: string;
}

export default {
  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    console.log(`DLQ: Processing ${batch.messages.length} failed jobs`);
    
    // Process each failed job
    for (const message of batch.messages) {
      const job = message.body;
      
      try {
        console.error(`Job ${job.id} exhausted retries and moved to DLQ:`, {
          type: job.type,
          domain_id: job.domain_id,
          attempts: job.attempts,
        });

        // Send notification email for failed job
        await sendJobFailedNotification(env, job, message);
        
        // Acknowledge the message so it's removed from DLQ
        message.ack();
      } catch (error) {
        console.error(`Failed to process DLQ message ${job.id}:`, error);
        // Still ack to prevent infinite retry loop
        message.ack();
      }
    }
  },
};

async function sendJobFailedNotification(
  env: Env,
  job: JobMessage,
  message: any
): Promise<void> {
  try {
    // Only send notifications for jobs with domain_id
    if (!job.domain_id) {
      console.log(`Skipping notification for job ${job.id} - no domain_id`);
      return;
    }

    // Get domain details
    const domain = await env.DB.prepare('SELECT * FROM domains WHERE id = ?')
      .bind(job.domain_id)
      .first<DomainRow>();
    
    if (!domain) {
      console.log(`Domain not found for job ${job.id}`);
      return;
    }

    // Get organization details
    const org = await env.DB.prepare('SELECT * FROM organizations WHERE id = ?')
      .bind(domain.org_id)
      .first<OrgRow>();
    
    if (!org) {
      console.log(`Organization not found for job ${job.id}`);
      return;
    }

    // Get all active members of the organization (admins and owners)
    const members = await env.DB.prepare(
      `SELECT email FROM organization_members 
       WHERE org_id = ? 
       AND status = 'active' 
       AND role IN ('owner', 'admin')`
    ).bind(domain.org_id).all<MemberRow>();

    const emails = members.results?.map(m => m.email).filter(Boolean) || [];
    
    if (emails.length === 0) {
      console.log(`No admin emails found for org ${domain.org_id}`);
      return;
    }

    // Extract error message
    const errorMessage = extractErrorMessage(message);

    // Build email HTML
    const html = buildJobFailedEmail(
      domain.domain_name,
      job.type,
      errorMessage,
      org.name
    );

    // Queue email notification
    // Note: We queue this with low priority to avoid infinite loops if email sending fails
    // The consumer will process this as a normal email job
    await env.QUEUE.send({
      id: crypto.randomUUID(),
      type: 'send_email',
      emailParams: {
        to: emails,
        subject: `⚠️ Job Failed: ${domain.domain_name} - ${job.type}`,
        html,
      },
      attempts: 0,
      // CRITICAL: Mark this as a DLQ notification so we can handle it specially if it fails
      // If this email itself fails, the consumer will acknowledge it instead of retrying,
      // preventing an infinite loop where failed DLQ notifications generate more DLQ notifications
      isDLQNotification: true,
    });

    console.log(`Queued DLQ notification for domain ${domain.domain_name} to ${emails.length} recipients`);
  } catch (error) {
    console.error('Failed to queue DLQ notification:', error);
  }
}

function extractErrorMessage(message: any): string {
  // Try to extract error message from the message metadata
  if (message.error) {
    return typeof message.error === 'string' ? message.error : JSON.stringify(message.error);
  }
  
  // Check for common error fields
  if (message.body?.last_error) {
    return message.body.last_error;
  }
  
  if (message.body?.error) {
    return typeof message.body.error === 'string' ? message.body.error : JSON.stringify(message.body.error);
  }
  
  return 'Unknown error - job exhausted retries';
}
