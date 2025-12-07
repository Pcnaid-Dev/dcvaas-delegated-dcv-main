import { D1Database } from "@cloudflare/workers-types";

export type Env = {
  DB: D1Database;

  // Wrangler secret
  CLOUDFLARE_API_TOKEN: string;

  // Wrangler vars
  CLOUDFLARE_ZONE_ID: string;      // pcnaid.com zone id
  SAAS_CNAME_TARGET: string;       // dcv.pcnaid.com
  CORS_ALLOW_ORIGINS?: string;     // comma-separated origins
};
