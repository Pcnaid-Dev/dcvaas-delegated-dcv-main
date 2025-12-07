# GitHub Copilot Coding Agent Tasks

This document contains detailed implementation tasks for completing the DCVaaS backend using Cloudflare Workers. Each section represents a GitHub issue that should be assigned to a GitHub Copilot coding agent.

---

## Issue #1: Cloudflare Worker API with Hono + D1 Schema

**Title**: Implement API Worker with Hono framework and D1 database schema

**Description**:
Create the core API Worker using Hono framework with all REST endpoints for domain management, connected to a Cloudflare D1 (SQLite) database.

**Acceptance Criteria**:
- [ ] Worker deployed with Hono framework
- [ ] D1 database created with full schema (see ARCHITECTURE.md)
- [ ] All API endpoints implemented and tested
- [ ] Request validation using Zod
- [ ] Error handling and proper HTTP status codes
- [ ] CORS configured for Spark UI origin
- [ ] API authentication middleware (Bearer token)
- [ ] Rate limiting per organization

**API Endpoints to Implement**:

### Domains
- `POST /api/domains` - Create new domain
  - Input: `{ domainName: string }`
  - Generate unique CNAME target
  - Insert into D1 domains table
  - Queue `dns_check` job
  - Return domain object with CNAME instruction

- `GET /api/domains` - List org domains
  - Query params: `status`, `limit`, `offset`
  - Filter by authenticated org
  - Return paginated results

- `GET /api/domains/:id` - Get single domain
  - Verify org ownership
  - Include latest job status
  - Return domain with related data

- `POST /api/domains/:id/verify` - Trigger DNS verification
  - Queue `dns_check` job
  - Return job ID

- `POST /api/domains/:id/issue` - Start certificate issuance
  - Verify domain status is `issuing`
  - Queue `start_issuance` job
  - Return job ID

- `POST /api/domains/:id/renew` - Manual renewal
  - Verify domain is `active`
  - Queue `renewal` job
  - Return job ID

- `DELETE /api/domains/:id` - Delete domain
  - Soft delete or hard delete based on config
  - Log to audit_logs

### Jobs
- `GET /api/jobs` - List jobs
  - Filter by `domain_id`, `type`, `status`
  - Paginated results

- `GET /api/jobs/:id` - Get job details
  - Include full result and error details

- `POST /api/jobs/:id/retry` - Retry failed job
  - Reset attempts counter
  - Re-queue job

### Organizations
- `GET /api/organizations` - List user's orgs
- `POST /api/organizations` - Create new org
- `PATCH /api/organizations/:id` - Update org settings

### API Tokens
- `POST /api/tokens` - Create new API token
  - Generate random token
  - Hash with SHA-256
  - Store hash only
  - Return plaintext token once

- `GET /api/tokens` - List org tokens (hashes only)
- `DELETE /api/tokens/:id` - Revoke token

### Audit Logs
- `GET /api/audit` - List audit logs for org
  - Filter by `action`, `user_id`, date range
  - Paginated, sorted by `created_at DESC`

**D1 Schema** (from ARCHITECTURE.md):
```sql
-- See docs/ARCHITECTURE.md for complete schema
-- Tables: organizations, organization_members, domains, jobs, audit_logs, api_tokens, oauth_connections
```

**Authentication Middleware**:
```typescript
async function authenticate(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  const tokenHash = await hashToken(token);

  const apiToken = await c.env.DB.prepare(
    'SELECT * FROM api_tokens WHERE token_hash = ? AND (expires_at IS NULL OR expires_at > datetime("now"))'
  ).bind(tokenHash).first<APIToken>();

  if (!apiToken) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // Update last_used_at
  await c.env.DB.prepare(
    'UPDATE api_tokens SET last_used_at = datetime("now") WHERE id = ?'
  ).bind(apiToken.id).run();

  c.set('orgId', apiToken.org_id);
  c.set('tokenId', apiToken.id);

  await next();
}
```

**Rate Limiting**:
```typescript
// Use Durable Objects or KV for rate limit counters
// Key: `ratelimit:${orgId}:${minute}`
// Value: request count
// TTL: 60 seconds
```

**Files to Create**:
- `workers/api/src/index.ts` - Main Hono app
- `workers/api/src/routes/domains.ts` - Domain endpoints
- `workers/api/src/routes/jobs.ts` - Job endpoints
- `workers/api/src/routes/organizations.ts` - Org endpoints
- `workers/api/src/routes/tokens.ts` - Token endpoints
- `workers/api/src/routes/audit.ts` - Audit log endpoints
- `workers/api/src/middleware/auth.ts` - Authentication
- `workers/api/src/middleware/ratelimit.ts` - Rate limiting
- `workers/api/src/lib/db.ts` - D1 helpers
- `workers/api/src/lib/validation.ts` - Zod schemas
- `workers/api/wrangler.toml` - Worker configuration
- `workers/api/schema.sql` - D1 database schema

**Testing**:
- Unit tests for each endpoint with Vitest
- Integration tests with local D1 database
- Load testing for rate limits

**Documentation**:
- Generate OpenAPI 3.0 spec
- Export to `OPENAPI.json` in project root

---

## Issue #2: Queue + Consumer Worker + DLQ Configuration

**Title**: Implement async job processing with Cloudflare Queues and dead-letter queue

**Description**:
Create a Consumer Worker that processes jobs from Cloudflare Queue with retry logic, exponential backoff, and dead-letter queue for failed jobs.

**Acceptance Criteria**:
- [ ] Queue configured in wrangler.toml
- [ ] Consumer Worker processes jobs by type
- [ ] Retry logic with exponential backoff
- [ ] Jobs fail after 3 attempts → move to DLQ
- [ ] Idempotent job handlers
- [ ] Status updates written to D1
- [ ] Audit log entries for all job state changes

**Job Types to Handle**:

### 1. DNS Check (`dns_check`)
```typescript
async function handleDNSCheck(job: Job, env: Env) {
  const domain = await env.DB.prepare(
    'SELECT * FROM domains WHERE id = ?'
  ).bind(job.domain_id).first<Domain>();

  if (!domain) {
    throw new Error('Domain not found');
  }

  // DoH query to Cloudflare DNS
  const recordName = `_acme-challenge.${domain.domain_name}`;
  const dohUrl = `https://cloudflare-dns.com/dns-query?name=${recordName}&type=CNAME`;

  const response = await fetch(dohUrl, {
    headers: { 'Accept': 'application/dns-json' },
  });

  const dnsResult = await response.json();

  // Verify CNAME matches expected target
  const cnameRecord = dnsResult.Answer?.find((r: any) => r.type === 5);

  if (cnameRecord && cnameRecord.data === domain.cname_target) {
    // Success: Update domain to issuing status
    await env.DB.prepare(
      'UPDATE domains SET status = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind('issuing', domain.id).run();

    await logAudit(env, {
      org_id: domain.org_id,
      action: 'domain.dns_verified',
      entity_type: 'domain',
      entity_id: domain.id,
    });

    return { success: true, cname: cnameRecord.data };
  } else {
    throw new Error(`CNAME not found or incorrect: expected ${domain.cname_target}`);
  }
}
```

### 2. Start Issuance (`start_issuance`)
Stub for now - will be implemented in Issue #3 with ACME client.

```typescript
async function handleStartIssuance(job: Job, env: Env) {
  // TODO: Implement in Issue #3 with acme-client
  // For now, simulate success
  await env.DB.prepare(
    'UPDATE domains SET status = ?, last_issued_at = datetime("now"), expires_at = datetime("now", "+90 days"), updated_at = datetime("now") WHERE id = ?'
  ).bind('active', job.domain_id).run();

  return { success: true, stubbed: true };
}
```

### 3. Renewal (`renewal`)
Same as issuance, stub for Issue #3.

```typescript
async function handleRenewal(job: Job, env: Env) {
  // TODO: Implement in Issue #3
  await env.DB.prepare(
    'UPDATE domains SET last_issued_at = datetime("now"), expires_at = datetime("now", "+90 days"), updated_at = datetime("now") WHERE id = ?'
  ).bind(job.domain_id).run();

  return { success: true, stubbed: true };
}
```

**Consumer Worker**:
```typescript
export default {
  async queue(batch: MessageBatch<Job>, env: Env, ctx: ExecutionContext): Promise<void> {
    for (const message of batch.messages) {
      const job = message.body;

      try {
        // Update job status to running
        await env.DB.prepare(
          'UPDATE jobs SET status = ?, updated_at = datetime("now") WHERE id = ?'
        ).bind('running', job.id).run();

        let result;
        switch (job.type) {
          case 'dns_check':
            result = await handleDNSCheck(job, env);
            break;
          case 'start_issuance':
            result = await handleStartIssuance(job, env);
            break;
          case 'renewal':
            result = await handleRenewal(job, env);
            break;
          default:
            throw new Error(`Unknown job type: ${job.type}`);
        }

        // Success: Update job
        await env.DB.prepare(
          'UPDATE jobs SET status = ?, result = ?, updated_at = datetime("now") WHERE id = ?'
        ).bind('succeeded', JSON.stringify(result), job.id).run();

        message.ack();

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Increment attempts
        const attempts = job.attempts + 1;

        if (attempts >= 3) {
          // Move to DLQ after 3 failures
          await env.DB.prepare(
            'UPDATE jobs SET status = ?, attempts = ?, last_error = ?, updated_at = datetime("now") WHERE id = ?'
          ).bind('failed', attempts, errorMessage, job.id).run();

          // Send to DLQ (or separate table/queue)
          await env.DLQ.send({ ...job, final_error: errorMessage });

          message.ack(); // Acknowledge to remove from main queue
        } else {
          // Retry with exponential backoff
          await env.DB.prepare(
            'UPDATE jobs SET attempts = ?, last_error = ?, updated_at = datetime("now") WHERE id = ?'
          ).bind(attempts, errorMessage, job.id).run();

          message.retry({ delaySeconds: Math.pow(2, attempts) * 60 }); // 2min, 4min, 8min
        }
      }
    }
  }
};
```

**wrangler.toml Configuration**:
```toml
[[queues.producers]]
binding = "QUEUE"
queue = "dcvaas-jobs"

[[queues.consumers]]
queue = "dcvaas-jobs"
max_batch_size = 10
max_batch_timeout = 30
max_retries = 0  # We handle retries manually
dead_letter_queue = "dcvaas-dlq"

[[queues.producers]]
binding = "DLQ"
queue = "dcvaas-dlq"
```

**Files to Create**:
- `workers/consumer/src/index.ts` - Main queue consumer
- `workers/consumer/src/handlers/dns-check.ts` - DNS verification handler
- `workers/consumer/src/handlers/issuance.ts` - Issuance handler (stub)
- `workers/consumer/src/handlers/renewal.ts` - Renewal handler (stub)
- `workers/consumer/src/lib/utils.ts` - Shared utilities
- `workers/consumer/wrangler.toml` - Consumer configuration

**Testing**:
- Unit tests for each handler with mocked dependencies
- Integration tests with test queue
- Test retry logic and DLQ routing

---

## Issue #3: ACME Client Integration with acme-client Library

**Title**: Implement certificate issuance and renewal using acme-client with Let's Encrypt and ZeroSSL CA failover

**Description**:
Integrate the `acme-client` library to handle real ACME DNS-01 challenges, certificate issuance, and renewal. Implement automatic failover from Let's Encrypt to ZeroSSL on rate limit or availability issues.

**Acceptance Criteria**:
- [ ] ACME account key generated and stored in Cloudflare Secrets
- [ ] Certificate issuance flow complete (order → challenge → finalize → download)
- [ ] DNS-01 challenge TXT records published to dcvaas-verify.com zone
- [ ] Certificate and private key stored securely (R2 or customer-provided)
- [ ] Automatic CA failover (Let's Encrypt → ZeroSSL)
- [ ] Rate limit tracking and backoff
- [ ] Certificate renewal 30 days before expiration
- [ ] CT log monitoring (optional, for unauthorized issuance detection)

**ACME Flow**:

### 1. Account Key Management
```typescript
import * as acme from 'acme-client';

async function getACMEClient(ca: 'letsencrypt' | 'zerossl', env: Env): Promise<acme.Client> {
  const directoryUrl = ca === 'letsencrypt'
    ? 'https://acme-v02.api.letsencrypt.org/directory'
    : 'https://acme.zerossl.com/v2/DV90';

  const accountKey = await acme.forge.createPrivateKey();

  // In production, load from env.ACME_ACCOUNT_KEY secret
  // const accountKey = Buffer.from(env.ACME_ACCOUNT_KEY, 'base64');

  const client = new acme.Client({
    directoryUrl,
    accountKey,
  });

  return client;
}
```

### 2. Certificate Issuance
```typescript
async function issueCertificate(domain: Domain, env: Env): Promise<Certificate> {
  const client = await getACMEClient('letsencrypt', env);

  // Create order for wildcard and apex
  const order = await client.createOrder({
    identifiers: [
      { type: 'dns', value: domain.domain_name },
      { type: 'dns', value: `*.${domain.domain_name}` },
    ],
  });

  // Get authorization challenges
  const authorizations = await client.getAuthorizations(order);

  for (const authz of authorizations) {
    const challenge = authz.challenges.find(c => c.type === 'dns-01');
    if (!challenge) throw new Error('DNS-01 challenge not available');

    // Get the TXT record value
    const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);

    // Publish TXT record to our zone via Cloudflare API
    await publishTXTRecord(env, domain.cname_target, keyAuthorization);

    // Notify CA that challenge is ready
    await client.completeChallenge(challenge);
  }

  // Wait for validation
  await client.waitForValidStatus(order);

  // Generate CSR
  const [privateKey, csr] = await acme.forge.createCsr({
    commonName: domain.domain_name,
    altNames: [`*.${domain.domain_name}`],
  });

  // Finalize order
  await client.finalizeOrder(order, csr);

  // Download certificate
  const certificate = await client.getCertificate(order);

  // Store certificate and private key
  await env.CERTIFICATES.put(`${domain.id}/cert.pem`, certificate);
  await env.CERTIFICATES.put(`${domain.id}/key.pem`, privateKey);

  return {
    certificate,
    privateKey,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
```

### 3. Publish TXT Record via Cloudflare API
```typescript
async function publishTXTRecord(env: Env, cnameTarget: string, txtValue: string): Promise<void> {
  const zoneId = env.CLOUDFLARE_ZONE_ID; // dcvaas-verify.com zone

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'TXT',
        name: cnameTarget,
        content: txtValue,
        ttl: 120, // 2 minutes (fast propagation)
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to publish TXT record: ${JSON.stringify(error)}`);
  }

  // Wait for DNS propagation (2-5 minutes)
  await waitForDNSPropagation(cnameTarget, txtValue);
}

async function waitForDNSPropagation(name: string, expectedValue: string): Promise<void> {
  const maxAttempts = 30; // 5 minutes with 10-second intervals
  for (let i = 0; i < maxAttempts; i++) {
    const dohUrl = `https://cloudflare-dns.com/dns-query?name=${name}&type=TXT`;
    const response = await fetch(dohUrl, {
      headers: { 'Accept': 'application/dns-json' },
    });

    const result = await response.json();
    const txtRecord = result.Answer?.find((r: any) => r.type === 16);

    if (txtRecord && txtRecord.data === expectedValue) {
      return; // Propagated successfully
    }

    await sleep(10000); // 10 seconds
  }

  throw new Error('DNS propagation timeout');
}
```

### 4. CA Failover Logic
```typescript
async function issueCertificateWithFailover(domain: Domain, env: Env): Promise<Certificate> {
  try {
    return await issueCertificate(domain, env, 'letsencrypt');
  } catch (error) {
    console.error('Let\'s Encrypt failed, trying ZeroSSL:', error);

    // Check if error is rate limit
    if (error.message.includes('rate limit')) {
      await logAudit(env, {
        org_id: domain.org_id,
        action: 'ca.rate_limit',
        entity_id: domain.id,
        details: { ca: 'letsencrypt', error: error.message },
      });
    }

    // Fallback to ZeroSSL
    return await issueCertificate(domain, env, 'zerossl');
  }
}
```

**Files to Create**:
- `workers/consumer/src/lib/acme.ts` - ACME client wrapper
- `workers/consumer/src/lib/cloudflare-dns.ts` - DNS API client
- `workers/consumer/src/lib/certificate-storage.ts` - R2 storage helpers
- Update `workers/consumer/src/handlers/issuance.ts` - Real implementation
- Update `workers/consumer/src/handlers/renewal.ts` - Real implementation

**Secrets to Add** (via `wrangler secret put`):
- `ACME_ACCOUNT_KEY` - Base64-encoded private key
- `CLOUDFLARE_API_TOKEN` - API token with DNS edit permissions
- `CLOUDFLARE_ZONE_ID` - Zone ID for dcvaas-verify.com

**Testing**:
- Use Let's Encrypt staging environment for testing
- Test wildcard certificates (`*.example.com`)
- Test rate limit scenarios
- Test CA failover
- Verify CT log entries

**Dependencies to Install**:
```bash
cd workers/consumer
npm install acme-client
```

---

## Issue #4: OAuth Provider Integrations (Cloudflare, GoDaddy, Route53)

**Title**: Implement single-click CNAME setup via OAuth for Cloudflare, GoDaddy, and AWS Route53

**Description**:
Build OAuth flows for DNS providers allowing Agency-tier customers to automatically create CNAME records without manual DNS configuration.

**Acceptance Criteria**:
- [ ] OAuth flow for Cloudflare
- [ ] OAuth flow for GoDaddy
- [ ] OAuth flow for AWS Route53 (using IAM credentials or OAuth)
- [ ] Token encryption with AES-GCM before storage
- [ ] Token refresh logic
- [ ] Least-privilege scopes (dns:read, dns:edit only)
- [ ] Automatic CNAME creation after connection
- [ ] Token revocation and disconnect flow

**OAuth Flow (Cloudflare Example)**:

### 1. Initiate OAuth
```typescript
// API Worker endpoint
app.get('/api/oauth/cloudflare/authorize', async (c) => {
  const orgId = c.get('orgId');
  const state = await generateSecureRandomString();

  // Store state temporarily (KV with 10-minute TTL)
  await c.env.KV.put(`oauth:state:${state}`, orgId, { expirationTtl: 600 });

  const authorizeUrl = new URL('https://dash.cloudflare.com/oauth2/auth');
  authorizeUrl.searchParams.set('client_id', c.env.CLOUDFLARE_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', `${c.env.APP_URL}/api/oauth/cloudflare/callback`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'dns:read dns:edit');
  authorizeUrl.searchParams.set('state', state);

  return c.redirect(authorizeUrl.toString());
});
```

### 2. Handle Callback
```typescript
app.get('/api/oauth/cloudflare/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  // Verify state
  const orgId = await c.env.KV.get(`oauth:state:${state}`);
  if (!orgId) {
    return c.json({ error: 'Invalid state' }, 400);
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://dash.cloudflare.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: c.env.CLOUDFLARE_CLIENT_ID,
      client_secret: c.env.CLOUDFLARE_CLIENT_SECRET,
      redirect_uri: `${c.env.APP_URL}/api/oauth/cloudflare/callback`,
    }),
  });

  const { access_token, refresh_token, expires_in } = await tokenResponse.json();

  // Encrypt tokens
  const encryptedAccessToken = await encryptSecret(access_token, c.env.ENCRYPTION_KEY);
  const encryptedRefreshToken = await encryptSecret(refresh_token, c.env.ENCRYPTION_KEY);

  // Store connection
  const connectionId = generateId();
  await c.env.DB.prepare(`
    INSERT INTO oauth_connections (id, org_id, provider, encrypted_access_token, encrypted_refresh_token, expires_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', '+' || ? || ' seconds'))
  `).bind(
    connectionId,
    orgId,
    'cloudflare',
    encryptedAccessToken,
    encryptedRefreshToken,
    expires_in
  ).run();

  // Redirect back to Spark UI
  return c.redirect(`${c.env.APP_URL}/settings?oauth=success`);
});
```

### 3. Create CNAME via OAuth
```typescript
async function createCNAMEViaCloudflare(
  domain: Domain,
  connection: OAuthConnection,
  env: Env
): Promise<void> {
  // Decrypt access token
  const accessToken = await decryptSecret(
    connection.encrypted_access_token,
    env.ENCRYPTION_KEY
  );

  // List zones to find the right one
  const zonesResponse = await fetch('https://api.cloudflare.com/client/v4/zones', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  const { result: zones } = await zonesResponse.json();
  const zone = zones.find((z: any) => domain.domain_name.endsWith(z.name));

  if (!zone) {
    throw new Error('Zone not found in Cloudflare account');
  }

  // Create CNAME record
  const dnsResponse = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'CNAME',
        name: `_acme-challenge.${domain.domain_name}`,
        content: domain.cname_target,
        ttl: 3600,
        proxied: false,
      }),
    }
  );

  if (!dnsResponse.ok) {
    const error = await dnsResponse.json();
    throw new Error(`Failed to create CNAME: ${JSON.stringify(error)}`);
  }

  // Update domain status
  await env.DB.prepare(
    'UPDATE domains SET status = ? WHERE id = ?'
  ).bind('issuing', domain.id).run();
}
```

### 4. Token Refresh
```typescript
async function refreshCloudflareToken(connection: OAuthConnection, env: Env): Promise<void> {
  const refreshToken = await decryptSecret(
    connection.encrypted_refresh_token,
    env.ENCRYPTION_KEY
  );

  const response = await fetch('https://dash.cloudflare.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: env.CLOUDFLARE_CLIENT_ID,
      client_secret: env.CLOUDFLARE_CLIENT_SECRET,
    }),
  });

  const { access_token, refresh_token: new_refresh_token, expires_in } = await response.json();

  // Re-encrypt and update
  const encryptedAccessToken = await encryptSecret(access_token, env.ENCRYPTION_KEY);
  const encryptedRefreshToken = await encryptSecret(new_refresh_token, env.ENCRYPTION_KEY);

  await env.DB.prepare(`
    UPDATE oauth_connections
    SET encrypted_access_token = ?,
        encrypted_refresh_token = ?,
        expires_at = datetime('now', '+' || ? || ' seconds'),
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    encryptedAccessToken,
    encryptedRefreshToken,
    expires_in,
    connection.id
  ).run();
}
```

**GoDaddy OAuth**:
Similar flow, but using GoDaddy's OAuth endpoints and API:
- Authorize: `https://sso.godaddy.com/oauth/authorize`
- Token: `https://sso.godaddy.com/oauth/token`
- API: `https://api.godaddy.com/v1/domains/{domain}/records`

**AWS Route53**:
Use AWS Cognito for OAuth or IAM credentials:
- Requires AWS SDK
- Use least-privilege policy (route53:ChangeResourceRecordSets)

**Files to Create**:
- `workers/api/src/routes/oauth.ts` - OAuth endpoints
- `workers/api/src/lib/oauth-providers/cloudflare.ts` - Cloudflare client
- `workers/api/src/lib/oauth-providers/godaddy.ts` - GoDaddy client
- `workers/api/src/lib/oauth-providers/route53.ts` - Route53 client
- `workers/api/src/lib/encryption.ts` - AES-GCM helpers

**Secrets to Add**:
- `ENCRYPTION_KEY` - 32-byte AES key (hex-encoded)
- `CLOUDFLARE_CLIENT_ID` - OAuth client ID
- `CLOUDFLARE_CLIENT_SECRET` - OAuth client secret
- `GODADDY_CLIENT_ID`
- `GODADDY_CLIENT_SECRET`
- `AWS_ACCESS_KEY_ID` (for Route53)
- `AWS_SECRET_ACCESS_KEY`

**Testing**:
- Test full OAuth flow in sandbox environments
- Test token refresh before expiration
- Test error handling (denied consent, expired tokens)
- Test CNAME creation for various domain configurations

---

## Issue #5: Cron Triggers for Daily Renewal Checks

**Title**: Implement Cloudflare Cron Triggers for automated daily certificate renewal checks

**Description**:
Set up a scheduled Worker that runs daily at midnight UTC, queries for certificates expiring within 30 days, and queues renewal jobs.

**Acceptance Criteria**:
- [ ] Cron trigger configured in wrangler.toml
- [ ] Daily execution at 00:00 UTC
- [ ] Query D1 for expiring certificates (expiresAt < now + 30 days)
- [ ] Queue renewal job for each expiring domain
- [ ] Avoid duplicate jobs (check for existing queued/running renewals)
- [ ] Monitoring/alerting for cron failures
- [ ] Audit log entry for each cron run

**Cron Worker**:
```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Starting daily renewal check:', new Date().toISOString());

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Find expiring certificates
    const stmt = env.DB.prepare(`
      SELECT d.*
      FROM domains d
      WHERE d.status = 'active'
        AND d.expires_at < ?
        AND d.id NOT IN (
          SELECT domain_id FROM jobs
          WHERE type = 'renewal'
            AND status IN ('queued', 'running')
            AND created_at > datetime('now', '-1 hour')
        )
    `);

    const domains = await stmt.bind(thirtyDaysFromNow.toISOString()).all<Domain>();

    console.log(`Found ${domains.results.length} domains needing renewal`);

    for (const domain of domains.results) {
      const jobId = generateId();

      // Queue renewal job
      await env.QUEUE.send({
        id: jobId,
        type: 'renewal',
        domain_id: domain.id,
        attempts: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Insert job record
      await env.DB.prepare(`
        INSERT INTO jobs (id, type, domain_id, status, attempts, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(jobId, 'renewal', domain.id, 'queued', 0).run();

      // Audit log
      await env.DB.prepare(`
        INSERT INTO audit_logs (id, org_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        generateId(),
        domain.org_id,
        'cron.renewal_queued',
        'domain',
        domain.id,
        JSON.stringify({ job_id: jobId, expires_at: domain.expires_at })
      ).run();

      console.log(`Queued renewal for domain ${domain.domain_name} (${domain.id})`);
    }

    console.log('Daily renewal check completed');
  }
};
```

**wrangler.toml**:
```toml
name = "dcvaas-cron"
main = "src/index.ts"

[triggers]
crons = ["0 0 * * *"]  # Daily at midnight UTC

[[d1_databases]]
binding = "DB"
database_name = "dcvaas-prod"
database_id = "YOUR_DATABASE_ID"

[[queues.producers]]
binding = "QUEUE"
queue = "dcvaas-jobs"
```

**Monitoring**:
- Set up Cloudflare alerting for cron execution failures
- Log to external service (e.g., Datadog, Sentry) for monitoring
- Email alert if 0 domains processed (potential query issue)

**Files to Create**:
- `workers/cron/src/index.ts` - Main cron handler
- `workers/cron/wrangler.toml` - Cron configuration

**Testing**:
- Test locally with `wrangler dev --test-scheduled`
- Verify no duplicate jobs are created
- Test with various expiration scenarios

---

## Summary

These 5 issues represent the complete backend implementation for DCVaaS. Once completed, the Spark UI will connect to real Cloudflare Workers for production certificate issuance and management.

**Estimated Effort**:
- Issue #1 (API + D1): 3-5 days
- Issue #2 (Queue): 2-3 days
- Issue #3 (ACME): 4-6 days
- Issue #4 (OAuth): 3-5 days
- Issue #5 (Cron): 1-2 days

**Total**: ~2-3 weeks for experienced Cloudflare Workers developer

**Next Steps**:
1. Create GitHub repository
2. Open 5 issues with content from this file
3. Assign to GitHub Copilot coding agent
4. Review and iterate on PRs
5. Deploy to Cloudflare Workers production
6. Connect Spark UI to production API
7. Launch! 🚀
