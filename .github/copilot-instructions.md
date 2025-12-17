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
  1. User adds domain -> API creates in CF (initial status: `pending_cname`).
  2. Cron finds non-active domains -> Pushes to Queue.
  3. Consumer checks CF API -> Updates D1 status (`active`, `issuing`, `error`, etc.).
- **Frontend Data**: Always use `src/lib/data.ts` for data fetching. Do not fetch directly in components unless necessary.
- **Routing**: API routes are defined in `workers/api/src/index.ts`.

## Developer Workflows

### Local Development
- **Frontend**: `npm run dev` runs the frontend development server on http://localhost:5173
- **Backend Workers**: Use `wrangler dev` in individual worker directories (`workers/api`, `workers/consumer`, `workers/cron`)
- **Prerequisites**: Ensure you have Node.js installed and run `npm install` before starting

### Building & Testing
- **Build Frontend**: `npm run build` - Runs `tsc -b --noCheck && vite build`
  - `tsc -b --noCheck`: Builds TypeScript project without type checking (for speed)
  - `vite build`: Bundles the app to `dist/`
- **Lint**: `npm run lint` - Runs ESLint on the codebase (ESLint is installed as a devDependency)
- **Type Checking**: For explicit type checking, run `tsc --noEmit` (tsconfig.json has `noEmit: true`)
- **No Tests**: This repository currently does not have a test suite configured

### Deployment
- **Frontend**: Deploy with `npx wrangler deploy` from the root (deploys `wrangler.toml` with the SPA)
- **API Worker**: `cd workers/api && npx wrangler deploy`
- **Consumer Worker**: `cd workers/consumer && npx wrangler deploy`
- **Cron Worker**: `cd workers/cron && npx wrangler deploy`
- **Secrets**: Use `wrangler secret put <SECRET_NAME>` to set environment secrets

### Database Migrations
- Migrations are in `workers/api/migrations/`
- Apply migrations: `wrangler d1 execute dcvaas-db --remote --file=workers/api/migrations/<migration-file>.sql`
- Create new migration: Add a new `.sql` file with a descriptive name and incremental number

## Working with Workers

### API Worker (`workers/api`)
- **Framework**: Hono (lightweight web framework)
- **Entry Point**: `src/index.ts`
- **Key Libraries**:
  - `src/lib/cloudflare.ts`: Cloudflare API client functions
  - `src/lib/domains.ts`: Domain management logic
  - `src/lib/jobs.ts`: Job queue helpers
  - `src/lib/audit.ts`: Audit logging
  - `src/lib/http.ts`: HTTP utilities
- **Middleware**: `src/middleware/auth.ts` handles authentication
- **Environment**: Defined in `src/env.d.ts`
- **Routes**: All routes are defined in `src/index.ts`

### Consumer Worker (`workers/consumer`)
- **Purpose**: Processes background jobs from the queue
- **Entry Point**: `src/index.ts`
- **Handlers**: `src/handlers/sync-status.ts` is the main job handler
- **Queue**: Consumes from `dcvaas-jobs` queue (max batch size: 10)

### Cron Worker (`workers/cron`)
- **Purpose**: Scheduled tasks that trigger status syncs
- **Entry Point**: `src/index.ts`
- **Schedule**: Runs every 5 minutes (`*/5 * * * *`)
- **Action**: Queries D1 for pending/issuing domains and queues sync jobs

## Frontend Patterns

### Component Structure
- **Pages**: Located in `src/pages/`. Each page is a top-level route component.
- **UI Components**: Shadcn UI components in `src/components/ui/`
- **Custom Components**: Domain-specific components in `src/components/`
  - `StatusBadge.tsx`: Displays domain status with appropriate styling
  - `DNSRecordDisplay.tsx`: Shows DNS instructions in monospace with copy functionality
  - `CopyButton.tsx`: Reusable copy-to-clipboard button
  - `AppShell.tsx`: Main layout wrapper

### Data Fetching
- **Always** use functions from `src/lib/data.ts` for API calls
- Do not fetch directly in components unless absolutely necessary
- The data layer abstracts the API endpoint structure

### Styling
- **Tailwind CSS**: Use utility classes for styling
- **Design System**: Follow the PRD.md color palette and typography guidelines
- **Responsive**: Mobile-first approach, test on different screen sizes
- **Animations**: Use Framer Motion for complex animations, CSS transitions for simple ones

### State Management
- **Auth Context**: `src/contexts/AuthContext.tsx` manages authentication state
- **Local State**: Use React hooks (useState, useEffect) for component state
- **No Global State Library**: React context is sufficient for this app

## Database Schema

### Key Tables
- **organizations**: Stores org data, subscription tier, and white-label theme
- **organization_members**: Junction table for user-org relationships with roles
- **domains**: Core table with Cloudflare integration fields:
  - `cf_custom_hostname_id`: Cloudflare resource ID
  - `cf_status`: Cloudflare status (`pending`, `active`, `moved`, `blocked`)
  - `cf_ssl_status`: SSL status (`initializing`, `pending_validation`, `active`)
  - `cf_verification_errors`: JSON array of validation errors
- **jobs**: Background job tracking
- **audit_logs**: Immutable audit trail

### Indexes
- `idx_domains_org`: Speed up org domain queries
- `idx_domains_expires`: Find expiring certificates
- `idx_jobs_domain`: Track jobs by domain
- `idx_jobs_status`: Query jobs by status

## Security Considerations

### Authentication
- GitHub OAuth for user authentication
- API tokens (hashed with SHA-256) for programmatic access
- Never expose Cloudflare API tokens to the frontend

### Secrets Management
- `CLOUDFLARE_API_TOKEN`: Must have SSL for SaaS permissions, scoped to the specific zone
- `CLOUDFLARE_ZONE_ID`: The zone where custom hostnames are created
- Store secrets using `wrangler secret put`, never commit them to git

### Key Security Principles
- **No Private Keys**: This app never generates or stores TLS private keys (Cloudflare manages them)
- **Scoped Permissions**: Cloudflare API tokens should have minimal required permissions
- **Input Validation**: Always validate domain names and user input
- **CORS**: Configured in API worker via `CORS_ALLOW_ORIGINS` environment variable

## Status Sync Loop Details

This is the core async processing pattern in DCVaaS:

1. **User adds domain** → API Worker creates Custom Hostname in Cloudflare → Saves `cf_custom_hostname_id` to D1 with status `pending_cname`
2. **Cron Worker** (every 5 min) → Queries D1 for domains where `status != 'active'` → Sends job to Queue
3. **Consumer Worker** → Receives job → Calls Cloudflare API → Maps CF status to internal status → Updates D1
4. **Frontend** → Polls or user clicks "Refresh" → Sees updated status

### Status Mapping
- Cloudflare `active` + SSL `active` → DCVaaS `active`
- Cloudflare `pending_validation` → DCVaaS `issuing`
- SSL `validation_failed` → DCVaaS `error` (with error details)
- Initial state → DCVaaS `pending_cname`

## Common Tasks

### Adding a New API Endpoint
1. Add route handler in `workers/api/src/index.ts`
2. Implement business logic in appropriate `src/lib/*.ts` file
3. Update `src/lib/data.ts` in frontend to call the new endpoint
4. Add audit logging if state changes

### Adding a New Job Type
1. Add job handler in `workers/consumer/src/handlers/`
2. Update job type in `workers/consumer/src/lib/types.ts`
3. Add job dispatch logic in API worker or cron worker
4. Update queue message routing in `workers/consumer/src/index.ts`

### Adding a New Page
1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/AppShell.tsx` if needed
4. Implement data fetching using `src/lib/data.ts`

### Database Schema Changes
1. Create new migration file: `workers/api/migrations/<number>_<description>.sql`
2. Test locally: `wrangler d1 execute dcvaas-db --local --file=<migration-file>`
3. Apply to production: `wrangler d1 execute dcvaas-db --remote --file=<migration-file>`
4. Update TypeScript types in relevant `types.ts` files

## Error Handling Patterns

### Frontend
- Use try/catch blocks for async operations
- Display user-friendly error messages using toast notifications (sonner)
- Log errors to console for debugging
- Use `ErrorFallback.tsx` for component-level error boundaries

### Backend Workers
- Return appropriate HTTP status codes (400 for bad requests, 500 for server errors)
- Include error messages in response body
- Log errors for debugging (console.error)
- Store validation errors in `cf_verification_errors` for display to users

## Environment Variables

### API Worker
- `SAAS_CNAME_TARGET`: The fallback origin domain (e.g., `dcv.pcnaid.com`)
- `CLOUDFLARE_ZONE_ID`: Your Cloudflare zone ID
- `CLOUDFLARE_API_TOKEN`: Secret - SSL for SaaS API token
- `CORS_ALLOW_ORIGINS`: Comma-separated list of allowed origins

### Consumer Worker
- `CLOUDFLARE_ZONE_ID`: Your Cloudflare zone ID
- `CLOUDFLARE_API_TOKEN`: Secret - SSL for SaaS API token

### Cron Worker
- No secrets needed - uses D1 database binding

## Code Style & Conventions

### TypeScript
- Use strict mode
- Define types for all function parameters and return values
- Avoid `any` types
- Use interfaces for object shapes

### Naming Conventions
- **Files**: kebab-case for regular files, PascalCase for React components
- **Functions**: camelCase
- **Components**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase

### React Conventions
- Functional components only (no class components)
- Use hooks for state and effects
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks

## Tech Stack
- **Languages**: TypeScript (Strict mode)
- **Frontend**: React 19, Vite, Tailwind CSS 4, Shadcn UI
- **Backend**: Hono (for Workers), Cloudflare Workers Runtime
- **Database**: Cloudflare D1 (SQLite)
- **Infrastructure**: Cloudflare Workers, D1, Queues, SSL for SaaS
- **Icons**: Phosphor Icons (`@phosphor-icons/react`)
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: date-fns

## Additional Resources
- **PRD**: See `PRD.md` for product requirements and design specifications
- **Architecture**: See `docs/ARCHITECTURE.md` for detailed architecture overview
- **Security**: See `docs/SECURITY.md` for security architecture details
- **Agent Tasks**: See `AGENTS.md` for implementation task breakdowns
