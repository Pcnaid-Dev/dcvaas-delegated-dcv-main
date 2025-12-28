# Multi-Brand Implementation Guide

## Summary

This guide documents the multi-brand contextual branding implementation for DCVaaS, supporting three distinct brands with separate marketing and app domains:

1. **AutoCertify**: `autocertify.net` (marketing), `wizard.autocertify.net` (app)
2. **DelegatedSSL**: `delegatedssl.com` (marketing), `portal.delegatedssl.com` (app)
3. **KeylessSSL**: `keylessssl.dev` (marketing), `app.keylessssl.dev` (app)

## What Has Been Implemented

### ✅ Phase 1: Build Fixes
- Fixed syntax errors in `src/lib/data.ts` and `src/pages/WebhooksPage.tsx`
- Verified clean build with all dependencies installed

### ✅ Phase 2: Brand Resolution System
- **Frontend**: `src/lib/brand-resolver.ts`
  - Hostname-based brand detection
  - Support for 3 brands with marketing and app hosts
  - Local dev override via `VITE_BRAND_OVERRIDE` env var or `?brand=` query param
  - Exports: `brandId`, `marketingHost`, `appHost`, `isMarketingHost`, `isAppHost`, `preferredHost`

- **Backend**: `workers/shared/brand-resolver.ts`
  - Same brand resolution logic for Cloudflare Workers
  - Used by API worker and SPA worker for SEO safety

### ✅ Phase 3: Theme System
- Created `src/contexts/BrandContext.tsx` React context
- Integrated theme token CSS files for all 3 brands
- Theme applies automatically via `data-brand` attribute on `<html>` element
- CSS variable-based theming from `autocertify/theme.tokens.css`, `delegatedssl/theme.tokens.css`, `keylessssl/theme.tokens.css`

### ✅ Phase 4: Microcopy System
- Created `src/lib/microcopy.ts` for loading brand-specific copy
- Dynamic imports of `microcopy.json` files per brand
- Caching layer for performance
- Integrated into `BrandContext` for easy component access

### ✅ Phase 5: Frontend Integration (Partial)
- Updated `App.tsx` to integrate `BrandProvider`
- `BrandProvider` wraps entire app and provides brand context
- Theme and microcopy loaded automatically on mount

### ✅ Phase 6: Backend SEO Safety
- **SEO Module**: `workers/api/src/lib/seo.ts`
  - X-Robots-Tag header for app subdomains
  - Per-brand robots.txt generation
  - Per-brand sitemap.xml generation
  - Canonical URL enforcement
  - WWW redirect handling

- **SPA Worker**: `workers/spa.js`
  - Brand resolution from hostname
  - Serves `/robots.txt` per brand (no cross-brand URLs)
  - Serves `/sitemap.xml` per brand (no app URLs, no cross-brand URLs)
  - 308 redirects from `www.` to non-www
  - X-Robots-Tag: noindex, nofollow on all app subdomain responses

### ✅ Phase 7: SEO Compliance (Partial)
- WWW to non-WWW redirects implemented
- App subdomains have X-Robots-Tag: noindex, nofollow
- Brand-specific robots.txt and sitemap.xml generation
- Self-referencing canonical URL functions available

## What Remains To Be Done

### 🔲 Frontend Page Updates
The following pages need to be updated to use brand-specific microcopy and layouts:

1. **LandingPage.tsx**
   - Replace hardcoded text with `useBrand()` hook
   - Use `microcopy.hero_headline`, `microcopy.hero_subheadline`, etc.
   - Implement brand-specific layouts per SEO spec:
     - KeylessSSL: Docs-first IA, code blocks, sidebar nav
     - DelegatedSSL: Enterprise SaaS IA, case studies, trust sections
     - AutoCertify: Wizard-first IA, step-by-step flows, platform hubs

2. **PricingPage.tsx**
   - Use brand-specific pricing copy
   - Use `microcopy.pricing_agency`, `microcopy.pricing_enterprise`, etc.

3. **DocsPage.tsx**
   - Use brand-specific documentation structure
   - Different emphasis per brand (dev docs for KeylessSSL, agency workflows for DelegatedSSL, setup guides for AutoCertify)

### 🔲 Canonical URL Enforcement
- Add canonical `<link>` tags to all marketing pages
- Ensure they are self-referencing (same hostname)
- Implement in `index.html` or via React Helmet

### 🔲 Cross-Brand Link Removal
- Audit all pages for cross-brand links
- Remove sitewide cross-brand links (footer, header)
- Limit to max 1 contextual cross-brand link per page if necessary

### 🔲 Testing
1. **Build Testing**
   - ✅ Frontend builds successfully
   - Build all workers: `cd workers/api && npx wrangler deploy --dry-run`
   - Verify no TypeScript errors

2. **SEO Smoke Test**
   ```bash
   python3 -m pip install -r dcvaas-seo-safety-spec/ci/requirements.txt
   python3 dcvaas-seo-safety-spec/ci/seo_smoke_test.py --config dcvaas-seo-safety-spec/ci/seo_safety_rules.json
   ```

3. **Manual Testing**
   - Test brand switching with `?brand=autocertify.net`, `?brand=delegatedssl.com`, `?brand=keylessssl.dev`
   - Verify theme changes (colors, fonts, spacing)
   - Verify microcopy loading
   - Test robots.txt and sitemap.xml for each brand
   - Verify WWW redirects
   - Verify app subdomain noindex headers

### 🔲 Documentation
- Update README.md with brand override instructions
- Document `VITE_BRAND_OVERRIDE` environment variable
- Document query parameter override for testing
- Add SEO safety requirements summary

## Usage Instructions

### For Developers

#### Testing Brand Switching Locally
```bash
# Set environment variable
export VITE_BRAND_OVERRIDE=delegatedssl.com
npm run dev

# Or use query parameter
http://localhost:5173/?brand=autocertify.net
```

#### Using Brand Context in Components
```tsx
import { useBrand } from '@/contexts/BrandContext';

function MyComponent() {
  const { brand, microcopy } = useBrand();
  
  return (
    <div>
      <h1>{microcopy.hero_headline || 'Fallback headline'}</h1>
      <p>Current brand: {brand.brandName}</p>
    </div>
  );
}
```

#### Accessing Microcopy
```tsx
const { microcopy } = useBrand();

// String values
const headline = microcopy.hero_headline;
const cta = microcopy.hero_primary_cta;

// Array values
const chips = microcopy.reassurance_chips || [];
```

### For Deployment

#### Deploy Frontend (SPA Worker)
```bash
npx wrangler deploy
```

#### Deploy API Worker
```bash
cd workers/api
npx wrangler deploy
```

#### Deploy Consumer Worker
```bash
cd workers/consumer
npx wrangler deploy
```

#### Deploy Cron Worker
```bash
cd workers/cron
npx wrangler deploy
```

## SEO Safety Checklist

Per the SEO_SAFETY_SPEC.md, ensure:

- [ ] Each brand has unique marketing content (different outlines, headings, examples)
- [ ] App subdomains return `X-Robots-Tag: noindex, nofollow`
- [ ] robots.txt per host contains only same-host sitemap URL
- [ ] sitemap.xml per host contains only same-host marketing URLs (no app URLs, no cross-brand URLs)
- [ ] WWW redirects to non-WWW with 308 status
- [ ] All marketing pages have self-referencing canonical tags
- [ ] Cross-brand links limited to max 1 per page, contextual only
- [ ] No sitewide cross-brand link blocks (footer, header)

## Brand-Specific Requirements

### AutoCertify (autocertify.net)
- **Tone**: Calm, reassuring, urgent (for "Not Secure" panic)
- **Target**: SMBs with security warnings
- **Layout**: Wizard-first IA, step-by-step flows, platform fix hubs
- **Colors**: Secure Green (#15803D primary), white/mint backgrounds
- **Microcopy**: Emphasizes "instant fix", "zero downtime", "works with everything"

### DelegatedSSL (delegatedssl.com)
- **Tone**: Professional, enterprise, ROI-focused
- **Target**: Agencies and MSPs managing multiple clients
- **Layout**: Enterprise SaaS IA, case studies, trust sections
- **Colors**: Trust Blue (#2563EB primary), clean whites/grays
- **Microcopy**: Emphasizes "agency dashboard", "margin protection", "white-label"

### KeylessSSL (keylessssl.dev)
- **Tone**: Technical, dev-focused, implementation-oriented
- **Target**: CTOs, DevOps teams, SaaS developers
- **Layout**: Docs-first IA, code blocks, API emphasis, sidebar nav
- **Colors**: Dark theme, Secure Green (#00D084), Dev Blue (#39B7FF)
- **Microcopy**: Emphasizes "API", "ACME", "DNS-01", "delegation"

## File Reference

### Frontend
- `src/lib/brand-resolver.ts` - Brand detection and resolution
- `src/lib/microcopy.ts` - Microcopy loading and caching
- `src/contexts/BrandContext.tsx` - React context for brand and microcopy
- `src/main.css` - Imports brand theme tokens
- `autocertify/microcopy.json` - AutoCertify-specific text
- `autocertify/theme.tokens.css` - AutoCertify theme variables
- `delegatedssl/microcopy.json` - DelegatedSSL-specific text
- `delegatedssl/theme.tokens.css` - DelegatedSSL theme variables
- `keylessssl/microcopy.json` - KeylessSSL-specific text
- `keylessssl/theme.tokens.css` - KeylessSSL theme variables

### Backend
- `workers/shared/brand-resolver.ts` - Brand resolution for workers
- `workers/api/src/lib/seo.ts` - SEO safety utilities
- `workers/spa.js` - SPA worker with multi-brand routing

### Specifications
- `dcvaas-seo-safety-spec/spec/SEO_SAFETY_SPEC.md` - SEO safety requirements
- `dcvaas-seo-safety-spec/ci/seo_safety_rules.json` - Test configuration
- `dcvaas-seo-safety-spec/ci/seo_smoke_test.py` - SEO smoke test script

## Next Steps

1. **Complete Frontend Integration** (High Priority)
   - Update LandingPage, PricingPage, DocsPage with brand microcopy
   - Implement brand-specific layouts per SEO spec

2. **Add Canonical Tags** (High Priority)
   - Self-referencing canonical on all marketing pages
   - Verify no cross-domain canonicals

3. **Remove Cross-Brand Links** (High Priority)
   - Audit all pages
   - Remove sitewide cross-brand links

4. **Run SEO Smoke Test** (Required Before Merge)
   - Install Python dependencies
   - Run test against deployed or local instances
   - Fix any failures

5. **Deploy and Verify** (Final Step)
   - Deploy all workers
   - Manually verify each brand
   - Check robots.txt, sitemap.xml, headers
   - Verify theme and microcopy loading

## Contact

For questions or issues with the multi-brand implementation, refer to:
- SEO Safety Spec: `/dcvaas-seo-safety-spec/spec/SEO_SAFETY_SPEC.md`
- Brand Definitions: Check `src/lib/brand-resolver.ts` and `workers/shared/brand-resolver.ts`
- Theme Tokens: Check individual `theme.tokens.css` files
- Microcopy: Check individual `microcopy.json` files
