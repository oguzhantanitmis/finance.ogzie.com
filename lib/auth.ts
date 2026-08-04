import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { normalizeEmail, resolveUserRole } from "@/lib/authz";
import { verifyAndConsumeOgzieTicket } from "@/lib/ogzie-sso";
import { linkOgzieIdentity } from "@/lib/ogzie-identity";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS    = 15 * 60 * 1000;
const SESSION_SHORT_SECONDS = 8  * 60 * 60;
const SESSION_LONG_SECONDS  = 30 * 24 * 60 * 60;

async function logLogin(userId: string, success: boolean, reason: string, ip: string | null, userAgent: string | null) {
    try {
        await prisma.loginHistory.create({
            data: { userId, success, reason, ip, userAgent: userAgent?.slice(0, 1000) ?? null },
        });
    } catch (e) {
        console.error('login history error:', e);
    }
}

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
                const userAgent = (req?.headers?.["user-agent"] as string | undefined) ?? null;

                const user = await prisma.user.findUnique({ where: { email } });
                if (!user) return null;
                if (!user.isActive || user.deletedAt) {
                    await logLogin(user.id, false, 'inactive', ip, userAgent);
                    return null;
                }

                // Kilitli mi?
                if (user.lockedUntil && user.lockedUntil > new Date()) {
                    const min = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
                    await logLogin(user.id, false, 'locked', ip, userAgent);
                    throw new Error(`LOCKED:${min}`);
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
                    await logLogin(user.id, false, 'wrong_password', ip, userAgent);
                    if (willLock) throw new Error("LOCKED:15");
                    throw new Error(`ATTEMPTS:${MAX_FAILED_ATTEMPTS - attempts}`);
                }

                // Başarılı giriş
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
                await logLogin(user.id, true, 'ok', ip, userAgent);

                return {
                    id:             user.id,
                    email:          user.email,
                    name:           user.name ?? undefined,
                    role,
                    sessionVersion: user.sessionVersion,
                    rememberMe,
                };
            },
        }),
        // ogzie SSO — EdDSA imzalı tek-kullanımlık bilet ile şifresiz giriş.
        // Mevcut e-posta/şifre girişine dokunmaz; ayrı provider (id: "ogzie").
        CredentialsProvider({
            id: "ogzie",
            name: "ogzie SSO",
            credentials: {
                token: { label: "Bilet", type: "text" },
            },
            async authorize(credentials, req) {
                const token = credentials?.token;
                if (!token) return null;

                const verified = await verifyAndConsumeOgzieTicket(token);
                if (!verified) return null;

                // Hangi hesapla giriş yapılacağını ogzie belirler (bilet `email`
                // claim'i; app.ogzie.com'dan per-app ayarlanır, varsayılan
                // oguzhan@tanitmis.com). Geriye-uyumluluk için env fallback'i kalır.
                const sourceEmail =
                    verified.email ?? process.env.OGZIE_SSO_MANAGER_EMAIL;
                if (!sourceEmail) return null;
                const email = normalizeEmail(sourceEmail);

                const ip = (req?.headers?.["x-forwarded-for"] as string | undefined)
                    ?.split(",")[0]?.trim() ?? null;
                const userAgent = (req?.headers?.["user-agent"] as string | undefined) ?? null;

                const user = await prisma.user.findUnique({ where: { email } });
                if (!user || !user.isActive || user.deletedAt) {
                    if (user) await logLogin(user.id, false, "ogzie_inactive", ip, userAgent);
                    // Teşhis: jti zaten tüketildi; eşleşen aktif hesap yoksa kök
                    // nedeni logla (ogzie subject_email yanlış/finance'ta hesap yok).
                    else console.warn(`[ogzie-sso] eşleşen aktif hesap yok: ${email}`);
                    return null;
                }

                const role = resolveUserRole(user.email, user.role);
                await linkOgzieIdentity({
                    issuer: verified.iss,
                    subject: verified.sub,
                    userId: user.id,
                    email: user.email,
                });
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
                await logLogin(user.id, true, "ogzie_sso", ip, userAgent);

                return {
                    id:             user.id,
                    email:          user.email,
                    name:           user.name ?? undefined,
                    role,
                    sessionVersion: user.sessionVersion,
                    rememberMe:     false,
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
