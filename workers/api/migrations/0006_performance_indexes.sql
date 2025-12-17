-- Add performance indexes for frequently queried columns
-- This migration improves query performance for common access patterns

-- Index for filtering domains by status (used by cron worker)
CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);

-- Index for filtering domains by org_id and status together
CREATE INDEX IF NOT EXISTS idx_domains_org_status ON domains(org_id, status);

-- Index for Cloudflare custom hostname lookups
CREATE INDEX IF NOT EXISTS idx_domains_cf_hostname ON domains(cf_custom_hostname_id) WHERE cf_custom_hostname_id IS NOT NULL;

-- Index for jobs by status and created_at (for queue processing)
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at DESC);

-- Index for jobs by domain_id and status
CREATE INDEX IF NOT EXISTS idx_jobs_domain_status ON jobs(domain_id, status);

-- Index for audit logs by org_id and created_at (for audit log pages)
CREATE INDEX IF NOT EXISTS idx_audit_org_created ON audit_logs(org_id, created_at DESC);

-- Index for API tokens by org_id
CREATE INDEX IF NOT EXISTS idx_api_tokens_org ON api_tokens(org_id);

-- Index for updated_at on domains for efficient sorting
CREATE INDEX IF NOT EXISTS idx_domains_updated ON domains(updated_at DESC);
