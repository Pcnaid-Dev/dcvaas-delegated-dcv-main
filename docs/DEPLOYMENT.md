# Cloudflare deployment

## Account and bindings

These Workers deploy from the **Startups** Cloudflare account:

- `dcvaas-frontend`
- `dcvaas-api`
- `dcvaas-cron`
- `dcvaas-consumer`
- `dcvaas-dlq`

- Account ID: `fc84e278ed073c8a37e8e2c6990cdb66`
- Shared API/cron/consumer/DLQ D1 binding: `DB`
- D1 database name: `dcvaas-db`
- D1 database ID: `ee1c72f2-0fe3-4d38-8cb8-8c749be9b9f9`
- Job queue name: `dcvaas-jobs`
- Dead-letter queue name: `dcvaas-jobs-dlq`

## Deployment environments

Use these staging endpoints until the `pcnaid.com` zone exists in the Startups account:

- Frontend: `https://dcvaas-frontend.broker-fc8.workers.dev`
- API: `https://dcvaas-api.broker-fc8.workers.dev`

`VITE_API_BASE_URL` is embedded in the frontend bundle at build time. Build the workers.dev frontend with:

```bash
VITE_API_BASE_URL=https://dcvaas-api.broker-fc8.workers.dev npm run build
```

The same staging value is recorded in `.env.example`. When `VITE_API_BASE_URL` is absent, the code retains `https://dcv.pcnaid.com` as the production fallback.

The `dcvaas-frontend` and `dcvaas-api` production environments set `workers_dev = false` and contain the `pcnaid.com` custom routes. After the zone is staged in Startups:

1. Replace `CLOUDFLARE_ZONE_ID = "466bdf66d7498a2167140d334df52787"` in both API variable blocks with the `pcnaid.com` zone ID from the Startups account.
2. Rebuild the frontend with `VITE_API_BASE_URL=https://dcv.pcnaid.com`, or omit the variable to use the production fallback.
3. In both `[vars]` and `[env.production.vars]`, remove `https://dcvaas-frontend.broker-fc8.workers.dev` from `CORS_ALLOW_ORIGINS` after the frontend custom domain is live; retain the custom-domain origins.
4. Deploy the frontend custom domain from the repository root with `wrangler deploy --env production`.
5. Deploy the API custom domains from `workers/api` with `wrangler deploy --env production`.

In `workers/api/wrangler.toml`, the old zone ID remains as a documented staging placeholder. Do not use the production environment before replacing it.

## API secrets

Configure these secret names for `dcvaas-api` in every deployed environment:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `ENCRYPTION_KEY`
- `INTERNAL_ADMIN_TOKEN`

`ENCRYPTION_KEY` must equal the value used to encrypt the existing D1 rows. Copied D1 data is unreadable with a different value.

`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` used for SSL for SaaS must point to the Cloudflare account that owns the `pcnaid.com` zone.
