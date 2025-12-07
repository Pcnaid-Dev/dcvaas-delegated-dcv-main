Here is the fully revised `AGENTS.md` file. It has been rewritten to reflect your pivot to **Cloudflare for SaaS (Custom Hostnames)**.

This plan removes the complex custom ACME logic tasks and replaces them with tasks focused on API integration, status syncing, and UI simplification.

---

# GitHub Copilot Coding Agent Tasks

This document contains detailed implementation tasks for completing the DCVaaS backend migration to **Cloudflare for SaaS (Custom Hostnames)**. Each section represents a GitHub issue that should be assigned to a GitHub Copilot coding agent.

**Architecture Strategy**: "Buy" (Cloudflare Managed) instead of "Build" (Custom ACME).

---

## Issue #1: API Worker Cleanup & Cloudflare Integration

**Title**: Finalize API Worker for Cloudflare SaaS and Remove Legacy ACME Endpoints

**Description**:
The API worker is currently in a hybrid state. We need to fully switch to the Cloudflare Custom Hostname API and remove the legacy endpoints intended for the custom ACME engine.

**Acceptance Criteria**:
- [ ] Remove `POST /api/domains/:id/issue` endpoint and handler.
- [ ] Remove `POST /api/domains/:id/renew` endpoint and handler.
- [ ] Ensure `POST /api/domains` calls `createCustomHostname` (lib/cloudflare.ts) and saves the `cf_custom_hostname_id` to D1.
- [ ] Ensure `POST /api/domains/:id/sync` exists to manually trigger a status refresh from the UI.
- [ ] Update `listDomains` to return the `dnsInstruction` pointing to `SAAS_CNAME_TARGET` (from env).

**Refactored `workers/api/src/index.ts` Route Plan**:

```typescript
// ... imports

// KEEP:
app.get('/api/domains', listDomains); // Returns list with Cloudflare statuses
app.post('/api/domains', createDomain); // Calls Cloudflare API -> Inserts to D1
app.get('/api/domains/:id', getDomain);
app.delete('/api/domains/:id', deleteDomain); // Calls Cloudflare DELETE -> Deletes from D1

// UPDATE:
app.post('/api/domains/:id/sync', syncDomain); // Calls Cloudflare GET -> Updates D1

// REMOVE:
// app.post('/api/domains/:id/issue', ...); // DELETED
// app.post('/api/domains/:id/renew', ...); // DELETED
```

**Environment Variables to Verify**:
- `SAAS_CNAME_TARGET` (e.g., `dcv.pcnaid.com`)
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_API_TOKEN` (Must have SSL for SaaS permissions)

---

## Issue #2: Consumer Worker - Status Sync Logic

**Title**: Implement `sync_status` Job Handler in Consumer Worker

**Description**:
The Consumer Worker no longer needs to handle complex ACME cryptographic challenges. Its primary role is now to process background jobs that sync the status of a domain from Cloudflare to our D1 database.

**Acceptance Criteria**:
- [ ] Remove `issuance.ts` and `renewal.ts` handlers (delete files).
- [ ] Ensure `src/handlers/sync-status.ts` is robust:
    - Call `getCustomHostname` (Cloudflare API).
    - Map Cloudflare status (`active`, `pending_validation`, `moved`) to D1 status.
    - Update `cf_status`, `cf_ssl_status`, and `cf_verification_errors` in D1.
- [ ] Update `src/index.ts` (Consumer) to handle the `sync_status` job type.
- [ ] Keep `dns-check.ts` for the UI's "Pre-flight" check capability.

**Job Handler Logic (`sync-status.ts`)**:
```typescript
export async function handleSyncStatus(job: JobMessage, env: Env) {
  const domain = await env.DB.prepare('SELECT * FROM domains WHERE id = ?').bind(job.domain_id).first();
  if (!domain || !domain.cf_custom_hostname_id) return;

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
}
```

---

## Issue #3: Cron Worker - Polling Strategy

**Title**: Refactor Cron Worker to Poll Pending Domains

**Description**:
The previous Cron logic checked for certificate expiry. Since Cloudflare auto-renews, we no longer need this. The new Cron job must poll for domains that are stuck in `pending` or `issuing` states to see if they have become `active`.

**Acceptance Criteria**:
- [ ] Remove "Expiry Check" logic.
- [ ] Implement "Pending Poller" logic:
    - Query D1: `SELECT * FROM domains WHERE status != 'active' AND status != 'error'`
    - For each result, queue a `sync_status` job to the Consumer queue.
- [ ] Configure `wrangler.toml` triggers to run frequently (e.g., every 5 or 10 minutes) to ensure fast activation detection.

**New Cron Logic**:
```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Find domains waiting for validation
    const res = await env.DB.prepare(
      `SELECT * FROM domains WHERE status IN ('pending_cname', 'issuing')`
    ).all<DomainRow>();

    const domains = res.results ?? [];

    for (const domain of domains) {
      await env.QUEUE.send({
        id: crypto.randomUUID(),
        type: 'sync_status', // Routes to handleSyncStatus in Consumer
        domain_id: domain.id,
        attempts: 0,
      });
    }
  },
};
```

---

## Issue #4: Frontend UI/UX Overhaul

**Title**: Update Domain Detail Page to Remove Manual Issuance Steps

**Description**:
The UI currently shows buttons for "Start Issuance" and "Simulate Verify". These are obsolete. The user flow is now passive: Add Domain -> Add CNAME -> Wait for Cloudflare.

**Acceptance Criteria**:
- [ ] **Remove** `handleStartIssuance` and `handleSimulateVerify` functions from `DomainDetailPage.tsx`.
- [ ] **Remove** the "Step 2: Start Certificate Issuance" card.
- [ ] **Add** a Status Card for pending domains:
    - Title: "Verification in Progress"
    - Body: "Cloudflare is validating your domain. This happens automatically once the CNAME is detected."
    - Button: "Refresh Status" (Calls `POST /api/domains/:id/sync`).
- [ ] **Update "Check DNS" Logic**:
    - The `handleCheckDNS` function currently checks for a CNAME record.
    - Update it to validate that the CNAME points specifically to `SAAS_CNAME_TARGET` (e.g., `dcv.pcnaid.com` or `custom.dcv.pcnaid.com`), ensuring the user hasn't pointed it to a random hash.
- [ ] Update `DNSRecordDisplay`:
    - Ensure it displays the instruction: `_acme-challenge.<domain> CNAME <SAAS_CNAME_TARGET>` (or root CNAME if using partial setup).

**Example Status Card Component**:
```tsx
{domain.status === 'issuing' && (
  <Card className="p-6 border-blue-200 bg-blue-50/50">
    <div className="flex items-center gap-3">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">Verification in Progress</h3>
        <p className="text-sm text-muted-foreground">
          Cloudflare is validating your DNS configuration. This process is automatic.
        </p>
      </div>
    </div>
    <div className="mt-4">
        <Button onClick={handleSyncStatus} variant="outline" size="sm">
            Refresh Status
        </Button>
    </div>
  </Card>
)}
```

---

## Issue #5: Infrastructure & Cleanup

**Title**: Remove Legacy Secrets and Dependencies

**Description**:
Clean up the codebase to remove artifacts from the old custom ACME engine.

**Acceptance Criteria**:
- [ ] **Wrangler Cleanup**:
    - Remove `R2` bucket bindings (certificates are now stored by Cloudflare).
    - Remove `ACME_ACCOUNT_KEY` from secrets/env.
    - Remove `SECONDARY_CA` from secrets/env.
- [ ] **Dependency Cleanup**:
    - Uninstall `acme-client` from `workers/consumer`.
    - Uninstall `node-forge` if not used elsewhere.
- [ ] **Database**:
    - (Optional) Create a migration to drop `private_key`, `csr`, and `challenges_blob` columns from the `domains` table to save space.

---

## Summary

**Estimated Effort**:
- Issue #1 (API): 1 day
- Issue #2 (Consumer): 1 day
- Issue #3 (Cron): 0.5 days
- Issue #4 (Frontend): 1-2 days
- Issue #5 (Cleanup): 0.5 days

**Total**: ~1 week to fully transition to the "Buy" model.