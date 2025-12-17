import { Resend } from 'resend';
import type { Env } from '../env';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email using Resend API
 * This function is called from the queue consumer to send emails asynchronously
 */
export async function sendEmail(env: Env, params: SendEmailParams): Promise<void> {
  const resend = new Resend(env.RESEND_API_KEY);
  
  const from = params.from || 'DCVaaS <noreply@pcnaid.com>';
  
  try {
    const response = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    
    console.log('Email sent successfully:', response);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Queue an email notification to be sent asynchronously
 */
export async function queueEmailNotification(
  env: Env,
  emailParams: SendEmailParams
): Promise<void> {
  await env.QUEUE.send({
    id: crypto.randomUUID(),
    type: 'send_email',
    emailParams,
    attempts: 0,
  });
}

/**
 * Email template: Certificate issued successfully
 */
export function buildCertificateIssuedEmail(domainName: string, orgName: string): string {
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

/**
 * Email template: Certificate expiring soon
 */
export function buildCertificateExpiringEmail(
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

/**
 * Email template: Job failed and moved to Dead Letter Queue
 */
export function buildJobFailedEmail(
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
        <code style="display: block; background: #fef2f2; padding: 12px; border-radius: 4px; margin-top: 8px; word-break: break-word;">${errorMessage}</code>
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
