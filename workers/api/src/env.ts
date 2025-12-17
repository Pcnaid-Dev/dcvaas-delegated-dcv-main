import { D1Database, Queue } from "@cloudflare/workers-types";

export type Env = {
  DB: D1Database;
  QUEUE?: Queue;

  // Wrangler secrets
  CLOUDFLARE_API_TOKEN: string;
  ENCRYPTION_KEY: string;          // AES-GCM encryption key for OAuth tokens

  // Wrangler vars
  CLOUDFLARE_ZONE_ID: string;      // pcnaid.com zone id
  SAAS_CNAME_TARGET: string;       // dcv.pcnaid.com
  CORS_ALLOW_ORIGINS?: string;     // comma-separated origins
};
