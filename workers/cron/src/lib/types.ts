/// <reference types="@cloudflare/workers-types" />
type D1Database = any;
type Queue<T = unknown> = { send: (msg: T) => Promise<void> };
type Fetcher = { fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response> };

export interface Env {
  DB: D1Database;
  QUEUE: Queue<JobMessage>;
}

export type JobType = 'dns_check' | 'start_issuance' | 'renewal' | 'sync_status' | 'send_email';


export interface JobMessage {
  id: string;
  type: JobType;
  domain_id: string;
  attempts: number;
}
