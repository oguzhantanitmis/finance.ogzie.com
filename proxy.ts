import { withAuth } from "next-auth/middleware"

const PRIMARY_SUPERUSER = "oguzhan@tanitmis.com"

export default withAuth({
    pages: { signIn: "/login" },
    callbacks: {
        authorized({ token, req }) {
            if (!token) return false

            const pathname = req.nextUrl.pathname
            const superuserOnly =
                pathname === "/admin" || pathname.startsWith("/admin/") ||
                pathname === "/ai"    || pathname.startsWith("/ai/")

            if (superuserOnly) {
                return token.role === "SUPERUSER"
                    || token.email?.toLowerCase() === PRIMARY_SUPERUSER
            }

            return true
        },
    },
})

export const config = {
    matcher: [
        // Tüm yolları yakala, ama public yollar + static asset'ler hariç
        // - /login: giriş sayfası
        // - /api/auth: NextAuth + forgot-password + reset-password
        // - /api/ogzie-ingest: ogzie → finance push ingest (kendi Ed25519 imza auth'u var)
        // - /ogzie-sso: ogzie SSO bilet landing'i (session HENÜZ yok — giriş noktası)
        // - _next, favicon, manifest, static asset uzantıları
        "/((?!login|api/auth|api/ogzie-ingest|ogzie-sso|_next/static|_next/image|favicon\\.ico|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
}
