import type { Env, JobMessage, DomainRow } from '../lib/types';
import { logAudit } from '../lib/audit';

export async function handleDNSCheck(job: JobMessage, env: Env): Promise<unknown> {
  const domain = await env.DB.prepare(
    'SELECT * FROM domains WHERE id = ?'
  )
    .bind(job.domain_id)
    .first<DomainRow>();

  if (!domain) {
    throw new Error('Domain not found');
  }

  const recordName = `_acme-challenge.${domain.domain_name}`;
  const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
    recordName
  )}&type=CNAME`;

  const response = await fetch(dohUrl, {
    headers: { Accept: 'application/dns-json' },
  });

  if (!response.ok) {
    throw new Error(`DNS query failed with status ${response.status}`);
  }

  const dnsResult = await response.json() as any;

  const cnameRecord = dnsResult.Answer?.find((r: any) => r.type === 5);
  if (cnameRecord && cnameRecord.data) {
    // Cloudflare returns trailing dot
    const target = String(cnameRecord.data).replace(/\.$/, '');

    if (target === domain.cname_target) {
      await env.DB.prepare(
        'UPDATE domains SET status = ?, updated_at = datetime("now") WHERE id = ?'
      )
        .bind('issuing', domain.id)
        .run();

      await logAudit(env, {
        org_id: domain.org_id,
        action: 'domain.dns_verified',
        entity_type: 'domain',
        entity_id: domain.id,
        details: { recordName, target },
      });

      return { success: true, target };
    }

    throw new Error(
      `CNAME target mismatch. Expected ${domain.cname_target}, got ${target}`
    );
  }

  throw new Error(`CNAME record for ${recordName} not found`);
}
