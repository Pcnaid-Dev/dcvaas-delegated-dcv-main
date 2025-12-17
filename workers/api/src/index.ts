import type { Env } from './env';
import { authenticate, isOwnerOrAdmin, hasRole } from './middleware/auth';
import { json, withCors, preflight, notFound, unauthorized, badRequest, forbidden } from './lib/http';
import { listDomains, getDomain, createDomain, syncDomain, forceRecheck } from './lib/domains';
import { listMembers, inviteMember, removeMember, updateMemberRole } from './lib/members';
import { createCheckoutSession, handleStripeWebhook } from './routes/billing';

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
        const domains = await listDomains(env, auth.orgId);
        return withCors(req, env, json({ domains }));
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

      return withCors(req, env, notFound());
    } catch (err: any) {
      const message = err?.message ? String(err.message) : 'Internal error';
      return withCors(req, env, json({ error: 'internal_error', message }, 500));
    }
  },
};
