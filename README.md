# DCVaaS – Delegated DCV-as-a-Service

> **A SaaS control plane for automated SSL/TLS certificate issuance and renewal via delegated DNS-01 validation**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

DCVaaS automates wildcard SSL/TLS certificate lifecycle management using delegated Domain Control Validation (DCV). By creating a simple CNAME record, customers can securely automate ACME DNS-01 challenges without exposing root DNS API credentials. This is the control plane UI—production certificate issuance runs in Cloudflare Workers.

### Why DCVaaS?

Certificate lifetimes are shrinking:
- **2020**: 398 days
- **2024**: 90 days  
- **2029**: 47 days (proposed)

Manual renewals become impossible at scale. DCVaaS provides:

- **🔒 Security**: No root DNS keys on customer servers—CNAME delegation isolates validation authority
- **🔄 Zero-Touch Renewals**: Automatic renewal 30 days before expiration with retry/DLQ
- **🌐 Universal Compatibility**: Works with any DNS provider via simple CNAME
- **⚡ Premium Features**: Single-click OAuth setup for Cloudflare/GoDaddy (Agency tier)

## Features

### Core Functionality
- ✅ **Domain Management**: Add domains, generate unique CNAME targets, track status
- ✅ **DNS Validation**: DoH-based CNAME verification (Cloudflare DNS-over-HTTPS)
- ✅ **Certificate Issuance** (stubbed): Simulates ACME flow with TXT challenge generation
- ✅ **Automated Renewals**: Daily cron simulation queues expiring certificates
- ✅ **Job Queue**: View background jobs with retry attempts and dead-letter queue
- ✅ **Audit Logging**: Immutable audit trail for compliance and forensics

### SaaS Features
- ✅ **Multi-Tenancy**: Organizations with team management and RBAC
- ✅ **Tiered Pricing**: Free (3 domains) / Pro (15 domains + API) / Agency (50+ domains + white-label)
- ✅ **API Tokens**: Create scoped tokens for programmatic access (Pro+)
- ✅ **White-Label Branding**: Custom logo and colors (Agency)
- ✅ **GitHub Authentication**: Sign in with GitHub account

### Developer Experience
- ✅ **Comprehensive Documentation**: Built-in docs with quickstart, API reference, architecture
- ✅ **Admin Panel**: Demo mode, cron simulation, environment variable status
- ✅ **OpenAPI Spec**: RESTful API design ready for Worker implementation
- ✅ **Responsive UI**: Mobile-first design with clean, accessible components

## Getting Started

### Prerequisites
- Modern browser
- GitHub account (for authentication)

### Running Locally

This is a Spark application—simply open in your browser:

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` and sign in with GitHub.

### Quick Demo

1. **Sign In**: Click "Sign In with GitHub"
2. **Create Organization**: Settings → Create Organization
3. **Add Domain**: Dashboard → Add Domain → Enter `example.com`
4. **Copy CNAME**: Copy the generated CNAME instruction
5. **Simulate DNS Check**: Click "Check DNS Now" (will fail without real DNS)
6. **Start Issuance**: After DNS verification, click "Start Issuance"
7. **Simulate Verify**: Click "Simulate CA Verify" to complete the demo flow

## Security

### Token Storage
- **OAuth Tokens**: Encrypted with AES-GCM before storage
- **API Tokens**: Stored as SHA-256 hashes
- **Production**: Encryption keys in Cloudflare Secret Store, decryption in Workers only

### CNAME Delegation Security
- **Scoped Authority**: `_acme-challenge` subdomain only—no root DNS access
- **Unique Targets**: One CNAME target per domain (non-reusable)
- **No Secrets**: CNAME records are public (by DNS design)—no sensitive data exposed

## Pricing

| Plan | Domains | API | Team | White-Label | Support | Price |
|------|---------|-----|------|-------------|---------|-------|
| **Free** | 3 | ✗ | ✗ | ✗ | Community | $0 |
| **Pro** | 15 | ✓ | ✗ | ✗ | Email | $29/mo |
| **Agency** | 50+ | ✓ | ✓ | ✓ | Priority | $99/mo |

See [`docs/PRICING.md`](docs/PRICING.md) for detailed feature matrix.

## License

MIT License - see [LICENSE](LICENSE) file

---

**Built with ❤️ using GitHub Spark**
