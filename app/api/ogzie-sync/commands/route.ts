import {
    BillingCycle,
    LedgerEntryType,
    Prisma,
    RecordStatus,
} from '@prisma/client'
import { NextResponse } from 'next/server'

import { resolveOgzieUserId, validateOgzieIdentity, type OgzieIdentity } from '@/lib/ogzie-identity'
import {
    financeDescription,
    ogzieCommandLockQuery,
    validFinancePayload,
    type FinancePayload,
} from '@/lib/ogzie-finance-command'
import { verifyOgziePush } from '@/lib/ogzie-ingest-verify'
import { prisma } from '@/lib/prisma'
import { enrichSubscriptionName } from '@/lib/subscription-enrichment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const commandTypes = [
    'subscription.upsert',
    'recurring_expense.upsert',
    'expense.create',
] as const
type CommandType = (typeof commandTypes)[number]

type CommandBody = {
    version: 2
    aud: string
    commandId: string
    identity: OgzieIdentity
    command: { type: CommandType; payload: FinancePayload }
}

function isCommandType(value: unknown): value is CommandType {
    return typeof value === 'string' && commandTypes.includes(value as CommandType)
}

function date(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`)
}

export async function POST(req: Request) {
    const rawBody = await req.text()
    const aud = process.env.OGZIE_FINANCE_PUSH_AUDIENCE
    const publicJwk = process.env.OGZIE_FINANCE_PUSH_PUBLIC_JWK
    const hermesPublicJwk = process.env.OGZIE_FINANCE_HERMES_PUBLIC_JWK
    const publicJwks = [publicJwk, hermesPublicJwk].filter((jwk): jwk is string => Boolean(jwk))
    if (!aud || publicJwks.length === 0) {
        return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 500 })
    }

    const verdict = verifyOgziePush(rawBody, req.headers.get('x-ogzie-timestamp'), req.headers.get('x-ogzie-signature'), { aud, publicJwks })
    if (!verdict.ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    let body: CommandBody
    try { body = JSON.parse(rawBody) as CommandBody } catch {
        return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }
    const identity = validateOgzieIdentity(body.identity)
    if (
        body.version !== 2 || body.aud !== aud || !identity ||
        typeof body.commandId !== 'string' || body.commandId.length < 8 || body.commandId.length > 191 ||
        !isCommandType(body.command?.type) || !validFinancePayload(body.command.payload)
    ) return NextResponse.json({ ok: false, error: 'invalid_command' }, { status: 400 })

    const userId = await resolveOgzieUserId(identity)
    if (!userId) return NextResponse.json({ ok: false, error: 'identity_not_linked' }, { status: 409 })

    const previous = await prisma.ogzieCommand.findUnique({ where: { commandId: body.commandId } })
    if (previous && previous.userId !== userId) {
        return NextResponse.json({ ok: false, error: 'command_conflict' }, { status: 409 })
    }
    if (previous?.status === 'completed' && previous.result) {
        return NextResponse.json(previous.result)
    }

    await prisma.ogzieCommand.upsert({
        where: { commandId: body.commandId },
        create: { userId, commandId: body.commandId, type: body.command.type, payload: body.command.payload as Prisma.InputJsonValue },
        update: {},
    })

    const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw(ogzieCommandLockQuery(body.commandId))
        const locked = await tx.ogzieCommand.findUniqueOrThrow({ where: { commandId: body.commandId } })
        if (locked.userId !== userId) throw new Error('command_conflict')
        if (locked.status === 'completed' && locked.result) return locked.result

        const p = body.command.payload
        const amount = p.amountCents / 100
        const description = financeDescription(p)
        let recordId: string
        let subscriptionId: string | undefined

        if (body.command.type === 'subscription.upsert') {
            const enrichment = enrichSubscriptionName(p.name)
            const externalId = `draft:${p.draftId}`
            const providerDomain = p.providerDomain?.trim().toLowerCase() || enrichment.providerDomain
            const existingSubscription = await tx.subscription.findFirst({
                where: {
                    userId,
                    status: RecordStatus.ACTIVE,
                    ...(providerDomain
                        ? { providerDomain }
                        : { name: p.name.trim(), currency: p.currency.toUpperCase() }),
                },
                select: { id: true },
            })
            const subscription = existingSubscription
                ? await tx.subscription.update({
                    where: { id: existingSubscription.id },
                    data: { notes: description },
                    select: { id: true },
                })
                : await tx.subscription.upsert({
                    where: { source_externalId: { source: 'ogzie-app', externalId } },
                    create: {
                        userId,
                        source: 'ogzie-app', externalId,
                        name: p.name.trim(), amount, currency: p.currency.toUpperCase(),
                        billingCycle: p.billingCycle === 'monthly' ? BillingCycle.MONTHLY : BillingCycle.YEARLY,
                        category: p.category?.trim() || enrichment.category,
                        nextPayment: date(p.nextPayment),
                        providerDomain,
                        brandKey: enrichment.brandKey, logoUrl: enrichment.logoUrl, color: enrichment.color,
                        billingAnchorDay: Number(p.nextPayment.slice(8, 10)), autopay: Boolean(p.autopay),
                        isEssential: Boolean(p.isEssential), isActive: true, status: RecordStatus.ACTIVE,
                        notes: description,
                        lastAmount: amount,
                        monthlyNormalizedAmount: +(p.amountCents / (p.billingCycle === 'yearly' ? 1200 : 100)).toFixed(2),
                    },
                    update: {
                        name: p.name.trim(), amount, currency: p.currency.toUpperCase(),
                        billingCycle: p.billingCycle === 'monthly' ? BillingCycle.MONTHLY : BillingCycle.YEARLY,
                        category: p.category?.trim() || enrichment.category,
                        nextPayment: date(p.nextPayment),
                        providerDomain,
                        autopay: Boolean(p.autopay), isEssential: Boolean(p.isEssential), isActive: true,
                        status: RecordStatus.ACTIVE, lastAmount: amount,
                        notes: description,
                        monthlyNormalizedAmount: +(p.amountCents / (p.billingCycle === 'yearly' ? 1200 : 100)).toFixed(2),
                    },
                    select: { id: true },
                })
            recordId = subscription.id
            subscriptionId = subscription.id
        } else if (body.command.type === 'recurring_expense.upsert') {
            const existingRecurring = await tx.recurringExpense.findFirst({
                where: {
                    userId,
                    name: p.name.trim(),
                    currency: p.currency.toUpperCase(),
                    status: RecordStatus.ACTIVE,
                },
                select: { id: true },
            })
            const recurring = existingRecurring
                ? await tx.recurringExpense.update({
                    where: { id: existingRecurring.id },
                    data: { notes: description },
                    select: { id: true },
                })
                : await tx.recurringExpense.create({
                    data: {
                        userId,
                        name: p.name.trim(),
                        category: p.category?.trim() || 'Fatura ve ödemeler',
                        amount,
                        currency: p.currency.toUpperCase(),
                        billingCycle: p.billingCycle === 'monthly' ? BillingCycle.MONTHLY : BillingCycle.YEARLY,
                        billingAnchorDay: Number(p.nextPayment.slice(8, 10)),
                        nextPayment: date(p.nextPayment),
                        autopay: Boolean(p.autopay),
                        isEssential: p.isEssential !== false,
                        status: RecordStatus.ACTIVE,
                        notes: description,
                    },
                    select: { id: true },
                })
            recordId = recurring.id
        } else {
            const entry = await tx.ledgerEntry.upsert({
                where: { source_externalId: { source: 'ogzie-app-mail', externalId: p.draftId } },
                create: {
                    userId,
                    type: LedgerEntryType.EXPENSE,
                    amount,
                    currency: p.currency.toUpperCase(),
                    description,
                    category: p.category?.trim() || 'Fatura ve ödemeler',
                    date: date(p.occurredOn ?? p.nextPayment),
                    source: 'ogzie-app-mail',
                    externalId: p.draftId,
                    metadata: { origin: 'mail-suggestion', draftId: p.draftId },
                },
                update: {
                    amount,
                    currency: p.currency.toUpperCase(),
                    description,
                    category: p.category?.trim() || 'Fatura ve ödemeler',
                    date: date(p.occurredOn ?? p.nextPayment),
                },
                select: { id: true },
            })
            recordId = entry.id
        }

        const completed = {
            ok: true,
            commandId: body.commandId,
            recordId,
            ...(subscriptionId ? { subscriptionId } : {}),
        }
        await tx.ogzieCommand.update({
            where: { commandId: body.commandId },
            data: { status: 'completed', result: completed },
        })
        return completed
    })

    return NextResponse.json(result)
}
