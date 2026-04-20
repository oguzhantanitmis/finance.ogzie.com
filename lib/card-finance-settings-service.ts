'use server'

import type { CardFinanceSettings } from '@prisma/client'
import { ActionError } from '@/lib/action-result'
import { determineStatementStatus } from '@/lib/card-engine/statement-engine'
import { prisma } from '@/lib/prisma'

async function findUserCard(userId: string, cardId: string) {
    return prisma.creditCard.findFirstOrThrow({
        where: { id: cardId, userId },
        include: {
            statements: {
                where: { status: { in: ['OPEN', 'OVERDUE', 'CLOSED'] } },
                orderBy: { statementDate: 'desc' },
                take: 1,
            },
        },
    })
}

async function findUserAccount(userId: string, accountId: string) {
    return prisma.account.findFirstOrThrow({
        where: { id: accountId, userId },
        select: { id: true, currency: true },
    })
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
    if (amount <= 0) {
        throw new ActionError('Tutar sıfırdan büyük olmalıdır.')
    }

    const [card, account] = await Promise.all([
        findUserCard(userId, cardId),
        findUserAccount(userId, accountId),
    ])

    const latestStatement = card.statements[0] ?? null
    const outstandingStatementBalance = latestStatement
        ? Math.max(latestStatement.statementBalance - latestStatement.paymentsReceived, 0)
        : 0
    const appliedToStatement = Math.min(amount, outstandingStatementBalance)
    const nextPaymentsReceived = latestStatement
        ? latestStatement.paymentsReceived + appliedToStatement
        : 0

    await prisma.$transaction(async (tx) => {
        await tx.account.update({
            where: { id: account.id },
            data: { balance: { decrement: amount } },
        })

        if (latestStatement && appliedToStatement > 0) {
            await tx.cardStatement.update({
                where: { id: latestStatement.id },
                data: {
                    paymentsReceived: nextPaymentsReceived,
                    status: determineStatementStatus({
                        statementBalance: latestStatement.statementBalance,
                        minimumPayment: latestStatement.minimumPayment,
                        paymentsReceived: nextPaymentsReceived,
                        dueDate: latestStatement.dueDate,
                    }),
                },
            })
        }

        await tx.cardPayment.create({
            data: {
                creditCardId: card.id,
                amount,
                description: description || 'Hesaptan Kart Ödemesi',
                statementId: appliedToStatement > 0 ? latestStatement?.id : undefined,
                allocationDetail: {
                    appliedToStatement,
                    outstandingStatementBalance,
                },
            },
        })

        await tx.ledgerEntry.create({
            data: {
                userId,
                type: 'CARD_PAYMENT',
                amount: -amount,
                currency: account.currency,
                description: description || `Kart ödeme: ${card.cardName}`,
                accountId: account.id,
                creditCardId: card.id,
                date: new Date(),
            },
        })
    })
}
