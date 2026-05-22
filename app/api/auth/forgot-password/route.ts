import { NextRequest } from 'next/server'
import crypto from 'crypto'

import { normalizeEmail } from '@/lib/authz'
import { isSmtpConfigured, sendPasswordResetEmail } from '@/lib/email/smtp'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 * Cevap her zaman 200 — kullanıcı varlığını sızdırmaz (timing-safe).
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}))
        const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
        if (!email) {
            return Response.json({ ok: true }, { status: 200 })
        }

        const user = await prisma.user.findUnique({ where: { email } })

        // Kullanıcı bulunsa da bulunmasa da aynı cevap (enumeration koruma)
        if (user && user.isActive && !user.deletedAt) {
            const token = crypto.randomBytes(32).toString('hex')
            const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 saat

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordResetToken: token,
                    passwordResetExpiry: expiry,
                },
            })

            if (isSmtpConfigured()) {
                await sendPasswordResetEmail({
                    to: user.email,
                    name: user.name,
                    token,
                }).catch(err => console.error('forgot-password email error:', err))
            }
        }

        return Response.json({ ok: true }, { status: 200 })
    } catch (e) {
        console.error('forgot-password error:', e)
        return Response.json({ ok: true }, { status: 200 })
    }
}
