import type { Env } from '../env';

interface AuditInput {
  org_id: string;
  user_id: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: unknown;
}

export async function logAudit(env: Env, input: AuditInput): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `
    INSERT INTO audit_logs
      (id, org_id, user_id, action, entity_type, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
  )
    .bind(
      id,
      input.org_id,
      input.user_id,
      input.action,
      input.entity_type ?? null,
      input.entity_id ?? null,
      input.details ? JSON.stringify(input.details) : null,
      now
    )
    .run();
}
