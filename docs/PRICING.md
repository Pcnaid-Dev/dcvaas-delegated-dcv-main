# DCVaaS Pricing

## Plan Comparison

| Feature | Free | Pro | Agency |
|---------|------|-----|--------|
| **Price** | $0/month | $29/month | $99/month |
| **Domains** | 3 | 15 | 50+ |
| **API Access** | ✗ | ✓ | ✓ |
| **Team Members** | 1 (owner only) | 1 (owner only) | Unlimited |
| **RBAC** | ✗ | ✗ | ✓ (Owner/Admin/Member) |
| **Audit Logs** | Basic (90 days) | Basic (90 days) | Full (3 years) |
| **Single-Click CNAME** | ✗ | ✗ | ✓ (OAuth) |
| **White-Label** | ✗ | ✗ | ✓ |
| **Custom Domain** | ✗ | ✗ | Coming Soon |
| **Support** | Community | Email | Priority + Slack |
| **SLA** | Best effort | 99% | 99.9% |
| **CA Failover** | ✓ | ✓ | ✓ |
| **Webhooks** | ✗ | 3 endpoints | Unlimited |
| **API Rate Limit** | N/A | 100/min | 1000/min |

## Detailed Feature Breakdown

### Free Plan - Developer
**Perfect for**: Personal projects, development, testing

**Included**:
- ✅ Up to 3 domains
- ✅ Automatic certificate renewals
- ✅ DNS-01 validation via CNAME delegation
- ✅ Let's Encrypt + ZeroSSL CA failover
- ✅ Basic dashboard with domain status
- ✅ Job history (last 30 days)
- ✅ Community support (Discord/Forums)
- ✅ Basic audit logs (90 day retention)

**Limitations**:
- ❌ No API access
- ❌ No team members
- ❌ No webhooks
- ❌ Manual CNAME setup required
- ❌ No white-label branding

**Use Cases**:
- Personal blog certificates
- Side project SSL
- Development/staging environments
- Testing DCVaaS before committing

---

### Pro Plan - Professional
**Perfect for**: Small businesses, freelancers, SaaS startups

**Everything in Free, plus**:
- ✅ Up to 15 domains
- ✅ **REST API access** with token authentication
- ✅ OpenAPI documentation
- ✅ 3 webhook endpoints for notifications
- ✅ Email support (24-hour response)
- ✅ 99% uptime SLA
- ✅ API rate limit: 100 requests/minute
- ✅ Job history (90 days)
- ✅ Custom expiration thresholds (default: 30 days)

**Still Limited**:
- ❌ No team collaboration features
- ❌ No single-click OAuth setup
- ❌ No white-label branding
- ❌ Single owner only

**Use Cases**:
- SaaS application certificates (moderate scale)
- Client project SSL management
- Automated certificate provisioning
- Integration with CI/CD pipelines

**API Example**:
```bash
curl -X POST https://api.dcvaas.com/v1/domains \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domainName": "app.example.com"}'
```

---

### Agency Plan - Enterprise
**Perfect for**: Agencies, MSPs, enterprises, high-volume SaaS

**Everything in Pro, plus**:
- ✅ Up to 50 domains (contact sales for more)
- ✅ **Team management** with unlimited members
- ✅ **Role-Based Access Control** (Owner/Admin/Member)
- ✅ **Single-Click CNAME Setup** via OAuth (Cloudflare, GoDaddy, Route53)
- ✅ **White-Label Branding** (logo, colors, custom domain*)
- ✅ **Full Audit Logs** (3 year retention, exportable)
- ✅ Unlimited webhook endpoints
- ✅ Priority support (4-hour response, Slack channel)
- ✅ 99.9% uptime SLA
- ✅ API rate limit: 1000 requests/minute
- ✅ Job history (1 year)
- ✅ Custom renewal thresholds
- ✅ Dedicated account manager (50+ domains)
- ✅ Quarterly business reviews

**White-Label Features**:
- 🎨 Custom logo on all pages
- 🎨 Custom color scheme (primary/secondary)
- 🎨 Hide "Powered by DCVaaS" branding
- 🎨 Custom domain (e.g., certs.youragency.com)*
- 🎨 Branded emails and notifications*

_* Custom domain and branded emails coming Q2 2024_

**Single-Click CNAME Providers**:
- ✅ Cloudflare (OAuth ready)
- ✅ GoDaddy (OAuth ready)
- 🔄 AWS Route53 (Q1 2024)
- 🔄 Azure DNS (Q2 2024)
- 🔄 Google Cloud DNS (Q2 2024)

**Use Cases**:
- Agency managing 20+ client domains
- MSP offering SSL-as-a-service
- Enterprise with multiple brands/subsidiaries
- High-volume SaaS (100k+ tenants)
- White-label certificate platform

**Team Collaboration Example**:
```
Owner: Full control, billing access
Admin: Add/remove domains, manage API tokens
Member: View-only access to status/jobs
```

---

## Add-Ons (All Plans)

### Additional Domains
- **Pro**: $2/domain/month above limit
- **Agency**: $1.50/domain/month above limit
- **Volume Discounts**: 100+ domains - contact sales

### Extended Audit Log Retention
- **Free → 1 year**: +$5/month
- **Pro → 3 years**: +$10/month
- **Agency → 7 years**: +$20/month

### Priority Support Upgrade
- **Free → Email Support**: +$10/month
- **Pro → Priority Support**: +$20/month

---

## Billing & Payment

### Payment Methods
- ✅ Credit/Debit Card (Visa, Mastercard, Amex)
- ✅ ACH Direct Debit (Agency plan only)
- ✅ Wire Transfer (50+ domains, annual only)

### Billing Cycle
- **Monthly**: Billed on signup date each month
- **Annual**: 2 months free (10 months price for 12 months)

### Trials
- **Pro**: 14-day free trial (no credit card required)
- **Agency**: 30-day free trial + onboarding call

### Cancellation
- **Cancel anytime**: Pro-rated refund for unused time
- **Domains**: Remain active until current period ends
- **Data**: Exported as JSON before deletion (30-day grace)

---

## FAQ

### What happens if I exceed my domain limit?
You'll see a friendly prompt to upgrade. Existing domains continue working—you just can't add new ones until you upgrade or remove domains.

### Can I change plans mid-cycle?
Yes! Upgrades take effect immediately (pro-rated charge). Downgrades take effect at next renewal (no refunds for downgrade).

### Do you offer discounts for nonprofits/education?
Yes! 50% off Pro/Agency plans with proof of 501(c)(3) or .edu email.

### What if I need more than 50 domains?
Contact sales@dcvaas.com for custom enterprise pricing. Volume discounts available.

### Is there a setup fee?
No setup fees, ever. Pay only for your subscription.

### What if Let's Encrypt rate limit is hit?
We automatically failover to ZeroSSL (included in all plans). No action required.

### How does white-label billing work?
You can resell DCVaaS with your own branding/pricing. We bill you based on total domains across all your customers.

### Can I cancel my OAuth connection?
Yes, in Settings → White-Label → Disconnect. Your CNAME records remain—you'll just set them up manually going forward.

### What currencies do you accept?
USD only currently. EUR and GBP coming Q1 2024.

---

## Pricing Philosophy

**Why we charge for domains, not certificates**:
- Certificates renew automatically every 90 days (soon 47 days)
- You pay once for the domain, regardless of renewal frequency
- No surprise fees when CA/Browser Forum shortens lifetimes

**Free tier forever**:
- We're committed to keeping the Free plan available
- Great for developers, students, and personal projects
- No credit card needed to start

**Transparent pricing**:
- No hidden fees or usage charges
- Simple per-domain pricing above limits
- Cancel anytime with pro-rated refunds

---

## Contact Sales

Ready to get started with Pro or Agency?

- **Email**: sales@dcvaas.com
- **Calendar**: [Book a demo](https://calendly.com/dcvaas/demo)
- **Slack**: Join our [community](https://dcvaas.com/slack)

---

**Last Updated**: January 2024  
**Next Review**: Quarterly (April 2024)
