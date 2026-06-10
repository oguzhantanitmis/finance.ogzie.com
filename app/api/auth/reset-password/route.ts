import { NextRequest } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

import { prisma } from '@/lib/prisma'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/reset-password
 * Body: { token: string, newPassword: string }
 * Token DB'de sha256 hash olarak saklanır — gelen ham token hash'lenip aranır.
 */
export async function POST(req: NextRequest) {
    try {
        // Token brute-force koruması: IP başına 10 deneme / 15 dk
        const ip = clientIp(req)
        if (!rateLimit(`reset:ip:${ip}`, 10, 15 * 60 * 1000)) {
            return Response.json({ error: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.' }, { status: 429 })
        }

        const body = await req.json().catch(() => ({}))
        const token = typeof body.token === 'string' ? body.token.trim() : ''
        const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

        if (!token || newPassword.length < 8) {
            return Response.json({ error: 'Token veya şifre geçersiz (en az 8 karakter).' }, { status: 400 })
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
        const user = await prisma.user.findUnique({ where: { passwordResetToken: tokenHash } })
        if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
            return Response.json({ error: 'Sıfırlama linki geçersiz veya süresi dolmuş.' }, { status: 400 })
        }

        const hash = await bcrypt.hash(newPassword, 12)

        // Atomik tek-kullanım: token hâlâ eşleşiyorsa güncelle (replay koruması)
        const result = await prisma.user.updateMany({
            where: { id: user.id, passwordResetToken: tokenHash },
            data: {
                password: hash,
                passwordResetToken: null,
                passwordResetExpiry: null,
                failedLoginAttempts: 0,
                lockedUntil: null,
                sessionVersion: { increment: 1 }, // tüm cihazlardan çıkış
            },
        })
        if (result.count === 0) {
            return Response.json({ error: 'Sıfırlama linki geçersiz veya süresi dolmuş.' }, { status: 400 })
        }

        return Response.json({ ok: true })
    } catch (e) {
        console.error('reset-password error:', e instanceof Error ? e.message : 'bilinmeyen')
        return Response.json({ error: 'Sunucu hatası.' }, { status: 500 })
    }
}
