# DCVaaS Architecture

## Overview
DCVaaS is a distributed SaaS control plane designed to automate SSL/TLS certificate issuance for custom domains. 

**Architectural Shift:** Moving from a "Build" strategy (custom ACME client) to a "Buy" strategy, DCVaaS now leverages **Cloudflare for SaaS** as the underlying certificate engine. The DCVaaS application acts as the orchestrator and user interface, managing tenant data and billing, while offloading the complexity of cryptographic challenges, key storage, and certificate renewal to Cloudflare's edge network.

## System Diagram

### 1. Domain Onboarding
1.  **User Action:** User adds a custom domain (e.g., `app.client.com`) via the Dashboard.
2.  **API Worker:** * Validates plan limits (Free/Pro/Agency).
    * Calls Cloudflare API (`POST /zones/:zone_id/custom_hostnames`) to register the domain.
    * Stores the returned `cf_hostname_id` and initial status (`pending`) in the D1 database.
3.  **UI Feedback:** Returns the required **CNAME target** (the SaaS Fallback Origin: `dcv.pcnaid.com`) to the user.

### 2. Verification & Issuance (Delegated)
1.  **User Action:** User creates a CNAME record in their DNS: `app.client.com` -> `dcv.pcnaid.com`.
2.  **Cloudflare Edge:** Cloudflare automatically detects the CNAME placement and initiates Domain Control Validation (DCV) internally (HTTP-01 or DNS-01 via the fallback).
3.  **Issuance:** Once validated, Cloudflare issues the certificate and deploys it to the edge globally.

### 3. Status Synchronization (The "Sync" Loop)
1.  **Cron Worker:** Runs periodically (e.g., every 5 minutes). Queries D1 for domains where `status != 'active'`.
2.  **Queue System:** Batches these domains and sends messages to the Cloudflare Queue.
3.  **Consumer Worker:** * Consumes messages.
    * Polls the Cloudflare API (`GET /custom_hostnames/:id`) for the current status.
    * **Transition:** If Cloudflare reports `active`, the Worker updates the D1 database status to `active`.
    * **Error Handling:** If verification fails (e.g., `invalid_cname`), captures the error message from Cloudflare and updates the D1 record for user display.

## D1 Database Schema

The schema relies on `users`, `organizations`, and `domains`.

### Key Tables
* **`organizations`**: Stores subscription tier (Free/Pro/Agency) and Stripe Customer IDs.
* **`domains`**:
    * `id`: UUID
    * `org_id`: Foreign Key
    * `domain_name`: String (e.g., `app.client.com`)
    * `cf_hostname_id`: **(New)** Stores the Cloudflare Resource ID.
    * `cf_status`: **(New)** Maps to Cloudflare statuses (`pending`, `active`, `moved`, `blocked`).
    * `verification_errors`: Text/JSON storage for feedback from the Sync worker.
    * *(Removed)*: `private_key`, `csr`, `challenges_blob` (No longer needed as CF manages keys).

## Worker Structure

### 1. API Worker (`workers/api`)
* **Framework:** Hono
* **Responsibility:** REST API, Authentication, Billing Webhooks (Stripe), and Cloudflare API Proxy.
* **Endpoints:**
    * `POST /domains`: Registers hostname with Cloudflare.
    * `GET /domains/:id`: Returns status and CNAME instructions.
    * `DELETE /domains/:id`: Offboards hostname from Cloudflare.

### 2. Consumer Worker (`workers/consumer`)
* **Responsibility:** Background processing for state synchronization.
* **Handlers:**
    * `sync-status.ts`: Checks Cloudflare API for certificate progression.
    * `dns-check.ts`: Lightweight CNAME lookup helper for the UI (optional "Check Now" button).

### 3. Cron Worker (`workers/cron`)
* **Responsibility:** Scheduler.
* **Schedule:** Triggers the status sync loop to ensure the Dashboard reflects the real-time state of the Cloudflare network.

## Security Architecture

### 1. Authentication
* **User Auth:** Handled via GitHub OAuth / App Session.
* **API Tokens:** Hashed SHA-256 tokens stored in D1 for programmatic access by tenants.

### 2. Secrets Management
* **Cloudflare Credentials:** `CLOUDFLARE_API_TOKEN` is stored in Wrangler Secrets (encrypted). It is scoped strictly to **SSL for SaaS** permissions for the specific Zone ID.
* **No Private Keys:** The application **does not** handle or store TLS private keys. These are generated and stored securely within Cloudflare's infrastructure, significantly reducing the application's attack surface.

## Deployment & Infrastructure

* **Runtime:** Cloudflare Workers (Serverless).
* **Database:** Cloudflare D1 (SQLite at the Edge).
* **Queues:** Cloudflare Queues (for decoupling the Cron trigger from API polling).
* **Global Fallback:** A dedicated Fallback Origin is configured in the Cloudflare Dashboard to route traffic for all custom hostnames.

## Scalability & Limits
* **Certificate Limit:** Soft limit based on Cloudflare plan (default 100 free).
* **Billing:** Application logic gates creation of new domains based on the user's Stripe subscription status (Free: 3 domains, Pro: 15, Agency: 50+).