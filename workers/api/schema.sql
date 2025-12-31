-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  subscription_tier TEXT NOT NULL CHECK(subscription_tier IN ('free', 'pro', 'agency')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Organization Members
CREATE TABLE IF NOT EXISTS organization_members (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invited', 'suspended')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(org_id, user_id),
  UNIQUE(org_id, email)
);

-- Domains
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  domain_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_cname', -- pending_cname, issuing, active, error
  cf_custom_hostname_id TEXT,
  cf_status TEXT,
  cf_ssl_status TEXT,
  cf_verification_errors TEXT, -- JSON array
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_domains_org ON domains(org_id);
CREATE INDEX IF NOT EXISTS idx_domains_expires ON domains(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);
CREATE INDEX IF NOT EXISTS idx_domains_org_status ON domains(org_id, status);
CREATE INDEX IF NOT EXISTS idx_domains_cf_hostname ON domains(cf_custom_hostname_id);
CREATE INDEX IF NOT EXISTS idx_domains_updated ON domains(updated_at);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at);
-- Bad index removed from here