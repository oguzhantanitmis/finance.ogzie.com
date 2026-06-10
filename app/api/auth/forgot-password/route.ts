import { NextRequest } from 'next/server'
import crypto from 'crypto'

import { normalizeEmail } from '@/lib/authz'
import { isSmtpConfigured, sendPasswordResetEmail } from '@/lib/email/smtp'
import { prisma } from '@/lib/prisma'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 * Cevap her zaman 200 — kullanıcı varlığını sızdırmaz (timing-safe).
 * Token DB'de sha256 hash olarak saklanır; ham token yalnızca e-postada yer alır.
 */
export async function POST(req: NextRequest) {
    try {
        // IP başına 5 istek / 15 dk + e-posta başına 3 istek / 15 dk
        const ip = clientIp(req)
        if (!rateLimit(`forgot:ip:${ip}`, 5, 15 * 60 * 1000)) {
            return Response.json({ ok: true }, { status: 200 }) // sessiz drop — enumeration verme
        }

        const body = await req.json().catch(() => ({}))
        const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
        if (!email || !rateLimit(`forgot:email:${email}`, 3, 15 * 60 * 1000)) {
            return Response.json({ ok: true }, { status: 200 })
        }

        const user = await prisma.user.findUnique({ where: { email } })

        // Kullanıcı bulunsa da bulunmasa da aynı cevap (enumeration koruma)
        if (user && user.isActive && !user.deletedAt) {
            const token = crypto.randomBytes(32).toString('hex')
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
            const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 saat

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordResetToken: tokenHash,
                    passwordResetExpiry: expiry,
                },
            })

            if (isSmtpConfigured()) {
                await sendPasswordResetEmail({
                    to: user.email,
                    name: user.name,
                    token,
                }).catch(err => {
                    // Token/PII loglama — yalnızca hata özeti
                    const msg = err instanceof Error ? err.message : 'SMTP hatası'
                    console.error('forgot-password email error:', msg.slice(0, 200))
                })
            }
        }

        return Response.json({ ok: true }, { status: 200 })
    } catch (e) {
        console.error('forgot-password error:', e instanceof Error ? e.message : 'bilinmeyen')
        return Response.json({ ok: true }, { status: 200 })
    }
}
