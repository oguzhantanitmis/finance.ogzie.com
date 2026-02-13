import { withAuth } from "next-auth/middleware"

export default withAuth({
    pages: {
        signIn: "/login",
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
