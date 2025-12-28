# DCVaaS SEO Safety Spec + CI Smoke Tests

This bundle contains:
- `spec/SEO_SAFETY_SPEC.md` — the engineering + content rules to keep 3 brands on shared infra SEO-safe.
- `ci/seo_safety_rules.json` — domain/paths configuration.
- `ci/seo_smoke_test.py` — CI-friendly smoke tests:
  - canonical host + self-canonical
  - robots.txt & sitemap isolation (no cross-domain contamination)
  - app subdomains are `noindex`
  - optional cross-brand link footprint limit

## Quick start

1) Install deps:
```bash
python -m pip install -r ci/requirements.txt
```

2) Run:
```bash
python ci/seo_smoke_test.py --config ci/seo_safety_rules.json
```

3) Use in CI:
- Run this after deploy to staging (or against preview envs if hostnames resolve).
- Fail the pipeline if exit code is non-zero.

## Customize
Edit `ci/seo_safety_rules.json`:
- update domains
- update which pages to check (marketing_pages)
- update app subdomains and test paths
- tune `max_cross_brand_links_per_page`
