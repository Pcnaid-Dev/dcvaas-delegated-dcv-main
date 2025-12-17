# Production Hardening Implementation Summary

## Overview
This document summarizes the backend implementation for API tokens, webhooks, and OAuth connections, moving from client-side stubs to production-ready D1 database integration.

## Implemented Features

### 1. API Token Backend ✅

**Files Created/Modified:**
- `workers/api/src/lib/tokens.ts` - Token management library
- `workers/api/src/index.ts` - Added token routes
- `src/lib/data.ts` - Updated to use real API endpoints

**Endpoints:**
- `POST /api/tokens` - Create a new API token (admin/owner only)
- `GET /api/tokens` - List all tokens for organization
- `DELETE /api/tokens/:id` - Revoke a token (admin/owner only)

**Security Features:**
- Tokens generated with format: `dcv_live_<32-random-hex-chars>`
- SHA-256 hashing before storage (plaintext never stored)
- Token revealed only once on creation
- Automatic last_used_at tracking on authentication

**Usage Example:**
```bash
# Create token
curl -X POST https://dcv.pcnaid.com/api/tokens \
  -H "Authorization: Bearer <existing-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "CI/CD Token"}'

# Response includes token ONCE
{
  "token": {
    "id": "token_abc123",
    "orgId": "org_xyz",
    "name": "CI/CD Token",
    "token": "dcv_live_1a2b3c4d5e6f...",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}

# Use the token
curl https://dcv.pcnaid.com/api/domains \
  -H "Authorization: Bearer dcv_live_1a2b3c4d5e6f..."
```

### 2. Webhook System ✅

**Files Created/Modified:**
- `workers/api/migrations/0007_webhooks.sql` - Database migration
- `workers/api/src/lib/webhooks.ts` - Webhook management and dispatch
- `workers/consumer/src/lib/webhooks.ts` - Simplified dispatch-only version
- `workers/consumer/src/handlers/sync-status.ts` - Integrated webhook dispatch
- `src/pages/WebhooksPage.tsx` - Updated to use real API
- `src/lib/data.ts` - Added webhook API functions

**Endpoints:**
- `POST /api/webhooks` - Create webhook endpoint (admin/owner only)
- `GET /api/webhooks` - List all webhook endpoints
- `PATCH /api/webhooks/:id` - Enable/disable webhook (admin/owner only)
- `DELETE /api/webhooks/:id` - Delete webhook endpoint (admin/owner only)

**Database Schema:**
```sql
CREATE TABLE webhook_endpoints (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);
```

**Security Features:**
- HMAC-SHA256 signature in `X-DCVaaS-Signature` header
- Unique secret per endpoint (64 hex chars)
- 5-second timeout per webhook delivery
- Event filtering per endpoint

**Webhook Payload Format:**
```json
{
  "event": "domain.active",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "domain_id": "dom_abc123",
    "domain_name": "example.com",
    "status": "active",
    "expires_at": "2024-04-15T10:30:00Z"
  }
}
```

**Supported Events:**
- `domain.active` - Certificate successfully issued
- `domain.error` - Certificate issuance/renewal failed
- `domain.expiring_soon` - Certificate expires within 30 days
- `domain.renewed` - Certificate successfully renewed
- `domain.added` - New domain added
- `domain.removed` - Domain removed
- `dns.verified` - DNS CNAME record verified
- `dns.check_failed` - DNS verification failed
- `job.failed` - Background job failed
- `job.dlq` - Job moved to dead letter queue

**Verification Example (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(hmac)
  );
}
```

### 3. OAuth Backend ✅

**Files Created/Modified:**
- `workers/api/src/lib/oauth.ts` - OAuth connection management
- `workers/api/src/index.ts` - Added OAuth routes

**Endpoints:**
- `POST /api/oauth/exchange` - Exchange OAuth code for tokens (admin/owner only)
- `GET /api/oauth/connections` - List OAuth connections
- `DELETE /api/oauth/connections/:id` - Delete connection (admin/owner only)

**Security Features:**
- AES-GCM encryption for access/refresh tokens
- PBKDF2 key derivation (100,000 iterations)
- Dynamic salt derived from encryption key
- Environment variable required: `OAUTH_ENCRYPTION_KEY`
- Tokens never exposed in API responses

**Database Schema (Already Existed):**
```sql
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

**Supported Providers:**
- `cloudflare` - Cloudflare OAuth (stub, needs implementation)
- `godaddy` - GoDaddy OAuth (stub, needs implementation)
- `route53` - AWS credentials (not OAuth-based)
- `other` - Generic OAuth provider

**Implementation Note:**
The OAuth exchange logic is currently a stub. Production implementation requires:
1. Provider-specific OAuth client credentials (env vars)
2. OAuth flow implementation per provider
3. Token refresh logic

### 4. Sync Loop Enhancement ✅

**Files Modified:**
- `workers/cron/src/index.ts` - Updated domain query
- `workers/consumer/src/handlers/sync-status.ts` - Enhanced status sync

**Changes:**
```sql
-- Before: Only synced pending/issuing domains
SELECT * FROM domains 
WHERE status IN ('pending_cname', 'issuing')

-- After: Also syncs stale active domains
SELECT * FROM domains 
WHERE status IN ('pending_cname', 'issuing')
   OR (status = 'active' AND updated_at < datetime('now', '-1 day'))
```

**Benefits:**
- Active domain certificates are refreshed daily
- Expiration dates stay accurate as Cloudflare auto-renews
- Dashboard reflects true certificate lifecycle

**Webhook Integration:**
- Dispatches `domain.active` when domain becomes active
- Dispatches `domain.error` when status changes to error
- Non-blocking: webhook failures don't fail the sync job

## Deployment Checklist

### 1. Environment Variables
Add these to your workers:

**API Worker:**
```bash
wrangler secret put OAUTH_ENCRYPTION_KEY --env production
# Use a strong 32+ character random string
```

**All Workers:**
Ensure these are already set:
- `CLOUDFLARE_API_TOKEN` - For SSL for SaaS API access
- `CLOUDFLARE_ZONE_ID` - Your zone ID
- `SAAS_CNAME_TARGET` - Fallback origin domain

### 2. Database Migration
```bash
# Apply webhook migration to production
wrangler d1 execute dcvaas-db --remote \
  --file=workers/api/migrations/0007_webhooks.sql
```

### 3. Deploy Workers
```bash
# Deploy API worker
cd workers/api && wrangler deploy --env production

# Deploy consumer worker
cd workers/consumer && wrangler deploy --env production

# Deploy cron worker
cd workers/cron && wrangler deploy --env production
```

### 4. Deploy Frontend
```bash
# Build and deploy
npm run build
npx wrangler deploy --env production
```

## Testing Endpoints

### API Tokens
```bash
# Create admin token first (if you don't have one)
# You'll need to create it via D1 directly initially

# List tokens
curl https://dcv.pcnaid.com/api/tokens \
  -H "Authorization: Bearer <token>"

# Create new token
curl -X POST https://dcv.pcnaid.com/api/tokens \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Token"}'

# Delete token
curl -X DELETE https://dcv.pcnaid.com/api/tokens/<token-id> \
  -H "Authorization: Bearer <token>"
```

### Webhooks
```bash
# List webhooks
curl https://dcv.pcnaid.com/api/webhooks \
  -H "Authorization: Bearer <token>"

# Create webhook
curl -X POST https://dcv.pcnaid.com/api/webhooks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/unique-id",
    "events": ["domain.active", "domain.error"]
  }'

# Test webhook delivery
# Add a domain and watch it become active to trigger webhook
```

### OAuth Connections
```bash
# List connections
curl https://dcv.pcnaid.com/api/oauth/connections \
  -H "Authorization: Bearer <token>"

# Exchange code (after OAuth redirect)
curl -X POST https://dcv.pcnaid.com/api/oauth/exchange \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "cloudflare",
    "code": "oauth-code-from-callback",
    "redirectUri": "https://dcv.pcnaid.com/oauth/callback"
  }'
```

## Security Audit Results

✅ **CodeQL Scan:** No security alerts found

**Addressed Code Review Issues:**
- ✅ OAuth encryption key now required (no default fallback)
- ✅ Salt derivation improved (derived from key, not hardcoded)
- ✅ Removed misleading masked tokens from listing
- ✅ Fixed expires_at to only update when Cloudflare provides value
- ✅ Reduced code duplication in consumer worker

## Known Limitations

1. **OAuth Providers:** Code exchange is stubbed. Each provider needs:
   - OAuth client credentials
   - Provider-specific token exchange logic
   - Token refresh implementation

2. **Webhook Retries:** Current implementation doesn't retry failed webhooks. Consider adding:
   - Retry logic with exponential backoff
   - Dead letter queue for failed deliveries
   - Webhook delivery history/logs

3. **API Token Expiration:** API tokens with an `expires_at` date are correctly enforced at authentication time. However, there is no background job to automatically clean up expired tokens from the database yet.

4. **Rate Limiting:** No rate limiting on API endpoints. Consider adding Cloudflare Rate Limiting rules or implement in middleware.

## Future Enhancements

1. **Webhook Delivery UI:**
   - Show delivery history per endpoint
   - Display success/failure rates
   - Allow manual retry of failed deliveries

2. **API Token Scopes:**
   - Implement granular permissions per token
   - Read-only vs. read-write tokens
   - Resource-specific access (e.g., specific domains)

3. **OAuth Integration:**
   - Complete Cloudflare OAuth flow
   - Add GoDaddy OAuth support
   - Implement automatic DNS record updates via OAuth connections

4. **Monitoring:**
   - Webhook delivery metrics in dashboard
   - API token usage analytics
   - Alert on repeated webhook failures

## Support

For issues or questions, see:
- PRD.md - Product requirements
- ARCHITECTURE.md - Architecture overview
- SECURITY.md - Security guidelines
