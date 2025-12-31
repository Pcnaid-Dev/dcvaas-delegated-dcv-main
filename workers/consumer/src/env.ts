/// <reference types="@cloudflare/workers-types" />
type D1Database = any;
type Queue<T = unknown> = { send: (msg: T) => Promise<void> };
type Fetcher = { fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response> };


export type Env = {
  DB: D1Database;
  QUEUE: Queue;

  // Wrangler secrets
  CLOUDFLARE_API_TOKEN: string;
  RESEND_API_KEY: string;

  // Wrangler vars
  CLOUDFLARE_ZONE_ID: string;
  EMAIL_FROM?: string; // Add this line
};
