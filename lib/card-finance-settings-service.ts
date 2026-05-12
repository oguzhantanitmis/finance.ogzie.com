import type { CardFinanceSettings } from '@prisma/client'
import { prisma } from '@/lib/prisma'

function assertFiniteRange(value: number, label: string, min: number, max: number) {
    if (!Number.isFinite(value) || value < min || value > max) {
        throw new Error(`${label} gecersiz.`)
    }
}

/**
 * Kullanıcının genel kart finans ayarlarını getirir.
 * Yoksa null döner.
 */
export async function getCardFinanceSettings(userId: string): Promise<CardFinanceSettings | null> {
    return prisma.cardFinanceSettings.findUnique({ where: { userId } })
}

/**
 * Genel kart finans ayarlarını oluşturur veya günceller.
 */
export async function upsertCardFinanceSettings(
    userId: string,
    data: {
        contractualRate: number
        defaultRate: number
        cashAdvanceRate: number
        minPaymentRateBelow50k: number
        minPaymentRateAbove50k: number
        kkdfRate: number
        bsmvRate: number
        notes?: string
    }
): Promise<CardFinanceSettings> {
    assertFiniteRange(data.contractualRate, 'Akdi faiz orani', 0, 100)
    assertFiniteRange(data.defaultRate, 'Gecikme faiz orani', 0, 100)
    assertFiniteRange(data.cashAdvanceRate, 'Nakit avans faiz orani', 0, 100)
    assertFiniteRange(data.minPaymentRateBelow50k, 'Asgari odeme orani', 0, 1)
    assertFiniteRange(data.minPaymentRateAbove50k, 'Asgari odeme orani', 0, 1)
    assertFiniteRange(data.kkdfRate, 'KKDF orani', 0, 1)
    assertFiniteRange(data.bsmvRate, 'BSMV orani', 0, 1)

    return prisma.cardFinanceSettings.upsert({
        where: { userId },
        create: {
            userId,
            ...data,
            lastUpdated: new Date(),
        },
        update: {
            ...data,
            lastUpdated: new Date(),
        },
    })
}

/**
 * Belirli bir kart için etkin faiz oranlarını getirir.
 * Kart useGlobalRates=true ise genel ayarları kullanır, değilse kendi oranlarını döner.
 */
export async function getEffectiveRates(userId: string, cardId: string) {
    const card = await prisma.creditCard.findFirstOrThrow({
        where: { id: cardId, userId },
    })

    if (card.useGlobalRates) {
        const global = await getCardFinanceSettings(userId)
        if (global) {
            return {
                contractualRate: global.contractualRate,
                defaultRate: global.defaultRate,
                cashAdvanceRate: global.cashAdvanceRate,
                kkdfRate: global.kkdfRate,
                bsmvRate: global.bsmvRate,
                minPaymentRate: card.totalLimit <= 50000 ? global.minPaymentRateBelow50k : global.minPaymentRateAbove50k,
                source: 'global' as const,
            }
        }
    }

    return {
        contractualRate: card.contractualRate,
        defaultRate: card.defaultRate,
        cashAdvanceRate: card.cashAdvanceRate,
        kkdfRate: card.kkdfRate,
        bsmvRate: card.bsmvRate,
        minPaymentRate: card.minPaymentRate,
        source: 'card' as const,
    }
}

/**
 * Kart ödemesini kaydeder.
 * 1. Hesap bakiyesi düşer
 * 2. LedgerEntry (CARD_PAYMENT) oluşturur
 */
export async function recordCardPayment(
    userId: string,
    cardId: string,
    amount: number,
    accountId: string,
    description?: string
): Promise<void> {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Tutar sıfırdan büyük olmalıdır.')

    const [card, account] = await Promise.all([
        prisma.creditCard.findFirstOrThrow({ where: { id: cardId, userId } }),
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
                type: 'CARD_PAYMENT',
                amount: -amount,
                currency: 'TRY',
                description: description || `Kart ödeme: ${card.cardName}`,
                accountId: account.id,
                creditCardId: card.id,
                date: new Date(),
            },
        }),
    ])
}
