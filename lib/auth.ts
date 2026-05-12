import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { normalizeEmail, resolveUserRole } from "@/lib/authz";

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Giriş",
            credentials: {
                email: { label: "E-posta", type: "email", placeholder: "ornek@ogzie.com" },
                password: { label: "Şifre", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials.password) {
                    return null;
                }
                const email = normalizeEmail(credentials.email);

                const user = await prisma.user.findUnique({
                    where: {
                        email,
                    },
                });

                if (!user) {
                    return null;
                }

                if (!user.isActive) {
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    return null;
                }

                const role = resolveUserRole(user.email, user.role);

                if (role !== user.role || !user.lastLoginAt) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            role,
                            lastLoginAt: new Date(),
                        },
                    });
                } else {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { lastLoginAt: new Date() },
                    });
                }

                return {
                    id: user.id + "",
                    email: user.email,
                    name: user.name,
                    role,
                };
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            return {
                ...session,
                user: {
                    ...session.user,
                    id: token.sub,
                    role: token.role,
                },
            };
        },
        async jwt({ token, user }) {
            if (user) {
                return {
                    ...token,
                    id: user.id,
                    role: user.role,
                };
            }
            return token;
        },
    },
};
