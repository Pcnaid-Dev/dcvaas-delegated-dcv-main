/**
 * CAA Record Inspector and Parser
 * 
 * This module provides utilities for:
 * - Parsing CAA (Certification Authority Authorization) DNS records
 * - Validating CAA syntax
 * - Detecting misconfigurations
 * - Identifying which Certificate Authorities can issue certificates
 */

export type CAATag = 'issue' | 'issuewild' | 'iodef';

export type CAARecord = {
  flags: number;
  tag: CAATag | string;
  value: string;
  raw: string;
};

export type CAAPolicy = {
  issue: string[];
  issuewild: string[];
  iodef: string[];
};

export type CAAInspectionResult = {
  domain: string;
  hasCAA: boolean;
  records: CAARecord[];
  policy: CAAPolicy;
  allowedCAs: string[];
  warnings: CAAWarning[];
  errors: string[];
  isValid: boolean;
};

export type CAAWarning = {
  type: 'blocked_all' | 'blocked_wildcards' | 'syntax_error' | 'misconfiguration' | 'cloudflare_blocked';
  message: string;
  severity: 'error' | 'warning' | 'info';
};

// Known Certificate Authorities
export const KNOWN_CAS = {
  'letsencrypt.org': "Let's Encrypt",
  'digicert.com': 'DigiCert',
  'sectigo.com': 'Sectigo',
  'globalsign.com': 'GlobalSign',
  'godaddy.com': 'GoDaddy',
  'ssl.com': 'SSL.com',
  'buypass.com': 'Buypass',
  'pki.goog': 'Google Trust Services',
  'amazontrust.com': 'Amazon Trust Services',
  'comodoca.com': 'Comodo',
  'entrust.net': 'Entrust',
  'usertrust.com': 'USERTrust',
  'identrust.com': 'IdenTrust',
  'trust-provider.com': 'SwissSign',
  'quovadisglobal.com': 'QuoVadis',
  // Cloudflare-specific
  'cloudflare.com': 'Cloudflare',
  'comodoca.com; cansignhttpexchanges=yes': 'Cloudflare (with HTTP Exchange signing)',
  'digicert.com; cansignhttpexchanges=yes': 'Cloudflare (with HTTP Exchange signing)',
  'letsencrypt.org; cansignhttpexchanges=yes': 'Cloudflare (with HTTP Exchange signing)',
  'pki.goog; cansignhttpexchanges=yes': 'Cloudflare (with HTTP Exchange signing)',
};

// CAs commonly used by Cloudflare for SaaS
export const CLOUDFLARE_CAS = [
  'digicert.com',
  'letsencrypt.org',
  'pki.goog',
];

/**
 * Parse a CAA record from DNS-over-HTTPS response format
 */
export function parseCAARecord(data: string): CAARecord | null {
  try {
    // CAA record format in DNS-over-HTTPS: "flags tag value"
    // Example: "0 issue \"letsencrypt.org\""
    const parts = data.match(/^(\d+)\s+(\w+)\s+"?([^"]+)"?$/);
    
    if (!parts || parts.length < 4) {
      return null;
    }

    const [, flags, tag, value] = parts;
    
    return {
      flags: parseInt(flags, 10),
      tag: tag.toLowerCase() as CAATag,
      value: value.trim(),
      raw: data,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Build CAA policy from records
 */
export function buildCAAPolicy(records: CAARecord[]): CAAPolicy {
  const policy: CAAPolicy = {
    issue: [],
    issuewild: [],
    iodef: [],
  };

  for (const record of records) {
    const tag = record.tag.toLowerCase();
    
    if (tag === 'issue') {
      policy.issue.push(record.value);
    } else if (tag === 'issuewild') {
      policy.issuewild.push(record.value);
    } else if (tag === 'iodef') {
      policy.iodef.push(record.value);
    }
  }

  return policy;
}

/**
 * Extract CA identifiers from policy values
 */
export function extractAllowedCAs(policy: CAAPolicy): string[] {
  const cas = new Set<string>();

  // Process issue tags
  for (const value of policy.issue) {
    if (value && value !== ';') {
      // Extract CA domain (before any semicolon for parameters)
      const ca = value.split(';')[0].trim();
      if (ca) {
        cas.add(ca);
      }
    }
  }

  // Process issuewild tags
  for (const value of policy.issuewild) {
    if (value && value !== ';') {
      const ca = value.split(';')[0].trim();
      if (ca) {
        cas.add(ca);
      }
    }
  }

  return Array.from(cas).filter(ca => ca.length > 0);
}

/**
 * Get friendly CA name
 */
export function getCAName(caIdentifier: string): string {
  // Try exact match first
  if (KNOWN_CAS[caIdentifier as keyof typeof KNOWN_CAS]) {
    return KNOWN_CAS[caIdentifier as keyof typeof KNOWN_CAS];
  }

  // Try to match base domain
  for (const [key, name] of Object.entries(KNOWN_CAS)) {
    if (caIdentifier.includes(key.split(';')[0].trim())) {
      return name;
    }
  }

  return caIdentifier;
}

/**
 * Analyze CAA policy and generate warnings
 */
export function analyzeCAAPolicy(domain: string, records: CAARecord[], policy: CAAPolicy): CAAWarning[] {
  const warnings: CAAWarning[] = [];

  // Check if all issuance is blocked
  const hasBlockAllIssue = policy.issue.some(v => v === ';' || v === '');
  const hasBlockAllWild = policy.issuewild.some(v => v === ';' || v === '');
  
  if (hasBlockAllIssue) {
    warnings.push({
      type: 'blocked_all',
      message: 'CAA record blocks ALL certificate issuance for this domain. No CA can issue certificates.',
      severity: 'error',
    });
  }

  if (hasBlockAllWild && !hasBlockAllIssue) {
    warnings.push({
      type: 'blocked_wildcards',
      message: 'CAA record blocks wildcard certificate issuance. Wildcard certificates cannot be issued for this domain.',
      severity: 'warning',
    });
  }

  // Check for Cloudflare compatibility
  const allowedCAs = extractAllowedCAs(policy);
  const hasCloudflareCA = allowedCAs.some(ca => 
    CLOUDFLARE_CAS.some(cfCA => ca.includes(cfCA))
  );

  if (allowedCAs.length > 0 && !hasCloudflareCA) {
    warnings.push({
      type: 'cloudflare_blocked',
      message: `Your CAA records don't allow Cloudflare's certificate authorities (${CLOUDFLARE_CAS.map(getCAName).join(', ')}). This may prevent certificate issuance through Cloudflare for SaaS.`,
      severity: 'error',
    });
  }

  // Check for syntax errors
  for (const record of records) {
    if (!['issue', 'issuewild', 'iodef'].includes(record.tag.toLowerCase())) {
      warnings.push({
        type: 'syntax_error',
        message: `Unknown CAA tag: "${record.tag}". Valid tags are: issue, issuewild, iodef.`,
        severity: 'warning',
      });
    }
  }

  return warnings;
}

/**
 * Generate a recommended CAA policy for Cloudflare
 */
export function generateCloudflareCAA(domain: string): string[] {
  return [
    `${domain} CAA 0 issue "letsencrypt.org"`,
    `${domain} CAA 0 issue "digicert.com"`,
    `${domain} CAA 0 issue "pki.goog"`,
    `${domain} CAA 0 issuewild "letsencrypt.org"`,
    `${domain} CAA 0 issuewild "digicert.com"`,
    `${domain} CAA 0 issuewild "pki.goog"`,
  ];
}

/**
 * Format CAA policy as user-friendly text
 */
export function formatCAAPolicy(policy: CAAPolicy): string {
  const lines: string[] = [];

  if (policy.issue.length > 0) {
    lines.push('**Issue (Standard Certificates):**');
    policy.issue.forEach(ca => {
      if (ca === ';' || ca === '') {
        lines.push('  • ❌ Blocked - No CA can issue');
      } else {
        lines.push(`  • ✓ ${getCAName(ca)}`);
      }
    });
  }

  if (policy.issuewild.length > 0) {
    lines.push('');
    lines.push('**Issue Wildcard (Wildcard Certificates):**');
    policy.issuewild.forEach(ca => {
      if (ca === ';' || ca === '') {
        lines.push('  • ❌ Blocked - No CA can issue wildcards');
      } else {
        lines.push(`  • ✓ ${getCAName(ca)}`);
      }
    });
  }

  if (policy.iodef.length > 0) {
    lines.push('');
    lines.push('**IODEF (Incident Reporting):**');
    policy.iodef.forEach(contact => {
      lines.push(`  • ${contact}`);
    });
  }

  return lines.join('\n');
}
