import { Prisma } from '@prisma/client'

export type FinancePayload = {
    draftId: string
    name: string
    amountCents: number
    currency: string
    billingCycle: 'monthly' | 'yearly'
    nextPayment: string
    occurredOn?: string
    description?: string
    category?: string
    providerDomain?: string | null
    autopay?: boolean
    isEssential?: boolean
}

export function validFinancePayload(value: unknown): value is FinancePayload {
    if (!value || typeof value !== 'object') return false
    const p = value as Partial<FinancePayload>
    return Boolean(
        typeof p.draftId === 'string' && p.draftId.length >= 8 && p.draftId.length <= 191 &&
        typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 200 &&
        Number.isSafeInteger(p.amountCents) && (p.amountCents ?? 0) > 0 &&
        typeof p.currency === 'string' && /^[A-Za-z]{3}$/.test(p.currency) &&
        (p.billingCycle === 'monthly' || p.billingCycle === 'yearly') &&
        typeof p.nextPayment === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.nextPayment) &&
        (p.occurredOn === undefined || /^\d{4}-\d{2}-\d{2}$/.test(p.occurredOn)) &&
        (p.description === undefined || (
            typeof p.description === 'string' &&
            p.description.trim().length >= 3 &&
            p.description.length <= 300
        )) &&
        (p.category === undefined || (typeof p.category === 'string' && p.category.length <= 100)) &&
        (p.providerDomain === undefined || p.providerDomain === null || (typeof p.providerDomain === 'string' && p.providerDomain.length <= 253)),
    )
}

/** Eski istemciler için sağlayıcı adını güvenli geri dönüş olarak korur. */
export function financeDescription(payload: Pick<FinancePayload, 'description' | 'name'>): string {
    return payload.description?.trim() || payload.name.trim()
}

/** MariaDB satır kilidi; Prisma değeri parametre olarak bağlar. */
export function ogzieCommandLockQuery(commandId: string): Prisma.Sql {
    return Prisma.sql`SELECT id FROM \`OgzieCommand\` WHERE \`commandId\` = ${commandId} FOR UPDATE`
}
