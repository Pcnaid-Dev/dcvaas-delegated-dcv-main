import type { Env } from '../env';

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  const body = JSON.stringify(data);
  
  const responseHeaders: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
  };
  
  // Only add ETags for successful responses (2xx)
  // This enables caching for GET responses while avoiding cache issues for mutations
  if (status >= 200 && status < 300) {
    responseHeaders['ETag'] = `"${hashString(body)}"`;
  }
  
  return new Response(body, {
    status,
    headers: {
      ...responseHeaders,
      ...headers,
    },
  });
}

// FNV-1a hash function for ETag generation
// This provides good distribution and low collision rate for cache keys
function hashString(str: string): string {
  const FNV_OFFSET_BASIS = 2166136261;
  const FNV_PRIME = 16777619;
  
  let hash = FNV_OFFSET_BASIS;
  
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME); // Use Math.imul for proper 32-bit multiplication
  }
  
  // Convert to unsigned 32-bit integer and then to base36 for compact representation
  return (hash >>> 0).toString(36);
}

export function withCors(req: Request, env: Env, res: Response): Response {
  const origin = req.headers.get('Origin') || '';
  const allowed = new Set(
    (env.CORS_ALLOW_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const h = new Headers(res.headers);
  if (origin && allowed.has(origin)) {
    h.set('Access-Control-Allow-Origin', origin);
    h.set('Vary', 'Origin');
    h.set('Access-Control-Allow-Credentials', 'true');
  }

  h.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  h.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  h.set('Access-Control-Max-Age', '86400');

  return new Response(res.body, { status: res.status, headers: h });
}

export function preflight(req: Request, env: Env): Response | null {
  if (req.method.toUpperCase() !== 'OPTIONS') return null;
  return withCors(req, env, new Response(null, { status: 204 }));
}

export function badRequest(message: string) {
  return json({ error: 'bad_request', message }, 400);
}

export function notFound() {
  return json({ error: 'not_found' }, 404);
}

export function unauthorized() {
  return json({ error: 'unauthorized' }, 401);
}

export function forbidden(message = 'Forbidden') {
  return json({ error: 'forbidden', message }, 403);
}
