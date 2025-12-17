-- Migration: 0004_team_management.sql (Idempotent Version)
-- Add team management and RBAC support
-- SAFE TO RUN MULTIPLE TIMES

-- IMPORTANT: This migration uses idempotent patterns where possible.
-- The strategy is to:
-- 1. Create new tables/indexes with IF NOT EXISTS (fully idempotent)
-- 2. For ALTER TABLE operations, these WILL ERROR on re-run (SQLite limitation)
-- 3. Use INSERT OR IGNORE for data migrations (idempotent)

-- CRITICAL: The ALTER TABLE statements below will fail if columns already exist.
-- This is a SQLite limitation - it does not support IF NOT EXISTS for ALTER TABLE ADD COLUMN.
-- Your migration system MUST track which migrations have been applied to prevent re-running.
-- If you need to re-run this migration, you must manually drop the columns first (not recommended).

BEGIN TRANSACTION;

-- 1. Add columns to organizations table
-- These will error if columns already exist - this is expected behavior
-- Migration system should prevent re-running this migration
ALTER TABLE organizations ADD COLUMN owner_id TEXT;
ALTER TABLE organizations ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK(subscription_tier IN ('free', 'pro', 'agency'));

-- 2. Create organization_members table (idempotent)
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
    UNIQUE(org_id, user_id),
    UNIQUE(org_id, email)
);

-- 3. Create indexes for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_email ON organization_members(email);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(status);
CREATE INDEX IF NOT EXISTS idx_org_members_org_email ON organization_members(org_id, email);

-- 4. Migrate existing organizations to have owner entries (idempotent with OR IGNORE)
-- For each organization with an owner_id, create a membership record
-- Uses deterministic ID generation based on org_id and owner_id to ensure idempotency
INSERT OR IGNORE INTO organization_members (id, org_id, user_id, email, role, status, created_at)
SELECT 
    substr('owner-' || id || '-' || owner_id, 1, 64),  -- Deterministic ID from org_id and owner_id
    id,
    owner_id,
    'owner@' || id || '.local',
    'owner',
    'active',
    datetime('now')
FROM organizations
WHERE owner_id IS NOT NULL;

-- 5. Update organizations without owner_id to have one (idempotent - will skip if already set)
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

COMMIT;
