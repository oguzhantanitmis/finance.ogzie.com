import { boundedFetch } from './request';

export function safeCallbackPath(value: string | null | undefined, origin: string): string {
 if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
 try {
  const url = new URL(value, origin);
  if (url.origin !== origin || url.pathname === '/login' || url.pathname.startsWith('/api/auth/')) return '/';
  return url.pathname + url.search + url.hash;
 } catch { return '/'; }
}

export async function submitCredentials(email: string, password: string, rememberMe: boolean, callbackUrl = '/') {
 const origin = window.location.origin;
 const callbackPath = safeCallbackPath(callbackUrl, origin);
 const csrfResponse = await boundedFetch('/api/auth/csrf');
 if (!csrfResponse.ok) return { error: 'SERVICE_UNAVAILABLE', status: csrfResponse.status };
 const { csrfToken } = await csrfResponse.json();
 if (typeof csrfToken !== 'string') return { error: 'SERVICE_UNAVAILABLE', status: 503 };
 const response = await boundedFetch('/api/auth/callback/credentials', {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ csrfToken, email, password, rememberMe: String(rememberMe), callbackUrl: new URL(callbackPath, origin).href, json: 'true' }),
 });
 if (response.status >= 500) return { error: 'SERVICE_UNAVAILABLE', status: response.status };
 const data = await response.json();
 const url = new URL(data.url, origin);
 if (url.origin !== origin) throw new Error('Invalid auth return address');
 const authError = url.pathname === '/login' || url.pathname.startsWith('/api/auth/error');
 return { error: authError ? url.searchParams.get('error') : null, status: response.status, callbackUrl: safeCallbackPath(url.pathname + url.search + url.hash, origin) };
}
