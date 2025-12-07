export type DomainStatus = 'pending_cname' | 'issuing' | 'active' | 'error';
export type JobType = 'dns_check' | 'start_issuance' | 'renewal';
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface DomainRow {
  id: string;
  org_id: string;
  domain_name: string;
  status: DomainStatus;
  cname_target: string;
  last_issued_at: string | null;
  expires_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobRow {
  id: string;
  type: JobType;
  domain_id: string;
  status: JobStatus;
  attempts: number;
  last_error: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobMessage {
  id: string;
  type: JobType;
  domain_id: string;
  attempts: number;
}

export interface Env {
  DB: D1Database;
  DLQ: Queue<JobMessage>;
}
