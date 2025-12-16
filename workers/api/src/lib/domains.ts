// workers/api/src/lib/domains.ts
import type { Env } from '../env';
import { createCustomHostname, getCustomHostname, deleteCustomHostname } from './cloudflare';

// --- Types ---
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

// --- READ Functions ---

export async function listDomains(env: Env, orgId: string, limit = 100, offset = 0) {
  const { results } = await env.DB
    .prepare(`SELECT * FROM domains WHERE org_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .bind(orgId, limit, offset)
    .all<DomainRow>();

  // Helper to show the target they need to CNAME to
  const cnameTarget = env.SAAS_CNAME_TARGET; 

return results.map((d: DomainRow) => ({
    id: d.id,
    orgId: d.org_id,
    domainName: d.domain_name,
    status: d.status,
    cnameTarget: d.cname_target, // The value stored in DB
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    cfCustomHostnameId: d.cf_custom_hostname_id,
    cfStatus: d.cf_status,
    cfSslStatus: d.cf_ssl_status,
    // Instructions for the UI
    dnsInstruction: `${d.domain_name} CNAME ${cnameTarget}`
  }));
}

export async function getDomain(env: Env, orgId: string, domainId: string) {
  const row = await env.DB
    .prepare(`SELECT * FROM domains WHERE id = ? AND org_id = ? LIMIT 1`)
    .bind(domainId, orgId)
    .first<DomainRow>();

  if (!row) return null;

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
  };
}

// --- WRITE Functions ---

export async function createDomain(env: Env, orgId: string, rawHostname: string) {
  const hostname = rawHostname.trim().toLowerCase();
  
  // 1. Call Cloudflare API to create the hostname
  const cfData = await createCustomHostname(env, hostname);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const cnameTarget = env.SAAS_CNAME_TARGET; 

  // 2. Insert into DB
  await env.DB.prepare(`
    INSERT INTO domains (
      id, org_id, domain_name, status, cname_target, 
      cf_custom_hostname_id, cf_status, cf_ssl_status, 
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, orgId, hostname, 
    'pending_cname', 
    cnameTarget,
    cfData.id,
    cfData.status,
    cfData.ssl.status,
    now, now
  ).run();

  return getDomain(env, orgId, id);
}

export async function deleteDomain(env: Env, orgId: string, domainId: string) {
  const domain = await getDomain(env, orgId, domainId);
  if (!domain) return;

  if (domain.cfCustomHostnameId) {
    // Delete from Cloudflare
    await deleteCustomHostname(env, domain.cfCustomHostnameId);
  }

  // Delete from DB
  await env.DB.prepare('DELETE FROM domains WHERE id = ? AND org_id = ?')
    .bind(domainId, orgId)
    .run();
}

// --- SYNC Functions ---

export async function syncDomain(env: Env, orgId: string, domainId: string) {
  const domain = await getDomain(env, orgId, domainId);
  if (!domain || !domain.cfCustomHostnameId) return null;

  // Get latest status from Cloudflare
  const cf = await getCustomHostname(env, domain.cfCustomHostnameId);
  
  // --- ADD THIS LOGGING ---
  console.log(`[Sync] Domain: ${domain.domainName}`);
  console.log(`[Sync] Cloudflare Status: ${cf.status}`);
  console.log(`[Sync] SSL Status: ${cf.ssl?.status}`);
  console.log(`[Sync] Full CF Response:`, JSON.stringify(cf));
  // ------------------------
  
  let internalStatus = 'pending_cname';
  if (cf.status === 'active') internalStatus = 'active';
  else if (cf.ssl.status === 'validation_failed') internalStatus = 'error';

  await env.DB.prepare(`
    UPDATE domains 
    SET status = ?, cf_status = ?, cf_ssl_status = ?, cf_verification_errors = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    internalStatus,
    cf.status,
    cf.ssl.status,
    JSON.stringify(cf.ssl.validation_errors || []),
    domainId
  ).run();

  return getDomain(env, orgId, domainId);
}

// Stub for forceRecheck if UI still calls it
export async function forceRecheck(env: Env, orgId: string, domainId: string) {
  return syncDomain(env, orgId, domainId);
}