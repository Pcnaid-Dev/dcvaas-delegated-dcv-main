-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  subscription_tier TEXT NOT NULL CHECK(subscription_tier IN ('free', 'pro', 'agency')),
  theme_logo_url TEXT,
  theme_primary_color TEXT,
  theme_secondary_color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Organization Members
CREATE TABLE IF NOT EXISTS organization_members (
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'member')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, org_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Modify existing domains table or create migration
ALTER TABLE domains ADD COLUMN cf_custom_hostname_id TEXT;
ALTER TABLE domains ADD COLUMN cf_status TEXT; -- e.g., 'pending', 'active'
ALTER TABLE domains ADD COLUMN cf_ssl_status TEXT; -- e.g., 'initializing', 'pending_validation', 'active'
ALTER TABLE domains ADD COLUMN cf_verification_errors TEXT; -- Store JSON array of errors

CREATE INDEX IF NOT EXISTS idx_domains_org ON domains(org_id);
CREATE INDEX IF NOT EXISTS idx_domains_expires
  ON domains(expires_at) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_jobs_domain ON jobs(domain_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, created_at);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(org_id, created_at);

-- API Tokens
CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  last_used_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- OAuth Connections
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
