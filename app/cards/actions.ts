'use server'

import { CardNetwork, CardStatus, TransactionType } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import {
    type ActionResult,
    createSuccessResult,
    getActionErrorResult,
    resolveFormData,
    toOptionalNumber,
    toOptionalString,
    toRequiredNumber,
    toRequiredString,
} from '@/lib/action-result'
import { calculateMinimumPayment } from '@/lib/card-engine/payment-engine'
import { getDueDate } from '@/lib/card-engine/statement-engine'
import { recordCardPayment } from '@/lib/card-finance-settings-service'
import { prisma } from '@/lib/prisma'
import { requireCurrentUser } from '@/lib/server-auth'

type CardField =
    | 'cardName'
    | 'bankName'
    | 'last4Digits'
    | 'cardNetwork'
    | 'status'
    | 'totalLimit'
    | 'cashAdvanceLimit'
    | 'cutOffDay'
    | 'paymentDueDay'
    | 'contractualRate'
    | 'defaultRate'
    | 'cashAdvanceRate'
    | 'kkdfRate'
    | 'bsmvRate'
    | 'minPaymentRate'
    | 'rewardsPoints'
    | 'color'

type CardTransactionField = 'type' | 'description' | 'merchant' | 'amount'
type CardPaymentField = 'amount' | 'description' | 'statementId'

function revalidateCardPaths(cardId?: string) {
    const paths = ['/', '/cards', '/transactions', '/payment-plan']
    if (cardId) {
        paths.push(`/cards/${cardId}`)
    }
    new Set(paths).forEach((path) => revalidatePath(path))
}

function parseCardNetwork(value: FormDataEntryValue | null) {
    const network = String(value ?? CardNetwork.VISA)
    return Object.values(CardNetwork).includes(network as CardNetwork)
        ? (network as CardNetwork)
        : CardNetwork.VISA
}

function parseCardStatus(value: FormDataEntryValue | null) {
    const status = String(value ?? CardStatus.ACTIVE)
    return Object.values(CardStatus).includes(status as CardStatus)
        ? (status as CardStatus)
        : CardStatus.ACTIVE
}

function parseTransactionType(value: string) {
    return Object.values(TransactionType).includes(value as TransactionType)
        ? (value as TransactionType)
        : TransactionType.PURCHASE
}

async function getUserCard(cardId: string, userId: string) {
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

async function syncLatestStatementForCard(cardId: string, totalLimit: number, paymentDueDay: number, minPaymentRate: number) {
    const latestStatement = await prisma.cardStatement.findFirst({
        where: { creditCardId: cardId, status: { in: ['OPEN', 'OVERDUE', 'CLOSED'] } },
        orderBy: { statementDate: 'desc' },
    })

    if (!latestStatement) {
        return
    }

    await prisma.cardStatement.update({
        where: { id: latestStatement.id },
        data: {
            dueDate: getDueDate(paymentDueDay, latestStatement.statementDate),
            minimumPayment: calculateMinimumPayment(totalLimit, latestStatement.statementBalance, minPaymentRate),
        },
    })
}

export async function addCreditCard(
    previousState: ActionResult<CardField> | FormData,
    formData?: FormData,
): Promise<ActionResult<CardField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const totalLimit = toRequiredNumber(data.get('totalLimit'), 'totalLimit', 'Toplam limit', { min: 0.01 })
        const minPaymentRate = toOptionalNumber(data.get('minPaymentRate')) ?? (totalLimit > 50000 ? 0.4 : 0.2)

        const card = await prisma.creditCard.create({
            data: {
                userId: user.id,
                cardName: toRequiredString(data.get('cardName'), 'cardName', 'Kart adi'),
                bankName: toRequiredString(data.get('bankName'), 'bankName', 'Banka adi'),
                last4Digits: String(data.get('last4Digits') ?? '0000').trim() || '0000',
                cardNetwork: parseCardNetwork(data.get('cardNetwork')),
                status: parseCardStatus(data.get('status')),
                totalLimit,
                cashAdvanceLimit: toOptionalNumber(data.get('cashAdvanceLimit')) ?? totalLimit * 0.5,
                cutOffDay: toRequiredNumber(data.get('cutOffDay'), 'cutOffDay', 'Hesap kesim gunu', { min: 1 }),
                paymentDueDay: toRequiredNumber(data.get('paymentDueDay'), 'paymentDueDay', 'Son odeme gunu', { min: 1 }),
                contractualRate: toOptionalNumber(data.get('contractualRate')) ?? 4.42,
                defaultRate: toOptionalNumber(data.get('defaultRate')) ?? 5.42,
                cashAdvanceRate: toOptionalNumber(data.get('cashAdvanceRate')) ?? 5.92,
                minPaymentRate,
                kkdfRate: toOptionalNumber(data.get('kkdfRate')) ?? 0.15,
                bsmvRate: toOptionalNumber(data.get('bsmvRate')) ?? 0.15,
                rewardsPoints: toOptionalNumber(data.get('rewardsPoints')) ?? 0,
                color: toOptionalString(data.get('color')) ?? '#6366F1',
                useGlobalRates: data.get('useGlobalRates') === 'on',
            },
        })
        revalidateCardPaths(card.id)
        return createSuccessResult('Kart kaydedildi.', card.id)
    } catch (error) {
        return getActionErrorResult<CardField>(error, 'Kart kaydedilemedi.')
    }
}

export async function updateCreditCard(
    previousState: ActionResult<CardField> | FormData,
    formData?: FormData,
): Promise<ActionResult<CardField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const cardId = String(data.get('cardId'))
        const existing = await getUserCard(cardId, user.id)
        const totalLimit = toRequiredNumber(data.get('totalLimit'), 'totalLimit', 'Toplam limit', { min: 0.01 })
        const minPaymentRate = toOptionalNumber(data.get('minPaymentRate')) ?? existing.minPaymentRate
        const paymentDueDay = toRequiredNumber(data.get('paymentDueDay'), 'paymentDueDay', 'Son odeme gunu', { min: 1 })

        const card = await prisma.creditCard.update({
            where: { id: existing.id },
            data: {
                cardName: toRequiredString(data.get('cardName'), 'cardName', 'Kart adi'),
                bankName: toRequiredString(data.get('bankName'), 'bankName', 'Banka adi'),
                last4Digits: String(data.get('last4Digits') ?? existing.last4Digits).trim() || existing.last4Digits,
                cardNetwork: parseCardNetwork(data.get('cardNetwork')),
                status: parseCardStatus(data.get('status')),
                totalLimit,
                cashAdvanceLimit: toOptionalNumber(data.get('cashAdvanceLimit')) ?? totalLimit * 0.5,
                cutOffDay: toRequiredNumber(data.get('cutOffDay'), 'cutOffDay', 'Hesap kesim gunu', { min: 1 }),
                paymentDueDay,
                contractualRate: toOptionalNumber(data.get('contractualRate')) ?? existing.contractualRate,
                defaultRate: toOptionalNumber(data.get('defaultRate')) ?? existing.defaultRate,
                cashAdvanceRate: toOptionalNumber(data.get('cashAdvanceRate')) ?? existing.cashAdvanceRate,
                kkdfRate: toOptionalNumber(data.get('kkdfRate')) ?? existing.kkdfRate,
                bsmvRate: toOptionalNumber(data.get('bsmvRate')) ?? existing.bsmvRate,
                minPaymentRate,
                rewardsPoints: toOptionalNumber(data.get('rewardsPoints')) ?? existing.rewardsPoints,
                color: toOptionalString(data.get('color')) ?? existing.color,
                useGlobalRates: data.get('useGlobalRates') === 'on',
            },
        })

        await syncLatestStatementForCard(card.id, totalLimit, paymentDueDay, minPaymentRate)
        revalidateCardPaths(card.id)
        return createSuccessResult('Kart guncellendi.', card.id)
    } catch (error) {
        return getActionErrorResult<CardField>(error, 'Kart guncellenemedi.')
    }
}

export async function deleteCreditCard(cardId: string): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()
        const card = await getUserCard(cardId, user.id)

        await prisma.creditCard.delete({ where: { id: card.id } })
        revalidateCardPaths(card.id)
        return createSuccessResult('Kart silindi.', card.id)
    } catch (error) {
        return getActionErrorResult(error, 'Kart silinemedi.')
    }
}

export async function addCardTransaction(data: {
    creditCardId: string
    type: string
    description: string
    merchant?: string
    amount: number
    totalInstallments?: number
    isCashAdvance?: boolean
}): Promise<ActionResult<CardTransactionField>> {
    try {
        const user = await requireCurrentUser()
        const card = await getUserCard(data.creditCardId, user.id)

        await prisma.cardTransaction.create({
            data: {
                creditCardId: card.id,
                type: parseTransactionType(data.type),
                description: data.description,
                merchant: data.merchant,
                amount: data.amount,
                remainingAmount: data.amount,
                totalInstallments: data.totalInstallments || 1,
                isCashAdvance: data.isCashAdvance || false,
            },
        })
        revalidateCardPaths(card.id)
        return createSuccessResult('Kart islemi kaydedildi.', card.id)
    } catch (error) {
        return getActionErrorResult<CardTransactionField>(error, 'Kart islemi kaydedilemedi.')
    }
}

export async function makeCardPayment(data: {
    creditCardId: string
    amount: number
    description?: string
    statementId?: string
    accountId?: string
}): Promise<ActionResult<CardPaymentField>> {
    try {
        const user = await requireCurrentUser()
        const card = await getUserCard(data.creditCardId, user.id)

        await prisma.cardPayment.create({
            data: {
                creditCardId: card.id,
                amount: data.amount,
                description: data.description || 'Manuel Odeme',
                statementId: data.statementId,
                allocationDetail: {},
            },
        })

        // Hesap bakiyesinden düş ve LedgerEntry oluştur (atomik)
        if (data.accountId) {
            await recordCardPayment(
                user.id,
                card.id,
                data.amount,
                data.accountId,
                data.description || `Kart ödeme: ${card.cardName}`
            )
        }

        revalidateCardPaths(card.id)
        return createSuccessResult('Kart odemesi kaydedildi.', card.id)
    } catch (error) {
        return getActionErrorResult<CardPaymentField>(error, 'Kart odemesi kaydedilemedi.')
    }
}

export async function getCardCurrentDebt(creditCardId: string): Promise<number> {
    const transactions = await prisma.cardTransaction.findMany({
        where: { creditCardId },
    })
    const payments = await prisma.cardPayment.findMany({
        where: { creditCardId },
    })

    const totalCharges = transactions
        .filter((transaction) => transaction.type !== 'REFUND')
        .reduce((sum, transaction) => sum + transaction.amount, 0)

    const totalRefunds = transactions
        .filter((transaction) => transaction.type === 'REFUND')
        .reduce((sum, transaction) => sum + transaction.amount, 0)

    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0)

    return Math.max(totalCharges - totalRefunds - totalPayments, 0)
}

export async function updateCardPoints(cardId: string, points: number): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()
        const card = await getUserCard(cardId, user.id)
        await prisma.creditCard.update({
            where: { id: card.id },
            data: { rewardsPoints: points },
        })
        revalidateCardPaths(card.id)
        return createSuccessResult('Kart puani guncellendi.', card.id)
    } catch (error) {
        return getActionErrorResult(error, 'Kart puani guncellenemedi.')
    }
}
