import type { User, UserRole } from '@prisma/client'

export const PRIMARY_SUPERUSER_EMAIL = 'oguzhan@tanitmis.com'

export function normalizeEmail(email: string) {
    return email.trim().toLowerCase()
}

export function isPrimarySuperuserEmail(email: string | null | undefined) {
    return Boolean(email && normalizeEmail(email) === PRIMARY_SUPERUSER_EMAIL)
}

export function resolveUserRole(email: string, role: UserRole): UserRole {
    return isPrimarySuperuserEmail(email) ? 'SUPERUSER' : role
}

export function isSuperuser(user: Pick<User, 'email' | 'role'> | null | undefined) {
    return Boolean(user && resolveUserRole(user.email, user.role) === 'SUPERUSER')
}
