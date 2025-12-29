KeylessSSL Marketing Site
Homepage Hero
Headline: “Stop leaking your DNS root keys to production servers.”
Subheadline: KeylessSSL automates wildcard TLS via Delegated DCV. Delegate _acme-challenge once (CNAME). Your high‑privilege DNS credentials stay air‑gapped in your vault. Add one CNAME. Ship renewals forever.
Primary CTA: Get API Key — Free for 3 Domains
Secondary CTA: View integration (opens code snippet/modal)
CTA Note (microcopy): “No credit card. Key shown once. Tokens are hashed server-side. Rotate any time.”
“Root Key Vulnerability” (Problem Section)
Problem Title: “Root Key Vulnerability”
Problem Summary: Using root DNS API keys on build agents or servers is “a zone takeover waiting to happen.” If one server is compromised, your entire DNS zone is gone. In other words, to automate wildcard SSL today, many teams put their AWS Route53 or Cloudflare root API keys on production systems – a catastrophic risk.
Anchor Quote: “If one server is compromised, your entire DNS zone is gone.” (This line appears on the page as a highlighted quote emphasizing the risk.)
“Delegated DCV, not delegated trust.” (Solution Architecture)
Section Title: “Delegated DCV, not delegated trust.”
Key Pillars: The architecture section highlights three technical pillars that differentiate KeylessSSL:
Air‑Gapped Validation – Delegate only _acme-challenge; root keys never touch KeylessSSL, your servers, or CI. In practice, you create a one-time CNAME record and never expose your master DNS credentials.
47‑Day Renewal Readiness – Designed for high-frequency (47-day) renewals, with no cron job maintenance. KeylessSSL’s infrastructure is built to handle the upcoming 8× increase in certificate rotations seamlessly.
Cloudflare‑Powered Reliability – Validation runs at the edge for predictable execution. “Enterprise-grade uptime without the enterprise price tag.” KeylessSSL leverages Cloudflare’s global network to perform challenges, giving you high reliability at a fraction of traditional costs.
Integration Steps (Inline How‑To)
A short three-step guide is embedded on the homepage to show how integration works:
Delegate validation – e.g. add a CNAME record:
_acme-challenge.example.com CNAME example-com.<tenant>.dcv.keylessssl.dev
(This one-time DNS delegation points the ACME challenge to KeylessSSL.)
Issue via API – run a simple API call (curl snippet provided on-click) to request the certificate.
Install your certificate – “Nginx / Caddy / Traefik / ALB / Cloudflare — you decide.” After issuance, you deploy the certificate as you normally would in your stack.
(A “View integration” modal is available to developers with code examples for cURL, Terraform, GitHub Actions, Kubernetes, etc., to facilitate this process.)
Pricing Plans
Section Title: “Pricing that doesn’t punish automation.” KeylessSSL offers two plans, highlighted on the homepage:
Hacker Plan (Free) – $0/mo. Up to 3 domains. Wildcards included. Uses the community validation queue and standard rate limits. CTA button: **“Get API Key — Free”*.
Pro Plan – $15/mo. Up to 50 domains. Wildcards included. Priority validation queue and higher rate limits, plus team access and audit events. CTA: “Start Pro”.
Pricing Undercut Note: “Cheaper than BrandSSL’s $29/mo starter — without shipping your root keys.” appears below the plan cards, positioning KeylessSSL as the more secure and cost-effective choice.
Developer Proof & Community
Toward the bottom of the page, KeylessSSL speaks directly to experienced developers:
Trust Tagline: “Built by people who’ve been burned by cert automation.” This line establishes credibility by noting the product creators have firsthand experience with the pain points of certificate management.
Quick Links: Docs: “ACME + DNS‑01 via Delegated DCV” and Blog: “Why certbot is technical debt” are prominently linked as next steps for those seeking technical details or context. These indicate the availability of deep dives and guides aligned with the developer audience.
FAQ and Final CTA
Since KeylessSSL targets a technical audience, the homepage minimizes generic FAQ content. Instead, it funnels users to detailed docs and a Security page (linked in the footer) for questions about how it works. The page ends with a final call-to-action banner – a high-contrast section with a repeat of the “Get API Key – Free for 3 Domains” button to capture any remaining undecided visitors. The footer includes standard links (Docs, API Reference, Security, Status, Contact, Terms, Privacy) to cover additional information. Sources: KeylessSSL combined branding spec, KeylessSSL.dev content guidelines.
