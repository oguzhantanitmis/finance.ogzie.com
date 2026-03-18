'use server'

import type { CardFinanceSettings } from '@prisma/client'
import { prisma } from '@/lib/prisma'

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
    const card = await prisma.creditCard.findUniqueOrThrow({ where: { id: cardId } })

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
    if (amount <= 0) throw new Error('Tutar sıfırdan büyük olmalıdır.')

    const card = await prisma.creditCard.findUniqueOrThrow({ where: { id: cardId } })

    await prisma.$transaction([
        prisma.account.update({
            where: { id: accountId },
            data: { balance: { decrement: amount } },
        }),
        prisma.ledgerEntry.create({
            data: {
                userId,
                type: 'CARD_PAYMENT',
                amount: -amount,
                currency: 'TRY',
                description: description || `Kart ödeme: ${card.cardName}`,
                accountId,
                creditCardId: cardId,
                date: new Date(),
            },
        }),
    ])
}
