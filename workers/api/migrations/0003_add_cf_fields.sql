-- Migration: 0003_add_cf_fields.sql
ALTER TABLE domains ADD COLUMN cf_custom_hostname_id TEXT;
ALTER TABLE domains ADD COLUMN cf_status TEXT;
ALTER TABLE domains ADD COLUMN cf_ssl_status TEXT;
ALTER TABLE domains ADD COLUMN cf_verification_errors TEXT;