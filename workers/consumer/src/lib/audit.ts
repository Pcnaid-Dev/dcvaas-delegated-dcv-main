import type { Env } from './types';

interface AuditLogInput {
  org_id: string;
  user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
}

export async function logAudit(env: Env, input: AuditLogInput): Promise<void> {
  const id = crypto.randomUUID();
  const detailsJson = input.details ? JSON.stringify(input.details) : null;

  await env.DB.prepare(
    `
    INSERT INTO audit_logs (id, org_id, user_id, action, entity_type, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `
  )
    .bind(
      id,
      input.org_id,
      input.user_id ?? null,
      input.action,
      input.entity_type ?? null,
      input.entity_id ?? null,
      detailsJson
    )
    .run();
}
