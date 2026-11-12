import { boundedFetch } from './request';
export async function submitCredentials(email: string, password: string, rememberMe: boolean) {
 const csrfResponse = await boundedFetch('/api/auth/csrf');
 if (!csrfResponse.ok) return { error: 'SERVICE_UNAVAILABLE', status: csrfResponse.status };
 const { csrfToken } = await csrfResponse.json();
 if (typeof csrfToken !== 'string') return { error: 'SERVICE_UNAVAILABLE', status: 503 };
 const response = await boundedFetch('/api/auth/callback/credentials', {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ csrfToken, email, password, rememberMe: String(rememberMe), callbackUrl: '/', json: 'true' }),
 });
 if (response.status >= 500) return { error: 'SERVICE_UNAVAILABLE', status: response.status };
 const data = await response.json();
 const url = new URL(data.url, window.location.origin);
 if (url.origin !== window.location.origin) throw new Error('Invalid auth return address');
 return { error: url.searchParams.get('error'), status: response.status };
}
