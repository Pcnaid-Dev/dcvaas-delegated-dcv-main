export interface Env {
  DB: D1Database;
  QUEUE: Queue<JobMessage>;
}

export type JobType = 'dns_check' | 'start_issuance' | 'renewal';

export interface JobMessage {
  id: string;
  type: JobType;
  domain_id: string;
  attempts: number;
}
