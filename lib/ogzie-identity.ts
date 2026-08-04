import { prisma } from '@/lib/prisma'

export type OgzieIdentity = {
    issuer: string
    subject: string
}

function normalizeIssuer(value: string): string {
    return value.trim().replace(/\/+$/, '')
}

export function validateOgzieIdentity(value: unknown): OgzieIdentity | null {
    if (!value || typeof value !== 'object') return null
    const candidate = value as Partial<OgzieIdentity>
    if (typeof candidate.issuer !== 'string' || typeof candidate.subject !== 'string') return null

    const issuer = normalizeIssuer(candidate.issuer)
    const subject = candidate.subject.trim()
    const configuredIssuer = normalizeIssuer(process.env.OGZIE_ISSUER ?? '')

    if (!issuer || !subject || subject.length > 191) return null
    if (!configuredIssuer || issuer !== configuredIssuer) return null
    return { issuer, subject }
}

/**
 * İmzalı App → Finance aktarımlarındaki hesabı Finance kullanıcısına çözer.
 * İlk v2 aktarımında mevcut OGZIE_INGEST_USER_ID güvenli bootstrap olarak
 * kullanılır ve eşleme kalıcılaştırılır; sonrasında env değişse bile eşleme kazanır.
 */
export async function resolveOgzieUserId(identity: OgzieIdentity | null): Promise<string | null> {
    const fallbackUserId = process.env.OGZIE_INGEST_USER_ID ?? null
    if (!identity) return fallbackUserId

    const existing = await prisma.externalIdentity.findUnique({
        where: { issuer_subject: identity },
        select: { id: true, userId: true },
    })
    if (existing) {
        await prisma.externalIdentity.update({
            where: { id: existing.id },
            data: { lastSeenAt: new Date() },
        })
        return existing.userId
    }

    if (!fallbackUserId) return null
    const user = await prisma.user.findFirst({
        where: { id: fallbackUserId, isActive: true, deletedAt: null },
        select: { id: true, email: true },
    })
    if (!user) return null

    const linked = await prisma.externalIdentity.upsert({
        where: { issuer_subject: identity },
        create: {
            userId: user.id,
            issuer: identity.issuer,
            subject: identity.subject,
            emailSnapshot: user.email,
        },
        update: { lastSeenAt: new Date() },
        select: { userId: true },
    })
    return linked.userId
}

export async function linkOgzieIdentity(input: OgzieIdentity & {
    userId: string
    email?: string | null
}): Promise<void> {
    await prisma.externalIdentity.upsert({
        where: { issuer_subject: { issuer: normalizeIssuer(input.issuer), subject: input.subject } },
        create: {
            userId: input.userId,
            issuer: normalizeIssuer(input.issuer),
            subject: input.subject,
            emailSnapshot: input.email ?? null,
        },
        update: {
            userId: input.userId,
            emailSnapshot: input.email ?? null,
            lastSeenAt: new Date(),
        },
    })
}
