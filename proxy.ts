import { withAuth } from "next-auth/middleware"

export default withAuth({
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ token, req }) {
            if (!token) return false

            const pathname = req.nextUrl.pathname
            const superuserOnly =
                pathname === "/admin" ||
                pathname.startsWith("/admin/") ||
                pathname === "/ai" ||
                pathname.startsWith("/ai/")

            if (superuserOnly) {
                return token.role === "SUPERUSER" || token.email?.toLowerCase() === "oguzhan@tanitmis.com"
            }

            return true
        },
    },
})

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - login
         * - api/auth
         * - _next/static
         * - _next/image
         * - favicon.ico
         * - manifest.json
         */
        "/((?!login|api|static|manifest.json|favicon.ico).*)",
    ]
}
