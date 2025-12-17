-- Migration: 0007_webhooks.sql
-- Add webhook_endpoints table for outbound webhook configuration

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array of event names
  enabled INTEGER NOT NULL DEFAULT 1, -- SQLite uses 0/1 for boolean
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Index for querying webhooks by organization
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_org ON webhook_endpoints(org_id);

-- Index for querying enabled webhooks by organization
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_org_enabled ON webhook_endpoints(org_id, enabled) WHERE enabled = 1;
