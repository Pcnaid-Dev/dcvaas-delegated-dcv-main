# Cloudflare deployment

## Account and bindings

`dcvaas-frontend` and `dcvaas-api` deploy from the **Startups** Cloudflare account:

- Account ID: `fc84e278ed073c8a37e8e2c6990cdb66`
- API D1 binding: `DB`
- D1 database name: `dcvaas-db`
- D1 database ID: `ee1c72f2-0fe3-4d38-8cb8-8c749be9b9f9`
- API queue producer binding: `QUEUE`
- Queue name: `dcvaas-jobs`

## Deployment environments

The default configurations set `workers_dev = true`. Use them for `workers.dev` deployments until the `pcnaid.com` zone exists in the Startups account.

The `production` environments set `workers_dev = false` and contain the `pcnaid.com` custom routes. After the zone is staged in Startups:

1. Replace `CLOUDFLARE_ZONE_ID = "466bdf66d7498a2167140d334df52787"` in both API variable blocks with the `pcnaid.com` zone ID from the Startups account.
2. Deploy the frontend custom domain from the repository root with `wrangler deploy --env production`.
3. Deploy the API custom domains from `workers/api` with `wrangler deploy --env production`.

In `workers/api/wrangler.toml`, the old zone ID remains as a documented staging placeholder. Do not use the production environment before replacing it.

## API secrets

Configure these secret names for `dcvaas-api` in every deployed environment:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `ENCRYPTION_KEY`
- `INTERNAL_ADMIN_TOKEN`

`ENCRYPTION_KEY` must equal the value used to encrypt the existing D1 rows. Copied D1 data is unreadable with a different value.

`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` used for SSL for SaaS must point to the Cloudflare account that owns the `pcnaid.com` zone.
