````markdown
# DCVaaS – Multi-Brand SSL/TLS Certificate Automation Platform

> **A SaaS control plane for automated SSL/TLS certificate issuance and renewal via Cloudflare for SaaS (Custom Hostnames)**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 🌐 Multi-Brand Architecture

DCVaaS is implemented as a **multi-brand, multi-tenant platform** supporting three distinct brands on shared infrastructure:

- **AutoCertify** (`autocertify.net`, `wizard.autocertify.net`) - SMB-focused SSL fix platform
- **DelegatedSSL** (`delegatedssl.com`, `portal.delegatedssl.com`) - Agency/MSP certificate dashboard
- **KeylessSSL** (`keylessssl.dev`, `app.keylessssl.dev`) - Developer ACME automation API

Each brand has unique:
- 🎨 **Visual theme** (CSS custom properties)
- 📝 **Microcopy and messaging**
- 🏗️ **Layout and information architecture**
- 🔍 **SEO isolation** (separate robots.txt, sitemap.xml, canonical URLs)
- 🚫 **noindex app subdomains** (app.*, wizard.*, portal.*)

**For complete multi-brand implementation details, see [MULTI_BRAND_GUIDE.md](./MULTI_BRAND_GUIDE.md).**

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

This is a React application—simply open in your browser:

```bash
npm install
npm run dev
````

Visit `http://localhost:5173` and sign in with GitHub.

## Deployment

The `dcvaas-api`, `dcvaas-cron`, `dcvaas-consumer`, and `dcvaas-dlq` Workers, plus `dcvaas-frontend`, deploy from the **Startups** Cloudflare account (`fc84e278ed073c8a37e8e2c6990cdb66`). All four backend Workers share the `dcvaas-db` D1 database with ID `ee1c72f2-0fe3-4d38-8cb8-8c749be9b9f9`.

The staging endpoints are `https://dcvaas-frontend.broker-fc8.workers.dev` and `https://dcvaas-api.broker-fc8.workers.dev`. Build the staging frontend with `VITE_API_BASE_URL=https://dcvaas-api.broker-fc8.workers.dev`; `.env.example` records this build value. If the variable is omitted, the frontend keeps its `https://dcv.pcnaid.com` production fallback.

At the `pcnaid.com` zone cutover, replace the documented old zone ID in `workers/api/wrangler.toml`, rebuild the frontend with `VITE_API_BASE_URL=https://dcv.pcnaid.com` (or omit it to use the fallback), and remove the workers.dev frontend origin from both API `CORS_ALLOW_ORIGINS` blocks after custom-domain traffic is live. Then deploy the frontend and API custom-domain configurations with `wrangler deploy --env production` from the repository root and from `workers/api`.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for bindings, zone staging, and required secret names.

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

**Built with ❤️ for automated SSL/TLS management**

```
```
