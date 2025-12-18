-- Add webhook_endpoints table for outbound webhook notifications
-- This table stores webhook endpoint configurations for organizations

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array of event names
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Index for quickly fetching webhooks by organization
CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhook_endpoints(org_id);

-- Index for quickly fetching enabled webhooks by organization
CREATE INDEX IF NOT EXISTS idx_webhooks_org_enabled ON webhook_endpoints(org_id, enabled) WHERE enabled = 1;
