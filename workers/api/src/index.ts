import type { Env } from './env';
import { authenticate, isOwnerOrAdmin, hasRole } from './middleware/auth';
import { json, withCors, preflight, notFound, unauthorized, badRequest, forbidden } from './lib/http';
import { listDomains, getDomain, createDomain, syncDomain, forceRecheck } from './lib/domains';
import { listMembers, inviteMember, removeMember, updateMemberRole } from './lib/members';
import { createCheckoutSession, handleStripeWebhook } from './routes/billing';
import { listAPITokens, createAPIToken, deleteAPIToken } from './lib/tokens';
import { listWebhooks, createWebhook, updateWebhook, deleteWebhook } from './lib/webhooks';
import { createOAuthConnection, listOAuthConnections, deleteOAuthConnection } from './lib/oauth';
import { getOrganization } from './lib/organizations';
import { listJobs, getJob } from './lib/jobs';
import { snakeToCamel } from './lib/utils';
import { PLAN_LIMITS, VALID_JOB_TYPES, type JobType } from '../../../shared/constants';

// Helper function to normalize ETags for comparison
// Removes W/ prefix (weak ETag indicator) and quotes
function normalizeETag(etag: string): string {
  return etag.replace(/^W\//, '').replace(/"/g, '');
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const pf = preflight(req, env);
    if (pf) return pf;

    try {
      const url = new URL(req.url);
      const method = req.method.toUpperCase();

      if (url.pathname === '/health') {
        return withCors(req, env, json({ ok: true }));
      }

      if (!url.pathname.startsWith('/api/')) {
        return withCors(req, env, notFound());
      }

      // Stripe webhook - no authentication required
      if (method === 'POST' && url.pathname === '/api/webhooks/stripe') {
        const response = await handleStripeWebhook(req, env);
        return response;
      }

      // Admin endpoints - require INTERNAL_ADMIN_TOKEN
      if (url.pathname.startsWith('/api/admin/')) {
        const adminToken = req.headers.get('X-Admin-Token');
        if (!adminToken || !env.INTERNAL_ADMIN_TOKEN || adminToken !== env.INTERNAL_ADMIN_TOKEN) {
          return withCors(req, env, new Response(
            JSON.stringify({ error: 'Unauthorized', message: 'Invalid admin token' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          ));
        }

        // POST /api/admin/demo/seed
        if (method === 'POST' && url.pathname === '/api/admin/demo/seed') {
          try {
            const { generateId } = await import('./lib/crypto');
            const now = new Date().toISOString();
            
            // Create demo org
            const orgId = generateId();
            await env.DB.prepare(
              `INSERT INTO organizations (id, name, owner_id, subscription_tier, created_at)
               VALUES (?, ?, ?, ?, ?)`
            ).bind(orgId, 'Demo Organization', 'demo_owner', 'pro', now).run();

            // Create demo domains
            const domainNames = ['demo1.example.com', 'demo2.example.com', 'demo3.example.com'];
            const domainIds = [];
            for (const name of domainNames) {
              const domainId = generateId();
              domainIds.push(domainId);
              await env.DB.prepare(
                `INSERT INTO domains (id, org_id, domain_name, status, cname_target, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
              ).bind(domainId, orgId, name, 'active', env.SAAS_CNAME_TARGET, now, now).run();
            }

            // Create demo jobs
            for (const domainId of domainIds) {
              const jobId = generateId();
              await env.DB.prepare(
                `INSERT INTO jobs (id, type, domain_id, status, attempts, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
              ).bind(jobId, 'dns_check', domainId, 'completed', 1, now, now).run();
            }

            return withCors(req, env, json({
              success: true,
              message: 'Demo data seeded successfully',
              orgId,
              domains: domainIds.length,
              jobs: domainIds.length
            }));
          } catch (err: any) {
            console.error('Demo seed error:', err);
            return withCors(req, env, json({ error: err.message }, 500));
          }
        }

        // POST /api/admin/demo/reset
        if (method === 'POST' && url.pathname === '/api/admin/demo/reset') {
          try {
            // Find demo org
            const demoOrg = await env.DB.prepare(
              `SELECT id FROM organizations WHERE name = 'Demo Organization'`
            ).first<{ id: string }>();

            if (demoOrg) {
              // Delete jobs for demo domains
              await env.DB.prepare(
                `DELETE FROM jobs WHERE domain_id IN (
                   SELECT id FROM domains WHERE org_id = ?
                 )`
              ).bind(demoOrg.id).run();

              // Delete demo domains
              await env.DB.prepare(
                `DELETE FROM domains WHERE org_id = ?`
              ).bind(demoOrg.id).run();

              // Delete demo org
              await env.DB.prepare(
                `DELETE FROM organizations WHERE id = ?`
              ).bind(demoOrg.id).run();
            }

            return withCors(req, env, json({
              success: true,
              message: 'Demo data reset successfully'
            }));
          } catch (err: any) {
            console.error('Demo reset error:', err);
            return withCors(req, env, json({ error: err.message }, 500));
          }
        }

        return withCors(req, env, notFound());
      }

// 1. Ensure this auth check exists first
const auth = await authenticate(req, env);
if (!auth) return withCors(req, env, unauthorized());

// 2. Add the Stripe route block here
if (method === 'POST' && url.pathname === '/api/create-checkout-session') {
  const response = await createCheckoutSession(req, env, auth as any);
  return withCors(req, env, response);
}

      // GET /api/organizations - Get current organization
      if (method === 'GET' && url.pathname === '/api/organizations') {
        const org = await getOrganization(env, auth.orgId);
        if (!org) return withCors(req, env, notFound());
        
        // Transform snake_case from DB to camelCase for frontend
        const response = json({
          organization: snakeToCamel(org)
        });
        return withCors(req, env, response);
      }

      // GET /api/domains
      if (method === 'GET' && url.pathname === '/api/domains') {
        // Parse and validate pagination parameters
        const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 1000));
        const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));
        const domains = await listDomains(env, auth.orgId, limit, offset);
        const response = json({ domains }, 200, {
          'Cache-Control': 'public, max-age=10, stale-while-revalidate=30',
        });
        
        // Check If-None-Match header for ETag support
        const ifNoneMatch = req.headers.get('If-None-Match');
        const etag = response.headers.get('ETag');
        if (ifNoneMatch && etag && normalizeETag(ifNoneMatch) === normalizeETag(etag)) {
          return withCors(req, env, new Response(null, { 
            status: 304, 
            headers: { 
              'ETag': etag,
              'Cache-Control': 'public, max-age=10, stale-while-revalidate=30',
            } 
          }));
        }
        
        return withCors(req, env, response);
      }

      // POST /api/domains
      if (method === 'POST' && url.pathname === '/api/domains') {
        const body = await req.json().catch(() => ({} as any));
        const hostname = String(body.hostname ?? body.domainName ?? '').trim();
        if (!hostname) return withCors(req, env, badRequest('hostname/domainName is required'));
        
        // Check domain limit before creating (unless platform owner)
        const platformOwnerEmail = env.PLATFORM_OWNER_EMAIL?.toLowerCase();
        let isPlatformOwner = false;
        
        if (platformOwnerEmail) {
          // Get org owner's email
          const orgOwner = await env.DB.prepare(
            `SELECT om.email 
             FROM organizations o 
             JOIN organization_members om ON om.user_id = o.owner_id AND om.org_id = o.id
             WHERE o.id = ?`
          ).bind(auth.orgId).first<{ email: string }>();
          
          isPlatformOwner = orgOwner?.email?.toLowerCase() === platformOwnerEmail;
        }
        
        if (!isPlatformOwner) {
          // Get org subscription tier and current domain count
          const org = await env.DB.prepare(
            'SELECT subscription_tier FROM organizations WHERE id = ?'
          ).bind(auth.orgId).first<{ subscription_tier: string }>();
          
          const domainCount = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM domains WHERE org_id = ?'
          ).bind(auth.orgId).first<{ count: number }>();
          
          const tier = org?.subscription_tier || 'free';
          const maxDomains = PLAN_LIMITS[tier as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
          
          if ((domainCount?.count || 0) >= maxDomains) {
            return withCors(req, env, badRequest(`Domain limit reached. Your plan allows ${maxDomains} domains. Upgrade to add more.`));
          }
        }
        
        const domain = await createDomain(env, auth.orgId, hostname);
        return withCors(req, env, json({ domain }, 201));
      }

      // GET /api/domains/:id
      {
        const m = url.pathname.match(/^\/api\/domains\/([^/]+)$/);
        if (m && method === 'GET') {
          const domainId = decodeURIComponent(m[1]);
          const domain = await getDomain(env, auth.orgId, domainId);
          if (!domain) return withCors(req, env, notFound());
          return withCors(req, env, json({ domain }));
        }
      }


      // POST /api/domains/:id/sync (no recheck, just refresh)
      {
        const m = url.pathname.match(/^\/api\/domains\/([^/]+)\/sync$/);
        if (m && method === 'POST') {
          const domainId = decodeURIComponent(m[1]);
          const domain = await syncDomain(env, auth.orgId, domainId);
          if (!domain) return withCors(req, env, notFound());
          return withCors(req, env, json({ domain }));
        }
      }

      // GET /api/orgs/:orgId/members
      {
        const m = url.pathname.match(/^\/api\/orgs\/([^/]+)\/members$/);
        if (m && method === 'GET') {
          const orgId = decodeURIComponent(m[1]);
          if (orgId !== auth.orgId) return withCors(req, env, forbidden());
          
          const members = await listMembers(env, orgId);
          return withCors(req, env, json({ members }));
        }
      }

      // POST /api/orgs/:orgId/members/invite
      {
        const m = url.pathname.match(/^\/api\/orgs\/([^/]+)\/members\/invite$/);
        if (m && method === 'POST') {
          const orgId = decodeURIComponent(m[1]);
          if (orgId !== auth.orgId) return withCors(req, env, forbidden());
          
          // Only owners and admins can invite
          if (!isOwnerOrAdmin(auth)) {
            return withCors(req, env, forbidden('Only owners and admins can invite members'));
          }

          const body = await req.json().catch(() => ({} as any));
          const email = String(body.email ?? '').trim();
          const role = (body.role ?? 'member') as 'owner' | 'admin' | 'member';
          
          if (!email) return withCors(req, env, badRequest('email is required'));
          
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            return withCors(req, env, badRequest('Invalid email format'));
          }
          
          if (!['owner', 'admin', 'member'].includes(role)) {
            return withCors(req, env, badRequest('Invalid role'));
          }

          // Only owners can invite other owners
          if (role === 'owner' && !hasRole(auth, 'owner')) {
            return withCors(req, env, forbidden('Only owners can invite other owners'));
          }

          try {
            const member = await inviteMember(env, orgId, email, role);
            return withCors(req, env, json({ member }, 201));
          } catch (err: any) {
            return withCors(req, env, badRequest(err.message));
          }
        }
      }

      // DELETE /api/orgs/:orgId/members/:userId
      {
        const m = url.pathname.match(/^\/api\/orgs\/([^/]+)\/members\/([^/]+)$/);
        if (m && method === 'DELETE') {
          const orgId = decodeURIComponent(m[1]);
          const userId = decodeURIComponent(m[2]);
          
          if (orgId !== auth.orgId) return withCors(req, env, forbidden());
          
          // Only owners and admins can remove members
          if (!isOwnerOrAdmin(auth)) {
            return withCors(req, env, forbidden('Only owners and admins can remove members'));
          }

          try {
            await removeMember(env, orgId, userId);
            return withCors(req, env, json({ success: true }));
          } catch (err: any) {
            return withCors(req, env, badRequest(err.message));
          }
        }
      }

      // PATCH /api/orgs/:orgId/members/:userId
      {
        const m = url.pathname.match(/^\/api\/orgs\/([^/]+)\/members\/([^/]+)$/);
        if (m && method === 'PATCH') {
          const orgId = decodeURIComponent(m[1]);
          const userId = decodeURIComponent(m[2]);
          
          if (orgId !== auth.orgId) return withCors(req, env, forbidden());
          
          // Only owners can change roles
          if (!hasRole(auth, 'owner')) {
            return withCors(req, env, forbidden('Only owners can change member roles'));
          }

          const body = await req.json().catch(() => ({} as any));
          const role = body.role as 'owner' | 'admin' | 'member';
          
          if (!role || !['owner', 'admin', 'member'].includes(role)) {
            return withCors(req, env, badRequest('Valid role is required'));
          }

          try {
            const member = await updateMemberRole(env, orgId, userId, role);
            return withCors(req, env, json({ member }));
          } catch (err: any) {
            return withCors(req, env, badRequest(err.message));
          }
        }
      }

      // POST /api/orgs/:orgId/members/accept - Accept invitation
      {
        const m = url.pathname.match(/^\/api\/orgs\/([^/]+)\/members\/accept$/);
        if (m && method === 'POST') {
          const orgId = decodeURIComponent(m[1]);
          
          if (orgId !== auth.orgId) return withCors(req, env, forbidden());

          const body = await req.json().catch(() => ({} as any));
          const userId = String(body.userId ?? '').trim();
          const email = String(body.email ?? '').trim();
          
          if (!userId || !email) {
            return withCors(req, env, badRequest('userId and email are required'));
          }

          try {
            const { acceptInvitation } = await import('./lib/members');
            await acceptInvitation(env, orgId, userId, email);
            return withCors(req, env, json({ success: true }));
          } catch (err: any) {
            return withCors(req, env, badRequest(err.message));
          }
        }
      }

      // GET /api/tokens - List API tokens
      if (method === 'GET' && url.pathname === '/api/tokens') {
        const tokens = await listAPITokens(env, auth.orgId);
        return withCors(req, env, json({ tokens }));
      }

      // POST /api/tokens - Create API token
      if (method === 'POST' && url.pathname === '/api/tokens') {
        const body = await req.json().catch(() => ({} as any));
        const name = String(body.name ?? '').trim();
        const expiresAt = body.expiresAt ? String(body.expiresAt) : null;

        if (!name) {
          return withCors(req, env, badRequest('name is required'));
        }

        try {
          const result = await createAPIToken(env, auth.orgId, name, expiresAt);
          return withCors(req, env, json(result, 201));
        } catch (err: any) {
          return withCors(req, env, badRequest(err.message));
        }
      }

      // DELETE /api/tokens/:id - Delete API token
      {
        const m = url.pathname.match(/^\/api\/tokens\/([^/]+)$/);
        if (m && method === 'DELETE') {
          const tokenId = decodeURIComponent(m[1]);
          await deleteAPIToken(env, auth.orgId, tokenId);
          return withCors(req, env, new Response(null, { status: 204 }));
        }
      }

      // GET /api/jobs - List jobs (with optional domainId filter)
      if (method === 'GET' && url.pathname === '/api/jobs') {
        const domainId = url.searchParams.get('domainId') || undefined;
        const type = url.searchParams.get('type') || undefined;
        const status = url.searchParams.get('status') || undefined;
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
        const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));

        const jobs = await listJobs(env, auth.orgId, { domainId, type, status }, limit, offset);
        return withCors(req, env, json({ jobs }));
      }

      // POST /api/jobs - Create a job
      if (method === 'POST' && url.pathname === '/api/jobs') {
        const body = await req.json().catch(() => ({} as any));
        const domainId = String(body.domainId ?? '').trim();
        const type = String(body.type ?? '').trim();

        if (!domainId || !type) {
          return withCors(req, env, badRequest('domainId and type are required'));
        }

        if (!VALID_JOB_TYPES.includes(type as JobType)) {
          return withCors(req, env, badRequest('Invalid job type'));
        }

        try {
          const { generateId } = await import('./lib/crypto');
          const jobId = generateId();
          const now = new Date().toISOString();

          await env.DB.prepare(
            `INSERT INTO jobs (id, type, domain_id, status, attempts, created_at, updated_at)
             VALUES (?, ?, ?, 'queued', 0, ?, ?)`
          )
            .bind(jobId, type, domainId, now, now)
            .run();

          // Enqueue the job to the consumer for processing
          if (env.QUEUE) {
            await env.QUEUE.send({
              jobId,
              orgId: auth.orgId,
              domainId,
              type
            });
          }

          const job = await getJob(env, auth.orgId, jobId);
          return withCors(req, env, json({ job }, 201));
        } catch (err: any) {
          return withCors(req, env, badRequest(err.message));
        }
      }

      // GET /api/jobs/:id - Get job by ID
      {
        const m = url.pathname.match(/^\/api\/jobs\/([^/]+)$/);
        if (m && method === 'GET') {
          const jobId = decodeURIComponent(m[1]);
          const job = await getJob(env, auth.orgId, jobId);
          if (!job) return withCors(req, env, notFound());
          return withCors(req, env, json({ job }));
        }
      }

      // GET /api/webhooks - List webhooks for the authenticated org
      if (method === 'GET' && url.pathname === '/api/webhooks') {
        const webhooks = await listWebhooks(env, auth.orgId);
        return withCors(req, env, json({ webhooks }));
      }

      // POST /api/webhooks - Create webhook
      if (method === 'POST' && url.pathname === '/api/webhooks') {
        const body = await req.json().catch(() => ({} as any));
        const url_value = String(body.url ?? '').trim();
        const events = body.events;

        if (!url_value || !events || !Array.isArray(events)) {
          return withCors(req, env, badRequest('url and events array are required'));
        }

        try {
          const webhook = await createWebhook(env, auth.orgId, url_value, events);
          return withCors(req, env, json({ webhook }, 201));
        } catch (err: any) {
          return withCors(req, env, badRequest(err.message));
        }
      }

      // PATCH /api/webhooks/:id - Update webhook
      {
        const m = url.pathname.match(/^\/api\/webhooks\/([^/]+)$/);
        if (m && method === 'PATCH') {
          const webhookId = decodeURIComponent(m[1]);
          const body = await req.json().catch(() => ({} as any));

          try {
            await updateWebhook(env, auth.orgId, webhookId, body);
            return withCors(req, env, json({ success: true }));
          } catch (err: any) {
            return withCors(req, env, badRequest(err.message));
          }
        }
      }

      // DELETE /api/webhooks/:id - Delete webhook
      {
        const m = url.pathname.match(/^\/api\/webhooks\/([^/]+)$/);
        if (m && method === 'DELETE') {
          const webhookId = decodeURIComponent(m[1]);
          await deleteWebhook(env, auth.orgId, webhookId);
          return withCors(req, env, new Response(null, { status: 204 }));
        }
      }

      // POST /api/oauth/exchange - Exchange OAuth code for tokens
      if (method === 'POST' && url.pathname === '/api/oauth/exchange') {
        const body = await req.json().catch(() => ({} as any));
        const provider = String(body.provider ?? '').trim().toLowerCase();
        const code = String(body.code ?? '').trim();
        const redirectUri = String(body.redirectUri ?? '').trim();

        if (!provider || !code || !redirectUri) {
          return withCors(req, env, badRequest('provider, code, and redirectUri are required'));
        }

        const validProviders = ['cloudflare', 'godaddy', 'route53', 'other'];
        if (!validProviders.includes(provider)) {
          return withCors(req, env, badRequest('Invalid provider'));
        }

        try {
          const result = await createOAuthConnection(env, auth.orgId, provider as any, code, redirectUri);
          return withCors(req, env, json(result, 201));
        } catch (err: any) {
          return withCors(req, env, badRequest(err.message));
        }
      }

      // GET /api/oauth/connections - List OAuth connections
      if (method === 'GET' && url.pathname === '/api/oauth/connections') {
        try {
          const connections = await listOAuthConnections(env, auth.orgId);
          return withCors(req, env, json({ connections }));
        } catch (err: any) {
          console.error('List OAuth connections error:', err);
          return withCors(req, env, badRequest(err.message || 'Failed to list OAuth connections'));
        }
      }

      // DELETE /api/oauth/connections/:provider - Delete OAuth connection
      {
        const m = url.pathname.match(/^\/api\/oauth\/connections\/([^/]+)$/);
        if (m && method === 'DELETE') {
          const provider = decodeURIComponent(m[1]).toLowerCase();

          try {
            await deleteOAuthConnection(env, auth.orgId, provider);
            return withCors(req, env, json({ success: true }));
          } catch (err: any) {
            console.error('Delete OAuth connection error:', err);
            return withCors(req, env, badRequest(err.message || 'Failed to delete OAuth connection'));
          }
        }
      }

      return withCors(req, env, notFound());
    } catch (err: any) {
      const message = err?.message ? String(err.message) : 'Internal error';
      return withCors(req, env, json({ error: 'internal_error', message }, 500));
    }
  },
};
