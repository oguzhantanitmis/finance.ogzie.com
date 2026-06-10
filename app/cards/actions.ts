'use server'

import { CardNetwork, CardStatus, DebtSourceType, TransactionType } from '@prisma/client'
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
import { resolveCardVisual } from '@/lib/card-visuals'
import { deleteCanonicalDebtForSource, rebuildCanonicalDebtForCreditCard } from '@/lib/canonical-debt-service'
import { prisma } from '@/lib/prisma'
import { requireCurrentUser } from '@/lib/server-auth'

type CardField =
    | 'cardName'
    | 'bankName'
    | 'cardProgram'
    | 'last4Digits'
    | 'cardNetwork'
    | 'status'
    | 'totalLimit'
    | 'availableLimit'
    | 'currentDebt'
    | 'cashAdvanceLimit'
    | 'cutOffDay'
    | 'paymentDueDay'
    | 'statementDate'
    | 'dueDate'
    | 'contractualRate'
    | 'defaultRate'
    | 'cashAdvanceRate'
    | 'kkdfRate'
    | 'bsmvRate'
    | 'minPaymentRate'
    | 'rewardsPoints'
    | 'color'
    | 'description'

type CardTransactionField = 'type' | 'description' | 'merchant' | 'amount' | 'totalInstallments'
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

const DAY_OPTIONS = { min: 1, max: 31, integer: true } as const
const NON_NEGATIVE_OPTIONS = { min: 0 } as const
const RATE_PERCENT_OPTIONS = { min: 0, max: 100 } as const

function toOptionalPercentFraction<TField extends string>(
    value: FormDataEntryValue | null,
    field: TField,
    label: string,
) {
    const parsed = toOptionalNumber(value, field, label, RATE_PERCENT_OPTIONS)
    if (parsed === null || parsed === undefined) return null
    return parsed > 1 ? parsed / 100 : parsed
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
        const minPaymentRate = toOptionalPercentFraction(data.get('minPaymentRate'), 'minPaymentRate', 'Asgari odeme orani') ?? (data.get('isNewCard') === 'on' || totalLimit > 50000 ? 0.4 : 0.2)
        const cardName = toRequiredString(data.get('cardName'), 'cardName', 'Kart adi')
        const bankName = toRequiredString(data.get('bankName'), 'bankName', 'Banka adi')
        const cardProgram = toOptionalString(data.get('cardProgram')) ?? resolveCardVisual(bankName, cardName).cardProgram
        const visual = resolveCardVisual(bankName, cardName, cardProgram)
        const currentDebt = toOptionalNumber(data.get('currentDebt'), 'currentDebt', 'Guncel borc', NON_NEGATIVE_OPTIONS) ?? 0

        const card = await prisma.creditCard.create({
            data: {
                userId: user.id,
                cardName,
                bankName,
                cardProgram,
                last4Digits: String(data.get('last4Digits') ?? '0000').trim() || '0000',
                cardNetwork: parseCardNetwork(data.get('cardNetwork')),
                status: parseCardStatus(data.get('status')),
                totalLimit,
                availableLimit: toOptionalNumber(data.get('availableLimit'), 'availableLimit', 'Kullanilabilir limit', NON_NEGATIVE_OPTIONS) ?? Math.max(totalLimit - currentDebt, 0),
                currentDebt,
                cashAdvanceLimit: toOptionalNumber(data.get('cashAdvanceLimit'), 'cashAdvanceLimit', 'Nakit avans limiti', NON_NEGATIVE_OPTIONS) ?? totalLimit * 0.5,
                cutOffDay: toRequiredNumber(data.get('cutOffDay'), 'cutOffDay', 'Hesap kesim gunu', DAY_OPTIONS),
                paymentDueDay: toRequiredNumber(data.get('paymentDueDay'), 'paymentDueDay', 'Son odeme gunu', DAY_OPTIONS),
                statementDate: data.get('statementDate') ? new Date(String(data.get('statementDate'))) : null,
                dueDate: data.get('dueDate') ? new Date(String(data.get('dueDate'))) : null,
                contractualRate: toOptionalNumber(data.get('contractualRate'), 'contractualRate', 'Akdi faiz orani', RATE_PERCENT_OPTIONS) ?? 4.42,
                defaultRate: toOptionalNumber(data.get('defaultRate'), 'defaultRate', 'Gecikme faiz orani', RATE_PERCENT_OPTIONS) ?? 5.42,
                cashAdvanceRate: toOptionalNumber(data.get('cashAdvanceRate'), 'cashAdvanceRate', 'Nakit avans faiz orani', RATE_PERCENT_OPTIONS) ?? 5.92,
                minPaymentRate,
                kkdfRate: toOptionalPercentFraction(data.get('kkdfRate'), 'kkdfRate', 'KKDF orani') ?? 0.15,
                bsmvRate: toOptionalPercentFraction(data.get('bsmvRate'), 'bsmvRate', 'BSMV orani') ?? 0.15,
                rewardsPoints: toOptionalNumber(data.get('rewardsPoints'), 'rewardsPoints', 'Odul puani', NON_NEGATIVE_OPTIONS) ?? 0,
                color: toOptionalString(data.get('color')) ?? visual.themeColor,
                logoPath: visual.logoPath,
                cardImagePath: visual.cardImagePath,
                description: toOptionalString(data.get('description')) ?? null,
                useGlobalRates: data.get('useGlobalRates') === 'on',
            },
        })
        await rebuildCanonicalDebtForCreditCard(user.id, card.id)
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
        const minPaymentRate = toOptionalPercentFraction(data.get('minPaymentRate'), 'minPaymentRate', 'Asgari odeme orani') ?? existing.minPaymentRate
        const paymentDueDay = toRequiredNumber(data.get('paymentDueDay'), 'paymentDueDay', 'Son odeme gunu', DAY_OPTIONS)
        const cardName = toRequiredString(data.get('cardName'), 'cardName', 'Kart adi')
        const bankName = toRequiredString(data.get('bankName'), 'bankName', 'Banka adi')
        const cardProgram = toOptionalString(data.get('cardProgram')) ?? existing.cardProgram
        const visual = resolveCardVisual(bankName, cardName, cardProgram)
        const currentDebt = toOptionalNumber(data.get('currentDebt'), 'currentDebt', 'Guncel borc', NON_NEGATIVE_OPTIONS) ?? existing.currentDebt ?? 0

        const card = await prisma.creditCard.update({
            where: { id: existing.id },
            data: {
                cardName,
                bankName,
                cardProgram,
                last4Digits: String(data.get('last4Digits') ?? existing.last4Digits).trim() || existing.last4Digits,
                cardNetwork: parseCardNetwork(data.get('cardNetwork')),
                status: parseCardStatus(data.get('status')),
                totalLimit,
                availableLimit: toOptionalNumber(data.get('availableLimit'), 'availableLimit', 'Kullanilabilir limit', NON_NEGATIVE_OPTIONS) ?? Math.max(totalLimit - currentDebt, 0),
                currentDebt,
                cashAdvanceLimit: toOptionalNumber(data.get('cashAdvanceLimit'), 'cashAdvanceLimit', 'Nakit avans limiti', NON_NEGATIVE_OPTIONS) ?? totalLimit * 0.5,
                cutOffDay: toRequiredNumber(data.get('cutOffDay'), 'cutOffDay', 'Hesap kesim gunu', DAY_OPTIONS),
                paymentDueDay,
                statementDate: data.get('statementDate') ? new Date(String(data.get('statementDate'))) : existing.statementDate,
                dueDate: data.get('dueDate') ? new Date(String(data.get('dueDate'))) : existing.dueDate,
                contractualRate: toOptionalNumber(data.get('contractualRate'), 'contractualRate', 'Akdi faiz orani', RATE_PERCENT_OPTIONS) ?? existing.contractualRate,
                defaultRate: toOptionalNumber(data.get('defaultRate'), 'defaultRate', 'Gecikme faiz orani', RATE_PERCENT_OPTIONS) ?? existing.defaultRate,
                cashAdvanceRate: toOptionalNumber(data.get('cashAdvanceRate'), 'cashAdvanceRate', 'Nakit avans faiz orani', RATE_PERCENT_OPTIONS) ?? existing.cashAdvanceRate,
                kkdfRate: toOptionalPercentFraction(data.get('kkdfRate'), 'kkdfRate', 'KKDF orani') ?? existing.kkdfRate,
                bsmvRate: toOptionalPercentFraction(data.get('bsmvRate'), 'bsmvRate', 'BSMV orani') ?? existing.bsmvRate,
                minPaymentRate,
                rewardsPoints: toOptionalNumber(data.get('rewardsPoints'), 'rewardsPoints', 'Odul puani', NON_NEGATIVE_OPTIONS) ?? existing.rewardsPoints,
                color: toOptionalString(data.get('color')) ?? existing.color ?? visual.themeColor,
                logoPath: visual.logoPath,
                cardImagePath: visual.cardImagePath,
                description: toOptionalString(data.get('description')) ?? existing.description,
                useGlobalRates: data.get('useGlobalRates') === 'on',
            },
        })

        await syncLatestStatementForCard(card.id, totalLimit, paymentDueDay, minPaymentRate)
        await rebuildCanonicalDebtForCreditCard(user.id, card.id)
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

        await deleteCanonicalDebtForSource(user.id, DebtSourceType.CREDIT_CARD, card.id)
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
        if (!Number.isFinite(data.amount) || data.amount <= 0) {
            return {
                success: false,
                message: 'İşlem tutarı sıfırdan büyük olmalıdır.',
                fieldErrors: { amount: 'Tutar geçersiz.' },
            }
        }
        const totalInstallments = data.totalInstallments || 1
        if (!Number.isInteger(totalInstallments) || totalInstallments < 1 || totalInstallments > 36) {
            return {
                success: false,
                message: 'Taksit sayısı 1 ile 36 arasında olmalıdır.',
                fieldErrors: { totalInstallments: 'Taksit sayısı geçersiz.' },
            }
        }
        const card = await getUserCard(data.creditCardId, user.id)

        await prisma.cardTransaction.create({
            data: {
                creditCardId: card.id,
                type: parseTransactionType(data.type),
                description: data.description,
                merchant: data.merchant,
                amount: data.amount,
                remainingAmount: data.amount,
                totalInstallments,
                isCashAdvance: data.isCashAdvance || false,
            },
        })
        await rebuildCanonicalDebtForCreditCard(user.id, card.id)
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
        if (!Number.isFinite(data.amount) || data.amount <= 0) {
            return {
                success: false,
                message: 'Ödeme tutarı sıfırdan büyük olmalıdır.',
                fieldErrors: { amount: 'Tutar geçersiz.' },
            }
        }
        const card = await getUserCard(data.creditCardId, user.id)
        const statementId = data.statementId
            ? (await prisma.cardStatement.findFirstOrThrow({
                where: { id: data.statementId, creditCardId: card.id },
                select: { id: true },
            })).id
            : undefined
        const accountId = data.accountId
            ? (await prisma.account.findFirstOrThrow({
                where: { id: data.accountId, userId: user.id },
                select: { id: true },
            })).id
            : undefined

        await prisma.cardPayment.create({
            data: {
                creditCardId: card.id,
                amount: data.amount,
                description: data.description || 'Manuel Odeme',
                statementId,
                allocationDetail: {},
            },
        })

        // Hesap bakiyesinden düş ve LedgerEntry oluştur (atomik)
        if (accountId) {
            await recordCardPayment(
                user.id,
                card.id,
                data.amount,
                accountId,
                data.description || `Kart ödeme: ${card.cardName}`
            )
        }

        await rebuildCanonicalDebtForCreditCard(user.id, card.id)
        revalidateCardPaths(card.id)
        return createSuccessResult('Kart odemesi kaydedildi.', card.id)
    } catch (error) {
        return getActionErrorResult<CardPaymentField>(error, 'Kart odemesi kaydedilemedi.')
    }
}

export async function getCardCurrentDebt(creditCardId: string): Promise<number> {
    const user = await requireCurrentUser()
    const card = await getUserCard(creditCardId, user.id)
    const transactions = await prisma.cardTransaction.findMany({
        where: { creditCardId: card.id },
    })
    const payments = await prisma.cardPayment.findMany({
        where: { creditCardId: card.id },
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

export async function drawCashAdvance(data: {
    creditCardId: string
    amount: number
    installments: number
}): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()
        if (!Number.isFinite(data.amount) || data.amount <= 0) {
            return getActionErrorResult(new Error('Tutar geçersiz'), 'Tutar geçersiz.')
        }

        const card = await getUserCard(data.creditCardId, user.id)

        const rate = card.cashAdvanceRate / 100
        const kkdf = card.kkdfRate
        const bsmv = card.bsmvRate
        const netRate = rate * (1 + kkdf + bsmv)

        let totalAmount = data.amount
        let installmentAmount = data.amount

        if (data.installments > 1) {
             const temp = Math.pow(1 + netRate, data.installments)
             installmentAmount = data.amount * (netRate * temp) / (temp - 1)
             totalAmount = installmentAmount * data.installments
        } else {
             const commission = data.amount * 0.01 // %1 komisyon
             totalAmount = data.amount + commission
             installmentAmount = totalAmount
        }

        const transaction = await prisma.cardTransaction.create({
            data: {
                creditCardId: card.id,
                type: 'CASH_ADVANCE',
                description: data.installments > 1 ? `Taksitli Nakit Avans (${data.installments} Ay)` : 'Nakit Avans',
                merchant: 'Banka ATM/Şube',
                amount: totalAmount,
                remainingAmount: totalAmount,
                totalInstallments: data.installments,
                isCashAdvance: true,
            }
        })

        if (data.installments > 1) {
            const installmentsToCreate = []
            for (let i = 1; i <= data.installments; i++) {
                const dueDate = new Date()
                dueDate.setMonth(dueDate.getMonth() + i)
                installmentsToCreate.push({
                    transactionId: transaction.id,
                    installmentNo: i,
                    amount: installmentAmount,
                    dueDate,
                })
            }
            await prisma.cardInstallment.createMany({
                data: installmentsToCreate
            })
        }

        await rebuildCanonicalDebtForCreditCard(user.id, card.id)
        revalidateCardPaths(card.id)
        return createSuccessResult('Nakit avans çekildi.', card.id)
    } catch (error) {
        return getActionErrorResult(error, 'Nakit avans çekilemedi.')
    }
}

export async function installmentizeTransaction(data: {
    transactionId: string
    installments: number
}): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()
        // Sorgu doğrudan kullanıcıya kapsamlı — başka kullanıcının işlemi "yok" davranışı verir
        const transaction = await prisma.cardTransaction.findFirstOrThrow({
            where: { id: data.transactionId, creditCard: { userId: user.id } },
            include: { creditCard: true }
        })

        if (transaction.totalInstallments > 1 || transaction.type !== 'PURCHASE') {
             return getActionErrorResult(new Error('Uygun değil'), 'Bu işlem taksitlendirilemez.')
        }

        const lowerDesc = transaction.description.toLowerCase()
        const lowerMerchant = (transaction.merchant || '').toLowerCase()
        const forbiddenKeywords = ['gıda', 'market', 'akaryakıt', 'benzin', 'telekom', 'fatura', 'kozmetik', 'yurt dışı', 'yurtdışı']
        const isForbidden = forbiddenKeywords.some(kw => lowerDesc.includes(kw) || lowerMerchant.includes(kw))

        if (isForbidden) {
             return getActionErrorResult(new Error('Yasal kısıtlama'), 'Bu sektördeki işlemler (Gıda, Akaryakıt, Telekom vb.) yasal olarak taksitlendirilemez.')
        }

        const card = transaction.creditCard
        const rate = card.contractualRate / 100
        const kkdf = card.kkdfRate
        const bsmv = card.bsmvRate
        const netRate = rate * (1 + kkdf + bsmv)

        const temp = Math.pow(1 + netRate, data.installments)
        const installmentAmount = transaction.amount * (netRate * temp) / (temp - 1)
        const totalAmount = installmentAmount * data.installments

        await prisma.cardTransaction.update({
            where: { id: transaction.id },
            data: {
                totalInstallments: data.installments,
                amount: totalAmount,
                remainingAmount: totalAmount,
                description: `${transaction.description} (Sonradan ${data.installments} Taksit)`
            }
        })

        const installmentsToCreate = []
        for (let i = 1; i <= data.installments; i++) {
            const dueDate = new Date()
            dueDate.setMonth(dueDate.getMonth() + i)
            installmentsToCreate.push({
                transactionId: transaction.id,
                installmentNo: i,
                amount: installmentAmount,
                dueDate,
            })
        }
        await prisma.cardInstallment.createMany({
            data: installmentsToCreate
        })

        await rebuildCanonicalDebtForCreditCard(user.id, card.id)
        revalidateCardPaths(card.id)
        return createSuccessResult('İşlem taksitlendirildi.', transaction.id)
    } catch (error) {
        return getActionErrorResult(error, 'İşlem taksitlendirilemedi.')
    }
}
