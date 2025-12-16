-- Migration: 0004_team_management.sql
-- Add team management and RBAC support

-- 1. Add owner_id and subscription_tier to organizations if they don't exist
-- Note: SQLite doesn't support ALTER TABLE IF NOT EXISTS, so we use a workaround
-- These columns may already exist in some deployments

-- Add owner_id column (may fail if exists, that's ok)
ALTER TABLE organizations ADD COLUMN owner_id TEXT;

-- Add subscription_tier column (may fail if exists, that's ok)
ALTER TABLE organizations ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK(subscription_tier IN ('free', 'pro', 'agency'));

-- Add theme columns (may fail if exists, that's ok)
ALTER TABLE organizations ADD COLUMN theme_logo_url TEXT;
ALTER TABLE organizations ADD COLUMN theme_primary_color TEXT;
ALTER TABLE organizations ADD COLUMN theme_secondary_color TEXT;

-- 2. Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invited', 'suspended')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(org_id, user_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_email ON organization_members(email);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(status);

-- 4. Migrate existing organizations to have owner entries
-- For each organization with an owner_id, create a membership record
INSERT INTO organization_members (id, org_id, user_id, email, role, status, created_at)
SELECT 
    lower(hex(randomblob(16))),
    id,
    COALESCE(owner_id, 'system'),
    'owner@' || id || '.local',
    'owner',
    'active',
    datetime('now')
FROM organizations
WHERE owner_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_members.org_id = organizations.id 
    AND organization_members.user_id = organizations.owner_id
);

-- 5. Update organizations without owner_id to have one (use first member or system)
UPDATE organizations
SET owner_id = (
    SELECT user_id FROM organization_members 
    WHERE organization_members.org_id = organizations.id 
    AND role = 'owner' 
    LIMIT 1
)
WHERE owner_id IS NULL
AND EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_members.org_id = organizations.id
);
