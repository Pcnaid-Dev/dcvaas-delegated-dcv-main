# DCVaaS Architecture

## Overview

DCVaaS is designed as a distributed system with a React-based control plane (this Spark) and a Cloudflare Workers-based backend for certificate issuance and renewal orchestration.

## System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    User-Facing Layer                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────┐         ┌─────────────────────┐    │
│  │  Spark UI (React)  │◄───────►│   GitHub Auth       │    │
│  │  - Dashboard       │         │   OAuth Flow        │    │
│  │  - Domain Mgmt     │         └─────────────────────┘    │
│  │  - Settings        │                                     │
│  └────────┬───────────┘                                     │
│           │                                                  │
└───────────┼──────────────────────────────────────────────────┘
            │
            │ REST API
            ▼
┌──────────────────────────────────────────────────────────────┐
│                  Cloudflare Workers Layer                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           API Worker (Hono)                         │    │
│  │  - POST /api/domains                                │    │
│  │  - GET  /api/domains/:id                            │    │
│  │  - POST /api/domains/:id/issue                      │    │
│  │  - POST /api/domains/:id/renew                      │    │
│  │  - GET  /api/jobs                                   │    │
│  └─────────────────┬──────────────────────────────────┘    │
│                    │                                         │
│                    ▼                                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Cloudflare D1 (SQLite)                    │    │
│  │  - organizations, organization_members              │    │
│  │  - domains, jobs, audit_logs                        │    │
│  │  - api_tokens, oauth_connections                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Queue + Consumer Worker                     │    │
│  │  - Job Processing (dns_check, issuance, renewal)   │    │
│  │  - Retry Logic (exponential backoff)               │    │
│  │  - Dead Letter Queue (> 3 failures)                │    │
│  │  - Idempotent Operations                            │    │
│  └─────────────────┬──────────────────────────────────┘    │
│                    │                                         │
│                    ▼                                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │         ACME Client (acme-client)                   │    │
│  │  - Let's Encrypt (primary CA)                       │    │
│  │  - ZeroSSL (backup CA)                              │    │
│  │  - Account key management                           │    │
│  │  - Challenge signing                                │    │
│  └─────────────────┬──────────────────────────────────┘    │
│                    │                                         │
└────────────────────┼─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                   External Services                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  Cloudflare    │  │  GoDaddy       │  │  Route53     │  │
│  │  DNS API       │  │  DNS API       │  │  DNS API     │  │
│  │  (via OAuth)   │  │  (via OAuth)   │  │  (via OAuth) │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Certificate Authorities (ACME endpoints)           │    │
│  │  - Let's Encrypt: https://acme-v02.api.letsencrypt.org  │
│  │  - ZeroSSL: https://acme.zerossl.com/v2/DV90       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Domain Onboarding

```
User → Dashboard → Add Domain
  ↓
API Worker: POST /api/domains
  ↓
Generate unique CNAME target: {hash}.acme.dcvaas-verify.com
  ↓
Store in D1: INSERT INTO domains (...)
  ↓
Queue Job: dns_check
  ↓
Return CNAME instruction to UI
```

### 2. DNS Verification

```
User creates CNAME: _acme-challenge.example.com → {hash}.acme.dcvaas-verify.com
  ↓
User clicks "Check DNS"
  ↓
API Worker: POST /api/domains/:id/verify
  ↓
Queue Job: dns_check
  ↓
Consumer Worker picks up job
  ↓
DoH Query: Resolve _acme-challenge.example.com
  ↓
Verify target matches expected CNAME
  ↓
Update domain status: pending_cname → issuing
  ↓
Log to audit_logs
```

### 3. Certificate Issuance

```
API Worker: POST /api/domains/:id/issue
  ↓
Queue Job: start_issuance
  ↓
Consumer Worker: ACME Client
  ↓
Create ACME order for domain
  ↓
Receive DNS-01 challenge
  ↓
Publish TXT record: {hash}.acme.dcvaas-verify.com TXT {challenge}
  ↓
Notify CA: Challenge ready
  ↓
CA verifies: _acme-challenge.example.com → {hash}.acme.dcvaas-verify.com → TXT {challenge}
  ↓
CA issues certificate
  ↓
Store certificate in D1 (or R2 for large certs)
  ↓
Update domain: status=active, expiresAt=now+90d
  ↓
Trigger webhook: domain.certificate_issued
```

### 4. Automated Renewal

```
Cron Trigger: Daily @ 00:00 UTC
  ↓
Query D1: SELECT * FROM domains WHERE expiresAt < (NOW() + 30 days) AND status='active'
  ↓
For each domain:
  ↓
  Queue Job: renewal
  ↓
Consumer Worker: Same flow as issuance
  ↓
Update expiresAt: now + 90d
  ↓
Trigger webhook: domain.renewed
```

## D1 Database Schema

```sql
-- Organizations
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  subscription_tier TEXT NOT NULL CHECK(subscription_tier IN ('free', 'pro', 'agency')),
  theme_logo_url TEXT,
  theme_primary_color TEXT,
  theme_secondary_color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Organization Members
CREATE TABLE organization_members (
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'member')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, org_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Domains
CREATE TABLE domains (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  domain_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending_cname', 'issuing', 'active', 'error')),
  cname_target TEXT NOT NULL UNIQUE,
  last_issued_at TEXT,
  expires_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(org_id, domain_name)
);

CREATE INDEX idx_domains_org ON domains(org_id);
CREATE INDEX idx_domains_expires ON domains(expires_at) WHERE status='active';

-- Jobs
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('dns_check', 'start_issuance', 'renewal')),
  domain_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'succeeded', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  result TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

CREATE INDEX idx_jobs_domain ON jobs(domain_id);
CREATE INDEX idx_jobs_status ON jobs(status, created_at);

-- Audit Logs
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_org ON audit_logs(org_id, created_at);

-- API Tokens
CREATE TABLE api_tokens (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  last_used_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- OAuth Connections
CREATE TABLE oauth_connections (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('cloudflare', 'godaddy', 'route53', 'other')),
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);
```

## Worker Structure

### API Worker (Hono)

```typescript
// api-worker/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

// Domain routes
app.post('/api/domains', createDomain);
app.get('/api/domains', listDomains);
app.get('/api/domains/:id', getDomain);
app.post('/api/domains/:id/verify', verifyDomain);
app.post('/api/domains/:id/issue', issueCertificate);
app.post('/api/domains/:id/renew', renewCertificate);
app.delete('/api/domains/:id', deleteDomain);

// Job routes
app.get('/api/jobs', listJobs);
app.get('/api/jobs/:id', getJob);
app.post('/api/jobs/:id/retry', retryJob);

export default app;
```

### Queue Consumer Worker

```typescript
// consumer-worker/src/index.ts
export default {
  async queue(batch: MessageBatch<Job>, env: Env) {
    for (const message of batch.messages) {
      try {
        await processJob(message.body, env);
        message.ack();
      } catch (error) {
        if (message.body.attempts >= 3) {
          await sendToDeadLetterQueue(message.body, env);
          message.ack();
        } else {
          message.retry();
        }
      }
    }
  }
};

async function processJob(job: Job, env: Env) {
  switch (job.type) {
    case 'dns_check':
      await handleDNSCheck(job, env);
      break;
    case 'start_issuance':
      await handleIssuance(job, env);
      break;
    case 'renewal':
      await handleRenewal(job, env);
      break;
  }
}
```

### Cron Worker

```typescript
// cron-worker/src/index.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const stmt = env.DB.prepare(`
      SELECT * FROM domains 
      WHERE expires_at < ? AND status = 'active'
    `);
    const domains = await stmt.bind(thirtyDaysFromNow.toISOString()).all();

    for (const domain of domains.results) {
      await env.QUEUE.send({
        type: 'renewal',
        domain_id: domain.id,
        attempts: 0,
      });
    }
  }
};
```

## Security Architecture

### Token Encryption

```typescript
// In Spark UI (client-side, demo only):
const encrypted = await encryptSecret(plaintext);
// Store: { iv, ciphertext, tag } all in one base64 string

// In Production Workers:
const key = env.ENCRYPTION_KEY; // From Cloudflare Secrets
const decrypted = await decryptWithKey(encrypted, key);
```

### API Authentication

```typescript
// Middleware in API Worker:
async function authenticate(c: Context) {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  const tokenHash = await hashToken(token);
  const apiToken = await c.env.DB.prepare(
    'SELECT * FROM api_tokens WHERE token_hash = ?'
  ).bind(tokenHash).first();
  
  if (!apiToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  c.set('orgId', apiToken.org_id);
  c.set('tokenId', apiToken.id);
}
```

## Deployment

### Wrangler Configuration

```toml
# wrangler.toml
name = "dcvaas-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "dcvaas-prod"
database_id = "YOUR_DATABASE_ID"

[[queues.producers]]
binding = "QUEUE"
queue = "dcvaas-jobs"

[[queues.consumers]]
queue = "dcvaas-jobs"
max_batch_size = 10
max_batch_timeout = 30

[triggers]
crons = ["0 0 * * *"]

[vars]
ENVIRONMENT = "production"
```

## Monitoring & Observability

- **Metrics**: Cloudflare Analytics for API requests, queue depth, worker execution time
- **Logging**: console.log → Cloudflare Logs
- **Alerts**: Queue depth > 1000, Job failure rate > 10%, Certificate expiration < 7 days
- **Tracing**: Distributed tracing via Cloudflare Trace (upcoming)

## Scalability

- **Horizontal**: Workers auto-scale based on load
- **Queue Batching**: Process up to 100 jobs per batch
- **D1 Limits**: 100k rows/table (use R2 for large objects if needed)
- **Rate Limiting**: Per-org API rate limits (100 req/min free, 1000 req/min pro)

## Next Steps

See [`AGENTS.md`](../AGENTS.md) for specific implementation tasks to assign to GitHub Copilot coding agent.
