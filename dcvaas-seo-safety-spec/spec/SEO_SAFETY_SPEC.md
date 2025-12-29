# DCVaaS Multi‑Brand SEO Safety Spec (v1.0)

**Owner:** Pcnaid Inc.  
**Applies to:** KeylessSSL (`keylessssl.dev`), DelegatedSSL (`delegatedssl.com`), AutoCertify (`autocertify.net`)  
**Architecture:** Shared codebase / shared infra allowed; *output isolation is mandatory*.  
**Last updated:** 2025-12-28

---

## 1) Objective

Run 3 separate brand domains on shared infrastructure **without** triggering:

- **Dedup / canonical folding** (WebMirror + shingles/fingerprints)
- **SERP diversity suppression** (“crowding” / “similar neighbors”)
- **Site topical dilution** (`siteFocusScore` / `siteRadius`)
- **Network/relationship contamination** (`UrlPoisoningData` + `spam_siblings`)
- **Engagement‑driven demotions** (NavBoost click signals)

This spec is grounded in the internal-feature inventory surfaced by the Google Content Warehouse leak audits (feature existence & intended measurement — not weights).

---

## 2) Threat model (what can kill rankings)

### 2.1 Site-level scoring is real → each domain is judged as a unit
Relevant leaked feature names referenced in the audits:
- `siteAuthority`
- `siteFocusScore`
- `siteRadius`
- `hostAge`
- `homepagePageRank`

**Risk:** if a brand drifts across topics or becomes “wide and shallow,” the whole domain’s ability to rank degrades.

### 2.2 Re-ranking uses click satisfaction (NavBoost) → intent mismatch gets punished
Relevant fields referenced in the audits:
- `goodClicks`, `badClicks`, `lastLongestClicks`
- `unsquashedClicks`, `unsquashedLastLongestClicks`
- scoring contemplated at **URL / subdomain / root domain** scope

**Risk:** Wrong audience → bounce/pogo → “badClicks” patterns → re-ranking demotions.

### 2.3 Dedup/near-dup systems exist → same page across brands gets folded
Relevant components referenced in the audits:
- WebMirror (canonicalization & duplication management)
- `IndexingConverterShingleFingerprint`
- `ShingleInfoPerDocData`
- forwarding duplicate URL storage (e.g., `RepositoryWebrefSimplifiedForwardingDup`)

**Risk:** “3 skins of the same site” → only one version wins; the rest get filtered.

### 2.4 Crowding/neighbor suppression exists → similar brands can’t dominate the same SERP
Relevant components referenced in the audits:
- `CrowdingPerDocData`
- `ResearchScamGenericFeatureVectorCrowding`
- nearest-neighbor constructs (e.g., `ResearchScamNearestNeighbors`)

**Risk:** Even if two brands are eligible, Google may suppress “similar neighbors.”

### 2.5 Relationship / poisoning signals exist → network footprints can contaminate
Relevant components referenced in the audits:
- `UrlPoisoningData` including `spam_siblings`
- outlink spam scoring references (e.g., `BlogPerDocDataOutlinks` with site spam scores)

**Risk:** Sitewide cross-linking and shared patterns can create an obvious “network” footprint.

---

## 3) Non‑negotiable rules (hard gates)

### R1 — 1 intent per brand (semantic distance is mandatory)
We do **not** build three domains to rank for the same queries.

- **KeylessSSL:** dev/CTO implementation: ACME, DNS‑01, API, CI/CD, key security.
- **DelegatedSSL:** agencies/MSPs: multi-client ops, white-label, margin, seats, workflows.
- **AutoCertify:** SMB panic fixes: “Not Secure” remediation, platform guides, wizards.

**Ban:** publishing “general SSL automation platform” pages across all 3.

### R2 — No page duplication across brands
If the shingle/fingerprint level matches, we get folded.

**Ban:** copy/paste pages with light rewrites (logo swaps, synonym swaps, same headings).

**Allowed:** same underlying topic only if:
- outline differs
- headings differ
- examples differ
- CTA differs
- token sequence differs materially

### R3 — Canonicals are tenant-aware and self-referencing by default
**Default:** every indexable marketing page returns a self-referencing canonical on the same hostname.

**Ban:** cross-domain canonicals unless we are intentionally consolidating a duplicate page.

### R4 — Cross‑brand linking must be sparse and contextual
Because relationship/poisoning constructs exist, we treat cross-domain links as radioactive unless justified.

**Ban:** sitewide footer “family of brands” link blocks.

**Allowed:** contextual links only, max **1 cross-brand link per page**, user-justified.

### R5 — Marketing indexable; App layer noindex (hard separation)
Marketing exists to rank. App exists to operate.

**Required:**
- Marketing on apex domains (`keylessssl.dev`, `delegatedssl.com`, `autocertify.net`) is indexable.
- App on subdomains is noindex:
  - `app.keylessssl.dev`
  - `portal.delegatedssl.com`
  - `wizard.autocertify.net`

Enforce `X-Robots-Tag: noindex, nofollow` for entire app subdomains at the edge.

---

## 4) Domain & URL canonicalization policy

### 4.1 Preferred host
Pick one per brand (recommended: **non‑www**) and enforce it.

- `https://www.<domain>` → 301/308 → `https://<domain>`

### 4.2 Canonical URL format
- Absolute canonical URLs only
- No query params (`utm_*`, `gclid`, etc.)
- Trailing slash policy consistent per brand

### 4.3 Redirect rules
- 301/308 for canonical host enforcement
- 301 for HTTP → HTTPS
- No redirect chains longer than 1 hop (crawl waste + UX loss)

---

## 5) Robots & Sitemap isolation (tenant isolation)

### 5.1 robots.txt
robots must be generated **per host** and must not reference other brands.

- Marketing host robots allows crawling of public marketing pages.
- App subdomain robots can disallow all, but **noindex header is the primary control**.

### 5.2 sitemap.xml
- Each marketing host serves its own sitemap containing **only URLs for that host**.
- Sitemaps must never include app subdomain URLs.
- Search Console: separate properties + separate sitemap submission per domain.

---

## 6) Template divergence requirements (reduce “similar neighbor” risk)

Even if template sameness isn’t proven as a standalone penalty, it’s a dedup/crowding risk reducer. We do not gamble.

### Required layout deltas by brand
**KeylessSSL**
- Docs-first IA
- code blocks in hero/sections
- sidebar nav
- API/quickstart emphasis

**DelegatedSSL**
- Enterprise SaaS IA
- case studies + ROI blocks
- multi-seat / workflow visuals
- trust/compliance sections

**AutoCertify**
- Wizard-first IA
- step-by-step flows
- platform fix hubs (WordPress/Wix/Shopify/etc.)
- heavy FAQ sections

**Engineering rule:** Each brand uses different layout components and different section ordering on core pages (home, pricing, how-it-works).

---

## 7) Content publishing rules (shingle-safe)

### 7.1 Shared topic policy
If a topic must exist across all 3 brands (e.g., “47-day renewals”):
- write 3 different outlines
- persona-native vocabulary per brand
- unique examples, screenshots, tools
- unique CTA

### 7.2 Legal pages
Legal pages don’t need to rank.
- Preferred: unique per brand
- Acceptable: identical but `noindex`

---

## 8) Cross-domain linking policy (anti‑poisoning)

### 8.1 Allowed
- contextual
- user-justified
- max 1 cross-brand link per page
- anchor must match target (Anchor Mismatch demotion references exist in audits)

### 8.2 Forbidden
- sitewide cross-links (footer/header)
- reciprocal link rings
- “our other brands” blocks repeated across site

### 8.3 Kill switch
If we suspect poisoning/relationship issues:
- remove cross-brand links immediately
- temporarily apply `rel="nofollow"` where links must remain for UX

---

## 9) Performance isolation (protect engagement signals)

Because click satisfaction matters (NavBoost), we treat speed/UX as ranking-critical.

### Required controls
- Edge cache marketing aggressively (SSG/ISR where possible)
- WAF/bot mitigation + rate limiting (especially “check my SSL” style endpoints)
- Background queues for DCV polling/renewals/scans (no long work in web requests)
- DB pooling + tenant quotas (max jobs, scan frequency, batch sizes)
- Optional but recommended: separate deployments per brand (same repo) to limit noisy-neighbor compute starvation

---

## 10) QA gates (CI + release gates)

### 10.1 Pre-deploy smoke test (must pass)
Per marketing hostname:
- 200 OK on key pages
- canonical host matches page host
- no `noindex` for marketing pages
- robots.txt contains sitemap pointing to same host
- sitemap `<loc>` entries are same host only

Per app hostname:
- `X-Robots-Tag` contains `noindex`
- app URLs do not appear in marketing sitemap

### 10.2 Weekly duplicate tripwire
Run similarity scans on:
- home, pricing, features
- top 20 content URLs per brand
If similarity crosses threshold → rewrite before publishing more.

### 10.3 Monitoring
Per domain:
- Search Console: “Duplicate, Google chose different canonical”
- CTR drops and query mismatch issues
- Performance: p95 TTFB, error rate, CWV field metrics

---

## 11) Incident response playbooks

### 11.1 “Google chose different canonical”
- verify canonical tags are self-referencing
- verify sitemap only contains correct host
- verify redirects aren’t folding hosts
- remove any cross-domain canonical mistakes immediately

### 11.2 “Only one brand indexes”
- run similarity scan across brands
- ensure no shared boilerplate blocks dominate pages (same headings + same sections)
- verify app is noindex (to avoid index pollution)

### 11.3 “Rankings suppressed after publishing similar content”
- check recent publishes for overlap
- split topics more aggressively (persona-native rewriting)
- reduce cross-domain linking footprint

---

## 12) Implementation patterns (Next.js / edge)

### 12.1 Next.js middleware hostname routing (concept)
```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const url = req.nextUrl.clone();

  // Enforce non-www canonical host
  if (host.startsWith("www.")) {
    const dest = `https://${host.replace("www.", "")}${url.pathname}${url.search}`;
    return NextResponse.redirect(dest, 308);
  }

  // Map host → tenant folder (internal rewrite)
  const tenant = host; // or lookup table
  url.pathname = `/_sites/${tenant}${url.pathname}`;
  return NextResponse.rewrite(url);
}
```

### 12.2 tenant-aware generateMetadata
- Must return brand-unique title/description/OG per host
- If tenant lookup fails: return 404 or `noindex` to avoid indexing broken branding

### 12.3 tenant-aware robots.ts & sitemap.ts
- robots and sitemap must be generated per host and must not mix brands

### 12.4 Edge header enforcement for app subdomains
- Set `X-Robots-Tag: noindex, nofollow` on app subdomains at CDN/edge

---

## Appendix A — Leak feature map (what we engineered around)

**Site scoring:** `siteAuthority`, `siteFocusScore`, `siteRadius`, `hostAge`, `homepagePageRank`  
**Clicks/re-ranking:** NavBoost (`goodClicks`, `badClicks`, `lastLongestClicks`, `unsquashedClicks`)  
**Dup/canonical:** WebMirror + forwarding duplicates; shingles (`IndexingConverterShingleFingerprint`, `ShingleInfoPerDocData`)  
**SERP diversity:** `CrowdingPerDocData`, `ResearchScamGenericFeatureVectorCrowding`  
**Network/spam:** `UrlPoisoningData` with `spam_siblings`, outlink spam scoring references  
**Link relevance demotion:** Anchor Mismatch demotion references

