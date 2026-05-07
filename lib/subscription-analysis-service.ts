import { prisma } from '@/lib/prisma'

export interface SubscriptionAnalysis {
    totalMonthly: number
    totalYearly: number
    essentialMonthly: number
    nonEssentialMonthly: number
    potentialSavings: number
    byCategory: { category: string; total: number; count: number }[]
}

export async function analyzeSubscriptions(userId: string): Promise<SubscriptionAnalysis> {
    const subs = await prisma.subscription.findMany({
        where: { userId, isActive: true, status: 'ACTIVE' },
        select: {
            amount: true,
            billingCycle: true,
            category: true,
            monthlyNormalizedAmount: true,
            isEssential: true,
        },
    })

    const withMonthly = subs.map((s) => ({
        ...s,
        monthly: s.monthlyNormalizedAmount ?? (s.billingCycle === 'YEARLY' ? s.amount / 12 : s.amount),
    }))

    const totalMonthly = withMonthly.reduce((sum, s) => sum + s.monthly, 0)
    const essentialMonthly = withMonthly.filter((s) => s.isEssential).reduce((sum, s) => sum + s.monthly, 0)
    const nonEssentialMonthly = totalMonthly - essentialMonthly
    const potentialSavings = nonEssentialMonthly // İptal edilebilir abonelik toplamı

    const categoryMap = new Map<string, { total: number; count: number }>()
    for (const s of withMonthly) {
        const existing = categoryMap.get(s.category) ?? { total: 0, count: 0 }
        categoryMap.set(s.category, { total: existing.total + s.monthly, count: existing.count + 1 })
    }
    const byCategory = Array.from(categoryMap.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.total - a.total)

    return {
        totalMonthly: +totalMonthly.toFixed(2),
        totalYearly: +(totalMonthly * 12).toFixed(2),
        essentialMonthly: +essentialMonthly.toFixed(2),
        nonEssentialMonthly: +nonEssentialMonthly.toFixed(2),
        potentialSavings: +potentialSavings.toFixed(2),
        byCategory,
    }
}

/**
 * Abonelik ödemesini kaydeder.
 * 1. Hesap bakiyesinden düşer
 * 2. LedgerEntry (SUBSCRIPTION_PAYMENT) oluşturur
 */
export async function recordSubscriptionPayment(
    userId: string,
    subscriptionId: string,
    amount: number,
    accountId: string,
    description?: string
): Promise<void> {
    if (amount <= 0) throw new Error('Tutar sıfırdan büyük olmalıdır.')

    const [sub, account] = await Promise.all([
        prisma.subscription.findFirstOrThrow({ where: { id: subscriptionId, userId } }),
        prisma.account.findFirstOrThrow({ where: { id: accountId, userId } }),
    ])

    await prisma.$transaction([
        prisma.account.update({
            where: { id: account.id },
            data: { balance: { decrement: amount } },
        }),
        prisma.ledgerEntry.create({
            data: {
                userId,
                type: 'SUBSCRIPTION_PAYMENT',
                amount: -amount,
                currency: sub.currency,
                description: description || `Abonelik ödemesi: ${sub.name}`,
                accountId: account.id,
                subscriptionId: sub.id,
                date: new Date(),
            },
        }),
    ])
}

/**
 * Aboneliğin isEssential alanını günceller.
 */
export async function toggleSubscriptionEssential(userId: string, subscriptionId: string, isEssential: boolean) {
    await prisma.subscription.findFirstOrThrow({
        where: { id: subscriptionId, userId },
        select: { id: true },
    })

    await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { isEssential },
    })
}
