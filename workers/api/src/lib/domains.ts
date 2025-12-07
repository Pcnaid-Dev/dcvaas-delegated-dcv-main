import type { Env } from '../env';
import { createCustomHostname, getCustomHostname, recheckCustomHostname, getDcvDelegationUuid } from './cloudflare';

function normalizeHostname(input: string): string {
  const h = input.trim().toLowerCase();
  const stripped = h.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return stripped;
}

function isValidHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253) return false;
  if (!hostname.includes('.')) return false;
  if (!/^[a-z0-9.-]+$/.test(hostname)) return false;
  if (hostname.startsWith('-') || hostname.endsWith('-')) return false;
  return true;
}

function mapStatus(cfStatus?: string, cfSslStatus?: string) {
  // Keep labels close to your UI’s existing statuses
  if (cfSslStatus === 'active' && cfStatus === 'active') return 'active';
  if (cfSslStatus && cfSslStatus !== 'active') return 'pending_validation';
  return 'pending_cname';
}

export type DomainRow = {
  id: string;
  org_id: string;
  domain_name: string;
  status: string;
  cname_target: string;
  cf_custom_hostname_id?: string | null;
  cf_status?: string | null;
  cf_ssl_status?: string | null;
  cf_verification_errors?: string | null;
  created_at: string;
  updated_at: string;
};

export async function listDomains(env: Env, orgId: string) {
  const { results } = await env.DB
    .prepare(`SELECT * FROM domains WHERE org_id = ? ORDER BY created_at DESC`)
    .bind(orgId)
    .all<DomainRow>();

  // Add DCV delegation instruction helper for UI convenience
  const uuid = await getDcvDelegationUuid(env);
  return results.map((d) => ({
    id: d.id,
    orgId: d.org_id,
    domainName: d.domain_name,
    status: d.status,
    cnameTarget: d.cname_target,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    cfCustomHostnameId: d.cf_custom_hostname_id,
    cfStatus: d.cf_status,
    cfSslStatus: d.cf_ssl_status,
    dcvDelegation: {
      recordName: `_acme-challenge.${d.domain_name}`,
      recordTarget: `${d.domain_name}.${uuid}.dcv.cloudflare.com`,
    },
  }));
}

export async function getDomain(env: Env, orgId: string, domainId: string) {
  const row = await env.DB
    .prepare(`SELECT * FROM domains WHERE id = ? AND org_id = ? LIMIT 1`)
    .bind(domainId, orgId)
    .first<DomainRow>();

  if (!row) return null;

  const uuid = await getDcvDelegationUuid(env);
  return {
    id: row.id,
    orgId: row.org_id,
    domainName: row.domain_name,
    status: row.status,
    cnameTarget: row.cname_target,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cfCustomHostnameId: row.cf_custom_hostname_id,
    cfStatus: row.cf_status,
    cfSslStatus: row.cf_ssl_status,
    cfVerificationErrors: row.cf_verification_errors ? JSON.parse(row.cf_verification_errors) : [],
    dcvDelegation: {
      recordName: `_acme-challenge.${row.domain_name}`,
      recordTarget: `${row.domain_name}.${uuid}.dcv.cloudflare.com`,
    },
  };
}

export async function createDomain(env: Env, orgId: string, rawHostname: string) {
  const hostname = normalizeHostname(rawHostname);
  if (!isValidHostname(hostname)) throw new Error('Invalid domain/hostname (use like example.com)');

  // id generation that’s stable and simple
  const domainId = `dom_${crypto.randomUUID()}`;

  // Create Cloudflare custom hostname (Cloudflare generates/renews certs) 
  const cf = await createCustomHostname(env, hostname, { org_id: orgId, domain_id: domainId });

  const status = mapStatus(cf.status, cf.ssl?.status);

  await env.DB
    .prepare(
      `INSERT INTO domains
       (id, org_id, domain_name, status, cname_target, cf_custom_hostname_id, cf_status, cf_ssl_status, cf_verification_errors)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      domainId,
      orgId,
      hostname,
      status,
      env.SAAS_CNAME_TARGET,
      cf.id,
      cf.status || null,
      cf.ssl?.status || null,
      JSON.stringify(cf.verification_errors || []),
    )
    .run();

  return getDomain(env, orgId, domainId);
}

export async function syncDomain(env: Env, orgId: string, domainId: string) {
  const row = await env.DB
    .prepare(`SELECT * FROM domains WHERE id = ? AND org_id = ? LIMIT 1`)
    .bind(domainId, orgId)
    .first<DomainRow>();

  if (!row || !row.cf_custom_hostname_id) return null;

  const cf = await getCustomHostname(env, row.cf_custom_hostname_id);
  const status = mapStatus(cf.status, cf.ssl?.status);

  await env.DB
    .prepare(
      `UPDATE domains
       SET status = ?, cf_status = ?, cf_ssl_status = ?, cf_verification_errors = ?, updated_at = datetime('now')
       WHERE id = ? AND org_id = ?`,
    )
    .bind(
      status,
      cf.status || null,
      cf.ssl?.status || null,
      JSON.stringify(cf.verification_errors || []),
      domainId,
      orgId,
    )
    .run();

  return getDomain(env, orgId, domainId);
}

export async function forceRecheck(env: Env, orgId: string, domainId: string) {
  const row = await env.DB
    .prepare(`SELECT * FROM domains WHERE id = ? AND org_id = ? LIMIT 1`)
    .bind(domainId, orgId)
    .first<DomainRow>();

  if (!row || !row.cf_custom_hostname_id) return null;

  await recheckCustomHostname(env, row.cf_custom_hostname_id);
  return syncDomain(env, orgId, domainId);
}
