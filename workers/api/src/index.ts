import type { Env } from './env';
import { authenticate, isOwnerOrAdmin, hasRole } from './middleware/auth';
import { json, withCors, preflight, notFound, unauthorized, badRequest, forbidden } from './lib/http';
import { listDomains, getDomain, createDomain, syncDomain, forceRecheck } from './lib/domains';
import { listMembers, inviteMember, removeMember, updateMemberRole } from './lib/members';
import { createCheckoutSession, handleStripeWebhook } from './routes/billing';
import { listAPITokens, createAPIToken, deleteAPIToken } from './lib/tokens';
import { listWebhookEndpoints, createWebhookEndpoint, updateWebhookEndpoint, deleteWebhookEndpoint } from './lib/webhooks';
import { logAudit } from './lib/audit';

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

// 1. Ensure this auth check exists first
const auth = await authenticate(req, env);
if (!auth) return withCors(req, env, unauthorized());

// 2. Add the Stripe route block here
if (method === 'POST' && url.pathname === '/api/create-checkout-session') {
  const response = await createCheckoutSession(req, env, auth as any);
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
        // Only owners and admins can create API tokens
        if (!isOwnerOrAdmin(auth)) {
          return withCors(req, env, forbidden('Only owners and admins can create API tokens'));
        }

        const body = await req.json().catch(() => ({} as any));
        const name = String(body.name ?? '').trim();
        const expiresAt = body.expiresAt ? String(body.expiresAt) : undefined;
        
        if (!name) return withCors(req, env, badRequest('name is required'));
        
        const result = await createAPIToken(env, auth.orgId, name, expiresAt);
        
        // Log audit event
        await logAudit(env, {
          org_id: auth.orgId,
          user_id: auth.userId || null,
          action: 'token.created',
          entity_type: 'api_token',
          entity_id: result.token.id,
          details: { name },
        });
        
        return withCors(req, env, json({ token: result.token, plaintext: result.plaintext }, 201));
      }

      // DELETE /api/tokens/:id - Delete API token
      {
        const m = url.pathname.match(/^\/api\/tokens\/([^/]+)$/);
        if (m && method === 'DELETE') {
          const tokenId = decodeURIComponent(m[1]);
          
          // Only owners and admins can delete API tokens
          if (!isOwnerOrAdmin(auth)) {
            return withCors(req, env, forbidden('Only owners and admins can delete API tokens'));
          }
          
          await deleteAPIToken(env, auth.orgId, tokenId);
          
          // Log audit event
          await logAudit(env, {
            org_id: auth.orgId,
            user_id: auth.userId || null,
            action: 'token.deleted',
            entity_type: 'api_token',
            entity_id: tokenId,
          });
          
          return withCors(req, env, json({ success: true }));
        }
      }

      // GET /api/webhooks - List webhook endpoints
      if (method === 'GET' && url.pathname === '/api/webhooks') {
        const webhooks = await listWebhookEndpoints(env, auth.orgId);
        return withCors(req, env, json({ webhooks }));
      }

      // POST /api/webhooks - Create webhook endpoint
      if (method === 'POST' && url.pathname === '/api/webhooks') {
        // Only owners and admins can create webhooks
        if (!isOwnerOrAdmin(auth)) {
          return withCors(req, env, forbidden('Only owners and admins can create webhooks'));
        }

        const body = await req.json().catch(() => ({} as any));
        const url_input = String(body.url ?? '').trim();
        const events = Array.isArray(body.events) ? body.events : [];
        
        if (!url_input) return withCors(req, env, badRequest('url is required'));
        if (events.length === 0) return withCors(req, env, badRequest('at least one event is required'));
        
        // Validate URL format
        try {
          new URL(url_input);
        } catch {
          return withCors(req, env, badRequest('Invalid URL format'));
        }
        
        const webhook = await createWebhookEndpoint(env, auth.orgId, url_input, events);
        
        // Log audit event
        await logAudit(env, {
          org_id: auth.orgId,
          user_id: auth.userId || null,
          action: 'webhook.created',
          entity_type: 'webhook_endpoint',
          entity_id: webhook.id,
          details: { url: url_input, events },
        });
        
        return withCors(req, env, json({ webhook }, 201));
      }

      // PATCH /api/webhooks/:id - Update webhook endpoint
      {
        const m = url.pathname.match(/^\/api\/webhooks\/([^/]+)$/);
        if (m && method === 'PATCH') {
          const webhookId = decodeURIComponent(m[1]);
          
          // Only owners and admins can update webhooks
          if (!isOwnerOrAdmin(auth)) {
            return withCors(req, env, forbidden('Only owners and admins can update webhooks'));
          }
          
          const body = await req.json().catch(() => ({} as any));
          const url_input = body.url !== undefined ? String(body.url).trim() : undefined;
          const events = body.events !== undefined ? (Array.isArray(body.events) ? body.events : []) : undefined;
          const enabled = body.enabled !== undefined ? Boolean(body.enabled) : undefined;
          
          // Validate URL if provided
          if (url_input !== undefined) {
            try {
              new URL(url_input);
            } catch {
              return withCors(req, env, badRequest('Invalid URL format'));
            }
          }
          
          const webhook = await updateWebhookEndpoint(env, auth.orgId, webhookId, url_input, events, enabled);
          if (!webhook) return withCors(req, env, notFound());
          
          // Log audit event
          await logAudit(env, {
            org_id: auth.orgId,
            user_id: auth.userId || null,
            action: 'webhook.updated',
            entity_type: 'webhook_endpoint',
            entity_id: webhookId,
            details: { url: url_input, events, enabled },
          });
          
          return withCors(req, env, json({ webhook }));
        }
      }

      // DELETE /api/webhooks/:id - Delete webhook endpoint
      {
        const m = url.pathname.match(/^\/api\/webhooks\/([^/]+)$/);
        if (m && method === 'DELETE') {
          const webhookId = decodeURIComponent(m[1]);
          
          // Only owners and admins can delete webhooks
          if (!isOwnerOrAdmin(auth)) {
            return withCors(req, env, forbidden('Only owners and admins can delete webhooks'));
          }
          
          await deleteWebhookEndpoint(env, auth.orgId, webhookId);
          
          // Log audit event
          await logAudit(env, {
            org_id: auth.orgId,
            user_id: auth.userId || null,
            action: 'webhook.deleted',
            entity_type: 'webhook_endpoint',
            entity_id: webhookId,
          });
          
          return withCors(req, env, json({ success: true }));
        }
      }

      return withCors(req, env, notFound());
    } catch (err: any) {
      const message = err?.message ? String(err.message) : 'Internal error';
      return withCors(req, env, json({ error: 'internal_error', message }, 500));
    }
  },
};
