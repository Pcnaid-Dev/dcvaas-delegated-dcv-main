// workers/api/src/env.d.ts

// This file is *types only*. It tells TypeScript what bindings
// your Worker receives from Cloudflare via wrangler.toml.

export interface Env {
  // Cloudflare D1 database for DCVaaS
  DB: any;          // you can later change these `any` types to D1Database, etc.

  // Job queues
  QUEUE: any;       // main jobs queue
  DLQ: any;         // dead letter queue

  // R2 for certificate storage
  CERTIFICATES: any;

  // Config / env vars
  VALIDATION_ROOT: string;         // "dcv.pcnaid.com"
  CLOUDFLARE_ACCOUNT_ID: string;   // your account ID

  // These are set as *secrets* in Wrangler (not hard-coded in wrangler.toml)
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ZONE_ID: string;
  ENCRYPTION_KEY: string;
  SECONDARY_CA: string;
  INTERNAL_ADMIN_TOKEN: string;
  STRIPE_SECRET_KEY: string;
}
