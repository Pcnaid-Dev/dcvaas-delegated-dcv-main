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
  expires_at?: string;
  cf_custom_hostname_id?: string;
}

interface OrgRow {
  id: string;
  name: string;
}

interface MemberRow {
  email: string;
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
    const syncMessages = domains.map(domain => ({
      body: {
        id: crypto.randomUUID(),
        type: 'sync_status' as const,
        domain_id: domain.id,
        attempts: 0
      }
    }));

    // Send messages in batches
    if (syncMessages.length > 0) {
      await env.QUEUE.sendBatch(syncMessages);
    }

    // 2. Check for certificates expiring in the next 7 days
    await checkExpiringCertificates(env);
  },
};

async function checkExpiringCertificates(env: Env): Promise<void> {
  try {
    // Calculate date 7 days from now
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = sevenDaysFromNow.toISOString();

    // Find active domains expiring within 7 days
    const res = await env.DB.prepare(
      `SELECT * FROM domains 
       WHERE status = 'active' 
       AND expires_at IS NOT NULL 
       AND expires_at <= ?
       AND expires_at > datetime('now')
       ORDER BY expires_at ASC
       LIMIT 100`
    ).bind(sevenDaysStr).all<DomainRow>();

    const expiringDomains = res.results ?? [];
    console.log(`Cron: Found ${expiringDomains.length} certificates expiring within 7 days`);

    // Send email notifications for each expiring domain
    for (const domain of expiringDomains) {
      await sendExpiringCertificateNotification(env, domain);
    }
  } catch (error) {
    console.error('Failed to check expiring certificates:', error);
  }
}

async function sendExpiringCertificateNotification(env: Env, domain: DomainRow): Promise<void> {
  try {
    if (!domain.expires_at) return;

    // Get organization details
    const org = await env.DB.prepare('SELECT * FROM organizations WHERE id = ?')
      .bind(domain.org_id)
      .first<OrgRow>();
    
    if (!org) return;

    // Get all active members of the organization
    const members = await env.DB.prepare(
      `SELECT email FROM organization_members 
       WHERE org_id = ? AND status = 'active'`
    ).bind(domain.org_id).all<MemberRow>();

    const emails = members.results?.map(m => m.email).filter(Boolean) || [];
    
    if (emails.length === 0) return;

    // Calculate days until expiry
    const expiresAt = new Date(domain.expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Build email HTML
    const html = buildCertificateExpiringEmail(
      domain.domain_name,
      daysUntilExpiry,
      domain.expires_at,
      org.name
    );

    // Queue email notification
    await env.QUEUE.send({
      id: crypto.randomUUID(),
      type: 'send_email',
      emailParams: {
        to: emails,
        subject: `Certificate Expiring Soon: ${domain.domain_name} (${daysUntilExpiry} days)`,
        html,
      },
      attempts: 0,
    });

    console.log(`Queued expiring certificate notification for domain ${domain.domain_name} to ${emails.length} recipients`);
  } catch (error) {
    console.error('Failed to queue expiring certificate notification:', error);
    // Don't throw - we don't want to fail the cron job
  }
}

function buildCertificateExpiringEmail(
  domainName: string,
  daysUntilExpiry: number,
  expiresAt: string,
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
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .warning-badge { display: inline-block; background: #f59e0b; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin: 20px 0; }
    .domain { font-size: 24px; font-weight: 700; color: #1f2937; margin: 20px 0; }
    .info-box { background: #fef3c7; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .action-box { background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Certificate Expiring Soon</h1>
    </div>
    <div class="content">
      <div class="warning-badge">⏰ Expires in ${daysUntilExpiry} days</div>
      <p>This is a reminder that your SSL/TLS certificate is approaching its expiration date.</p>
      
      <div class="domain">${domainName}</div>
      
      <div class="info-box">
        <p><strong>Expiration Details:</strong></p>
        <ul>
          <li>Expires on: <strong>${new Date(expiresAt).toLocaleDateString()}</strong></li>
          <li>Days remaining: <strong>${daysUntilExpiry}</strong></li>
        </ul>
      </div>
      
      <p><strong>What you need to do:</strong></p>
      <ul>
        <li>If auto-renewal is enabled, your certificate should renew automatically</li>
        <li>Please verify that your DNS records are still correctly configured</li>
        <li>Check your domain status in the dashboard</li>
      </ul>
      
      <div class="action-box">
        <a href="https://dcv.pcnaid.com" class="button">View Certificate Details</a>
      </div>
      
      <p>If you need assistance, please contact our support team.</p>
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