import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
const PRIMARY_SUPERUSER = "oguzhan@tanitmis.com"

export default withAuth(function proxy(request) {
 const token = request.nextauth.token;
 const pathname = request.nextUrl.pathname;
 if (!token) {
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Devam etmek için giriş yapın' }, { status: 401 });
  const login = new URL('/login', request.url);
  login.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
 }
 const restricted = pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/ai' || pathname.startsWith('/ai/');
 if (restricted && token.role !== 'SUPERUSER' && token.email?.toLowerCase() !== PRIMARY_SUPERUSER) {
  const message = 'Bu sayfaya erişim izniniz yok';
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: message }, { status: 403 });
  return new NextResponse(`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${message}</title><style>body{margin:0;background:#09090b;color:#fafafa;font:16px/1.6 system-ui}main{max-width:650px;margin:auto;padding:20vh 24px}h1{font-size:2rem}a{display:inline-block;padding:12px 20px;color:inherit;border:1px solid currentColor;border-radius:8px}a:focus-visible{outline:3px solid #a78bfa;outline-offset:4px}</style><main><h1>${message}</h1><p>403</p><a href="/">Ana sayfaya dön</a></main></html>`, { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
 }
 return NextResponse.next();
}, { pages: { signIn: '/login' }, callbacks: { authorized: () => true } })

export const config = {
    matcher: [
        // Tüm yolları yakala, ama public yollar + static asset'ler hariç
        // - /login: giriş sayfası
        // - /api/auth: NextAuth + forgot-password + reset-password
        // - /api/ogzie-ingest: ogzie → finance push ingest (kendi Ed25519 imza auth'u var)
        // - /api/ogzie-sync: app ↔ finance snapshot/command API (kendi Ed25519 imza auth'u var)
        // - /ogzie-sso: ogzie SSO bilet landing'i (session HENÜZ yok — giriş noktası)
        // - _next, favicon, manifest, static asset uzantıları
        "/((?!login|offline\\.html|unavailable\\.html|recovery-sw\\.js|api/auth|api/ogzie-ingest|api/ogzie-sync|ogzie-sso|_next/static|_next/image|favicon\\.ico|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
}
