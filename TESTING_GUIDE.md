# Testing Guide: API Tokens, Webhooks, OAuth & Sync Loop

This guide covers testing the newly implemented features for API tokens, webhooks, OAuth connections, and the enhanced certificate expiry sync loop.

## Prerequisites

1. **Apply Database Migration**:
   ```bash
   wrangler d1 execute dcvaas-db --remote --file=workers/api/migrations/0007_integrations.sql
   ```
   
   Or for local testing:
   ```bash
   wrangler d1 execute dcvaas-db --local --file=workers/api/migrations/0007_integrations.sql
   ```

2. **Set Required Secrets**:
   ```bash
   wrangler secret put ENCRYPTION_KEY --env production
   ```
   Generate a strong key (e.g., 32 random bytes as hex):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Deploy Workers**:
   ```bash
   # API Worker
   cd workers/api && npx wrangler deploy
   
   # Consumer Worker
   cd ../consumer && npx wrangler deploy
   
   # Cron Worker
   cd ../cron && npx wrangler deploy
   ```

4. **Deploy Frontend**:
   ```bash
   cd ../.. && npm run build && npx wrangler deploy
   ```

---

## Test 1: API Token Management

### Create a Token via UI
1. Navigate to **API Tokens** page
2. Click **Create Token**
3. Enter a name (e.g., "Test Token")
4. Click **Create**
5. **Copy the plaintext token** (shown only once)

### Verify Token Works
```bash
# Replace with your actual token and domain
export TOKEN="your-plaintext-token-here"
export API_URL="https://dcv.pcnaid.com"

# Test token authentication
curl -H "Authorization: Bearer $TOKEN" \
     $API_URL/api/domains
```

Expected: Returns JSON list of domains (or empty array if none exist)

### Test Token in UI
1. Verify token appears in the list with:
   - Name
   - Created date
   - Last used date (should update after curl command)
   - No expiry date (unless you set one)

### Delete Token
1. Click **Delete** button on the token
2. Confirm deletion
3. Verify token no longer appears in list
4. Test that deleted token no longer works:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
        $API_URL/api/domains
   ```
   Expected: 401 Unauthorized

---

## Test 2: Webhook Configuration

### Create a Webhook Endpoint
1. Navigate to **Webhooks** page
2. Click **Add Endpoint**
3. Enter URL: `https://webhook.site/your-unique-url` (use [webhook.site](https://webhook.site) for testing)
4. Select events:
   - `domain.active`
   - `domain.error`
5. Click **Create Endpoint**
6. **Copy the webhook secret** (shown only once)

### Verify Webhook in Database
```bash
wrangler d1 execute dcvaas-db --remote --command="SELECT * FROM webhook_endpoints;"
```

Expected: Shows webhook with URL, events JSON, plaintext secret, enabled=1

### Toggle Webhook Status
1. In UI, toggle the webhook to **Disabled**
2. Verify status updates in UI
3. Toggle back to **Enabled**

---

## Test 3: Webhook Dispatch on Domain Status Change

### Prerequisites
- Have at least one domain in `pending_cname` or `issuing` status
- Have webhook endpoint configured for `domain.active` event

### Trigger Status Change
1. Point the domain's DNS CNAME to your SAAS_CNAME_TARGET
2. Wait 5 minutes for cron to run, or manually trigger:
   ```bash
   # Get domain ID from database
   wrangler d1 execute dcvaas-db --remote --command="SELECT id, domain_name, status FROM domains LIMIT 5;"
   
   # Queue a sync job manually
   wrangler d1 execute dcvaas-db --remote --command="
   INSERT INTO jobs (id, type, domain_id, status, attempts, created_at, updated_at)
   VALUES ('manual-test-job', 'sync_status', 'your-domain-id', 'queued', 0, datetime('now'), datetime('now'));
   "
   ```

3. Check webhook.site for incoming POST request with:
   - Header: `X-DCVaaS-Event: domain.active`
   - Header: `X-DCVaaS-Signature: <hmac-sha256-signature>`
   - Body: JSON with domain details

### Verify Webhook Signature
```javascript
// In Node.js or browser console
const crypto = require('crypto');

const secret = 'your-webhook-secret';
const body = '{"domainId":"...","domainName":"..."}'; // actual payload
const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

console.log('Expected signature:', signature);
// Compare with X-DCVaaS-Signature header
```

---

## Test 4: Certificate Expiry Tracking

### Check Domain Expiry Updates
1. Wait for a domain to become `active`
2. Check database for `expires_at` and `last_issued_at`:
   ```bash
   wrangler d1 execute dcvaas-db --remote --command="
   SELECT id, domain_name, status, expires_at, last_issued_at, updated_at 
   FROM domains 
   WHERE status = 'active' 
   LIMIT 5;
   "
   ```

Expected: `expires_at` should be populated with ISO 8601 date (typically 90 days from `last_issued_at`)

### Verify Stale Domain Polling
1. Update a domain's `updated_at` to be >1 day old:
   ```bash
   wrangler d1 execute dcvaas-db --remote --command="
   UPDATE domains 
   SET updated_at = datetime('now', '-2 days') 
   WHERE id = 'your-domain-id';
   "
   ```

2. Wait for cron to run (every 5 minutes) or trigger manually
3. Check that `updated_at` is refreshed and `expires_at` is current

---

## Test 5: OAuth Connection (Stub Implementation)

### Create OAuth Connection via API
```bash
curl -X POST $API_URL/api/oauth/exchange \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "cloudflare",
    "code": "test-auth-code",
    "redirectUri": "https://example.com/callback"
  }'
```

Expected Response:
```json
{
  "id": "uuid",
  "orgId": "org_id",
  "provider": "cloudflare",
  "status": "created",
  "note": "OAuth connection created with stub token - full implementation pending"
}
```

### Verify Encrypted Token Storage
```bash
wrangler d1 execute dcvaas-db --remote --command="SELECT * FROM oauth_connections;"
```

Expected: `encrypted_access_token` should be base64 string (not plaintext)

### Check UI Display
1. Navigate to **Settings** page
2. Scroll to **DNS Provider Connections** section
3. Verify providers are listed (currently disabled/not connected)

---

## Test 6: Frontend Data Loading

### Verify No localStorage Usage
1. Open browser DevTools > Application > Local Storage
2. Check `dcvaas_tokens` key should NOT exist (removed)
3. Webhooks should NOT be in localStorage
4. Open Network tab
5. Navigate to API Tokens page
6. Verify API call to `/api/tokens` (not localStorage read)

### Test React Query Caching
1. Navigate to API Tokens page (triggers fetch)
2. Navigate away, then back
3. Open Network tab - should NOT refetch immediately (uses cache)
4. Wait 10 seconds (staleTime)
5. Navigate back - should refetch (cache stale)

---

## Test 7: Error Handling

### Invalid Token
```bash
curl -H "Authorization: Bearer invalid-token" \
     $API_URL/api/domains
```
Expected: 401 Unauthorized

### Invalid Webhook URL
1. Try creating webhook with URL: `ftp://example.com`
2. Expected: Error message "URL must use http or https protocol"

### Missing Required Fields
```bash
curl -X POST $API_URL/api/tokens \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected: 400 Bad Request - "name is required"

---

## Test 8: Audit Trail (If Implemented)

Check audit logs for:
- Token creation/deletion events
- Webhook creation/update/deletion events
- OAuth connection attempts

```bash
wrangler d1 execute dcvaas-db --remote --command="
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 10;
"
```

---

## Troubleshooting

### Webhooks Not Dispatching
1. Check webhook is enabled: `SELECT enabled FROM webhook_endpoints WHERE id='...'`
2. Verify events array includes the triggered event
3. Check consumer worker logs: `wrangler tail --name=dcvaas-consumer`
4. Verify domain actually changed status (check `cf_status` and `cf_ssl_status`)

### Certificate Expiry Not Updating
1. Check Cloudflare API response includes `ssl.expires_on` field
2. Verify consumer worker is processing jobs: `wrangler tail --name=dcvaas-consumer`
3. Check job queue: `SELECT * FROM jobs WHERE status='queued' OR status='running'`

### OAuth Encryption Errors
1. Verify `ENCRYPTION_KEY` secret is set: `wrangler secret list`
2. Check key is at least 32 bytes (64 hex chars)
3. Review API worker logs: `wrangler tail --name=dcvaas-api`

---

## Performance Verification

### Cron Worker Batch Processing
```bash
# Check cron logs for batch size
wrangler tail --name=dcvaas-cron --format=pretty
```
Should see: "Processing N domains (pending/issuing + stale active)"

### Consumer Worker Parallel Processing
Check consumer logs for Promise.allSettled usage - multiple domains should process concurrently

### API Response Times
Use browser Network tab to verify:
- `/api/domains` with ETag: ~50-200ms (304 if cached)
- `/api/tokens`: ~100-300ms
- `/api/webhooks`: ~100-300ms

---

## Cleanup

After testing, remove test data:
```bash
# Delete test tokens
wrangler d1 execute dcvaas-db --remote --command="DELETE FROM api_tokens WHERE label LIKE '%Test%';"

# Delete test webhooks
wrangler d1 execute dcvaas-db --remote --command="DELETE FROM webhook_endpoints WHERE url LIKE '%webhook.site%';"

# Delete test OAuth connections
wrangler d1 execute dcvaas-db --remote --command="DELETE FROM oauth_connections WHERE provider = 'cloudflare';"
```
