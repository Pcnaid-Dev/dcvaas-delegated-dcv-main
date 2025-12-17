import type { Env } from './env';
import { MessageBatch } from '@cloudflare/workers-types';

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
    await env.QUEUE.send({
      id: crypto.randomUUID(),
      type: 'send_email',
      emailParams: {
        to: emails,
        subject: `⚠️ Job Failed: ${domain.domain_name} - ${job.type}`,
        html,
      },
      attempts: 0,
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

function buildJobFailedEmail(
  domainName: string,
  jobType: string,
  errorMessage: string,
  orgName: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .error-badge { display: inline-block; background: #dc2626; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin: 20px 0; }
    .domain { font-size: 24px; font-weight: 700; color: #1f2937; margin: 20px 0; }
    .error-box { background: #fee2e2; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626; }
    .action-box { background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
    code { display: block; background: #fef2f2; padding: 12px; border-radius: 4px; margin-top: 8px; word-break: break-word; font-family: 'Courier New', monospace; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Job Processing Failed</h1>
    </div>
    <div class="content">
      <div class="error-badge">⚠️ Requires Attention</div>
      <p>A background job has failed after multiple retry attempts and has been moved to the Dead Letter Queue.</p>
      
      <div class="domain">${domainName}</div>
      
      <div class="error-box">
        <p><strong>Job Details:</strong></p>
        <ul>
          <li>Job Type: <strong>${jobType}</strong></li>
          <li>Status: <strong>Failed (moved to DLQ)</strong></li>
        </ul>
        <p><strong>Error Message:</strong></p>
        <code>${errorMessage}</code>
      </div>
      
      <p><strong>What this means:</strong></p>
      <ul>
        <li>The system was unable to process this job after multiple attempts</li>
        <li>Manual intervention may be required</li>
        <li>Check your domain configuration and DNS settings</li>
      </ul>
      
      <div class="action-box">
        <a href="https://dcv.pcnaid.com" class="button">View Job Details</a>
      </div>
      
      <p>If you need help resolving this issue, please contact our support team with the details above.</p>
    </div>
    <div class="footer">
      <p>This email was sent to you by DCVaaS for ${orgName}</p>
      <p>© ${new Date().getFullYear()} DCVaaS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
