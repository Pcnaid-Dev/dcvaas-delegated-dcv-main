// src/lib/data.ts
// Data layer for the DCVaaS UI.
// - Domains & jobs: talk to the Cloudflare Worker API.
// - Users/orgs/tokens/audit: localStorage stubs for now so the UI never crashes.

import type { Organization, User, Domain, Job, AuditLog, APIToken, Membership, WebhookEndpoint } from '@/types'; 

// Define default user for fallback/mocking
const DEFAULT_USER: User = {
  id: 'user_1',
  email: 'admin@pcnaid.com',
  login: 'Admin',
  avatarUrl: '',
  createdAt: new Date().toISOString(),
};

// Define default organization for fallback/mocking
const DEFAULT_ORG: Organization = {
  id: 'org_1',
  name: 'Pcnaid Default Org - Test',
  ownerId: 'user_1',
  subscriptionTier: 'agency', // Upgrade from 'pro' to 'agency'
  createdAt: new Date().toISOString(),
};

/**
 * Resolve brand-specific API base URL
 * Falls back to VITE_API_BASE_URL or default production URL
 */
function resolveApiBaseUrl(): string {
  // If explicit API base URL is set, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '');
  }

  // Otherwise, determine based on current hostname (brand)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase().replace(/^www\./, '');
    
    // Brand-specific API URLs
    if (hostname === 'keylessssl.dev' || hostname === 'app.keylessssl.dev') {
      return 'https://api.keylessssl.dev';
    }
    if (hostname === 'delegatedssl.com' || hostname === 'portal.delegatedssl.com') {
      return 'https://api.delegatedssl.com';
    }
    if (hostname === 'autocertify.net' || hostname === 'wizard.autocertify.net') {
      return 'https://api.autocertify.net';
    }
  }

  // Default to production URL
  return 'https://dcv.pcnaid.com';
}

const API_BASE_URL = resolveApiBaseUrl();
const API_TOKEN = import.meta.env.VITE_API_TOKEN;
const PLATFORM_OWNER_EMAIL = import.meta.env.VITE_PLATFORM_OWNER_EMAIL;

// ===== Helpers =====

/**
 * Check if we're in token auth mode (single org mode)
 */
export function isTokenMode(): boolean {
  return !!API_TOKEN;
}

/**
 * Check if current user is the platform owner
 */
export function isPlatformOwner(userEmail: string | undefined): boolean {
  if (!userEmail || !PLATFORM_OWNER_EMAIL) return false;
  return userEmail.toLowerCase() === PLATFORM_OWNER_EMAIL.toLowerCase();
}

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
    let errorMessage = res.statusText;
    
    try {
      body = await res.json();
      errorMessage = body?.error || body?.message || body?.details || res.statusText;
      
      // If body has additional error details, include them
      if (body?.details && typeof body.details === 'string') {
        errorMessage = `${errorMessage} - ${body.details}`;
      }
    } catch {
      // If JSON parsing fails, try to get text response
      try {
        const text = await res.text();
        if (text) {
          errorMessage = `${res.statusText}: ${text.substring(0, 200)}`;
        }
      } catch {
        // ignore parse error
      }
    }
    
    console.error('API error', { url, status: res.status, statusText: res.statusText, body });
    throw new Error(`API ${res.status}: ${errorMessage}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// ===== LocalStorage keys =====

const LOCAL_USER_KEY = 'dcvaas_user';
const LOCAL_ORG_KEY = 'dcvaas_org';
const LOCAL_ORG_LIST_KEY = 'dcvaas_orgs';
const LOCAL_MEMBERS_KEY = 'dcvaas_members';
const LOCAL_TOKENS_KEY = 'dcvaas_tokens';
const LOCAL_AUDIT_KEY = 'dcvaas_audit_logs';

// ===== USERS & ORGS (used by AppShell/AuthContext) =====

async function fetchOrganizationFromAPI(): Promise<Organization | null> {
  if (!API_TOKEN) return null;
  
  try {
    const res = await api<{ organization: Organization }>('/api/organizations');
    const org = res.organization;
    
    localStorage.setItem(LOCAL_ORG_KEY, JSON.stringify(org));
    localStorage.setItem(LOCAL_ORG_LIST_KEY, JSON.stringify([org]));
    
    return org;
  } catch (err) {
    console.warn('Failed to fetch organization from API, falling back to localStorage', err);
    return null;
  }
}

export async function getUser(): Promise<User> {
  if (!isBrowser()) return DEFAULT_USER;

  const raw = localStorage.getItem(LOCAL_USER_KEY);
  if (!raw) {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(DEFAULT_USER));
    return DEFAULT_USER;
  }

  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_USER, ...parsed };
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

export async function getUserOrganizations(): Promise<Organization[]> {
  // If running in browser, try to get the current logged-in user context
  let currentUserId = null;
  try {
    const userRaw = localStorage.getItem(LOCAL_USER_KEY);
    if (userRaw) currentUserId = JSON.parse(userRaw).id;
  } catch {}

  // 1. Try API if token is present
  const orgFromAPI = await fetchOrganizationFromAPI();
  if (orgFromAPI) return [orgFromAPI];

  // 2. Fallback to Local Storage (Stub Mode)
  const rawList = localStorage.getItem(LOCAL_ORG_LIST_KEY);
  if (rawList) {
    try {
      const list = JSON.parse(rawList) as Organization[];
      
      // FILTER: Only return orgs owned by THIS user (fixes data leak)
      if (currentUserId && Array.isArray(list)) {
        const userOrgs = list.filter(o => o.ownerId === currentUserId);
        if (userOrgs.length > 0) return userOrgs;
      } else if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    } catch { /* ignore */ }

    // 3. Create a fresh default org for this SPECIFIC user if none exists
  const newDefaultOrg = {
    ...DEFAULT_ORG,
    id: currentUserId ? `org_${currentUserId}` : DEFAULT_ORG.id,
    ownerId: currentUserId || DEFAULT_USER.id,
    name: currentUserId ? 'My Organization' : DEFAULT_ORG.name
    };
  }
  localStorage.setItem(LOCAL_ORG_KEY, JSON.stringify(DEFAULT_ORG));
  // Don't save to global list yet to avoid polluting shared state, 
  // but return it so the UI works
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

export function setDomain(_domain: Domain): void {}

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

export function setJob(_job: Job): void {}

// ===== API TOKENS (real API) =====

export async function getOrgAPITokens(): Promise<APIToken[]> {
  try {
    const res = await api<{ tokens: APIToken[] }>('/api/tokens');
    return res?.tokens ?? [];
  } catch (err) {
    console.warn('getOrgAPITokens failed', err);
    return [];
  }
}

// FIX: Update this function signature
export async function createAPIToken(name: string, expiresAt: string | null = null): Promise<{ token: string; tokenMeta: APIToken }> {
  const res = await api<{ token: string; tokenMeta: APIToken }>('/api/tokens', {
    method: 'POST',
    body: JSON.stringify({ name, expiresAt }),
  });
  return res;
}

export async function deleteAPIToken(id: string): Promise<void> {
  await api(`/api/tokens/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ===== AUDIT LOGS (local stub) =====

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

// ===== TEAM MEMBERS (real API) =====

export async function getOrgMembers(orgId: string): Promise<Membership[]> {
  try {
    const res = await api<{ members: Membership[] }>(`/api/orgs/${encodeURIComponent(orgId)}/members`);
    return res?.members ?? [];
  } catch (err) {
    console.warn('getOrgMembers failed', err);
    return [];
  }
}

export async function inviteOrgMember(orgId: string, email: string, role: 'owner' | 'admin' | 'member' = 'member'): Promise<Membership> {
  const res = await api<{ member: Membership }>(`/api/orgs/${encodeURIComponent(orgId)}/members/invite`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
  return res.member;
}

export async function removeOrgMember(orgId: string, userId: string): Promise<void> {
  await api(`/api/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

export async function updateOrgMemberRole(orgId: string, userId: string, role: 'owner' | 'admin' | 'member'): Promise<Membership> {
  const res = await api<{ member: Membership }>(`/api/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
  return res.member;
}

export async function acceptOrgInvitation(orgId: string, userId: string, email: string): Promise<void> {
  await api(`/api/orgs/${encodeURIComponent(orgId)}/members/accept`, {
    method: 'POST',
    body: JSON.stringify({ userId, email }),
  });
}

// ===== WEBHOOKS (real API) =====

export async function getOrgWebhooks(): Promise<WebhookEndpoint[]> {
  try {
    const res = await api<{ webhooks: WebhookEndpoint[] }>('/api/webhooks');
    return res?.webhooks ?? [];
  } catch (err) {
    console.warn('getOrgWebhooks failed', err);
    return [];
  }
}

export async function createWebhook(url: string, events: string[]): Promise<{ webhook: WebhookEndpoint & { secret: string } }> {
  const res = await api<{ webhook: WebhookEndpoint & { secret: string } }>('/api/webhooks', {
    method: 'POST',
    body: JSON.stringify({ url, events }),
  });
  return res;
}

export async function updateWebhook(id: string, updates: { url?: string; events?: string[]; enabled?: boolean }): Promise<void> {
  await api(`/api/webhooks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteWebhook(id: string): Promise<void> {
  await api(`/api/webhooks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function updateWebhookEnabled(webhookId: string, enabled: boolean): Promise<void> {
  await api(`/api/webhooks/${encodeURIComponent(webhookId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

// ===== BILLING / STRIPE =====

export async function createStripeCheckoutSession(priceId: string): Promise<{ url: string }> {
  const res = await api<{ url: string }>('/api/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ priceId }),
  });
  return res;
}

// ===== OAUTH CONNECTIONS =====

export interface OAuthConnection {
  id: string;
  org_id: string;
  provider: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export async function exchangeOAuthCode(provider: string, code: string, redirectUri: string): Promise<OAuthConnection> {
  const res = await api<{ connection: OAuthConnection }>('/api/oauth/exchange', {
    method: 'POST',
    body: JSON.stringify({ provider, code, redirectUri }),
  });
  return res.connection;
}

export async function listOAuthConnections(): Promise<OAuthConnection[]> {
  const res = await api<{ connections: OAuthConnection[] }>('/api/oauth/connections');
  return res?.connections ?? [];
}

export async function deleteOAuthConnection(provider: string): Promise<void> {
  await api(`/api/oauth/connections/${encodeURIComponent(provider)}`, {
    method: 'DELETE',
  });
}
