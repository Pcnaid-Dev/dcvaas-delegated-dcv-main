-- Migration: 0007_integrations.sql
-- Add support for API tokens, webhooks, OAuth connections, and enhanced domain tracking
-- This migration is designed to be idempotent where possible

BEGIN TRANSACTION;

-- 1. Add missing domain columns for certificate lifecycle tracking
-- These columns will error if they already exist (SQLite limitation)
-- Migration system should prevent re-running this migration
ALTER TABLE domains ADD COLUMN expires_at TEXT;
ALTER TABLE domains ADD COLUMN last_issued_at TEXT;
ALTER TABLE domains ADD COLUMN error_message TEXT;

-- 2. Create webhook_endpoints table (idempotent)
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON string array of event types
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Index for efficient webhook lookups by organization
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_org_id ON webhook_endpoints(org_id);

-- Index for efficient enabled webhook queries
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_enabled ON webhook_endpoints(org_id, enabled) WHERE enabled = 1;

-- 3. Create oauth_connections table (idempotent)
CREATE TABLE IF NOT EXISTS oauth_connections (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('cloudflare', 'godaddy', 'route53', 'other')),
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Index for efficient OAuth connection lookups by org and provider
CREATE INDEX IF NOT EXISTS idx_oauth_connections_org_provider ON oauth_connections(org_id, provider);

-- 4. Create jobs table if it doesn't exist (idempotent)
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('dns_check', 'start_issuance', 'renewal', 'sync_status')),
  domain_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'running', 'succeeded', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  result TEXT, -- JSON string for job results
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

-- Indexes for jobs table (already exist in 0006, but adding IF NOT EXISTS for safety)
CREATE INDEX IF NOT EXISTS idx_jobs_domain ON jobs(domain_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_domain_status ON jobs(domain_id, status);

COMMIT;
