````markdown
# DCVaaS – Delegated DCV-as-a-Service

> **A SaaS control plane for automated SSL/TLS certificate issuance and renewal via Cloudflare for SaaS (Custom Hostnames)**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

DCVaaS automates wildcard SSL/TLS certificate lifecycle management by orchestrating **Cloudflare Custom Hostnames** (SSL for SaaS). Instead of managing complex ACME clients and private keys directly, DCVaaS acts as the bridge between your users and Cloudflare's edge network.

By simply creating a CNAME record to a fallback origin, customers can secure their custom domains without sharing root DNS API credentials. This project provides the multi-tenant control plane, billing, and team management UI, while Cloudflare handles the cryptographic heavy lifting.

### Why DCVaaS?

Certificate lifetimes are shrinking:
- **2020**: 398 days
- **2024**: 90 days  
- **2029**: 47 days (proposed)

Manual renewals become impossible at scale. DCVaaS provides:

- **☁️ Cloudflare Powered**: Leverages enterprise-grade SSL for SaaS for issuance and termination.
- **🔒 Secure Architecture**: No private keys are ever generated, stored, or handled by this application.
- **🔄 Zero-Touch Renewals**: Cloudflare automatically handles renewals at the edge.
- **🌐 Universal Compatibility**: Works with any DNS provider via a simple CNAME target.

## Features

### Core Functionality
- ✅ **Custom Hostname Orchestration**: API-driven creation and management of Cloudflare Custom Hostnames.
- ✅ **Delegated Validation**: Users verify ownership by CNAMEing to your SaaS fallback origin.
- ✅ **Real-time Status**: Sync validation and issuance status from Cloudflare to the user dashboard.
- ✅ **Automated Renewals**: Native handling by Cloudflare; app monitors status for reporting.
- ✅ **Job Queue**: Async processing for status synchronization and error handling.
- ✅ **Audit Logging**: Immutable audit trail for compliance and forensics.
- ✅ **Email Notifications**: Transactional emails via Resend for certificate lifecycle events.

### SaaS Features
- ✅ **Multi-Tenancy**: Organizations with team management and RBAC.
- ✅ **Tiered Pricing**: Free (3 domains) / Pro (15 domains + API) / Agency (50+ domains + white-label).
- ✅ **API Tokens**: Create scoped tokens for programmatic access (Pro+).
- ✅ **White-Label Branding**: Custom logo and colors (Agency).
- ✅ **GitHub Authentication**: Sign in with GitHub account.

### Developer Experience
- ✅ **Comprehensive Documentation**: Built-in docs with quickstart, API reference, architecture.
- ✅ **Admin Panel**: Demo mode, cron simulation, environment variable status.
- ✅ **OpenAPI Spec**: RESTful API design implemented in Cloudflare Workers (Hono).
- ✅ **Responsive UI**: Mobile-first design with clean, accessible components.

## Getting Started

### Prerequisites
- Modern browser
- GitHub account (for authentication)
- Cloudflare Account (Enterprise or SaaS enabled) with `SSL for SaaS` active.

### Running Locally

This is a Spark application—simply open in your browser:

```bash
npm install
npm run dev
````

Visit `http://localhost:5173` and sign in with GitHub.

### Quick Demo

1.  **Sign In**: Click "Sign In with GitHub"
2.  **Create Organization**: Settings → Create Organization
3.  **Add Domain**: Dashboard → Add Domain → Enter `app.client-domain.com`
4.  **Copy CNAME**: Copy the generated target (e.g., `dcv.pcnaid.com`)
5.  **DNS Setup**: User creates CNAME `app.client-domain.com` -\> `dcv.pcnaid.com`
6.  **Verify**: Click "Check DNS". The app syncs with Cloudflare to confirm the hostname is `Active`.

## Security

### Architecture

  - **No Private Keys**: Unlike traditional ACME clients, this app **does not** generate or store TLS private keys. They exist solely on Cloudflare's edge.
  - **Token Encryption**: OAuth tokens (if used) are encrypted with AES-GCM before storage.
  - **Scoped API Access**: Backend uses scoped Cloudflare API tokens restricted to specific zones and SSL for SaaS operations.

### CNAME Delegation

  - **Scoped Authority**: Validation is delegated via CNAME, ensuring customers never share root DNS credentials.
  - **SaaS Fallback**: Traffic and validation requests are routed securely to your defined fallback origin.

## Pricing

| Plan | Domains | API | Team | White-Label | Support | Price |
|------|---------|-----|------|-------------|---------|-------|
| **Free** | 3 | ✗ | ✗ | ✗ | Community | $0 |
| **Pro** | 15 | ✓ | ✗ | ✗ | Email | $29/mo |
| **Agency** | 50+ | ✓ | ✓ | ✓ | Priority | $99/mo |

See [`docs/PRICING.md`](https://www.google.com/search?q=docs/PRICING.md) for detailed feature matrix.

## Email Notifications

DCVaaS sends automated email notifications for important events:

- 🎉 **Certificate Issued**: When a domain's SSL/TLS certificate becomes active
- ⏰ **Certificate Expiring**: 7-day warning before expiration
- ❌ **Job Failed**: Admin notifications when background jobs fail

All emails are sent asynchronously via [Resend](https://resend.com) using Cloudflare Queues.

**Setup**: See [`docs/EMAIL_SETUP.md`](docs/EMAIL_SETUP.md) for configuration instructions.

## License

MIT License - see [LICENSE](https://www.google.com/search?q=LICENSE) file

-----

**Built with ❤️ using GitHub Spark**

```
```