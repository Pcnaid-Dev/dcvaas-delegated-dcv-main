import type { Env } from '../env';
import type { SyncStatusJob } from '../lib/types';
import { getCustomHostname } from '../lib/cloudflare';

export async function handleSyncStatus(job: SyncStatusJob, env: Env) {
  const domain = await env.DB.prepare('SELECT * FROM domains WHERE id = ?').bind(job.domain_id).first<any>();
  if (!domain || !domain.cf_custom_hostname_id) return;

  const previousStatus = domain.status;
  const cfData = await getCustomHostname(env, domain.cf_custom_hostname_id);

  let internalStatus = 'pending_cname';
  if (cfData.status === 'active' && cfData.ssl.status === 'active') {
    internalStatus = 'active';
  } else if (cfData.ssl.status === 'validation_failed') {
    internalStatus = 'error';
  } else if (cfData.status === 'pending_validation') {
    internalStatus = 'issuing'; // Or 'pending_validation'
  }

  await env.DB.prepare(`
    UPDATE domains
    SET status = ?, cf_status = ?, cf_ssl_status = ?, cf_verification_errors = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    internalStatus,
    cfData.status,
    cfData.ssl.status,
    JSON.stringify(cfData.ssl.validation_errors || []),
    domain.id
  ).run();

  // Send email notification when certificate becomes active
  if (previousStatus !== 'active' && internalStatus === 'active') {
    await sendCertificateIssuedNotification(env, domain);
  }
}

async function sendCertificateIssuedNotification(env: Env, domain: any): Promise<void> {
  try {
    // Get organization details
    const org = await env.DB.prepare('SELECT * FROM organizations WHERE id = ?')
      .bind(domain.org_id)
      .first<any>();
    
    if (!org) return;

    // Get all active members of the organization
    const members = await env.DB.prepare(
      `SELECT email FROM organization_members 
       WHERE org_id = ? AND status = 'active'`
    ).bind(domain.org_id).all<{ email: string }>();

    const emails = members.results?.map(m => m.email).filter(Boolean) || [];
    
    if (emails.length === 0) return;

    // Build email HTML
    const html = buildCertificateIssuedEmail(domain.domain_name, org.name);

    // Queue email notification
    await env.QUEUE.send({
      id: crypto.randomUUID(),
      type: 'send_email',
      emailParams: {
        to: emails,
        subject: `Certificate Issued: ${domain.domain_name}`,
        html,
      },
      attempts: 0,
    });

    console.log(`Queued certificate issued notification for domain ${domain.domain_name} to ${emails.length} recipients`);
  } catch (error) {
    console.error('Failed to queue certificate issued notification:', error);
    // Don't throw - we don't want to fail the job if email queueing fails
  }
}

function buildCertificateIssuedEmail(domainName: string, orgName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin: 20px 0; }
    .domain { font-size: 24px; font-weight: 700; color: #1f2937; margin: 20px 0; }
    .info-box { background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Certificate Issued Successfully!</h1>
    </div>
    <div class="content">
      <div class="badge">✓ Active</div>
      <p>Great news! Your SSL/TLS certificate has been successfully issued and is now active.</p>
      
      <div class="domain">${domainName}</div>
      
      <div class="info-box">
        <p><strong>What this means:</strong></p>
        <ul>
          <li>Your domain is now secured with a valid SSL/TLS certificate</li>
          <li>HTTPS connections are enabled and trusted by browsers</li>
          <li>Certificate is automatically renewed before expiration</li>
        </ul>
      </div>
      
      <p>You can view your certificate details in your <a href="https://dcv.pcnaid.com" style="color: #2563eb;">DCVaaS dashboard</a>.</p>
      
      <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
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
