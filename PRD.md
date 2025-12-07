# DCVaaS – Delegated DCV-as-a-Service Control Plane

A SaaS control plane that automates wildcard SSL/TLS certificate issuance and renewal via delegated DNS-01 validation with one-time CNAME setup, providing security (no root DNS keys on customer servers), operational reliability, and zero-touch renewals in response to shrinking certificate lifetimes.

**Experience Qualities**:
1. **Enterprise-grade reliability** – Every interaction reinforces trust through clear status indicators, comprehensive audit trails, and transparent error messaging that guides users to resolution
2. **Security-conscious transparency** – The interface makes security choices visible and understandable, from encrypted token storage to delegated validation flows, without overwhelming technical users
3. **Frictionless automation** – Complex certificate lifecycle management becomes a simple one-time CNAME setup followed by invisible renewals, with optional premium features for even easier onboarding

**Complexity Level**: Complex Application (advanced functionality, accounts)
This is a multi-tenant SaaS with organization management, team collaboration with RBAC, OAuth integrations, API token management, webhook systems, job orchestration with retry/DLQ patterns, white-label theming, tiered billing, and comprehensive audit logging. It serves as the control plane for a distributed certificate issuance system.

## Essential Features

### 1. GitHub Authentication & User Management
- **Functionality**: OAuth sign-in with GitHub; user profile with avatar and email
- **Purpose**: Leverage existing developer identity; no password management needed
- **Trigger**: "Sign in with GitHub" button on landing page or app access attempt
- **Progression**: Click sign-in → GitHub OAuth consent → redirect back → auto-create User record → land in org selector or onboarding
- **Success criteria**: User can sign in, see their GitHub avatar, and access their organizations

### 2. Organization & Team Management
- **Functionality**: Create organizations, invite members with roles (Owner/Admin/Member), manage team access
- **Purpose**: Multi-tenant structure allowing teams to collaborate on certificate management
- **Trigger**: Post-authentication onboarding or "Create Organization" from dashboard
- **Progression**: Enter org name → create → invite members by email → assign roles → members accept → appear in team list
- **Success criteria**: Multiple users can collaborate within an org with appropriate permission boundaries

### 3. Domain Onboarding with CNAME Delegation
- **Functionality**: Add domain, generate unique CNAME target, provide copyable DNS instructions, verify CNAME via DoH
- **Purpose**: Delegate DNS-01 validation authority without sharing root DNS credentials
- **Trigger**: "Add Domain" button from dashboard
- **Progression**: Enter domain name → generate cnameTarget → display instruction "_acme-challenge.{domain} CNAME {cnameTarget}" → user creates DNS record → click "Check DNS" → DoH lookup → verify CNAME → update status to issuing
- **Success criteria**: Domain status progresses from pending_cname to issuing after successful DNS verification

### 4. Single-Click CNAME Setup (Premium OAuth Integration)
- **Functionality**: OAuth to Cloudflare/GoDaddy, automatically create CNAME via DNS provider API (stubbed)
- **Purpose**: Premium feature eliminating manual DNS configuration for agency-tier customers
- **Trigger**: "Single-Click Setup with Cloudflare" button during domain add flow
- **Progression**: Click OAuth → provider consent → capture code → exchange for tokens (stub) → encrypt tokens → store OAuthConnection → simulate DNS API call → create CNAME → mark domain issuing
- **Success criteria**: Agency-tier users can complete CNAME setup without touching DNS control panel

### 5. Certificate Issuance Simulation
- **Functionality**: Stub ACME flow: show TXT challenge value, simulate CA verification, mark domain active
- **Purpose**: Demonstrate the production issuance flow that will run in Cloudflare Workers
- **Trigger**: "Start Issuance" button on domain detail when status is issuing
- **Progression**: Click start → create start_issuance Job → display TXT value to publish → click "Simulate CA Verify" → mark succeeded → set expiresAt = now + 90d → update domain to active → log audit event
- **Success criteria**: Domain transitions to active with visible expiration date and audit trail

### 6. Automated Renewal Orchestration
- **Functionality**: Daily cron simulation finding expiring certificates (< 30 days), enqueue renewal jobs, execute with retry/DLQ
- **Purpose**: Zero-touch renewals ensuring certificates never expire
- **Trigger**: Admin "Simulate Daily Cron" or scheduled automatic check (production)
- **Progression**: Cron runs → query domains where expiresAt < 30d → create renewal Job per domain → process queue → on success update expiresAt → on failure retry with backoff → after N failures move to DLQ
- **Success criteria**: Certificates approaching expiration are automatically renewed without user intervention

### 7. Job Queue & Dead Letter Queue Management
- **Functionality**: View all jobs (dns_check, start_issuance, renewal), filter by status, inspect failures, requeue from DLQ
- **Purpose**: Operational visibility into async certificate operations with manual intervention for stuck jobs
- **Trigger**: Navigate to Jobs page, or view DLQ tab in admin
- **Progression**: Job created → status queued → worker picks up → running → succeeded/failed → if failed increment attempts → retry with backoff → after 3 failures → move to DLQ → admin reviews → clicks "Requeue"
- **Success criteria**: Failed jobs surface in DLQ with error details and can be manually requeued

### 8. Comprehensive Audit Logging
- **Functionality**: Append immutable audit records for every domain action, user change, settings modification
- **Purpose**: Compliance, security forensics, and operational transparency
- **Trigger**: Any state-changing operation (domain add, DNS check, issuance, renewal, setting change, team invite)
- **Progression**: User action → persist primary change → append AuditLog(orgId, userId, action, details, timestamp) → display in filterable audit viewer
- **Success criteria**: Every significant action appears in audit log with who/what/when details

### 9. Tiered Pricing with Feature Gating
- **Functionality**: Free (3 domains), Pro (15 domains + API), Agency (50+ domains + team + white-label + single-click)
- **Purpose**: Monetization aligned with customer scale and feature needs
- **Trigger**: Organization creation defaults to Free; upgrade via Billing page
- **Progression**: Create org on Free → hit domain limit → see upsell modal → click "Upgrade to Pro" → Stripe checkout (stubbed) → webhook updates tier → limits increase → premium features unlock
- **Success criteria**: Feature access and limits correctly reflect subscription tier; upgrade flow is clear

### 10. API Token Management & OpenAPI Docs
- **Functionality**: Create/revoke org-scoped API tokens, call REST endpoints for domain/job operations, view OpenAPI spec
- **Purpose**: Programmatic integration for customers automating certificate management
- **Trigger**: Navigate to API Tokens page, click "Create Token"
- **Progression**: Enter token name → click create → generate hashed token → show plaintext once → copy → use in Authorization header → call /api/domains → validate token → execute operation → return JSON → log to audit
- **Success criteria**: Users can create tokens, make authenticated API calls, and see OpenAPI documentation

### 11. Webhook Configuration for Event Notifications
- **Functionality**: Configure webhook endpoints to receive real-time notifications for domain events (certificate lifecycle, DNS operations, job failures)
- **Purpose**: Enable customers to integrate DCVaaS events into their own systems for automation, monitoring, and alerting
- **Trigger**: Navigate to Webhooks page, click "Add Endpoint"
- **Progression**: Enter endpoint URL → select events to subscribe (domain.active, domain.error, domain.expiring_soon, dns.verified, job.failed, etc.) → create endpoint → receive unique signing secret → configure webhook handler → verify signatures → process events
- **Success criteria**: Users can create/delete webhook endpoints, toggle enable/disable, view signing secrets, and receive event payloads with HMAC-SHA256 signatures

### 12. White-Label Agency Portal
- **Functionality**: Upload logo, set brand colors, preview themed interface, configure custom domain (placeholder)
- **Purpose**: Agency tier feature allowing MSPs to brand the platform as their own service
- **Trigger**: Navigate to Settings → White-Label Theme (agency tier only)
- **Progression**: Upload logo → pick primary/secondary colors → click "Preview White-Label" → interface rebrands → login screen shows custom logo → footer shows "Powered by DCVaaS" → configure custom domain for future
- **Success criteria**: Agency customers see fully branded interface with their logo and colors

### 13. Environment Configuration (Admin)
- **Functionality**: Display which environment variables are configured (without exposing values)
- **Purpose**: Operational visibility into external service connections
- **Trigger**: Admin navigates to Environment panel
- **Progression**: View panel → see CLOUDFLARE_API_TOKEN: ✓ Set, STRIPE_PUBLIC_KEY: ✗ Not Set → understand which integrations are active
- **Success criteria**: Admins can audit environment configuration without seeing secret values

## Edge Case Handling

- **DNS propagation delays** – Show "Checking..." state with retry logic; surface "Not found yet" with countdown timer and "Try again" button
- **CNAME conflicts** – Detect if existing CNAME points elsewhere; show warning with resolution steps
- **Expired OAuth tokens** – Catch refresh failures; prompt user to re-authenticate with provider
- **Domain limit reached** – Block domain add with friendly modal showing current usage, limit, and "Upgrade" CTA
- **Duplicate domain names** – Prevent adding same domain twice to an org; show existing domain if attempted
- **Job retry exhaustion** – After 3 failures, move to DLQ and send notification (webhook/email stub)
- **Malformed DNS records** – Validate CNAME format in checker; provide specific error messages
- **Organization with no owner** – Prevent owner removal if they're the last owner; require ownership transfer
- **API token compromise** – Provide revoke-all button and last-used timestamps for token auditing
- **Storage limit approaching** – Monitor record sizes; paginate large collections; show warning if org data > 400kB

## Design Direction

The design should evoke enterprise SaaS confidence with a developer-friendly edge—clean, data-dense dashboards with excellent information hierarchy, consistent status indicators, and security-conscious UI patterns that make complex certificate operations feel approachable and transparent. Minimal interface that focuses on operational clarity over decoration, with purposeful animations for state transitions and premium feel through attention to spacing and typography.

## Color Selection

**Triadic with Security-Focused Accents** – Blue (trust/security), Orange (alerts/action), Green (success/active) creating a professional palette that communicates reliability while maintaining visual interest and clear semantic meaning for certificate states.

- **Primary Color**: Deep security blue `oklch(0.45 0.15 250)` – Communicates trust, security, and enterprise reliability; used for primary actions and navigation
- **Secondary Colors**: 
  - Slate gray `oklch(0.35 0.02 250)` for secondary actions and muted backgrounds
  - Warm orange `oklch(0.65 0.15 45)` for warning states and attention-grabbing CTAs
- **Accent Color**: Vibrant cyan `oklch(0.70 0.14 210)` – Highlights active certificates, success states, and interactive elements
- **Semantic Colors**:
  - Success green `oklch(0.65 0.17 145)` for active certificates and completed operations
  - Warning amber `oklch(0.75 0.15 85)` for approaching expiration
  - Error red `oklch(0.60 0.20 25)` for failed jobs and invalid states
  - Neutral gray `oklch(0.50 0.01 250)` for pending states

**Foreground/Background Pairings**:
- Background (White `oklch(0.99 0 0)`): Foreground dark slate `oklch(0.25 0.02 250)` – Ratio 11.2:1 ✓
- Card (Light gray `oklch(0.97 0.005 250)`): Foreground dark slate `oklch(0.25 0.02 250)` – Ratio 10.5:1 ✓
- Primary (Security blue `oklch(0.45 0.15 250)`): White text `oklch(0.99 0 0)` – Ratio 8.1:1 ✓
- Secondary (Slate gray `oklch(0.35 0.02 250)`): White text `oklch(0.99 0 0)` – Ratio 11.8:1 ✓
- Accent (Vibrant cyan `oklch(0.70 0.14 210)`): Dark slate `oklch(0.25 0.02 250)` – Ratio 5.2:1 ✓
- Muted (Pale gray `oklch(0.95 0.005 250)`): Muted foreground `oklch(0.45 0.02 250)` – Ratio 6.8:1 ✓
- Success (Green `oklch(0.65 0.17 145)`): Dark slate `oklch(0.25 0.02 250)` – Ratio 4.9:1 ✓
- Warning (Amber `oklch(0.75 0.15 85)`): Dark slate `oklch(0.25 0.02 250)` – Ratio 4.6:1 ✓
- Error (Red `oklch(0.60 0.20 25)`): White text `oklch(0.99 0 0)` – Ratio 5.1:1 ✓

## Font Selection

Professional, highly legible typefaces that convey technical precision and enterprise credibility while maintaining modern approachability—Inter for UI elements and data tables, with JetBrains Mono for code snippets and DNS records.

- **Typographic Hierarchy**:
  - H1 (Page Titles): Inter Bold / 32px / -0.02em letter spacing / 1.2 line height
  - H2 (Section Headers): Inter Semibold / 24px / -0.01em / 1.3
  - H3 (Card Headers): Inter Semibold / 18px / -0.01em / 1.4
  - Body (Primary): Inter Regular / 15px / 0em / 1.6
  - Body Small (Secondary): Inter Regular / 14px / 0em / 1.5
  - Caption (Metadata): Inter Medium / 13px / 0em / 1.4
  - Code (DNS, API): JetBrains Mono Regular / 14px / 0em / 1.5
  - Button Text: Inter Semibold / 14px / 0em / 1

## Animations

Animations should reinforce system state changes—especially certificate status transitions—with subtle, purposeful motion that guides attention without delaying workflows. Balance functional feedback (loading states, status updates) with moments of delight (successful issuance, renewal completion) to make complex async operations feel responsive and trustworthy.

**Purposeful Meaning**: Motion communicates certificate lifecycle progression (pending → issuing → active) and job queue operations, using directional transitions (slide-in for new jobs, fade-out for completed) and color morphing for status changes to reinforce system state.

**Hierarchy of Movement**:
- **Critical status changes** (domain active, job failed): 300ms ease-out with scale + color transition
- **Job queue updates**: 200ms slide-in from right for new jobs, 150ms fade-out for completed
- **DNS verification**: pulsing indicator during check, then checkmark with bounce on success
- **Navigation**: 250ms smooth page transitions with subtle fade
- **Hover states**: 100ms color transitions on buttons and interactive elements
- **Copy actions**: 150ms scale feedback + toast notification
- **Skeleton loaders**: gentle wave animation for async data loading

## Component Selection

**Components**: 
- **Navigation**: Custom sidebar with nested routes and collapsible sections for org/admin areas
- **Dashboard**: Table with sortable columns, search, status Badge components, and row actions in DropdownMenu
- **Domain detail**: Card layouts with Tabs for overview/events/jobs; Timeline component for certificate history
- **Forms**: Form + Input + Label components with inline validation; Select for dropdowns; Switch for toggles
- **Modals**: Dialog for domain add/invite; AlertDialog for destructive actions (revoke token, delete domain)
- **Status indicators**: Custom Badge variants (pending_cname=gray, issuing=blue, active=green, error=red)
- **Job queue**: Table with Progress bars for running jobs; Accordion for error details
- **Audit log**: Table with date-fns formatting, filterable by action type using Command palette
- **DNS instructions**: Card with Textarea (readonly) and copy Button with Clipboard API
- **API docs**: Tabs for endpoints, Accordion for request/response examples, Code blocks with syntax highlighting
- **Billing**: Pricing Card grid with feature lists, Button CTAs; usage Progress indicators
- **White-label**: ColorPicker (custom), image upload Input with preview Avatar
- **Admin**: Switch for demo mode, Separator for sections, Alert for environment status

**Customizations**:
- **StatusBadge**: Extended Badge with icon prefixes from Phosphor (Clock, ArrowsClockwise, CheckCircle, XCircle)
- **CopyButton**: Button with Copy icon that shows checkmark feedback and triggers toast
- **DNSRecordDisplay**: Monospace code block with copy functionality and CNAME format validation
- **JobStatusIndicator**: Progress ring for running, icons for queued/succeeded/failed with attempt counts
- **TimelineEvent**: Custom component with connecting lines, timestamp, user avatar, and action description
- **PlanFeatureGate**: Wrapper checking subscription tier and showing upsell overlay if insufficient

**States**:
- Buttons: default → hover (saturate primary) → active (darken 5%) → focus (ring) → disabled (opacity 50%)
- Inputs: default → focus (ring + border color) → error (red ring + helper text) → disabled (gray background)
- Table rows: default → hover (background muted) → selected (background accent/10)
- Job status: queued (gray) → running (blue with pulse) → succeeded (green) → failed (red)
- Domain status: pending_cname (gray dot) → issuing (blue pulse) → active (green checkmark) → error (red x)

**Icon Selection**:
- Domain: Globe
- Add: Plus
- DNS: NetworkWired (or GlobeHemisphereWest)
- Certificate: Certificate
- Check: CheckCircle
- Error: XCircle
- Warning: Warning
- Renewal: ArrowsClockwise
- Copy: Copy / ClipboardText
- API: Code
- Team: Users
- Settings: Gear
- Audit: ListBullets
- Job: Queue
- Admin: ShieldCheck

**Spacing**:
- Section gaps: gap-8 (32px)
- Card padding: p-6 (24px)
- Form field spacing: gap-4 (16px)
- Button padding: px-4 py-2 (16px/8px)
- Table cell padding: p-3 (12px)
- Inline elements: gap-2 (8px)
- Tight grouping: gap-1 (4px)

**Mobile**:
- Sidebar collapses to hamburger menu with Sheet overlay
- Tables convert to stacked card layouts with key info prominent
- Multi-column grids (pricing, dashboard stats) collapse to single column
- Form fields stack vertically with full width
- Dialog components use Drawer on mobile for better thumb reach
- Navigation tabs become horizontal scrollable strip
- Status badges maintain same size but may wrap text on narrow screens
