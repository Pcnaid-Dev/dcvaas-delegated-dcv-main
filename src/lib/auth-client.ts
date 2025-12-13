// src/lib/auth-client.ts

// Point this to your Auth API
const AUTH_BASE_URL = (import.meta.env.VITE_AUTH_API_BASE_URL || 'https://auth-api.pcnaid.com/v1').replace(/\/+$/, '');

// Helper to read cookies (for CSRF protection if your Auth API uses it)
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

export class AuthApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function authFetch<T>(path: string, options: RequestInit & { json?: unknown } = {}): Promise<T> {
  const url = `${AUTH_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  
  const headers = new Headers(options.headers ?? {});
  if (options.json !== undefined) {
    headers.set('content-type', 'application/json');
  }

  // If your auth template uses double-submit cookie pattern for CSRF
  const csrf = getCookie('pcnaid_csrf');
  if (csrf) headers.set('x-csrf-token', csrf);

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // THIS IS KEY: It sends the .pcnaid.com cookies
    body: options.json ? JSON.stringify(options.json) : undefined,
  });

  if (!res.ok) {
    // Attempt to parse error
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body.error?.message || body.message || msg;
    } catch {}
    throw new AuthApiError(msg, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as T;
}

export function authGet<T>(path: string) {
  return authFetch<T>(path, { method: 'GET' });
}

export function authPost<T>(path: string, body?: unknown) {
  return authFetch<T>(path, { method: 'POST', json: body });
}