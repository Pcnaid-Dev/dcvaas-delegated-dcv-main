-- Migration: 0007_index_domains_status_updated.sql
-- Purpose: Optimize cron worker query that polls active domains for daily refresh
-- This compound index supports efficient queries filtering by status and updated_at

-- Add compound index for cron worker query that checks:
-- WHERE status != 'active' OR (status = 'active' AND updated_at < datetime('now', '-1 day'))
CREATE INDEX IF NOT EXISTS idx_domains_status_updated ON domains(status, updated_at ASC);
