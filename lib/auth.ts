import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { normalizeEmail, resolveUserRole } from "@/lib/authz";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 dakika
const SESSION_SHORT_SECONDS = 8 * 60 * 60;   // 8 saat (beni hatırla yok)
const SESSION_LONG_SECONDS  = 30 * 24 * 60 * 60; // 30 gün (beni hatırla)

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
        maxAge: SESSION_LONG_SECONDS, // JWT encode sırasında token.rememberMe ile override edilir
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Giriş",
            credentials: {
                email:      { label: "E-posta",      type: "email",    placeholder: "ornek@ogzie.com" },
                password:   { label: "Şifre",        type: "password" },
                rememberMe: { label: "Beni hatırla", type: "text"     },
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials.password) return null;

                const email = normalizeEmail(credentials.email);
                const rememberMe = credentials.rememberMe === "true";
                const ip = (req?.headers?.["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
                        ?? (req?.headers?.["x-real-ip"] as string | undefined)
                        ?? null;

                const user = await prisma.user.findUnique({ where: { email } });

                if (!user || !user.isActive) return null;

                // Hesap kilitli mi?
                if (user.lockedUntil && user.lockedUntil > new Date()) {
                    const remainingMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
                    throw new Error(`LOCKED:${remainingMin}`);
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    const attempts = user.failedLoginAttempts + 1;
                    const willLock = attempts >= MAX_FAILED_ATTEMPTS;
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            failedLoginAttempts: attempts,
                            lockedUntil: willLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
                        },
                    });
                    if (willLock) throw new Error("LOCKED:15");
                    throw new Error(`ATTEMPTS:${MAX_FAILED_ATTEMPTS - attempts}`);
                }

                // Başarılı giriş — reset
                const role = resolveUserRole(user.email, user.role);
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        role,
                        lastLoginAt: new Date(),
                        lastLoginIp: ip,
                        failedLoginAttempts: 0,
                        lockedUntil: null,
                    },
                });

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name ?? undefined,
                    role,
                    sessionVersion: user.sessionVersion,
                    rememberMe,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id             = user.id;
                token.role           = user.role;
                token.sessionVersion = user.sessionVersion;
                token.rememberMe     = user.rememberMe ?? false;
            }
            return token;
        },
        async session({ session, token }) {
            return {
                ...session,
                user: {
                    ...session.user,
                    id:             token.id,
                    role:           token.role,
                    sessionVersion: token.sessionVersion,
                },
            };
        },
    },
    jwt: {
        // "Beni hatırla" seçilmemişse token 8 saat sonra geçersiz olur.
        // Next-auth v4'te encode/decode hook'larıyla maxAge override edilebilir.
        encode: async ({ token, secret, maxAge: _defaultMax }) => {
            const { encode } = await import("next-auth/jwt");
            const maxAge = token?.rememberMe ? SESSION_LONG_SECONDS : SESSION_SHORT_SECONDS;
            return encode({ token, secret, maxAge });
        },
        decode: async ({ token, secret }) => {
            const { decode } = await import("next-auth/jwt");
            return decode({ token, secret });
        },
    },
};
