import { NextResponse } from 'next/server'

import { getDashboardData } from '@/lib/dashboard-service'
import { resolveOgzieUserId, validateOgzieIdentity, type OgzieIdentity } from '@/lib/ogzie-identity'
import { verifyOgziePush } from '@/lib/ogzie-ingest-verify'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SnapshotRequest = {
    version: 2
    aud: string
    requestId: string
    identity: OgzieIdentity
}

export async function POST(req: Request) {
    const rawBody = await req.text()
    const aud = process.env.OGZIE_FINANCE_PUSH_AUDIENCE
    const publicJwk = process.env.OGZIE_FINANCE_PUSH_PUBLIC_JWK
    if (!aud || !publicJwk) {
        return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 500 })
    }

    const verdict = verifyOgziePush(
        rawBody,
        req.headers.get('x-ogzie-timestamp'),
        req.headers.get('x-ogzie-signature'),
        { aud, publicJwk },
    )
    if (!verdict.ok) {
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    let body: SnapshotRequest
    try {
        body = JSON.parse(rawBody) as SnapshotRequest
    } catch {
        return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }

    const identity = validateOgzieIdentity(body.identity)
    if (
        body.version !== 2 ||
        body.aud !== aud ||
        typeof body.requestId !== 'string' ||
        body.requestId.length < 8 ||
        body.requestId.length > 191 ||
        !identity
    ) {
        return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 })
    }

    const userId = await resolveOgzieUserId(identity)
    if (!userId) {
        return NextResponse.json({ ok: false, error: 'identity_not_linked' }, { status: 409 })
    }

    const [overview, subscriptions, recurringExpenses] = await Promise.all([
        getDashboardData(userId),
        prisma.subscription.findMany({
            where: { userId, isActive: true, status: 'ACTIVE' },
            orderBy: [{ nextPayment: 'asc' }, { name: 'asc' }],
            select: {
                id: true,
                name: true,
                amount: true,
                currency: true,
                billingCycle: true,
                category: true,
                nextPayment: true,
                providerDomain: true,
                monthlyNormalizedAmount: true,
                isEssential: true,
                autopay: true,
                updatedAt: true,
            },
        }),
        prisma.recurringExpense.findMany({
            where: { userId, status: 'ACTIVE' },
            orderBy: [{ nextPayment: 'asc' }, { name: 'asc' }],
            select: {
                id: true,
                name: true,
                amount: true,
                currency: true,
                billingCycle: true,
                category: true,
                nextPayment: true,
                isEssential: true,
                autopay: true,
                updatedAt: true,
            },
        }),
    ])

    return NextResponse.json({
        ok: true,
        schemaVersion: 1,
        subject: identity.subject,
        generatedAt: new Date().toISOString(),
        overview,
        subscriptions: subscriptions.map((item) => ({
            ...item,
            nextPayment: item.nextPayment.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
        })),
        recurringExpenses: recurringExpenses.map((item) => ({
            ...item,
            monthlyNormalizedAmount:
                item.billingCycle === 'YEARLY' ? +(item.amount / 12).toFixed(2) : item.amount,
            nextPayment: item.nextPayment.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
        })),
    })
}
