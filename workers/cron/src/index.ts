import { ScheduledEvent, ExecutionContext, Queue, D1Database } from '@cloudflare/workers-types';
import { buildCertificateExpiringEmail } from './lib/email-templates';

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
    // OR active domains that haven't been updated in > 24 hours
    // Use LIMIT to avoid overwhelming the queue with large batches
    const BATCH_SIZE = 100;
  const res = await env.DB.prepare(
    `SELECT * FROM domains 
     WHERE status != 'active' 
        OR (status = 'active' AND updated_at < datetime('now', '-1 day'))
     ORDER BY updated_at ASC 
     LIMIT ?`
  ).bind(BATCH_SIZE).all<DomainRow>();

  const domains = res.results ?? [];
  console.log(`Cron: Processing ${domains.length} domains (non-active or active domains needing refresh)`);

  // Batch send to queue for better performance
  const messages = domains.map(domain => ({
    body: { // <--- THIS FIXES THE TYPE ERROR
      id: crypto.randomUUID(),
      type: 'sync_status' as const,
      domain_id: domain.id,
      attempts: 0
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