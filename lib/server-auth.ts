import { cache } from 'react'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { isSuperuser, resolveUserRole } from '@/lib/authz'
import { prisma, withDbRetry } from '@/lib/prisma'

// İstek başına tek kullanıcı sorgusu (layout + sayfa + servisler paylaşır)
export const getCurrentUser = cache(async () => {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return null

    // Retry: cold-start veya geçici bağlantı sorunu için
    const user = await withDbRetry(() =>
        prisma.user.findUnique({ where: { email: session.user.email! } })
    )
    if (!user || !user.isActive || user.deletedAt) return null

    // sessionVersion eşleşmiyorsa oturum geçersiz
    const tokenVersion = session.user.sessionVersion ?? 1
    if (user.sessionVersion !== tokenVersion) return null

    const role = resolveUserRole(user.email, user.role)
    if (role !== user.role) {
        return withDbRetry(() =>
            prisma.user.update({ where: { id: user.id }, data: { role } })
        )
    }

    return user
})

export async function requireCurrentUser() {
    const user = await getCurrentUser()
    if (!user) throw new Error('Unauthorized')
    return user
}

export async function requireSuperuser() {
    const user = await requireCurrentUser()
    if (!isSuperuser(user)) throw new Error('Forbidden')
    return user
}
