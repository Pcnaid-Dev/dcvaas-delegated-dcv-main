-- Migration: 0004_add_branding.sql
-- Add white-label branding fields to organizations table

ALTER TABLE organizations ADD COLUMN brand_color TEXT DEFAULT '#2563eb' CHECK (brand_color IS NULL OR brand_color GLOB '#[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]');
ALTER TABLE organizations ADD COLUMN logo_url TEXT;
ALTER TABLE organizations ADD COLUMN custom_domain TEXT;
