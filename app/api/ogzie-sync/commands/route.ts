import { BillingCycle, Prisma, RecordStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { authenticateOgzieControlRequest } from '@/lib/ogzie-control-auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CURRENCY_RE = /^[A-Z]{3,8}$/

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

function validString(value: unknown, max: number): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

function parseSubscriptionPayload(value: unknown): SubscriptionPayload | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const item = value as Record<string, unknown>
    if (!validString(item.draftId, 191) || !validString(item.name, 191)) return null
    if (!Number.isSafeInteger(item.amountCents) || (item.amountCents as number) <= 0 || (item.amountCents as number) > 100_000_000_000) return null
    if (typeof item.currency !== 'string' || !CURRENCY_RE.test(item.currency)) return null
    if (item.billingCycle !== 'monthly' && item.billingCycle !== 'yearly') return null
    if (typeof item.nextPayment !== 'string' || !Number.isFinite(Date.parse(item.nextPayment))) return null
    if (item.category !== undefined && !validString(item.category, 100)) return null
    if (item.providerDomain !== undefined && item.providerDomain !== null && !validString(item.providerDomain, 253)) return null
    if (item.autopay !== undefined && typeof item.autopay !== 'boolean') return null
    if (item.isEssential !== undefined && typeof item.isEssential !== 'boolean') return null
    return item as SubscriptionPayload
}

export async function POST(request: Request) {
    const auth = await authenticateOgzieControlRequest(request)
    if (!auth.ok) {
        return NextResponse.json({ ok: false, error: auth.reason }, { status: auth.status })
    }

    const { commandId, command } = auth.body
    if (typeof commandId !== 'string' || !UUID_RE.test(commandId)) {
        return NextResponse.json({ ok: false, error: 'invalid_command_id' }, { status: 400 })
    }
    if (!command || typeof command !== 'object' || Array.isArray(command)) {
        return NextResponse.json({ ok: false, error: 'invalid_command' }, { status: 400 })
    }
    const typedCommand = command as Record<string, unknown>
    if (typedCommand.type !== 'subscription.upsert') {
        return NextResponse.json({ ok: false, error: 'unsupported_command' }, { status: 400 })
    }
    const payload = parseSubscriptionPayload(typedCommand.payload)
    if (!payload) {
        return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
    }

    const userId = process.env.OGZIE_INGEST_USER_ID?.trim()
    if (!userId) {
        return NextResponse.json({ ok: false, error: 'control_not_configured' }, { status: 503 })
    }

    const existing = await prisma.ogzieCommand.findUnique({ where: { commandId } })
    if (existing) return NextResponse.json({ ok: true, subscriptionId: existing.resultId, replayed: true })

    const cycle = payload.billingCycle === 'yearly' ? BillingCycle.YEARLY : BillingCycle.MONTHLY
    const amount = payload.amountCents / 100
    const nextPayment = new Date(payload.nextPayment)
    try {
        const subscriptionId = await prisma.$transaction(async (tx) => {
            const subscription = await tx.subscription.create({
                data: {
                    userId,
                    name: payload.name.trim(),
                    amount,
                    currency: payload.currency,
                    billingCycle: cycle,
                    category: payload.category?.trim() || 'Genel',
                    nextPayment,
                    billingAnchorDay: nextPayment.getUTCDate(),
                    providerDomain: payload.providerDomain?.trim() || null,
                    autopay: payload.autopay ?? false,
                    isEssential: payload.isEssential ?? false,
                    status: RecordStatus.ACTIVE,
                    isActive: true,
                    monthlyNormalizedAmount: cycle === BillingCycle.YEARLY ? amount / 12 : amount,
                    notes: `Ogzie e-posta taslağı: ${payload.draftId}`,
                },
            })
            await tx.ogzieCommand.create({
                data: { commandId, type: 'subscription.upsert', resultId: subscription.id },
            })
            return subscription.id
        })
        return NextResponse.json({ ok: true, subscriptionId, replayed: false })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const replay = await prisma.ogzieCommand.findUnique({ where: { commandId } })
            if (replay) return NextResponse.json({ ok: true, subscriptionId: replay.resultId, replayed: true })
        }
        throw error
    }
}
