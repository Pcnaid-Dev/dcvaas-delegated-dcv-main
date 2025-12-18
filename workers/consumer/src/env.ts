export type Env = {
  DB: D1Database;
  QUEUE: Queue;

  // Wrangler secrets
  CLOUDFLARE_API_TOKEN: string;
  RESEND_API_KEY: string;

  // Wrangler vars
  CLOUDFLARE_ZONE_ID: string;
};
