import { BillingCycle, Prisma, RecordStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import { resolveOgzieUserId, validateOgzieIdentity, type OgzieIdentity } from '@/lib/ogzie-identity'
import { verifyOgziePush } from '@/lib/ogzie-ingest-verify'
import { prisma } from '@/lib/prisma'
import { enrichSubscriptionName } from '@/lib/subscription-enrichment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SubscriptionPayload = {
    draftId: string
    name: string
    amountCents: number
    currency: string
    billingCycle: 'monthly' | 'yearly'
    nextPayment: string
    category?: string
    providerDomain?: string | null
    autopay?: boolean
    isEssential?: boolean
}

type CommandBody = {
    version: 2
    aud: string
    commandId: string
    identity: OgzieIdentity
    command: { type: 'subscription.upsert'; payload: SubscriptionPayload }
}

function validPayload(value: unknown): value is SubscriptionPayload {
    if (!value || typeof value !== 'object') return false
    const p = value as Partial<SubscriptionPayload>
    return Boolean(
        typeof p.draftId === 'string' && p.draftId.length >= 8 && p.draftId.length <= 191 &&
        typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 200 &&
        Number.isSafeInteger(p.amountCents) && (p.amountCents ?? 0) > 0 &&
        typeof p.currency === 'string' && /^[A-Za-z]{3}$/.test(p.currency) &&
        (p.billingCycle === 'monthly' || p.billingCycle === 'yearly') &&
        typeof p.nextPayment === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.nextPayment),
    )
}

export async function POST(req: Request) {
    const rawBody = await req.text()
    const aud = process.env.OGZIE_FINANCE_PUSH_AUDIENCE
    const publicJwk = process.env.OGZIE_FINANCE_PUSH_PUBLIC_JWK
    if (!aud || !publicJwk) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 500 })

    const verdict = verifyOgziePush(rawBody, req.headers.get('x-ogzie-timestamp'), req.headers.get('x-ogzie-signature'), { aud, publicJwk })
    if (!verdict.ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    let body: CommandBody
    try { body = JSON.parse(rawBody) as CommandBody } catch {
        return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }
    const identity = validateOgzieIdentity(body.identity)
    if (
        body.version !== 2 || body.aud !== aud || !identity ||
        typeof body.commandId !== 'string' || body.commandId.length < 8 || body.commandId.length > 191 ||
        body.command?.type !== 'subscription.upsert' || !validPayload(body.command.payload)
    ) return NextResponse.json({ ok: false, error: 'invalid_command' }, { status: 400 })

    const userId = await resolveOgzieUserId(identity)
    if (!userId) return NextResponse.json({ ok: false, error: 'identity_not_linked' }, { status: 409 })

    const previous = await prisma.ogzieCommand.findUnique({ where: { commandId: body.commandId } })
    if (previous?.status === 'completed' && previous.result) {
        return NextResponse.json(previous.result)
    }

    await prisma.ogzieCommand.upsert({
        where: { commandId: body.commandId },
        create: { userId, commandId: body.commandId, type: body.command.type, payload: body.command.payload as Prisma.InputJsonValue },
        update: {},
    })

    const p = body.command.payload
    const enrichment = enrichSubscriptionName(p.name)
    const externalId = `draft:${p.draftId}`
    const subscription = await prisma.subscription.upsert({
        where: { source_externalId: { source: 'ogzie-app', externalId } },
        create: {
            userId,
            source: 'ogzie-app', externalId,
            name: p.name.trim(), amount: p.amountCents / 100, currency: p.currency.toUpperCase(),
            billingCycle: p.billingCycle === 'monthly' ? BillingCycle.MONTHLY : BillingCycle.YEARLY,
            category: p.category?.trim() || enrichment.category,
            nextPayment: new Date(`${p.nextPayment}T00:00:00.000Z`),
            providerDomain: p.providerDomain?.trim().toLowerCase() || enrichment.providerDomain,
            brandKey: enrichment.brandKey, logoUrl: enrichment.logoUrl, color: enrichment.color,
            billingAnchorDay: Number(p.nextPayment.slice(8, 10)), autopay: Boolean(p.autopay),
            isEssential: Boolean(p.isEssential), isActive: true, status: RecordStatus.ACTIVE,
            lastAmount: p.amountCents / 100,
            monthlyNormalizedAmount: +(p.amountCents / (p.billingCycle === 'yearly' ? 1200 : 100)).toFixed(2),
        },
        update: {
            name: p.name.trim(), amount: p.amountCents / 100, currency: p.currency.toUpperCase(),
            billingCycle: p.billingCycle === 'monthly' ? BillingCycle.MONTHLY : BillingCycle.YEARLY,
            category: p.category?.trim() || enrichment.category,
            nextPayment: new Date(`${p.nextPayment}T00:00:00.000Z`),
            providerDomain: p.providerDomain?.trim().toLowerCase() || enrichment.providerDomain,
            autopay: Boolean(p.autopay), isEssential: Boolean(p.isEssential), isActive: true,
            status: RecordStatus.ACTIVE, lastAmount: p.amountCents / 100,
            monthlyNormalizedAmount: +(p.amountCents / (p.billingCycle === 'yearly' ? 1200 : 100)).toFixed(2),
        },
        select: { id: true },
    })
    const result = { ok: true, commandId: body.commandId, subscriptionId: subscription.id }
    await prisma.ogzieCommand.update({
        where: { commandId: body.commandId },
        data: { status: 'completed', result },
    })
    return NextResponse.json(result)
}
