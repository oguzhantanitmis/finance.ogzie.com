import { NextResponse } from 'next/server'
import { authenticateOgzieControlRequest } from '@/lib/ogzie-control-auth'
import { getDashboardData } from '@/lib/dashboard-service'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
    const auth = await authenticateOgzieControlRequest(request)
    if (!auth.ok) {
        return NextResponse.json({ ok: false, error: auth.reason }, { status: auth.status })
    }
    if (typeof auth.body.requestId !== 'string' || !UUID_RE.test(auth.body.requestId)) {
        return NextResponse.json({ ok: false, error: 'invalid_request_id' }, { status: 400 })
    }

    const userId = process.env.OGZIE_INGEST_USER_ID?.trim()
    if (!userId) {
        return NextResponse.json({ ok: false, error: 'control_not_configured' }, { status: 503 })
    }

    const [overview, subscriptions, recurringExpenses] = await Promise.all([
        getDashboardData(userId),
        prisma.subscription.findMany({
            where: { userId, isActive: true, status: 'ACTIVE' },
            orderBy: { nextPayment: 'asc' },
            take: 1000,
        }),
        prisma.recurringExpense.findMany({
            where: { userId, status: 'ACTIVE' },
            orderBy: { nextPayment: 'asc' },
            take: 1000,
        }),
    ])

    return NextResponse.json({
        ok: true,
        schemaVersion: 1,
        subject: auth.body.identity.subject,
        generatedAt: new Date().toISOString(),
        overview,
        subscriptions: subscriptions.map((item) => ({
            id: item.id,
            name: item.name,
            amount: item.amount,
            currency: item.currency,
            billingCycle: item.billingCycle,
            category: item.category,
            nextPayment: item.nextPayment.toISOString(),
            monthlyNormalizedAmount: item.monthlyNormalizedAmount,
            providerDomain: item.providerDomain,
            isEssential: item.isEssential,
            autopay: item.autopay,
            updatedAt: item.updatedAt.toISOString(),
        })),
        recurringExpenses: recurringExpenses.map((item) => ({
            id: item.id,
            name: item.name,
            amount: item.amount,
            currency: item.currency,
            billingCycle: item.billingCycle,
            category: item.category,
            nextPayment: item.nextPayment.toISOString(),
            monthlyNormalizedAmount: null,
            providerDomain: null,
            isEssential: item.isEssential,
            autopay: item.autopay,
            updatedAt: item.updatedAt.toISOString(),
        })),
    }, { headers: { 'cache-control': 'no-store' } })
}
