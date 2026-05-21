import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { normalizeEmail, resolveUserRole } from "@/lib/authz";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS    = 15 * 60 * 1000;
const SESSION_SHORT_SECONDS = 8  * 60 * 60;
const SESSION_LONG_SECONDS  = 30 * 24 * 60 * 60;

export const authOptions: NextAuthOptions = {
    session: { strategy: "jwt", maxAge: SESSION_LONG_SECONDS },
    pages:   { signIn: "/login" },
    providers: [
        CredentialsProvider({
            name: "Giriş",
            credentials: {
                email:      { label: "E-posta",      type: "email"    },
                password:   { label: "Şifre",        type: "password" },
                rememberMe: { label: "Beni hatırla", type: "text"     },
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials.password) return null;

                const email      = normalizeEmail(credentials.email);
                const rememberMe = credentials.rememberMe === "true";
                const ip = (req?.headers?.["x-forwarded-for"] as string | undefined)
                    ?.split(",")[0]?.trim() ?? null;

                // --- Temel kullanıcı sorgusu (her zaman çalışan kolonlar) ---
                const user = await prisma.user.findUnique({ where: { email } });
                if (!user || !user.isActive) return null;

                // --- Brute-force + kilit (yeni kolonlar varsa) ---
                // Yeni DB kolonları migrate edilmemişse bu blok sessizce atlanır.
                const hasNewCols = 'failedLoginAttempts' in user;

                if (hasNewCols) {
                    const u = user as typeof user & {
                        failedLoginAttempts: number
                        lockedUntil: Date | null
                        sessionVersion: number
                    };

                    if (u.lockedUntil && u.lockedUntil > new Date()) {
                        const min = Math.ceil((u.lockedUntil.getTime() - Date.now()) / 60_000);
                        throw new Error(`LOCKED:${min}`);
                    }
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    if (hasNewCols) {
                        const u = user as typeof user & { failedLoginAttempts: number };
                        const attempts = u.failedLoginAttempts + 1;
                        const willLock = attempts >= MAX_FAILED_ATTEMPTS;
                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                ...(hasNewCols ? {
                                    failedLoginAttempts: attempts,
                                    lockedUntil: willLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
                                } : {}),
                            } as object,
                        });
                        if (willLock) throw new Error("LOCKED:15");
                        throw new Error(`ATTEMPTS:${MAX_FAILED_ATTEMPTS - attempts}`);
                    }
                    return null;
                }

                // --- Başarılı giriş ---
                const role = resolveUserRole(user.email, user.role);
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        role,
                        lastLoginAt: new Date(),
                        ...(hasNewCols ? {
                            lastLoginIp: ip,
                            failedLoginAttempts: 0,
                            lockedUntil: null,
                        } : {}),
                    } as object,
                });

                const sessionVersion = hasNewCols
                    ? (user as typeof user & { sessionVersion: number }).sessionVersion
                    : 1;

                return {
                    id:             user.id,
                    email:          user.email,
                    name:           user.name ?? undefined,
                    role,
                    sessionVersion,
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
                token.sessionVersion = user.sessionVersion ?? 1;
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
                    sessionVersion: token.sessionVersion ?? 1,
                },
            };
        },
    },
    jwt: {
        encode: async ({ token, secret, maxAge: _d }) => {
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
