import { cache as reactCache } from 'react'
import { addMonths, differenceInCalendarDays, startOfDay } from 'date-fns'
import {
    DebtObligationStatus,
    DebtObligationType,
    DebtSourceType,
    DebtStatus,
    LedgerEntryType,
    Prisma,
    type Debt,
    type PaymentPlan,
} from '@prisma/client'

import { calculateAccumulatedInterest, calculateKmhLateCost, calculateKmhStatement } from '@/lib/banking-engine'
import { calculateCurrentCardDebt } from '@/lib/card-balance'
import { calculateMinimumPayment } from '@/lib/card-engine/payment-engine'
import { prisma } from '@/lib/prisma'

export const OPEN_DEBT_OBLIGATION_STATUSES: DebtObligationStatus[] = [
    DebtObligationStatus.PENDING,
    DebtObligationStatus.PARTIAL_PAID,
    DebtObligationStatus.OVERDUE,
]

type DbClient = Prisma.TransactionClient | typeof prisma

type DebtAccountUpsertInput = {
    userId: string
    sourceType: DebtSourceType
    sourceEntityId: string | null
    sourceKey: string
    name: string
    counterpartyName?: string | null
    currency?: string
    status: DebtStatus
    limit?: number | null
    principalBalance: number
    statementBalance: number
    currentBalance: number
    interestRate?: number
    lateInterestRate?: number | null
    kkdfRate?: number
    bsmvRate?: number
    cutOffDay?: number | null
    paymentDueDay?: number | null
    statementDate?: Date | null
    nextDueDate?: Date | null
    metadata?: Prisma.InputJsonValue | null
}

type DebtObligationSeed = {
    type: DebtObligationType
    installmentNo?: number | null
    periodStart?: Date | null
    periodEnd?: Date | null
    dueDate: Date
    principalAmount?: number
    interestAmount?: number
    taxAmount?: number
    lateFeeAmount?: number
    totalAmount: number
    paidAmount?: number
    remainingAmount?: number
    status?: DebtObligationStatus
    metadata?: Prisma.InputJsonValue | null
}

function roundMoney(value: number) {
    if (!Number.isFinite(value)) return 0
    return Math.round((value + Number.EPSILON) * 100) / 100
}

function sourceKey(sourceType: DebtSourceType, sourceEntityId: string) {
    return `${sourceType}:${sourceEntityId}`
}

function daysOverdue(dueDate: Date | null | undefined, now = new Date()) {
    if (!dueDate) return 0
    return Math.max(0, differenceInCalendarDays(startOfDay(now), startOfDay(dueDate)))
}

function toNextMonthlyDate(day: number | null | undefined, from = new Date()) {
    if (!day) return null
    const base = new Date(from)
    const target = new Date(base.getFullYear(), base.getMonth(), Math.min(day, 28))
    if (target < startOfDay(base)) {
        target.setMonth(target.getMonth() + 1)
    }
    return target
}

function resolveObligationStatus(input: {
    dueDate: Date
    totalAmount: number
    paidAmount?: number
    remainingAmount?: number
}) {
    const paidAmount = roundMoney(input.paidAmount ?? 0)
    const remainingAmount = roundMoney(input.remainingAmount ?? Math.max(0, input.totalAmount - paidAmount))
    if (remainingAmount <= 0) return DebtObligationStatus.PAID
    if (paidAmount > 0) return DebtObligationStatus.PARTIAL_PAID
    if (daysOverdue(input.dueDate) > 0) return DebtObligationStatus.OVERDUE
    return DebtObligationStatus.PENDING
}

function resolveDebtStatus(currentBalance: number, obligations: DebtObligationSeed[]) {
    if (roundMoney(currentBalance) <= 0) return DebtStatus.PAID
    if (obligations.some((obligation) => obligation.status === DebtObligationStatus.OVERDUE || daysOverdue(obligation.dueDate) > 0)) {
        return DebtStatus.OVERDUE
    }
    return DebtStatus.ACTIVE
}

function legacyDebtSourceType(type: Debt['type']): DebtSourceType {
    if (type === 'LOAN') return DebtSourceType.LOAN
    if (type === 'CREDIT_CARD') return DebtSourceType.CREDIT_CARD
    if (type === 'KMH') return DebtSourceType.KMH
    if (type === 'PERSONAL') return DebtSourceType.PERSONAL_PAYABLE
    return DebtSourceType.MANUAL
}

function buildFallbackDueDate(debt: Pick<Debt, 'dueDate' | 'paymentDueDay'>) {
    return debt.dueDate ?? toNextMonthlyDate(debt.paymentDueDay) ?? new Date()
}

function normalizeObligation(seed: DebtObligationSeed) {
    const paidAmount = roundMoney(seed.paidAmount ?? 0)
    const totalAmount = roundMoney(seed.totalAmount)
    const remainingAmount = roundMoney(seed.remainingAmount ?? Math.max(0, totalAmount - paidAmount))

    return {
        ...seed,
        principalAmount: roundMoney(seed.principalAmount ?? totalAmount),
        interestAmount: roundMoney(seed.interestAmount ?? 0),
        taxAmount: roundMoney(seed.taxAmount ?? 0),
        lateFeeAmount: roundMoney(seed.lateFeeAmount ?? 0),
        totalAmount,
        paidAmount,
        remainingAmount,
        status: seed.status ?? resolveObligationStatus({
            dueDate: seed.dueDate,
            totalAmount,
            paidAmount,
            remainingAmount,
        }),
    }
}

function jsonOrNull(value: Prisma.InputJsonValue | null | undefined) {
    return value ?? Prisma.JsonNull
}

async function replaceCanonicalDebtAccount(
    tx: DbClient,
    data: DebtAccountUpsertInput,
    rawObligations: DebtObligationSeed[],
) {
    const obligations = rawObligations.map(normalizeObligation)
    const status = resolveDebtStatus(data.currentBalance, obligations)
    const account = await tx.debtAccount.upsert({
        where: {
            userId_sourceKey: {
                userId: data.userId,
                sourceKey: data.sourceKey,
            },
        },
        create: {
            ...data,
            currency: data.currency ?? 'TRY',
            status,
            interestRate: data.interestRate ?? 0,
            kkdfRate: data.kkdfRate ?? 0.15,
            bsmvRate: data.bsmvRate ?? 0.15,
            metadata: jsonOrNull(data.metadata),
        },
        update: {
            name: data.name,
            counterpartyName: data.counterpartyName,
            currency: data.currency ?? 'TRY',
            status,
            limit: data.limit,
            principalBalance: data.principalBalance,
            statementBalance: data.statementBalance,
            currentBalance: data.currentBalance,
            interestRate: data.interestRate ?? 0,
            lateInterestRate: data.lateInterestRate,
            kkdfRate: data.kkdfRate ?? 0.15,
            bsmvRate: data.bsmvRate ?? 0.15,
            cutOffDay: data.cutOffDay,
            paymentDueDay: data.paymentDueDay,
            statementDate: data.statementDate,
            nextDueDate: data.nextDueDate,
            metadata: jsonOrNull(data.metadata),
        },
    })

    await tx.debtObligation.deleteMany({
        where: {
            debtAccountId: account.id,
            payments: { none: {} },
        },
    })

    if (obligations.length > 0) {
        await tx.debtObligation.createMany({
            data: obligations.map((obligation) => ({
                debtAccountId: account.id,
                userId: data.userId,
                type: obligation.type,
                installmentNo: obligation.installmentNo,
                periodStart: obligation.periodStart,
                periodEnd: obligation.periodEnd,
                dueDate: obligation.dueDate,
                principalAmount: obligation.principalAmount,
                interestAmount: obligation.interestAmount,
                taxAmount: obligation.taxAmount,
                lateFeeAmount: obligation.lateFeeAmount,
                totalAmount: obligation.totalAmount,
                paidAmount: obligation.paidAmount,
                remainingAmount: obligation.remainingAmount,
                status: obligation.status,
                metadata: jsonOrNull(obligation.metadata),
            })),
        })
    }

    return account
}

function buildLegacyDebtObligations(debt: Debt & { paymentPlan: PaymentPlan[] }): DebtObligationSeed[] {
    const planRows = debt.paymentPlan.length > 0
        ? debt.paymentPlan
        : []

    if (planRows.length > 0) {
        return planRows.map((plan) => ({
            type: DebtObligationType.INSTALLMENT,
            installmentNo: plan.installmentNo,
            dueDate: plan.dueDate,
            principalAmount: plan.principalAmount,
            interestAmount: plan.interestAmount,
            taxAmount: plan.taxAmount,
            totalAmount: plan.amount,
            paidAmount: plan.isPaid ? plan.amount : 0,
            remainingAmount: plan.isPaid ? 0 : plan.amount,
            status: plan.isPaid ? DebtObligationStatus.PAID : undefined,
            metadata: {
                legacyPaymentPlanId: plan.id,
                source: 'PaymentPlan',
            },
        }))
    }

    const remainingBalance = roundMoney(debt.remainingBalance)
    if (remainingBalance <= 0) return []

    return [{
        type: debt.type === 'LOAN' ? DebtObligationType.INSTALLMENT : DebtObligationType.MANUAL_PAYMENT,
        installmentNo: debt.remainingInstallments && debt.installments
            ? Math.max(1, debt.installments - debt.remainingInstallments + 1)
            : null,
        dueDate: buildFallbackDueDate(debt),
        principalAmount: remainingBalance,
        totalAmount: remainingBalance,
        remainingAmount: remainingBalance,
        metadata: {
            legacyDebtId: debt.id,
            source: 'Debt',
        },
    }]
}

export async function rebuildCanonicalDebtForLegacyDebt(userId: string, debtId: string, client: DbClient = prisma) {
    const debt = await client.debt.findFirst({
        where: { id: debtId, userId },
        include: { paymentPlan: { orderBy: { installmentNo: 'asc' } } },
    })

    if (!debt) {
        await client.debtAccount.deleteMany({
            where: { userId, sourceEntityId: debtId, sourceKey: { startsWith: 'LOAN:' } },
        })
        return null
    }

    const sourceType = legacyDebtSourceType(debt.type)
    const obligations = buildLegacyDebtObligations(debt)
    const openObligations = obligations.filter((obligation) => obligation.status !== DebtObligationStatus.PAID)
    const statementBalance = roundMoney(openObligations.reduce((sum, obligation) => sum + (obligation.remainingAmount ?? obligation.totalAmount), 0))
    const currentBalance = roundMoney(debt.remainingBalance)

    return replaceCanonicalDebtAccount(client, {
        userId,
        sourceType,
        sourceEntityId: debt.id,
        sourceKey: sourceKey(sourceType, debt.id),
        name: debt.name,
        currency: 'TRY',
        status: debt.isPaid ? DebtStatus.PAID : DebtStatus.ACTIVE,
        limit: debt.limit,
        principalBalance: roundMoney(debt.totalPrincipal ?? currentBalance),
        statementBalance,
        currentBalance,
        interestRate: debt.interestRate,
        lateInterestRate: null,
        kkdfRate: debt.kkdfRate,
        bsmvRate: debt.bsmvRate,
        cutOffDay: debt.cutOffDay,
        paymentDueDay: debt.paymentDueDay,
        statementDate: null,
        nextDueDate: openObligations[0]?.dueDate ?? debt.dueDate ?? null,
        metadata: {
            legacyDebtId: debt.id,
            legacyDebtType: debt.type,
            installments: debt.installments,
            remainingInstallments: debt.remainingInstallments,
            source: 'Debt',
        },
    }, obligations)
}

export async function rebuildCanonicalDebtForCreditCard(userId: string, cardId: string, client: DbClient = prisma) {
    const card = await client.creditCard.findFirst({
        where: { id: cardId, userId },
        include: {
            statements: { orderBy: { statementDate: 'desc' }, take: 1 },
            transactions: true,
            payments: true,
        },
    })

    if (!card) {
        await client.debtAccount.deleteMany({
            where: { userId, sourceType: DebtSourceType.CREDIT_CARD, sourceEntityId: cardId },
        })
        return null
    }

    const latestStatement = card.statements[0] ?? null
    const paidMinimum = roundMoney(latestStatement?.paymentsReceived ?? 0)
    const currentDebt = roundMoney(calculateCurrentCardDebt(card))
    const statementBalance = roundMoney(latestStatement?.statementBalance ?? currentDebt)
    const minimumPayment = latestStatement
        ? roundMoney(Math.max(0, (latestStatement.minimumPayment || calculateMinimumPayment(card.totalLimit, statementBalance, card.minPaymentRate)) - paidMinimum))
        : roundMoney(calculateMinimumPayment(card.totalLimit, currentDebt, card.minPaymentRate))
    const dueDate = latestStatement?.dueDate ?? card.dueDate ?? toNextMonthlyDate(card.paymentDueDay) ?? new Date()
    const overdueDays = daysOverdue(dueDate)
    const lateCost = overdueDays > 0 && statementBalance > paidMinimum
        ? calculateAccumulatedInterest(
            roundMoney(Math.max(0, statementBalance - paidMinimum)),
            card.defaultRate,
            overdueDays,
            { kkdfRate: card.kkdfRate, bsmvRate: card.bsmvRate },
        )
        : { interest: 0, tax: 0, total: 0 }
    const totalDue = roundMoney(minimumPayment + lateCost.total)
    const obligations: DebtObligationSeed[] = totalDue > 0
        ? [{
            type: DebtObligationType.MINIMUM_PAYMENT,
            dueDate,
            principalAmount: minimumPayment,
            interestAmount: roundMoney(lateCost.interest ?? 0),
            taxAmount: roundMoney(lateCost.tax ?? 0),
            lateFeeAmount: roundMoney(lateCost.total ?? 0),
            totalAmount: totalDue,
            remainingAmount: totalDue,
            metadata: {
                statementId: latestStatement?.id ?? null,
                source: 'CreditCard',
                minimumPayment,
                paidMinimum,
                overdueDays,
            },
        }]
        : []

    return replaceCanonicalDebtAccount(client, {
        userId,
        sourceType: DebtSourceType.CREDIT_CARD,
        sourceEntityId: card.id,
        sourceKey: sourceKey(DebtSourceType.CREDIT_CARD, card.id),
        name: card.cardName,
        counterpartyName: card.bankName,
        currency: 'TRY',
        status: currentDebt <= 0 ? DebtStatus.PAID : DebtStatus.ACTIVE,
        limit: card.totalLimit,
        principalBalance: currentDebt,
        statementBalance,
        currentBalance: currentDebt,
        interestRate: card.contractualRate,
        lateInterestRate: card.defaultRate,
        kkdfRate: card.kkdfRate,
        bsmvRate: card.bsmvRate,
        cutOffDay: card.cutOffDay,
        paymentDueDay: card.paymentDueDay,
        statementDate: latestStatement?.statementDate ?? card.statementDate ?? null,
        nextDueDate: dueDate,
        metadata: {
            source: 'CreditCard',
            cardId: card.id,
            last4Digits: card.last4Digits,
            cardProgram: card.cardProgram,
            availableLimit: card.availableLimit,
            statementId: latestStatement?.id ?? null,
        },
    }, obligations)
}

export async function rebuildCanonicalDebtForAccount(userId: string, accountId: string, client: DbClient = prisma) {
    const account = await client.account.findFirst({
        where: { id: accountId, userId },
    })

    if (!account || !account.hasKmh) {
        await client.debtAccount.deleteMany({
            where: { userId, sourceType: DebtSourceType.KMH, sourceEntityId: accountId },
        })
        return null
    }

    const usedAmount = roundMoney(Math.max(account.balance * -1, 0))
    const principal = roundMoney(account.kmhStatementPrincipal ?? usedAmount)
    if (principal <= 0) {
        await client.debtAccount.deleteMany({
            where: { userId, sourceType: DebtSourceType.KMH, sourceEntityId: account.id },
        })
        return null
    }

    const hasStatement = Boolean(
        account.kmhStatementPrincipal ||
        account.kmhStatementInterest ||
        account.kmhMinimumPayment ||
        account.kmhStatementDate,
    )
    const statement = calculateKmhStatement(
        principal,
        account.kmhInterestRate ?? 4.25,
        30,
        { kkdfRate: 0.15, bsmvRate: 0.15 },
        hasStatement ? account.kmhStatementInterest : null,
    )
    const dueDate = account.kmhNextPaymentDate ?? toNextMonthlyDate(account.kmhPaymentDueDay) ?? addMonths(new Date(), 1)
    const minimumPayment = roundMoney(account.kmhMinimumPayment ?? statement.minimumPayment)
    const lateCost = calculateKmhLateCost(
        principal,
        account.kmhLateInterestRate ?? 4.55,
        daysOverdue(dueDate),
        { kkdfRate: 0.15, bsmvRate: 0.15 },
    )
    const totalDue = roundMoney(minimumPayment + lateCost.total)
    const periodDebt = roundMoney(hasStatement ? statement.periodDebt : Math.max(usedAmount, statement.periodDebt))
    const obligations: DebtObligationSeed[] = totalDue > 0
        ? [{
            type: DebtObligationType.MINIMUM_PAYMENT,
            dueDate,
            principalAmount: roundMoney(statement.minimumPrincipal),
            interestAmount: roundMoney(statement.interestWithTax),
            taxAmount: 0,
            lateFeeAmount: roundMoney(lateCost.total),
            totalAmount: totalDue,
            remainingAmount: totalDue,
            metadata: {
                source: 'Account.KMH',
                accountId: account.id,
                minimumPrincipal: statement.minimumPrincipal,
                interestWithTax: statement.interestWithTax,
                overdueDays: lateCost.overdueDays,
            },
        }]
        : []

    return replaceCanonicalDebtAccount(client, {
        userId,
        sourceType: DebtSourceType.KMH,
        sourceEntityId: account.id,
        sourceKey: sourceKey(DebtSourceType.KMH, account.id),
        name: `${account.name} KMH`,
        counterpartyName: account.bankName,
        currency: account.currency,
        status: periodDebt <= 0 ? DebtStatus.PAID : DebtStatus.ACTIVE,
        limit: account.kmhLimit,
        principalBalance: principal,
        statementBalance: periodDebt,
        currentBalance: periodDebt,
        interestRate: account.kmhInterestRate ?? 4.25,
        lateInterestRate: account.kmhLateInterestRate ?? 4.55,
        kkdfRate: 0.15,
        bsmvRate: 0.15,
        cutOffDay: account.kmhCutOffDay,
        paymentDueDay: account.kmhPaymentDueDay,
        statementDate: account.kmhStatementDate,
        nextDueDate: dueDate,
        metadata: {
            source: 'Account.KMH',
            accountId: account.id,
            accountName: account.name,
            kmhNextCutOffDate: account.kmhNextCutOffDate?.toISOString() ?? null,
            kmhMinimumPrincipalPayment: statement.minimumPrincipal,
            kmhStatementInterest: statement.interestWithTax,
            kmhMinimumPayment: minimumPayment,
        },
    }, obligations)
}

export async function rebuildCanonicalDebtForPayable(userId: string, receivablePayableId: string, client: DbClient = prisma) {
    const record = await client.receivablePayable.findFirst({
        where: { id: receivablePayableId, userId, type: 'PAYABLE' },
        include: {
            person: true,
            installments: { orderBy: { installmentNo: 'asc' } },
        },
    })

    if (!record) {
        await client.debtAccount.deleteMany({
            where: { userId, sourceType: DebtSourceType.PERSONAL_PAYABLE, sourceEntityId: receivablePayableId },
        })
        return null
    }

    const obligations: DebtObligationSeed[] = record.installments.length > 0
        ? record.installments
            .filter((installment) => installment.status !== 'CANCELED')
            .map((installment) => ({
                type: DebtObligationType.INSTALLMENT,
                installmentNo: installment.installmentNo,
                dueDate: installment.dueDate,
                principalAmount: installment.plannedAmount,
                totalAmount: installment.plannedAmount,
                paidAmount: installment.paidAmount,
                remainingAmount: installment.remainingAmount,
                status: installment.remainingAmount <= 0
                    ? DebtObligationStatus.PAID
                    : installment.status === 'PARTIAL_PAID'
                        ? DebtObligationStatus.PARTIAL_PAID
                        : installment.status === 'OVERDUE'
                            ? DebtObligationStatus.OVERDUE
                            : undefined,
                metadata: {
                    source: 'ReceivablePayable',
                    installmentId: installment.id,
                },
            }))
        : record.remainingAmount > 0
            ? [{
                type: DebtObligationType.MANUAL_PAYMENT,
                dueDate: record.dueDate ?? new Date(),
                principalAmount: record.remainingAmount,
                totalAmount: record.remainingAmount,
                remainingAmount: record.remainingAmount,
                metadata: {
                    source: 'ReceivablePayable',
                    receivablePayableId: record.id,
                },
            }]
            : []

    const openObligations = obligations.filter((obligation) => obligation.status !== DebtObligationStatus.PAID)

    return replaceCanonicalDebtAccount(client, {
        userId,
        sourceType: DebtSourceType.PERSONAL_PAYABLE,
        sourceEntityId: record.id,
        sourceKey: sourceKey(DebtSourceType.PERSONAL_PAYABLE, record.id),
        name: record.title ?? record.description,
        counterpartyName: record.person.name,
        currency: record.currency,
        status: record.status === 'CLOSED' ? DebtStatus.PAID : DebtStatus.ACTIVE,
        principalBalance: record.remainingAmount,
        statementBalance: roundMoney(openObligations.reduce((sum, obligation) => sum + (obligation.remainingAmount ?? obligation.totalAmount), 0)),
        currentBalance: record.remainingAmount,
        interestRate: 0,
        lateInterestRate: null,
        kkdfRate: 0,
        bsmvRate: 0,
        nextDueDate: openObligations[0]?.dueDate ?? record.dueDate ?? null,
        metadata: {
            source: 'ReceivablePayable',
            receivablePayableId: record.id,
            personId: record.personId,
            riskLevel: record.riskLevel,
            isInstallment: record.isInstallment,
        },
    }, obligations)
}

export async function deleteCanonicalDebtForSource(userId: string, sourceType: DebtSourceType, sourceEntityId: string) {
    await prisma.debtAccount.deleteMany({
        where: {
            userId,
            sourceType,
            sourceEntityId,
        },
    })
}

async function syncCanonicalDebtsForUserImpl(userId: string, options: { force?: boolean } = {}) {
    const [legacyDebts, creditCards, kmhAccounts, payables] = await Promise.all([
        prisma.debt.findMany({ where: { userId }, select: { id: true, type: true } }),
        prisma.creditCard.findMany({ where: { userId }, select: { id: true } }),
        prisma.account.findMany({ where: { userId, hasKmh: true }, select: { id: true } }),
        prisma.receivablePayable.findMany({ where: { userId, type: 'PAYABLE' }, select: { id: true } }),
    ])

    if (!options.force) {
        const existing = await prisma.debtAccount.findMany({
            where: { userId },
            select: { sourceKey: true },
        })
        const existingKeys = new Set(existing.map((item) => item.sourceKey))
        const work: Array<Promise<unknown>> = []

        for (const debt of legacyDebts) {
            const type = legacyDebtSourceType(debt.type)
            if (!existingKeys.has(sourceKey(type, debt.id))) {
                work.push(rebuildCanonicalDebtForLegacyDebt(userId, debt.id))
            }
        }
        for (const card of creditCards) {
            if (!existingKeys.has(sourceKey(DebtSourceType.CREDIT_CARD, card.id))) {
                work.push(rebuildCanonicalDebtForCreditCard(userId, card.id))
            }
        }
        for (const account of kmhAccounts) {
            if (!existingKeys.has(sourceKey(DebtSourceType.KMH, account.id))) {
                work.push(rebuildCanonicalDebtForAccount(userId, account.id))
            }
        }
        for (const payable of payables) {
            if (!existingKeys.has(sourceKey(DebtSourceType.PERSONAL_PAYABLE, payable.id))) {
                work.push(rebuildCanonicalDebtForPayable(userId, payable.id))
            }
        }

        await Promise.all(work)
        return
    }

    for (const debt of legacyDebts) {
        await rebuildCanonicalDebtForLegacyDebt(userId, debt.id)
    }
    for (const card of creditCards) {
        await rebuildCanonicalDebtForCreditCard(userId, card.id)
    }
    for (const account of kmhAccounts) {
        await rebuildCanonicalDebtForAccount(userId, account.id)
    }
    for (const payable of payables) {
        await rebuildCanonicalDebtForPayable(userId, payable.id)
    }
}

// İstek başına tek sync: aynı render içinde tekrar çağrılar (cards/accounts/debts
// sayfaları + ödeme planı motoru 5-6 strateji) sorgu tekrarı yaratmasın
const syncOncePerRequest = reactCache((userId: string) => syncCanonicalDebtsForUserImpl(userId))

export async function syncCanonicalDebtsForUser(userId: string, options: { force?: boolean } = {}) {
    if (options.force) return syncCanonicalDebtsForUserImpl(userId, options)
    return syncOncePerRequest(userId)
}

function ledgerTypeForDebtSource(sourceType: DebtSourceType) {
    if (sourceType === DebtSourceType.CREDIT_CARD) return LedgerEntryType.CARD_PAYMENT
    if (sourceType === DebtSourceType.PERSONAL_PAYABLE) return LedgerEntryType.PAYMENT_TO_PERSON
    return LedgerEntryType.DEBT_PAYMENT
}

export async function payCanonicalDebtObligation(input: {
    userId: string
    obligationId: string
    amount?: number
    accountId?: string | null
    description?: string
}) {
    const paymentDate = new Date()

    return prisma.$transaction(async (tx) => {
        const obligation = await tx.debtObligation.findFirst({
            where: {
                id: input.obligationId,
                userId: input.userId,
                status: { in: OPEN_DEBT_OBLIGATION_STATUSES },
            },
            include: { debtAccount: true },
        })

        if (!obligation) {
            throw new Error('Ödeme yükümlülüğü bulunamadı veya kapalı.')
        }

        const requestedAmount = input.amount ? roundMoney(input.amount) : roundMoney(obligation.remainingAmount)
        const amount = Math.min(requestedAmount, roundMoney(obligation.remainingAmount))
        if (amount <= 0) {
            throw new Error('Ödeme tutarı geçersiz.')
        }

        const paymentAccountId = input.accountId
            ? (await tx.account.findFirst({
                where: { id: input.accountId, userId: input.userId },
                select: { id: true },
            }))?.id ?? null
            : null
        if (input.accountId && !paymentAccountId) {
            throw new Error('Ödeme hesabı bulunamadı.')
        }

        const nextPaidAmount = roundMoney(obligation.paidAmount + amount)
        const nextRemainingAmount = roundMoney(Math.max(0, obligation.remainingAmount - amount))
        const nextStatus = nextRemainingAmount <= 0
            ? DebtObligationStatus.PAID
            : DebtObligationStatus.PARTIAL_PAID

        const totalBefore = Math.max(0.01, obligation.remainingAmount)
        const principalShare = roundMoney(Math.min(amount, obligation.principalAmount * (amount / totalBefore)))
        const interestShare = roundMoney(Math.min(Math.max(0, amount - principalShare), obligation.interestAmount + obligation.taxAmount + obligation.lateFeeAmount))

        await tx.debtObligation.update({
            where: { id: obligation.id },
            data: {
                paidAmount: nextPaidAmount,
                remainingAmount: nextRemainingAmount,
                status: nextStatus,
            },
        })

        await tx.debtPayment.create({
            data: {
                debtAccountId: obligation.debtAccountId,
                obligationId: obligation.id,
                userId: input.userId,
                accountId: paymentAccountId,
                amount,
                currency: obligation.debtAccount.currency,
                paymentDate,
                description: input.description ?? `${obligation.debtAccount.name} ödemesi`,
                allocation: {
                    principal: principalShare,
                    interestAndTax: interestShare,
                    obligationBeforePayment: obligation.remainingAmount,
                    obligationAfterPayment: nextRemainingAmount,
                },
            },
        })

        const accountCurrentBalance = roundMoney(Math.max(0, obligation.debtAccount.currentBalance - amount))
        const accountStatementBalance = roundMoney(Math.max(0, obligation.debtAccount.statementBalance - amount))
        const accountPrincipalBalance = roundMoney(Math.max(0, obligation.debtAccount.principalBalance - principalShare))

        await tx.debtAccount.update({
            where: { id: obligation.debtAccountId },
            data: {
                currentBalance: accountCurrentBalance,
                statementBalance: accountStatementBalance,
                principalBalance: accountPrincipalBalance,
                status: accountCurrentBalance <= 0 ? DebtStatus.PAID : DebtStatus.ACTIVE,
                nextDueDate: nextRemainingAmount > 0 ? obligation.dueDate : undefined,
            },
        })

        if (paymentAccountId) {
            await tx.account.updateMany({
                where: { id: paymentAccountId, userId: input.userId },
                data: { balance: { decrement: amount } },
            })
        }

        await tx.ledgerEntry.create({
            data: {
                userId: input.userId,
                type: ledgerTypeForDebtSource(obligation.debtAccount.sourceType),
                amount,
                currency: obligation.debtAccount.currency,
                description: input.description ?? `${obligation.debtAccount.name} ödemesi`,
                category: 'Borç ödemesi',
                date: paymentDate,
                accountId: paymentAccountId,
                debtId: obligation.debtAccount.sourceType === DebtSourceType.LOAN || obligation.debtAccount.sourceType === DebtSourceType.MANUAL
                    ? obligation.debtAccount.sourceEntityId
                    : null,
                creditCardId: obligation.debtAccount.sourceType === DebtSourceType.CREDIT_CARD
                    ? obligation.debtAccount.sourceEntityId
                    : null,
                metadata: {
                    debtAccountId: obligation.debtAccountId,
                    obligationId: obligation.id,
                    sourceType: obligation.debtAccount.sourceType,
                    canonical: true,
                },
            },
        })

        return {
            paidAmount: amount,
            remainingAmount: nextRemainingAmount,
            debtAccountId: obligation.debtAccountId,
        }
    })
}
