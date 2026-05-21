import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { isSuperuser, resolveUserRole } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export async function getCurrentUser() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return null

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user || !user.isActive) return null

    // Sunucu tarafındaki sessionVersion JWT'deki ile eşleşmiyorsa oturum geçersiz
    // (admin "tüm cihazlardan çıkış" yaptığında sessionVersion artar)
    const tokenVersion = session.user.sessionVersion ?? 1
    if (user.sessionVersion !== tokenVersion) return null

    const role = resolveUserRole(user.email, user.role)
    if (role !== user.role) {
        return prisma.user.update({ where: { id: user.id }, data: { role } })
    }

    return user
}

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
