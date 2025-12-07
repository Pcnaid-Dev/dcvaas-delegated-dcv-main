export type Env = {
  DB: D1Database;
  QUEUE: Queue;

  // Wrangler secret
  CLOUDFLARE_API_TOKEN: string;

  // Wrangler vars
  CLOUDFLARE_ZONE_ID: string;
};
