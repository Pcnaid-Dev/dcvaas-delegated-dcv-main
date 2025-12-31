import type { Env } from '../env';
import type { JobDTO, JobRow } from './types';

function mapJobRow(row: JobRow): JobDTO {
  return {
    id: row.id,
    type: row.type,
    domainId: row.domain_id,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error ?? null,
    result: row.result ? safeJson(row.result) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export async function getJob(
  env: Env,
  orgId: string,
  jobId: string
): Promise<JobDTO | null> {
const row = (await env.DB.prepare(
  `SELECT j.*
     FROM jobs j
     JOIN domains d ON d.id = j.domain_id
    WHERE j.id = ? AND d.org_id = ?`
)
  .bind(jobId, orgId)
  .first()) as JobRow | null;



  return row ? mapJobRow(row) : null;
}

export async function listJobs(
  env: Env,
  orgId: string,
  filters: { domainId?: string; type?: string; status?: string },
  limit = 50,
  offset = 0
): Promise<JobDTO[]> {
  let sql = `
    SELECT j.*
    FROM jobs j
    JOIN domains d ON d.id = j.domain_id
    WHERE d.org_id = ?
  `;
  const binds: unknown[] = [orgId];

  if (filters.domainId) {
    sql += ' AND j.domain_id = ?';
    binds.push(filters.domainId);
  }
  if (filters.type) {
    sql += ' AND j.type = ?';
    binds.push(filters.type);
  }
  if (filters.status) {
    sql += ' AND j.status = ?';
    binds.push(filters.status);
  }

  sql += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?';
  binds.push(limit, offset);

const res = await env.DB.prepare(sql).bind(...binds).all();
const rows = (res.results ?? []) as unknown as JobRow[]; // Added 'unknown' cast
return rows.map(mapJobRow);

}

export async function markJobQueued(env: Env, jobId: string): Promise<void> {
  await env.DB.prepare(
    `
    UPDATE jobs
    SET status = 'queued', attempts = 0, last_error = NULL, updated_at = datetime('now')
    WHERE id = ?
  `
  )
    .bind(jobId)
    .run();
}
