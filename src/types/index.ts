export type User = {
  id: string;
  email: string;
  login: string;
  avatarUrl: string;
  createdAt: string;
};

export type SubscriptionTier = 'free' | 'pro' | 'agency';

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  subscriptionTier: 'free' | 'pro' | 'agency'; // Matches PR #10 (RBAC)

  // --- Branding Fields (PR #8) ---
  brandColor?: string;
  logoUrl?: string;
  customDomain?: string;
  theme?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  // -------------------------------

  createdAt: string;
}

export type MemberRole = 'owner' | 'admin' | 'member';

export type Membership = {
  id: string;
  userId: string;
  orgId: string;
  email: string;
  role: MemberRole;
  status: 'active' | 'invited' | 'suspended';
  createdAt: string;
  updatedAt: string;
};

export type DomainStatus = 'pending_cname' | 'issuing' | 'pending_validation' | 'active' | 'error';

// 2. Update the Domain interface
export type Domain = {
  id: string;
  orgId: string;
  domainName: string;
  status: DomainStatus;
  cnameTarget: string;
  
  // Add these missing Cloudflare fields:
  cfCustomHostnameId?: string;
  cfStatus?: string;
  cfSslStatus?: string;
  cfVerificationErrors?: any[]; // Using any[] to safely handle the JSON array
  
  lastIssuedAt?: string;
  expiresAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type OAuthProvider = 'cloudflare' | 'godaddy' | 'route53' | 'other';

export type OAuthConnection = {
  id: string;
  orgId: string;
  provider: OAuthProvider;
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type JobType = 'dns_check' | 'start_issuance' | 'renewal';
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type Job = {
  id: string;
  type: JobType;
  domainId: string;
  status: JobStatus;
  attempts: number;
  lastError?: string;
  result?: any;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  orgId: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: any;
  createdAt: string;
};

export type APIToken = {
  id: string;
  orgId: string;
  name: string;
  tokenHash: string;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
};

export type WebhookEndpoint = {
  id: string;
  orgId: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  createdAt: string;
};

export type PlanLimits = {
  maxDomains: number;
  apiAccess: boolean;
  teamAccess: boolean;
  auditLogs: boolean;
  singleClickCNAME: boolean;
  whiteLabel: boolean;
  support: 'community' | 'email' | 'priority';
};

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  free: {
    maxDomains: 3,
    apiAccess: false,
    teamAccess: false,
    auditLogs: false,
    singleClickCNAME: false,
    whiteLabel: false,
    support: 'community',
  },
  pro: {
    maxDomains: 15,
    apiAccess: true,
    teamAccess: false,
    auditLogs: false,
    singleClickCNAME: false,
    whiteLabel: false,
    support: 'email',
  },
  agency: {
    maxDomains: 50,
    apiAccess: true,
    teamAccess: true,
    auditLogs: true,
    singleClickCNAME: true,
    whiteLabel: true,
    support: 'priority',
  },
};

/**
 * Get effective max domains for a user, considering platform owner status
 */
export function getEffectiveMaxDomains(
  org: Organization | undefined,
  userEmail: string | undefined
): number {
  // Platform owner has unlimited domains
  const ownerEmail = import.meta.env.VITE_PLATFORM_OWNER_EMAIL;
  if (ownerEmail && userEmail && userEmail.toLowerCase() === ownerEmail.toLowerCase()) {
    return Infinity;
  }
  
  // Normal users follow plan limits
  if (!org) return PLAN_LIMITS.free.maxDomains;
  return PLAN_LIMITS[org.subscriptionTier].maxDomains;
}

export type EnvironmentVariable = {
  key: string;
  isSet: boolean;
  description: string;
  required: boolean;
};
