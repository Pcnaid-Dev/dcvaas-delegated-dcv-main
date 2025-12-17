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
- **Frontend Libraries**: 
  - `src/lib/data.ts`: API client functions (used as React Query query/mutation functions)
  - `src/lib/auth-client.ts`: Authentication client utilities
  - `src/lib/crypto.ts`: Client-side crypto utilities (ID generation)
  - `src/lib/dns.ts`: DNS-related utilities
  - `src/lib/utils.ts`: General utility functions (cn, date formatting)
  - `src/lib/stripe-constants.ts`: Stripe/billing constants

## Developer Workflows

### Local Development
- **Frontend**: `npm run dev` runs the frontend development server on http://localhost:5173
- **Backend Workers**: Use `wrangler dev` in individual worker directories (`workers/api`, `workers/consumer`, `workers/cron`)
- **Prerequisites**: Ensure you have Node.js installed and run `npm install` before starting

### Building & Testing
- **Build Frontend**: `npm run build` - Runs `tsc -b --noCheck && vite build`
  - `tsc -b --noCheck`: Performs incremental build without full type checking for faster builds
  - `vite build`: Bundles the app to `dist/`.
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
- Latest migration: `0006_performance_indexes.sql` (adds performance indexes for common queries)
- Apply migrations: `wrangler d1 execute dcvaas-db --remote --file=workers/api/migrations/<migration-file>.sql`
- Test locally: `wrangler d1 execute dcvaas-db --local --file=workers/api/migrations/<migration-file>.sql`
- Create new migration: Add a new `.sql` file with format `000X_description.sql` with incremental number

## Working with Workers

### API Worker (`workers/api`)
- **Framework**: Hono (lightweight web framework)
- **Entry Point**: `src/index.ts`
- **Key Libraries**:
  - `src/lib/cloudflare.ts`: Cloudflare API client functions with retry logic
  - `src/lib/domains.ts`: Domain management logic with pagination support
  - `src/lib/jobs.ts`: Job queue helpers
  - `src/lib/audit.ts`: Audit logging
  - `src/lib/http.ts`: HTTP utilities including ETag generation and JSON helpers
  - `src/lib/crypto.ts`: Cryptographic utilities (hashing, encryption)
  - `src/lib/members.ts`: Organization member management
  - `src/lib/types.ts`: Shared TypeScript types
  - `src/lib/stripe-constants.ts`: Stripe/billing constants
- **Routes**:
  - `src/routes/billing.ts`: Billing and subscription endpoints
  - Main routes in `src/index.ts` (domains, jobs, audit logs, API tokens, etc.)
- **Middleware**: `src/middleware/auth.ts` handles authentication and authorization
- **Environment**: Defined in `src/env.d.ts` and `src/env.ts`

### Consumer Worker (`workers/consumer`)
- **Purpose**: Processes background jobs from the queue in parallel
- **Entry Point**: `src/index.ts`
- **Handlers**: `src/handlers/sync-status.ts` is the main job handler for domain status synchronization
- **Queue**: Consumes from `dcvaas-jobs` queue (max batch size: 10)
- **Processing**: Uses `Promise.allSettled()` for parallel message processing
- **Error Handling**: Logs failures without blocking successful message processing

### Cron Worker (`workers/cron`)
- **Purpose**: Scheduled tasks that trigger status syncs for pending domains
- **Entry Point**: `src/index.ts`
- **Schedule**: Runs every 5 minutes (`*/5 * * * *`)
- **Action**: 
  - Queries D1 for domains with status `pending_cname` or `issuing`
  - Limits to 100 domains per run (BATCH_SIZE constant)
  - Orders by `updated_at ASC` to prioritize stale domains
  - Uses `sendBatch()` for efficient queue message delivery
- **Optimization**: Batch operations improve performance by 80% vs sequential processing

## Frontend Patterns

### Component Structure
- **Pages**: Located in `src/pages/`. Each page is a top-level route component.
  - Core pages: `DashboardPage`, `DomainDetailPage`, `LandingPage`, `PricingPage`, `DocsPage`
  - Management pages: `TeamPage`, `BillingPage`, `SettingsPage`, `AdminPage`
  - Advanced pages: `APITokensPage`, `WebhooksPage`, `JobsPage`, `AuditLogsPage`
- **UI Components**: Shadcn UI components in `src/components/ui/`
- **Custom Components**: Domain-specific components in `src/components/`
  - `StatusBadge.tsx`: Displays domain status with appropriate styling
  - `DNSRecordDisplay.tsx`: Shows DNS instructions in monospace with copy functionality
  - `CopyButton.tsx`: Reusable copy-to-clipboard button
  - `AppShell.tsx`: Main layout wrapper
  - `ThemeProvider.tsx`: Theme context provider

### Data Fetching with React Query
- **Always** use React Query (`@tanstack/react-query`) for data fetching
- **Cache Configuration**: Configured in `src/App.tsx` with:
  - `staleTime: 10000` (10 seconds) - data considered fresh for 10s
  - `gcTime: 5 * 60 * 1000` (5 minutes) - cache garbage collection
  - `refetchOnWindowFocus: false` - avoid unnecessary refetches
  - `retry: 1` - single retry on failure
- **Query Pattern**: Use `useQuery` for data fetching:
  ```typescript
  const { data: domains = [] } = useQuery({
    queryKey: ['domains', currentOrg?.id],
    queryFn: () => getOrgDomains(currentOrg!.id),
    enabled: !!currentOrg,
    staleTime: 10000,
  });
  ```
- **Mutation Pattern**: Use `useMutation` for data modifications:
  ```typescript
  const addDomainMutation = useMutation({
    mutationFn: createDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
  });
  ```
- **Data Layer**: Functions from `src/lib/data.ts` are used as query/mutation functions
- **Cache Invalidation**: Use `queryClient.invalidateQueries()` after mutations to update cached data
- **Benefits**: Eliminates redundant API calls, provides instant navigation, reduces server load by 60-80%

### Performance Optimization
- **Memoization**: Use `useMemo` for expensive computations:
  - Filter/search operations on large arrays
  - Building lookup maps (O(1) access instead of O(n))
  - Derived data that depends on specific dependencies
  - Example: `const domainMap = useMemo(() => new Map(domains.map(d => [d.id, d.domainName])), [domains]);`
- **When to Memoize**:
  - Filtering or searching large datasets
  - Building Maps or Sets for lookups
  - Complex calculations that run on every render
  - Data transformations with stable dependencies
- **Avoid**: Over-memoization of simple operations (adds overhead)

### Styling
- **Tailwind CSS**: Use utility classes for styling
- **Design System**: Follow the PRD.md color palette and typography guidelines
- **Responsive**: Mobile-first approach, test on different screen sizes
- **Animations**: Use Framer Motion for complex animations, CSS transitions for simple ones

### State Management
- **Auth Context**: `src/contexts/AuthContext.tsx` manages authentication state
- **React Query**: Manages server state and caching (domains, jobs, audit logs, etc.)
- **Local State**: Use React hooks (useState, useEffect) for component-level UI state
- **No Global State Library**: React context + React Query is sufficient for this app

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

### Indexes (from 0006_performance_indexes.sql)
- `idx_domains_status`: Filter domains by status (used by cron worker)
- `idx_domains_org_status`: Filter domains by org_id and status together
- `idx_domains_cf_hostname`: Cloudflare custom hostname lookups
- `idx_jobs_status_created`: Query jobs by status and created_at (for queue processing)
- `idx_jobs_domain_status`: Track jobs by domain_id and status
- `idx_audit_org_created`: Audit logs by org_id and created_at (for audit log pages)
- `idx_api_tokens_org`: API tokens by organization
- `idx_domains_updated`: Efficient sorting by updated_at timestamp
- **Legacy indexes**: `idx_domains_org`, `idx_domains_expires`, `idx_jobs_domain`, `idx_jobs_status` (may still exist)

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

## Performance Optimizations

The application implements comprehensive performance optimizations as detailed in `PERFORMANCE_IMPROVEMENTS.md`:

### HTTP Caching
- **ETag Support**: The /api/domains endpoint includes ETags generated with FNV-1a hash...
- **304 Not Modified**: API checks `If-None-Match` header and returns 304 when content unchanged
- **Cache-Control Headers**: `public, max-age=10, stale-while-revalidate=30`
- **Implementation**: `workers/api/src/lib/http.ts` (json helper) and route handlers
- **Impact**: Reduces bandwidth by 70-90% for unchanged data

### Database Performance
- **Pagination**: All list queries support `LIMIT` and `OFFSET` parameters
- **Indexes**: Comprehensive indexes on frequently queried columns (see Database Schema section)
- **Query Optimization**: Use indexed columns in WHERE clauses
- **Batch Operations**: Group related queries when possible

### Worker Optimizations
- **Cron Worker** (`workers/cron/src/index.ts`):
  - Limits batch size to 100 domains per run with `LIMIT` clause
  - Uses `sendBatch()` instead of individual queue sends
  - Orders by `updated_at ASC` to prioritize stale domains
  - Filters: `status IN ('pending_cname', 'issuing')`
- **Consumer Worker** (`workers/consumer/src/index.ts`):
  - Parallel processing with `Promise.allSettled(promises)`
  - Processes up to 10 messages concurrently (queue batch size)
  - Handles partial failures gracefully
  - Logs failures without blocking successful messages
- **API Worker** (`workers/api/src/lib/cloudflare.ts`):
  - Exponential backoff with `fetchWithRetry(url, options, maxRetries = 3)`
  - Rate limit handling: respects `Retry-After` header on 429 responses
  - Separate retry budget for rate limits (max 3 retries)
  - Maximum delay cap: 30 seconds

### Frontend Caching
- **React Query**: Automatic caching with 10s stale time, 5min garbage collection
- **Optimistic Updates**: Mutations invalidate relevant queries automatically
- **Reduced API Calls**: 60-80% reduction in redundant requests
- **Instant Navigation**: Cached data displays immediately on page changes

### Expected Performance Metrics
- Page Load Time: 60-75% faster (2-3s → 0.5-1s)
- API Response Time: 75-90% faster (500-1000ms → 50-200ms)
- Database Query Time: 80-95% faster (100-500ms → 10-50ms)
- Worker Processing: 70-80% faster (5-10s/batch → 1-2s/batch)
- Bandwidth Usage: 70-90% reduction (100KB → 10-30KB per request)

## Status Sync Loop Details

This is the core async processing pattern in DCVaaS:

1. **User adds domain** → API Worker creates Custom Hostname in Cloudflare → Saves `cf_custom_hostname_id` to D1 with status `pending_cname`
2. **Cron Worker** (every 5 min) → Queries D1 for domains where `status` is `pending_cname` or `issuing` → Sends job to Queue
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
1. Create new migration file: `workers/api/migrations/000X_<description>.sql` (next number after 0006)
2. Test locally: `wrangler d1 execute dcvaas-db --local --file=workers/api/migrations/000X_<description>.sql`
3. Apply to production: `wrangler d1 execute dcvaas-db --remote --file=workers/api/migrations/000X_<description>.sql`
4. Update TypeScript types in `workers/api/src/lib/types.ts` and `src/types/index.ts`
5. Consider adding indexes for new frequently-queried columns

### Optimizing Performance
1. Add database indexes for new query patterns
2. Use React Query for new data fetching needs
3. Memoize expensive computations with `useMemo`
4. Implement pagination for new list endpoints
5. Add ETag support for cacheable GET endpoints
6. Use batch operations for queue messages
7. Profile slow queries with EXPLAIN QUERY PLAN

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
- Use exponential backoff with retry logic for external API calls (Cloudflare API)
- Handle rate limits (429 responses) gracefully with `Retry-After` header respect
- Use parallel processing for batch operations (`Promise.allSettled`)
- Implement batch sending for queue messages to improve throughput

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
- **State Management**: React Query (`@tanstack/react-query`) for server state + React Context for auth
- **Backend**: Hono (for Workers), Cloudflare Workers Runtime
- **Database**: Cloudflare D1 (SQLite)
- **Infrastructure**: Cloudflare Workers, D1, Queues, SSL for SaaS
- **Icons**: Phosphor Icons (`@phosphor-icons/react`)
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: date-fns
- **Notifications**: Sonner (toast notifications)

## Best Practices & Anti-Patterns

### Do's ✅
- Use React Query for all data fetching and mutations
- Memoize expensive computations with `useMemo`
- Use indexed database columns in WHERE clauses
- Implement pagination for list endpoints
- Use batch operations for queue messages
- Handle rate limits with exponential backoff
- Invalidate React Query cache after mutations
- Use ETag/304 responses for cacheable endpoints
- Process worker messages in parallel with `Promise.allSettled`

### Don'ts ❌
- Don't fetch data directly in components (use React Query)
- Don't use `useEffect` for data loading (use `useQuery`)
- Don't refetch data manually after mutations (use query invalidation)
- Don't process worker messages sequentially (use parallel processing)
- Don't send queue messages individually (use `sendBatch`)
- Don't ignore rate limits or retry logic for external APIs
- Don't query database without using indexes
- Don't load unbounded result sets (use pagination)

## Monitoring & Debugging

### Performance Monitoring
- Track Core Web Vitals: LCP, FID, CLS
- Monitor API response times (p50, p95, p99)
- Log slow database queries (>100ms)
- Track React Query cache hit rates
- Monitor worker execution times

### Debugging Tips
- Check browser DevTools Network tab for 304 responses
- Use React Query DevTools to inspect cache state
- Review Cloudflare Workers logs for errors
- Check D1 query performance with EXPLAIN QUERY PLAN
- Monitor queue message processing failures

## Additional Resources
- **PRD**: See `PRD.md` for product requirements and design specifications
- **Architecture**: See `docs/ARCHITECTURE.md` for detailed architecture overview
- **Security**: See `docs/SECURITY.md` for security architecture details
- **Agent Tasks**: See `AGENTS.md` for implementation task breakdowns
- **Performance**: See `PERFORMANCE_IMPROVEMENTS.md` for detailed performance optimization documentation
- **Implementation**: See `IMPLEMENTATION_SUMMARY.md` for project implementation history
