import { D1Database, Queue } from "@cloudflare/workers-types";

export type Env = {
  DB: D1Database;
  QUEUE: Queue;

  // Wrangler secret
  RESEND_API_KEY: string;
};
