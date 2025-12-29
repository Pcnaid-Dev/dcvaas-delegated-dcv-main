import { D1Database, Queue } from "@cloudflare/workers-types";

export type Env = {
  // Bindings
  DB: D1Database;
  QUEUE: Queue;
  DLQ?: Queue;
  CERTIFICATES?: any;  // KV namespace if used

  // Secrets (set via wrangler secret put)
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ZONE_ID: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  ENCRYPTION_KEY: string;          // AES-GCM encryption key for OAuth tokens
  RESEND_API_KEY?: string;         // Email notifications
  INTERNAL_ADMIN_TOKEN?: string;   // For admin/demo endpoints
  STRIPE_SECRET_KEY?: string;      // Stripe payments
  STRIPE_WEBHOOK_SECRET?: string;  // Stripe webhook verification
  PLATFORM_OWNER_EMAIL?: string;   // Platform owner for unlimited domains

  // Variables (set via wrangler.toml)
  SAAS_CNAME_TARGET: string;       // dcv.pcnaid.com
  CORS_ALLOW_ORIGINS?: string;     // comma-separated origins
};
