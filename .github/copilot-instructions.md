# DCVaaS Copilot Instructions

## Project Overview
DCVaaS is a SaaS control plane for managing SSL/TLS certificates via **Cloudflare for SaaS (Custom Hostnames)**. It orchestrates Cloudflare's edge network rather than handling ACME challenges directly.

## Architecture & Components
- **Frontend**: React (Vite) + Tailwind + Shadcn UI. Located in `src/`.
  - Data Layer: `src/lib/data.ts` abstracts API calls.
  - Auth: `src/contexts/AuthContext.tsx`.
- **Backend**: Cloudflare Workers (Monorepo-style in `workers/`).
  - **API Worker** (`workers/api`): Hono-based REST API. Handles CRUD and Cloudflare API proxying.
  - **Consumer Worker** (`workers/consumer`): Background job processor (Cloudflare Queues). Syncs status from Cloudflare to D1.
  - **Cron Worker** (`workers/cron`): Scheduled task. Polls pending domains in D1 and queues sync jobs.
- **Database**: Cloudflare D1 (SQLite). Schema in `workers/api/schema.sql`.
- **Infrastructure**: Cloudflare Queues for async processing.

## Key Patterns & Conventions
- **"Buy" Strategy**: Do NOT implement custom ACME clients or key generation. Use `workers/api/src/lib/cloudflare.ts` to interact with Cloudflare's Custom Hostname API.
- **Status Sync Loop**:
  1. User adds domain -> API creates in CF (status: `pending`).
  2. Cron finds pending domains -> Pushes to Queue.
  3. Consumer checks CF API -> Updates D1 status (`active`, `moved`, `error`).
- **Frontend Data**: Always use `src/lib/data.ts` for data fetching. Do not fetch directly in components unless necessary.
- **Routing**: API routes are defined in `workers/api/src/index.ts`.

## Developer Workflows
- **Deployment**: Use `npx wrangler deploy` in specific worker directories.
- **Local Dev**: `npm run dev` runs the frontend. Workers are typically tested via `wrangler dev`.
- **Database**: D1 migrations are in `workers/api/migrations/`.

## Tech Stack
- **Languages**: TypeScript (Strict).
- **Frameworks**: React 18, Hono (Workers).
- **Cloud**: Cloudflare Workers, D1, Queues, SSL for SaaS.
