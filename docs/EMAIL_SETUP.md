# Email Notification Setup

This document describes how to set up transactional emails using Resend.com.

## Overview

DCVaaS uses [Resend](https://resend.com) to send transactional email notifications for:
1. **Certificate Issued** - When a domain's SSL/TLS certificate becomes active
2. **Certificate Expiring** - When a certificate will expire within 7 days
3. **Job Failed** - When a background job fails after max retries (Dead Letter Queue)

## Architecture

- **Email Queue System**: Emails are sent asynchronously via Cloudflare Queues
- **Workers Involved**:
  - `api` - Creates email notification jobs
  - `consumer` - Processes send_email jobs using Resend API
  - `cron` - Checks for expiring certificates every 5 minutes
  - `dlq` - Handles failed jobs and sends admin notifications

## Setup Instructions

### 1. Get Resend API Key

**IMPORTANT**: Never commit API keys to source control. Use Wrangler secrets to securely store your Resend API key.

To obtain a Resend API key:
1. Sign up at [resend.com](https://resend.com)
2. Navigate to API Keys section
3. Create a new API key with send permissions
4. Copy the API key (starts with `re_`)
5. Store it securely using `wrangler secret put RESEND_API_KEY`

### 2. Configure Workers

Set the `RESEND_API_KEY` secret for the following workers:

```bash
# API Worker
cd workers/api
wrangler secret put RESEND_API_KEY
# Paste your API key when prompted

# Consumer Worker
cd ../consumer
wrangler secret put RESEND_API_KEY
# Paste your API key when prompted
```

**Note**: The DLQ worker doesn't need `RESEND_API_KEY` because it only queues email jobs for the consumer worker to process. It doesn't send emails directly.

### 3. Verify Domain (Production)

For production use, you need to verify your sending domain in Resend:

1. Go to Resend Dashboard → Domains
2. Add your domain (e.g., `pcnaid.com`)
3. Add the provided DNS records:
   - TXT record for domain verification
   - MX record (optional, for receiving bounces)
   - DKIM records for email authentication

4. Wait for DNS propagation (usually a few minutes)
5. Click "Verify Domain" in Resend dashboard

### 4. Update Email Templates (Optional)

Email templates are defined in:
- `workers/api/src/lib/email.ts` - Template builder functions
- `workers/consumer/src/handlers/sync-status.ts` - Certificate issued template
- `workers/cron/src/index.ts` - Certificate expiring template
- `workers/dlq/src/index.ts` - Job failed template

To customize:
1. Edit the HTML in the `build*Email()` functions
2. Update the `from` address if needed (default: `DCVaaS <noreply@pcnaid.com>`)
3. Redeploy the affected worker

## Email Triggers

### Certificate Issued
- **Trigger**: Domain status changes from non-active to `active`
- **Recipients**: All active members of the organization
- **Location**: `workers/consumer/src/handlers/sync-status.ts`

### Certificate Expiring
- **Trigger**: Cron job runs every 5 minutes, checks for certificates expiring within 7 days
- **Recipients**: All active members of the organization
- **Location**: `workers/cron/src/index.ts`
- **Note**: Emails are sent once per domain per check cycle

### Job Failed (DLQ)
- **Trigger**: Job fails after 3 retry attempts and moves to Dead Letter Queue
- **Recipients**: Organization owners and admins only
- **Location**: `workers/dlq/src/index.ts`
- **Max Retries**: Configured in `workers/consumer/wrangler.toml`

## Testing

### Local Testing

```bash
# Start the consumer worker locally
cd workers/consumer
wrangler dev

# In another terminal, trigger a test email
cd workers/api
# Use the API to create a domain and trigger status changes
```

### Manual Email Test

You can manually queue an email for testing:

```typescript
await env.QUEUE.send({
  id: crypto.randomUUID(),
  type: 'send_email',
  emailParams: {
    to: 'your-email@example.com',
    subject: 'Test Email from DCVaaS',
    html: '<h1>Test</h1><p>This is a test email.</p>',
  },
  attempts: 0,
});
```

## Monitoring

### Check Email Logs

```bash
# View consumer worker logs
wrangler tail dcvaas-consumer

# View DLQ worker logs
wrangler tail dcvaas-dlq
```

### Resend Dashboard

Monitor email delivery, bounces, and errors in the [Resend Dashboard](https://resend.com/emails).

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Verify `RESEND_API_KEY` is set correctly
   ```bash
   # This will show if the secret exists (but not the value)
   wrangler secret list
   ```

2. **Check Queue**: Verify jobs are being queued
   ```bash
   wrangler tail dcvaas-consumer
   ```

3. **Check Resend Dashboard**: Look for failed sends or bounces

### Domain Not Verified

If using a custom domain for sending:
- Verify DNS records are properly configured
- Allow time for DNS propagation (up to 48 hours)
- Use Resend's DNS checker tool

### Rate Limits

Resend free tier limits:
- 100 emails/day
- 3,000 emails/month

For production, upgrade to a paid plan.

## Security Considerations

1. **API Key Protection**: Never commit `RESEND_API_KEY` to version control
2. **Email Addresses**: Only send to verified organization members
3. **Rate Limiting**: Implement rate limiting if sending high volumes
4. **Unsubscribe**: Consider adding unsubscribe links for notification preferences

## Future Enhancements

- [ ] Email preferences per user (opt-out of certain notifications)
- [ ] Email templates stored in database for easy customization
- [ ] Support for multiple email providers (SendGrid, Mailgun)
- [ ] HTML email template builder in the dashboard
- [ ] Weekly digest emails instead of real-time notifications
