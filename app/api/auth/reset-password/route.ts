import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/reset-password
 * Body: { token: string, newPassword: string }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}))
        const token = typeof body.token === 'string' ? body.token.trim() : ''
        const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

        if (!token || newPassword.length < 8) {
            return Response.json({ error: 'Token veya şifre geçersiz (en az 8 karakter).' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({ where: { passwordResetToken: token } })
        if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
            return Response.json({ error: 'Sıfırlama linki geçersiz veya süresi dolmuş.' }, { status: 400 })
        }

        const hash = await bcrypt.hash(newPassword, 12)

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hash,
                passwordResetToken: null,
                passwordResetExpiry: null,
                failedLoginAttempts: 0,
                lockedUntil: null,
                sessionVersion: { increment: 1 }, // tüm cihazlardan çıkış
            },
        })

        return Response.json({ ok: true })
    } catch (e) {
        console.error('reset-password error:', e)
        return Response.json({ error: 'Sunucu hatası.' }, { status: 500 })
    }
}
