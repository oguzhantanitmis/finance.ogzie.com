import { BillingCycle, RecordStatus } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export type OgzieSubscriptionEvent = {
    externalId: string
    assetType: 'domain' | 'service'
    assetId: string
    assetName?: string
    providerDomain?: string | null
    mode: 'forecast' | 'actual'
    direction: 'in' | 'out'
    amountCents: number
    currency: string
    occurredOn: string
    billingCycle?: 'monthly' | 'yearly' | null
    description: string
}

function domainName(event: OgzieSubscriptionEvent): string {
    const explicit = event.providerDomain?.trim() || event.assetName?.trim()
    if (explicit) return explicit.toLowerCase()
    return event.description.replace(/^Domain:\s*/i, '').split(/\s+\(/, 1)[0]?.trim().toLowerCase() || event.assetId
}

/**
 * App domain yenilemelerini Finance aboneliklerine bağlar. Yalnız forecast,
 * gelecek ödeme tarihini temsil eder; actual geçmiş dönemi olduğu için abonelik
 * tarihini geriye çekmez. Aynı providerDomain'e ait mevcut manuel kayıt ilk
 * senkronizasyonda sahiplenilir, böylece çift abonelik oluşmaz.
 */
export async function syncOgzieDomainSubscriptions(
    userId: string,
    events: OgzieSubscriptionEvent[],
): Promise<number> {
    let synced = 0
    for (const event of events) {
        if (
            event.assetType !== 'domain' ||
            event.mode !== 'forecast' ||
            event.direction !== 'out' ||
            !Number.isSafeInteger(event.amountCents) ||
            event.amountCents <= 0 ||
            !/^\d{4}-\d{2}-\d{2}$/.test(event.occurredOn)
        ) continue

        const externalId = `domain:${event.assetId}`
        const providerDomain = domainName(event)
        const data = {
            name: `Domain: ${providerDomain}`,
            amount: event.amountCents / 100,
            currency: event.currency.toUpperCase(),
            billingCycle: BillingCycle.YEARLY,
            category: 'Domain',
            nextPayment: new Date(`${event.occurredOn}T00:00:00.000Z`),
            isActive: true,
            providerDomain,
            billingAnchorDay: Number(event.occurredOn.slice(8, 10)),
            status: RecordStatus.ACTIVE,
            lastAmount: event.amountCents / 100,
            monthlyNormalizedAmount: +(event.amountCents / 1200).toFixed(2),
            isEssential: true,
            source: 'ogzie',
            externalId,
        } as const

        const linked = await prisma.subscription.findUnique({
            where: { source_externalId: { source: 'ogzie', externalId } },
            select: { id: true },
        })
        if (linked) {
            await prisma.subscription.update({ where: { id: linked.id }, data })
            synced++
            continue
        }

        const manualMatch = await prisma.subscription.findFirst({
            where: { userId, providerDomain, source: null },
            select: { id: true },
        })
        if (manualMatch) {
            await prisma.subscription.update({ where: { id: manualMatch.id }, data })
        } else {
            await prisma.subscription.create({ data: { ...data, userId } })
        }
        synced++
    }
    return synced
}
