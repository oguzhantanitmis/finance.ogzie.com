import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GEÇİCİ DEBUG endpoint — production /debts hatasını izole et.
 * URL: /api/debug/debts-health?token=<secret>&userId=<id>
 *
 * Token: kısa süreli kontrol için NEXTAUTH_SECRET'in ilk 8 karakteri.
 * Production sorunu çözüldükten sonra kaldırılacak.
 */
export async function GET(req: NextRequest) {
    const url = new URL(req.url)
    const token = url.searchParams.get('token') ?? ''
    const userIdParam = url.searchParams.get('userId') ?? ''

    const secret = process.env.NEXTAUTH_SECRET ?? ''
    const expected = secret.slice(0, 12)
    if (!expected || token !== expected) {
        return Response.json({ error: 'forbidden' }, { status: 403 })
    }

    const results: Record<string, unknown> = {
        env: {
            nodeVersion: process.version,
            vercelEnv: process.env.VERCEL_ENV,
            hasDatabase: Boolean(process.env.DATABASE_URL),
            databaseHost: process.env.DATABASE_URL?.match(/@([^:/]+)/)?.[1] ?? null,
            engineType: process.env.PRISMA_CLIENT_ENGINE_TYPE ?? '(unset)',
        },
    }

    async function probe(label: string, fn: () => Promise<unknown>) {
        try {
            const value = await fn()
            results[label] = { ok: true, value }
        } catch (e) {
            const err = e as { name?: string; code?: string; message?: string; meta?: unknown }
            results[label] = {
                ok: false,
                name: err?.name,
                code: err?.code,
                message: err?.message?.slice(0, 800),
                meta: err?.meta,
            }
        }
    }

    await probe('users.count',          () => prisma.user.count())
    await probe('user.findOne',         () => prisma.user.findFirst({
        where: userIdParam ? { id: userIdParam } : undefined,
        select: {
            id: true, email: true, isActive: true, deletedAt: true,
            preferredCurrency: true, locale: true, timezone: true,
            sessionVersion: true, failedLoginAttempts: true, lockedUntil: true,
            lastLoginIp: true, lastLoginAt: true,
        },
    }))
    await probe('loginHistory.count',   () => prisma.loginHistory.count())
    await probe('userActionLog.count',  () => prisma.userActionLog.count())
    await probe('debtAccount.findMany', () => prisma.debtAccount.findMany({ take: 1 }))
    await probe('debtObligation.findMany', () => prisma.debtObligation.findMany({ take: 1 }))
    await probe('creditCard.findMany',  () => prisma.creditCard.findMany({ take: 1 }))
    await probe('account.findMany',     () => prisma.account.findMany({ take: 1, where: { hasKmh: true } }))
    await probe('receivablePayable.findMany', () => prisma.receivablePayable.findMany({ take: 1 }))
    await probe('person.findMany',      () => prisma.person.findMany({ take: 1 }))

    if (userIdParam) {
        await probe('getDebtWorkspaceData', async () => {
            const { getDebtWorkspaceData } = await import('@/lib/debt-views')
            const data = await getDebtWorkspaceData(userIdParam)
            return {
                debtsCount: data.debts.length,
                peopleCount: data.people.length,
                obligationsCount: data.paymentObligations.length,
            }
        })
    }

    return Response.json(results, { status: 200 })
}
