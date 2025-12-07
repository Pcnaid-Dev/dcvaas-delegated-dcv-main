# DCVaaS Security Model

## Overview

DCVaaS is designed with security as a core principle. The architecture ensures that sensitive credentials are never exposed, and all operations follow the principle of least privilege.

## Threat Model

### Assets to Protect
1. **Customer DNS credentials** (OAuth tokens for DNS providers)
2. **API tokens** (for programmatic access)
3. **Private keys** (ACME account keys, certificate private keys)
4. **User data** (domain names, organization info)

### Threat Actors
- **External attackers**: Attempting to compromise customer domains
- **Malicious insiders**: Unauthorized access to customer data
- **Compromised accounts**: Stolen user credentials

## Security Principles

### 1. Delegated Authority (CNAME Delegation)

**Problem**: Traditional ACME DNS-01 requires full DNS API access, exposing root zone control.

**Solution**: CNAME delegation isolates validation authority to a single subdomain.

```
Customer DNS:
_acme-challenge.example.com CNAME abc123.acme.dcvaas-verify.com

DCVaaS Controlled Zone (dcvaas-verify.com):
abc123.acme.dcvaas-verify.com TXT "challenge-value"
```

**Security Benefits**:
- ✅ Customer never shares root DNS credentials
- ✅ Compromise of DCVaaS only affects validation subdomain
- ✅ Customer can revoke access by removing CNAME
- ✅ No risk of unauthorized zone modifications

### 2. Token Encryption at Rest

**OAuth Tokens** (DNS provider credentials):

```typescript
// Client-side (Spark UI - demo only):
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  plaintext
);

// Production (Cloudflare Workers):
const key = env.ENCRYPTION_KEY; // From Cloudflare Secrets
const decrypted = await crypto.subtle.decrypt(
  { name: 'AES-GCM', iv },
  key,
  ciphertext
);
```

**Storage**:
- **Key Storage**: Cloudflare Secret Store (encrypted at rest, never logged)
- **Token Storage**: D1 database (encrypted ciphertext only)
- **Rotation**: Encryption keys rotated annually, tokens re-encrypted

**API Tokens** (customer access):

```typescript
const plainToken = generateRandomToken(); // Show to user once
const tokenHash = await crypto.subtle.digest('SHA-256', plainToken);
// Store only hash, verify with constant-time comparison
```

### 3. Access Control (RBAC)

**Organization Roles**:
- **Owner**: Full control (delete org, manage members, billing)
- **Admin**: Manage domains, API tokens, webhooks
- **Member**: View-only access to domains and jobs

**Enforcement**:
```typescript
async function checkPermission(userId: string, orgId: string, action: string) {
  const membership = await db.getMembership(userId, orgId);
  
  const permissions = {
    owner: ['*'],
    admin: ['domain.create', 'domain.delete', 'token.create'],
    member: ['domain.view', 'job.view'],
  };
  
  return permissions[membership.role].includes(action) ||
         permissions[membership.role].includes('*');
}
```

### 4. Audit Logging

**Immutable Audit Trail**:
- All state-changing operations logged
- Who, what, when, and why (details)
- Append-only (no updates/deletes)
- Retention: 90 days (Free), 1 year (Pro), 3 years (Agency)

**Logged Events**:
```typescript
const auditEvents = [
  'domain.created',
  'domain.dns_verified',
  'domain.certificate_issued',
  'domain.renewed',
  'domain.deleted',
  'member.invited',
  'member.removed',
  'role.changed',
  'token.created',
  'token.revoked',
  'oauth.connected',
  'oauth.disconnected',
  'settings.changed',
];
```

### 5. API Security

**Authentication**:
- Bearer token in `Authorization` header
- SHA-256 hash comparison (constant-time)
- Token expiration after 1 year (configurable)

**Rate Limiting** (per organization):
| Plan | Rate Limit | Burst |
|------|------------|-------|
| Free | 10 req/min | 20 |
| Pro | 100 req/min | 200 |
| Agency | 1000 req/min | 2000 |

**Input Validation**:
```typescript
const domainSchema = z.object({
  domainName: z.string()
    .regex(/^[a-z0-9.-]+$/)
    .max(253)
    .refine(isValidDomain),
});
```

### 6. Secrets Management

**Cloudflare Secrets** (wrangler.toml):
```toml
[secrets]
ENCRYPTION_KEY = "..." # 32-byte AES key (auto-generated)
ACME_ACCOUNT_KEY = "..." # ACME account private key
WEBHOOK_SIGNING_KEY = "..." # HMAC key for webhooks
GITHUB_CLIENT_SECRET = "..." # OAuth client secret
```

**Access Control**:
- Secrets never logged or exposed in errors
- Workers only (no client access)
- Rotate annually or on suspected compromise

### 7. Certificate Private Keys

**Storage**:
- **Option A**: Cloudflare R2 (encrypted at rest)
- **Option B**: Customer-provided storage (S3, GCS)
- **Option C**: Ephemeral (issue and deliver immediately)

**Access**:
- Only Worker with job ID has access
- Time-boxed access (24 hours)
- No long-term storage of private keys

### 8. CA Failover Security

**Primary CA**: Let's Encrypt
- Rate limits: 50 certs/week per domain
- Public CT logs (transparency)

**Backup CA**: ZeroSSL
- Automatic failover if Let's Encrypt unavailable
- Separate ACME account
- Independent rate limits

**Security Considerations**:
- Both CAs verify domain control independently
- No single point of failure
- CT log monitoring for unauthorized issuance

## OAuth Security (Single-Click CNAME)

### Cloudflare OAuth

**Scopes** (least privilege):
```
dns:read     # Verify domain ownership
dns:edit     # Create CNAME records only
```

**Flow**:
```
1. User clicks "Connect Cloudflare"
2. Redirect to Cloudflare OAuth consent
3. User approves specific zones
4. Receive access_token + refresh_token
5. Encrypt tokens with AES-GCM
6. Store in D1 oauth_connections table
7. Use token to create CNAME via API
8. Never store plaintext tokens
```

**Token Refresh**:
```typescript
async function refreshOAuthToken(connection: OAuthConnection) {
  const plainRefreshToken = await decrypt(connection.encryptedRefreshToken);
  
  const response = await fetch('https://api.cloudflare.com/oauth2/token', {
    method: 'POST',
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: plainRefreshToken,
      client_id: env.CLOUDFLARE_CLIENT_ID,
      client_secret: env.CLOUDFLARE_CLIENT_SECRET,
    }),
  });
  
  const { access_token, refresh_token } = await response.json();
  
  // Re-encrypt and store
  connection.encryptedAccessToken = await encrypt(access_token);
  connection.encryptedRefreshToken = await encrypt(refresh_token);
  await db.updateOAuthConnection(connection);
}
```

## Incident Response

### Detection
- **Failed Auth**: > 10 attempts in 5 minutes → IP ban
- **Unusual Activity**: API calls from new location → email alert
- **Certificate Errors**: Issuance failure rate > 10% → admin alert

### Response Plan
1. **Containment**: Revoke compromised tokens, rotate secrets
2. **Investigation**: Audit log analysis, identify scope
3. **Remediation**: Patch vulnerabilities, update procedures
4. **Notification**: Email affected customers within 24 hours
5. **Post-Mortem**: Document incident, implement preventions

### Customer Actions
- **Revoke Access**: Delete CNAME to immediately stop validation
- **Rotate Tokens**: Revoke/recreate API tokens in dashboard
- **Disconnect OAuth**: Remove OAuth connections via Settings

## Compliance

### GDPR
- **Data Minimization**: Collect only necessary data
- **Right to Access**: Users can export all their data
- **Right to Erasure**: Delete organization → cascade delete all data
- **Data Portability**: JSON export of domains, jobs, audit logs

### SOC 2 (Planned)
- **Security**: Encryption, access control, audit logs
- **Availability**: 99.9% uptime SLA
- **Confidentiality**: Data isolation, no cross-tenant access

## Vulnerability Disclosure

**Report Security Issues**:
- Email: security@dcvaas.example.com
- Response SLA: 24 hours
- Bounty Program: $100-$5000 depending on severity

**Scope**:
- ✅ Authentication bypass
- ✅ Privilege escalation
- ✅ SQL injection, XSS, CSRF
- ✅ Secret exposure
- ✅ Rate limit bypass
- ✗ Social engineering
- ✗ Physical attacks
- ✗ DoS (except with proof of concept)

## Security Checklist for Developers

**Before Production Deployment**:
- [ ] All secrets in Cloudflare Secret Store (not hardcoded)
- [ ] OAuth tokens encrypted at rest
- [ ] API tokens hashed (SHA-256)
- [ ] Rate limiting enabled
- [ ] Audit logging complete
- [ ] Input validation (Zod schemas)
- [ ] SQL parameterized (no string concatenation)
- [ ] CORS configured (whitelist only)
- [ ] HTTPS only (no HTTP fallback)
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] Dependencies audited (npm audit)
- [ ] Secrets rotated (last 90 days)

---

**Last Updated**: 2024-01-15  
**Next Review**: 2024-04-15 (Quarterly)
