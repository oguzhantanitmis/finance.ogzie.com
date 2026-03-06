import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function getCurrentUser() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return null
    }

    return prisma.user.findUnique({
        where: { email: session.user.email },
    })
}

export async function requireCurrentUser() {
    const user = await getCurrentUser()
    if (!user) {
        throw new Error('Unauthorized')
    }

    return user
}
