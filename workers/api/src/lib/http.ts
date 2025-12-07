import type { Env } from '../env';

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
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
  h.set('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
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
