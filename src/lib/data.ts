// src/lib/data.ts
// Data layer for the DCVaaS UI.
// - Domains & jobs: talk to the Cloudflare Worker API.
// - Users/orgs/tokens/audit: localStorage stubs for now so the UI never crashes.

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://dcv.pcnaid.com').replace(/\/+$/, '');
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

// ===== Helpers =====

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (API_TOKEN) {
    headers['Authorization'] = `Bearer ${API_TOKEN}`;
  }

  return {
    ...headers,
    ...(extra || {}),
  };
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: authHeaders(init.headers as HeadersInit),
  });

  if (!res.ok) {
    let body: any;
    try {
      body = await res.json();
    } catch {
      // ignore parse error
    }
    const msg = body?.error || body?.message || res.statusText;
    console.error('API error', { url, status: res.status, body });
    throw new Error(`API ${res.status} ${msg}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// ===== Very loose types =====

export type Domain = any;
export type Job = any;
export type AuditLog = any;
export type APIToken = any;

export type User = {
  id: string;
  email: string;
  name?: string | null;
  [key: string]: any;
};

export type Organization = {
  id: string;
  name: string;
  slug?: string | null;
  plan?: string | null;
  [key: string]: any;
};

export type Membership = any;

// ===== Default objects so the UI never crashes =====

const DEFAULT_USER: User = {
  id: 'user_1',
  email: 'admin@pcnaid.com',
  name: 'Admin',
};

const DEFAULT_ORG: Organization = {
  id: 'org_1',
  name: 'Pcnaid Default Org',
  slug: 'pcnaid',
  plan: 'dev',
};

// ===== LocalStorage keys =====

const LOCAL_USER_KEY = 'dcvaas_user';
const LOCAL_ORG_KEY = 'dcvaas_org';
const LOCAL_ORG_LIST_KEY = 'dcvaas_orgs';
const LOCAL_MEMBERS_KEY = 'dcvaas_members';
const LOCAL_TOKENS_KEY = 'dcvaas_tokens';
const LOCAL_AUDIT_KEY = 'dcvaas_audit_logs';

// ===== USERS & ORGS (used by AppShell/AuthContext) =====

// Always return a user object so code like user.name.substring() doesn't crash
export async function getUser(): Promise<User> {
  if (!isBrowser()) return DEFAULT_USER;

  const raw = localStorage.getItem(LOCAL_USER_KEY);
  if (!raw) {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(DEFAULT_USER));
    return DEFAULT_USER;
  }

  try {
    const parsed = JSON.parse(raw);
    // Ensure critical fields exist
    return {
      ...DEFAULT_USER,
      ...parsed,
    };
  } catch {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(DEFAULT_USER));
    return DEFAULT_USER;
  }
}

export async function setUser(user: User | null): Promise<void> {
  if (!isBrowser()) return;
  if (!user) {
    localStorage.removeItem(LOCAL_USER_KEY);
    return;
  }
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
}

// AppShell often takes the first org in this list -> always return at least [DEFAULT_ORG]
export async function getUserOrganizations(): Promise<Organization[]> {
  if (!isBrowser()) return [DEFAULT_ORG];

  // Try explicit list first
  const rawList = localStorage.getItem(LOCAL_ORG_LIST_KEY);
  if (rawList) {
    try {
      const list = JSON.parse(rawList) as Organization[];
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {
      // ignore
    }
  }

  // Then single org
  const rawOrg = localStorage.getItem(LOCAL_ORG_KEY);
  if (rawOrg) {
    try {
      const org = JSON.parse(rawOrg) as Organization;
      return [org];
    } catch {
      // ignore
    }
  }

  // Seed defaults
  localStorage.setItem(LOCAL_ORG_KEY, JSON.stringify(DEFAULT_ORG));
  localStorage.setItem(LOCAL_ORG_LIST_KEY, JSON.stringify([DEFAULT_ORG]));
  return [DEFAULT_ORG];
}

export async function getOrganization(): Promise<Organization> {
  const orgs = await getUserOrganizations();
  return orgs[0] ?? DEFAULT_ORG;
}

export async function setOrganization(org: Organization | null): Promise<void> {
  if (!isBrowser()) return;

  if (!org) {
    localStorage.removeItem(LOCAL_ORG_KEY);
    localStorage.removeItem(LOCAL_ORG_LIST_KEY);
    return;
  }

  localStorage.setItem(LOCAL_ORG_KEY, JSON.stringify(org));

  const current = await getUserOrganizations();
  const list = [...current];
  const idx = list.findIndex((o) => o.id === org.id);
  if (idx >= 0) list[idx] = org;
  else list.push(org);

  localStorage.setItem(LOCAL_ORG_LIST_KEY, JSON.stringify(list));
}

export async function addMembership(member: Membership): Promise<void> {
  if (!isBrowser()) return;
  const raw = localStorage.getItem(LOCAL_MEMBERS_KEY);
  const list: Membership[] = raw ? JSON.parse(raw) : [];
  list.push(member);
  localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(list));
}

// ===== DOMAINS (real API) =====

export async function getOrgDomains(_orgId?: string): Promise<Domain[]> {
  try {
    const res = await api<{ domains: Domain[] }>('/api/domains');
    return res?.domains ?? [];
  } catch (err) {
    console.warn('getOrgDomains failed', err);
    return [];
  }
}

export async function getAllDomains(): Promise<Domain[]> {
  return getOrgDomains();
}

export async function getDomain(domainId: string): Promise<Domain> {
  const res = await api<{ domain: Domain }>(`/api/domains/${encodeURIComponent(domainId)}`);
  return res.domain;
}

export async function createDomain(domainName: string): Promise<Domain> {
  const res = await api<{ domain: Domain }>(`/api/domains`, {
    method: 'POST',
    body: JSON.stringify({ hostname: domainName, domainName }),
  });
  return res.domain;
}

// Older pages may still call addDomain
export const addDomain = createDomain;

export async function verifyDomain(domainId: string): Promise<void> {
  await api(`/api/domains/${encodeURIComponent(domainId)}/sync`, {
    method: 'POST',
  });
}

export async function syncDomain(domainId: string): Promise<Domain> {
  const res = await api<{ domain: Domain }>(`/api/domains/${encodeURIComponent(domainId)}/sync`, {
    method: 'POST',
  });
  return res.domain;
}

export async function getDomainsExpiringBefore(isoDate: string): Promise<Domain[]> {
  const domains = await getAllDomains();
  const cutoff = new Date(isoDate).getTime();

  return domains.filter((d: any) => {
    const raw = d.expiresAt ?? d.expires_at;
    if (!raw) return false;
    const ts = new Date(raw).getTime();
    return ts <= cutoff;
  });
}

// No-ops kept for compatibility with old Spark template
export function setDomain(_domain: Domain): void {
  // no-op
}

// ===== JOBS (real API) =====

export async function getJobs(domainId?: string): Promise<Job[]> {
  const query = domainId ? `?domainId=${encodeURIComponent(domainId)}` : '';
  try {
    const res = await api<{ jobs: Job[] }>(`/api/jobs${query}`);
    return res?.jobs ?? [];
  } catch (err) {
    console.warn('getJobs failed', err);
    return [];
  }
}

export async function getAllJobs(): Promise<Job[]> {
  return getJobs();
}

export async function getJob(jobId: string): Promise<Job> {
  const res = await api<{ job: Job }>(`/api/jobs/${encodeURIComponent(jobId)}`);
  return res.job;
}

export function setJob(_job: Job): void {
  // no-op
}

// ===== API TOKENS (local stub for now) =====

export async function getOrgAPITokens(): Promise<APIToken[]> {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(LOCAL_TOKENS_KEY);
  return raw ? (JSON.parse(raw) as APIToken[]) : [];
}

export async function addAPIToken(token: APIToken): Promise<void> {
  if (!isBrowser()) return;
  const raw = localStorage.getItem(LOCAL_TOKENS_KEY);
  const list: APIToken[] = raw ? JSON.parse(raw) : [];
  list.push(token);
  localStorage.setItem(LOCAL_TOKENS_KEY, JSON.stringify(list));
}

export async function deleteAPIToken(id: string): Promise<void> {
  if (!isBrowser()) return;
  const raw = localStorage.getItem(LOCAL_TOKENS_KEY);
  const list: APIToken[] = raw ? JSON.parse(raw) : [];
  const filtered = list.filter((t: any) => t.id !== id);
  localStorage.setItem(LOCAL_TOKENS_KEY, JSON.stringify(filtered));
}

// ===== AUDIT LOGS (local stub for now) =====

export async function getOrgAuditLogs(): Promise<AuditLog[]> {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
  return raw ? (JSON.parse(raw) as AuditLog[]) : [];
}

export async function addAuditLog(entry: AuditLog): Promise<void> {
  if (!isBrowser()) return;
  const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
  const list: AuditLog[] = raw ? JSON.parse(raw) : [];
  list.push({
    ...entry,
    id: entry?.id ?? (crypto.randomUUID?.() ?? String(Date.now())),
    createdAt: entry?.createdAt ?? new Date().toISOString(),
  });
  localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(list));
}
