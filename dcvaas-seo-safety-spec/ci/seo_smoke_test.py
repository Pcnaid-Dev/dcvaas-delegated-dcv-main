#!/usr/bin/env python3
"""
SEO Smoke Test for multi-brand / multi-domain SaaS.

Purpose:
- Catch the dumb mistakes that cause cross-domain canonical folding, sitemap contamination,
  and accidental indexation of app routes.

Usage:
  python ci/seo_smoke_test.py --config ci/seo_safety_rules.json

Exit codes:
  0 = pass
  1 = fail (at least one hard gate failed)
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse, urljoin

import requests
from bs4 import BeautifulSoup
from xml.etree import ElementTree as ET


@dataclass
class CheckResult:
    ok: bool
    name: str
    details: str


def norm_path(p: str) -> str:
    # Normalize trailing slashes (except root)
    if not p:
        return "/"
    if p != "/" and p.endswith("/"):
        return p[:-1]
    return p


def get_rel_canonical(soup: BeautifulSoup) -> Optional[str]:
    # rel can be string or list; handle both
    for link in soup.find_all("link"):
        rel = link.get("rel")
        if not rel:
            continue
        rel_vals = [r.lower() for r in (rel if isinstance(rel, list) else [rel])]
        if "canonical" in rel_vals:
            href = link.get("href")
            if href:
                return href.strip()
    return None


def has_noindex(resp: requests.Response, html: Optional[str]) -> bool:
    # Check X-Robots-Tag header
    xrt = resp.headers.get("x-robots-tag", "") or resp.headers.get("X-Robots-Tag", "")
    if xrt and "noindex" in xrt.lower():
        return True

    if not html:
        return False

    soup = BeautifulSoup(html, "lxml")
    meta = soup.find("meta", attrs={"name": "robots"})
    if meta and meta.get("content") and "noindex" in meta["content"].lower():
        return True
    return False


def fetch(url: str, ua: str, timeout: int, follow_redirects: bool) -> Tuple[Optional[requests.Response], Optional[str], Optional[str]]:
    try:
        resp = requests.get(
            url,
            headers={"User-Agent": ua, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"},
            timeout=timeout,
            allow_redirects=follow_redirects,
        )
        text = None
        ctype = resp.headers.get("content-type", "")
        if "text/html" in ctype or "application/xhtml+xml" in ctype or url.endswith(".html"):
            resp.encoding = resp.encoding or "utf-8"
            text = resp.text
        return resp, resp.url, text
    except requests.RequestException as e:
        return None, None, str(e)


def check_www_redirect(marketing_host: str, preferred_host: str, global_cfg: Dict[str, Any]) -> CheckResult:
    if not global_cfg.get("enforce_non_www", False):
        return CheckResult(True, f"www redirect ({marketing_host})", "skipped (enforce_non_www=false)")

    ua = global_cfg["user_agent"]
    timeout = int(global_cfg["timeout_seconds"])
    url = f"https://www.{marketing_host}/"
    resp, final_url, err_or_html = fetch(url, ua, timeout, follow_redirects=False)

    if resp is None:
        # If www doesn't resolve / TLS fails, we treat as warn-pass (no duplicate surface).
        return CheckResult(True, f"www redirect ({marketing_host})", f"warn: could not fetch {url}: {err_or_html}")

    # If www serves 200, it's a duplication risk
    if resp.status_code < 300:
        return CheckResult(False, f"www redirect ({marketing_host})", f"FAIL: www host served {resp.status_code} (should redirect to https://{preferred_host}/)")

    if resp.status_code not in (301, 302, 307, 308):
        return CheckResult(False, f"www redirect ({marketing_host})", f"FAIL: www host returned {resp.status_code} (expected 301/308 redirect)")

    loc = resp.headers.get("location", "")
    if not loc:
        return CheckResult(False, f"www redirect ({marketing_host})", "FAIL: redirect missing Location header")

    parsed = urlparse(loc if "://" in loc else f"https://www.{marketing_host}{loc}")
    if parsed.netloc != preferred_host:
        return CheckResult(False, f"www redirect ({marketing_host})", f"FAIL: Location points to {parsed.netloc}, expected {preferred_host}")

    return CheckResult(True, f"www redirect ({marketing_host})", f"OK: {resp.status_code} → {loc}")


def check_marketing_page(brand: Dict[str, Any], all_hosts: Set[str], global_cfg: Dict[str, Any], path: str) -> List[CheckResult]:
    results: List[CheckResult] = []
    ua = global_cfg["user_agent"]
    timeout = int(global_cfg["timeout_seconds"])
    follow = bool(global_cfg.get("follow_redirects", True))

    host = brand["marketing_host"]
    preferred_host = brand.get("preferred_host", host)

    url = f"https://{host}{path}"
    resp, final_url, html_or_err = fetch(url, ua, timeout, follow_redirects=follow)

    if resp is None:
        results.append(CheckResult(False, f"{brand['name']} {path}", f"FAIL: request error: {html_or_err}"))
        return results

    if resp.status_code >= 400:
        results.append(CheckResult(False, f"{brand['name']} {path}", f"FAIL: HTTP {resp.status_code} for {final_url}"))
        return results

    # Enforce https
    if global_cfg.get("require_https", True):
        if urlparse(final_url).scheme != "https":
            results.append(CheckResult(False, f"{brand['name']} {path}", f"FAIL: final URL not https: {final_url}"))

    # Noindex on marketing pages is forbidden
    if global_cfg.get("fail_if_marketing_page_has_noindex", True):
        if has_noindex(resp, html_or_err if isinstance(html_or_err, str) else None):
            results.append(CheckResult(False, f"{brand['name']} {path}", f"FAIL: marketing page is noindex (header/meta)"))

    # Canonical checks
    if global_cfg.get("require_self_canonical_on_marketing_pages", True):
        if not isinstance(html_or_err, str):
            results.append(CheckResult(False, f"{brand['name']} {path}", f"FAIL: expected HTML but got non-HTML content-type"))
            return results

        soup = BeautifulSoup(html_or_err, "lxml")
        canon = get_rel_canonical(soup)
        if not canon:
            results.append(CheckResult(False, f"{brand['name']} {path} canonical", "FAIL: missing rel=canonical"))
        else:
            canon_abs = canon if "://" in canon else urljoin(final_url, canon)
            canon_parsed = urlparse(canon_abs)
            if canon_parsed.netloc != preferred_host:
                results.append(CheckResult(False, f"{brand['name']} {path} canonical", f"FAIL: canonical host {canon_parsed.netloc} != preferred {preferred_host} ({canon_abs})"))
            else:
                # Path should match
                fp = urlparse(final_url)
                if norm_path(canon_parsed.path) != norm_path(fp.path):
                    results.append(CheckResult(False, f"{brand['name']} {path} canonical", f"FAIL: canonical path {canon_parsed.path} != final path {fp.path}"))
                else:
                    # Should not contain query
                    if canon_parsed.query:
                        results.append(CheckResult(False, f"{brand['name']} {path} canonical", f"FAIL: canonical contains query params: {canon_abs}"))
                    else:
                        results.append(CheckResult(True, f"{brand['name']} {path} canonical", f"OK: {canon_abs}"))

            # Disallow cross-domain canonicals
            if global_cfg.get("disallow_cross_domain_canonicals", True):
                if canon_parsed.netloc and canon_parsed.netloc in all_hosts and canon_parsed.netloc != preferred_host:
                    results.append(CheckResult(False, f"{brand['name']} {path} canonical cross-domain", f"FAIL: canonical points to other brand/app host: {canon_parsed.netloc}"))

        # Cross-brand link footprint (soft-hard gate; config max_cross_brand_links_per_page)
        max_links = int(global_cfg.get("max_cross_brand_links_per_page", 999))
        if max_links < 999:
            links = []
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if href.startswith("#") or href.startswith("mailto:") or href.startswith("tel:"):
                    continue
                absu = href if "://" in href else urljoin(final_url, href)
                h = urlparse(absu).netloc
                if h and h in all_hosts and h != preferred_host:
                    links.append(absu)
            if len(links) > max_links:
                results.append(CheckResult(False, f"{brand['name']} {path} cross-brand links", f"FAIL: found {len(links)} cross-brand links (max {max_links}). Example: {links[:3]}"))
            else:
                results.append(CheckResult(True, f"{brand['name']} {path} cross-brand links", f"OK: {len(links)} (max {max_links})"))

    return results


def check_robots_and_sitemap(brand: Dict[str, Any], all_hosts: Set[str], global_cfg: Dict[str, Any]) -> List[CheckResult]:
    results: List[CheckResult] = []
    ua = global_cfg["user_agent"]
    timeout = int(global_cfg["timeout_seconds"])
    follow = bool(global_cfg.get("follow_redirects", True))

    host = brand["marketing_host"]
    preferred_host = brand.get("preferred_host", host)

    # robots.txt
    robots_url = f"https://{host}/robots.txt"
    resp, final_url, text_or_err = fetch(robots_url, ua, timeout, follow_redirects=follow)
    if resp is None or resp.status_code >= 400:
        results.append(CheckResult(False, f"{brand['name']} robots.txt", f"FAIL: could not fetch robots.txt ({text_or_err})"))
    else:
        # robots is text/plain; we still have resp.text
        body = resp.text
        # ensure it doesn't mention other hosts
        bad_refs = [h for h in all_hosts if h != preferred_host and h in body]
        if bad_refs:
            results.append(CheckResult(False, f"{brand['name']} robots.txt contamination", f"FAIL: robots.txt references other host(s): {bad_refs}"))
        else:
            results.append(CheckResult(True, f"{brand['name']} robots.txt", "OK"))

        # sitemap directive (recommended)
        if "sitemap:" not in body.lower():
            results.append(CheckResult(False, f"{brand['name']} robots.txt sitemap", "FAIL: robots.txt missing Sitemap: directive (recommended)"))
        else:
            # basic check: sitemap line points to same host
            lines = [ln.strip() for ln in body.splitlines() if ln.strip().lower().startswith("sitemap:")]
            bad = []
            for ln in lines:
                parts = ln.split(":", 1)
                if len(parts) == 2:
                    sm_url = parts[1].strip()
                    h = urlparse(sm_url).netloc
                    if h and h != preferred_host:
                        bad.append(sm_url)
            if bad:
                results.append(CheckResult(False, f"{brand['name']} robots.txt sitemap host", f"FAIL: Sitemap points to other host(s): {bad}"))
            else:
                results.append(CheckResult(True, f"{brand['name']} robots.txt sitemap", "OK"))

    # sitemap.xml
    sitemap_url = f"https://{host}/sitemap.xml"
    resp, final_url, body_or_err = fetch(sitemap_url, ua, timeout, follow_redirects=follow)
    if resp is None or resp.status_code >= 400:
        results.append(CheckResult(False, f"{brand['name']} sitemap.xml", f"FAIL: could not fetch sitemap.xml ({body_or_err})"))
        return results

    # Parse xml
    try:
        xml_text = resp.text
        root = ET.fromstring(xml_text)
        locs = []
        for loc in root.findall(".//{*}loc"):
            if loc.text:
                locs.append(loc.text.strip())
        if not locs:
            results.append(CheckResult(False, f"{brand['name']} sitemap.xml", "FAIL: sitemap contains no <loc> entries"))
            return results

        # Ensure all loc hosts match
        if global_cfg.get("sitemap_host_must_match", True):
            bad_locs = []
            for u in locs:
                h = urlparse(u).netloc
                if h and h != preferred_host:
                    bad_locs.append(u)
            if bad_locs:
                results.append(CheckResult(False, f"{brand['name']} sitemap.xml host", f"FAIL: sitemap contains other hosts. Examples: {bad_locs[:5]}"))
            else:
                results.append(CheckResult(True, f"{brand['name']} sitemap.xml host", f"OK: {len(locs)} URLs"))

        # Ensure sitemap doesn't contain app subdomains (already covered by host check, but explicit)
        app_hosts = [a["host"] for a in brand.get("app_hosts", [])]
        app_hits = [u for u in locs if urlparse(u).netloc in app_hosts]
        if app_hits:
            results.append(CheckResult(False, f"{brand['name']} sitemap.xml app leakage", f"FAIL: sitemap contains app URLs: {app_hits[:3]}"))
        else:
            results.append(CheckResult(True, f"{brand['name']} sitemap.xml app leakage", "OK"))

    except ET.ParseError as e:
        results.append(CheckResult(False, f"{brand['name']} sitemap.xml parse", f"FAIL: sitemap.xml not valid XML: {e}"))

    return results


def check_app_hosts(brand: Dict[str, Any], global_cfg: Dict[str, Any]) -> List[CheckResult]:
    results: List[CheckResult] = []
    ua = global_cfg["user_agent"]
    timeout = int(global_cfg["timeout_seconds"])
    follow = bool(global_cfg.get("follow_redirects", True))

    for app in brand.get("app_hosts", []):
        host = app["host"]
        require_noindex = bool(app.get("require_noindex", True))
        for path in app.get("test_paths", ["/"]):
            url = f"https://{host}{path}"
            resp, final_url, html_or_err = fetch(url, ua, timeout, follow_redirects=follow)
            if resp is None:
                results.append(CheckResult(False, f"{brand['name']} app {host}{path}", f"FAIL: request error: {html_or_err}"))
                continue
            if resp.status_code >= 500:
                results.append(CheckResult(False, f"{brand['name']} app {host}{path}", f"FAIL: HTTP {resp.status_code}"))
                continue

            if require_noindex:
                is_noindex = has_noindex(resp, html_or_err if isinstance(html_or_err, str) else None)
                if not is_noindex:
                    results.append(CheckResult(False, f"{brand['name']} app {host}{path} noindex", f"FAIL: app response missing noindex header/meta (final: {final_url})"))
                else:
                    results.append(CheckResult(True, f"{brand['name']} app {host}{path} noindex", "OK"))

    return results


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True, help="Path to ci/seo_safety_rules.json")
    args = ap.parse_args()

    with open(args.config, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    global_cfg = cfg["global"]
    brands = cfg["brands"]

    # Build host allowlist for cross-domain checks
    all_hosts: Set[str] = set()
    for b in brands:
        all_hosts.add(b["marketing_host"])
        for a in b.get("app_hosts", []):
            all_hosts.add(a["host"])

    checks: List[CheckResult] = []

    # Run checks
    for b in brands:
        checks.append(check_www_redirect(b["marketing_host"], b.get("preferred_host", b["marketing_host"]), global_cfg))
        for p in b.get("marketing_pages", ["/"]):
            checks.extend(check_marketing_page(b, all_hosts, global_cfg, p))
        checks.extend(check_robots_and_sitemap(b, all_hosts, global_cfg))
        checks.extend(check_app_hosts(b, global_cfg))

    # Print summary
    failed = [c for c in checks if not c.ok]
    for c in checks:
        status = "PASS" if c.ok else "FAIL"
        print(f"[{status}] {c.name} — {c.details}")

    print("")
    print(f"Total checks: {len(checks)} | Failed: {len(failed)}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
