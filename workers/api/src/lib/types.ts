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

export interface DomainDTO {
  id: string;
  orgId: string;
  domainName: string;
  status: DomainStatus;
  cnameTarget: string;
  lastIssuedAt: string | null;
  expiresAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface JobDTO {
  id: string;
  type: JobType;
  domainId: string;
  status: JobStatus;
  attempts: number;
  lastError: string | null;
  result: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface JobMessage {
  id: string;
  type: JobType;
  domain_id: string;
  attempts: number;
}

export interface WebhookEndpointRow {
  id: string;
  org_id: string;
  url: string;
  secret: string;
  events: string; // JSON string
  enabled: number; // SQLite boolean (0 or 1)
  created_at: string;
}

export interface WebhookEndpointDTO {
  id: string;
  orgId: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
}
