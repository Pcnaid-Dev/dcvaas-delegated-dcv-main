import type { Env } from './env';
import { authenticate, isOwnerOrAdmin, hasRole } from './middleware/auth';
import { json, withCors, preflight, notFound, unauthorized, badRequest, forbidden } from './lib/http';
import { listDomains, getDomain, createDomain, syncDomain, forceRecheck } from './lib/domains';
import { listMembers, inviteMember, removeMember, updateMemberRole } from './lib/members';
import { createCheckoutSession, handleStripeWebhook } from './routes/billing';
import { createOAuthConnection, listOAuthConnections, deleteOAuthConnection } from './lib/oauth';

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

      // POST /api/oauth/exchange - Exchange OAuth code for tokens
      if (method === 'POST' && url.pathname === '/api/oauth/exchange') {
        const body = await req.json().catch(() => ({} as any));
        const provider = String(body.provider ?? '').trim().toLowerCase();
        const code = String(body.code ?? '').trim();
        const redirectUri = String(body.redirectUri ?? '').trim();

        if (!provider || !code || !redirectUri) {
          return withCors(req, env, badRequest('provider, code, and redirectUri are required'));
        }

        // Validate provider
        const validProviders = ['cloudflare', 'godaddy'];
        if (!validProviders.includes(provider)) {
          return withCors(req, env, badRequest(`Invalid provider. Must be one of: ${validProviders.join(', ')}`));
        }

        try {
          const connection = await createOAuthConnection(env, auth.orgId, provider, code, redirectUri);
          // Return connection without encrypted tokens
          const { encrypted_access_token, encrypted_refresh_token, ...safeConnection } = connection;
          return withCors(req, env, json({ connection: safeConnection }, 201));
        } catch (err: any) {
          console.error('OAuth exchange error:', err);
          return withCors(req, env, badRequest(err.message || 'Failed to exchange OAuth code'));
        }
      }

      // GET /api/oauth/connections - List OAuth connections
      if (method === 'GET' && url.pathname === '/api/oauth/connections') {
        try {
          const connections = await listOAuthConnections(env, auth.orgId);
          // Return connections without encrypted tokens
          const safeConnections = connections.map(({ encrypted_access_token, encrypted_refresh_token, ...conn }) => conn);
          return withCors(req, env, json({ connections: safeConnections }));
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
