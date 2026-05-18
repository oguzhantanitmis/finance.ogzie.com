import type { DebtType } from '@prisma/client'

import { calculateAccumulatedInterest, calculateKmhLateCost, calculateKmhStatement } from '@/lib/banking-engine'
import { calculateCurrentCardDebt } from '@/lib/card-balance'
import { prisma } from '@/lib/prisma'

export type DebtSourceKind = 'DEBT' | 'CREDIT_CARD' | 'KMH_ACCOUNT' | 'PERSONAL_RP'

export interface DebtView {
    id: string
    entityId: string
    sourceKind: DebtSourceKind
    sourceLabel: string
    canEdit: boolean
    canDelete: boolean
    navigateHref?: string
    navigateLabel?: string
    name: string
    subtitle?: string | null
    type: DebtType
    limit?: number | null
    cutOffDay?: number | null
    paymentDueDay?: number | null
    totalBalance: number
    remainingBalance: number
    interestRate: number
    minPaymentRate: number
    kkdfRate: number
    bsmvRate: number
    totalPrincipal?: number | null
    installments?: number | null
    remainingInstallments?: number | null
    kmhStatementDate?: string | null
    kmhStatementInterest?: number | null
    kmhMinimumPayment?: number | null
    kmhNextCutOffDate?: string | null
    kmhNextPaymentDate?: string | null
    kmhLateInterestRate?: number | null
    dueDate?: string | null
    paymentPlan?: Array<{
        id: string
        installmentNo: number
        amount: number
        principalAmount: number
        interestAmount: number
        taxAmount: number
        dueDate: string
        isPaid: boolean
    }>
    personId?: string
    accountId?: string
}

function roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100
}

export interface DebtPersonOption {
    id: string
    name: string
}

export type DebtPaymentObligationType = 'LOAN_INSTALLMENT' | 'KMH_MINIMUM' | 'CARD_MINIMUM'

export interface DebtPaymentObligation {
    id: string
    type: DebtPaymentObligationType
    sourceId: string
    name: string
    sourceLabel: string
    amount: number
    baseAmount: number
    overdueCost: number
    overdueDays: number
    dueDate: string
    balanceAfterPayment: number
    note: string
}

function daysOverdue(dueDate: Date | null | undefined, now = new Date()) {
    if (!dueDate) return 0
    const dayMs = 24 * 60 * 60 * 1000
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime()
    return Math.max(0, Math.floor((today - due) / dayMs))
}

function toNextMonthlyDate(day: number | null | undefined) {
    if (!day) return null

    const now = new Date()
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), Math.min(day, 28))

    if (currentMonthDate >= now) {
        return currentMonthDate
    }

    return new Date(now.getFullYear(), now.getMonth() + 1, Math.min(day, 28))
}

function normalizeLoanPaymentPlan<TDebt extends {
    type: DebtType
    dueDate: Date | null
    paymentPlan: Array<{ installmentNo: number; dueDate: Date }>
}>(debt: TDebt): TDebt['paymentPlan'] {
    if (debt.type !== 'LOAN') return debt.paymentPlan
    if (debt.paymentPlan.length <= 1) return debt.paymentPlan

    const preferredStart = debt.dueDate?.getTime() ?? null
    const byInstallment = new Map<number, typeof debt.paymentPlan[number]>()

    debt.paymentPlan.forEach((plan) => {
        const existing = byInstallment.get(plan.installmentNo)
        if (!existing) {
            byInstallment.set(plan.installmentNo, plan)
            return
        }

        const score = (item: typeof plan) => {
            const dateScore = item.dueDate.getTime()
            const preferredScore = preferredStart && dateScore >= preferredStart ? 10_000_000_000_000 : 0
            return preferredScore + dateScore
        }

        if (score(plan) > score(existing)) {
            byInstallment.set(plan.installmentNo, plan)
        }
    })

    return Array.from(byInstallment.values()).sort((left, right) => left.installmentNo - right.installmentNo)
}

export async function getDebtWorkspaceData(userId: string): Promise<{
    debts: DebtView[]
    people: DebtPersonOption[]
    paymentObligations: DebtPaymentObligation[]
}> {
    const [manualDebts, creditCards, payables, receivables, kmhAccounts, people] = await Promise.all([
        prisma.debt.findMany({
            where: { userId },
            include: {
                paymentPlan: {
                    orderBy: { installmentNo: 'asc' },
                },
            },
            orderBy: { remainingBalance: 'desc' },
        }),
        prisma.creditCard.findMany({
            where: { userId, status: { not: 'CLOSED' } },
            include: {
                transactions: {
                    select: { type: true, amount: true },
                },
                payments: {
                    select: { amount: true },
                },
                statements: {
                    orderBy: { statementDate: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        dueDate: true,
                        statementBalance: true,
                        minimumPayment: true,
                        paymentsReceived: true,
                        status: true,
                    },
                },
            },
        }),
        prisma.receivablePayable.findMany({
            where: {
                userId,
                type: 'PAYABLE',
                status: { not: 'CLOSED' },
            },
            include: {
                person: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { remainingAmount: 'desc' },
        }),
        prisma.receivablePayable.findMany({
            where: {
                userId,
                type: 'RECEIVABLE',
                status: { not: 'CLOSED' },
            },
            include: {
                person: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { remainingAmount: 'desc' },
        }),
        prisma.account.findMany({
            where: {
                userId,
                isActive: true,
                hasKmh: true,
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.person.findMany({
            where: { userId, isActive: true },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        }),
    ])

    const manualDebtViews: DebtView[] = manualDebts.map((debt) => {
        const paymentPlan = normalizeLoanPaymentPlan(debt)

        return {
            id: debt.id,
            entityId: debt.id,
            sourceKind: 'DEBT',
            sourceLabel: 'Borç kaydı',
            canEdit: true,
            canDelete: true,
            name: debt.name,
            subtitle: null,
            type: debt.type,
            limit: debt.limit,
            cutOffDay: debt.cutOffDay,
            paymentDueDay: debt.paymentDueDay,
            totalBalance: debt.totalBalance,
            remainingBalance: debt.remainingBalance,
            interestRate: debt.interestRate,
            minPaymentRate: debt.minPaymentRate,
            kkdfRate: debt.kkdfRate,
            bsmvRate: debt.bsmvRate,
            totalPrincipal: debt.totalPrincipal,
            installments: debt.installments,
            remainingInstallments: debt.remainingInstallments,
            dueDate: debt.dueDate?.toISOString() ?? null,
            paymentPlan: paymentPlan.map((plan) => ({
                ...plan,
                dueDate: plan.dueDate.toISOString(),
            })),
        }
    })

    const creditCardDebtViews: DebtView[] = creditCards.flatMap((card) => {
            const currentDebt = calculateCurrentCardDebt(card)
            const latestStatement = card.statements[0] ?? null

            if (currentDebt <= 0 && !latestStatement?.statementBalance) {
                return []
            }

            return [{
                id: `card-${card.id}`,
                entityId: card.id,
                sourceKind: 'CREDIT_CARD',
                sourceLabel: 'Kartlardan yansıyor',
                canEdit: false,
                canDelete: false,
                navigateHref: `/cards/${card.id}`,
                navigateLabel: 'Kartı aç',
                name: card.cardName,
                subtitle: card.bankName,
                type: 'CREDIT_CARD' as const,
                limit: card.totalLimit,
                cutOffDay: card.cutOffDay,
                paymentDueDay: card.paymentDueDay,
                totalBalance: latestStatement?.statementBalance ?? currentDebt,
                remainingBalance: currentDebt,
                interestRate: card.contractualRate,
                minPaymentRate: card.minPaymentRate,
                kkdfRate: card.kkdfRate,
                bsmvRate: card.bsmvRate,
                dueDate: latestStatement?.dueDate.toISOString() ?? null,
                paymentPlan: [],
            } satisfies DebtView]
        })

    const cardPaymentObligations: DebtPaymentObligation[] = creditCards.flatMap((card) => {
        const currentDebt = calculateCurrentCardDebt(card)
        const latestStatement = card.statements[0] ?? null
        if (!latestStatement || currentDebt <= 0) return []

        const paidMinimum = latestStatement.paymentsReceived ?? 0
        const minimumDue = roundMoney(Math.max(0, latestStatement.minimumPayment - paidMinimum))
        if (minimumDue <= 0) return []

        const overdueDays = daysOverdue(latestStatement.dueDate)
        const unpaidStatement = roundMoney(Math.max(0, latestStatement.statementBalance - paidMinimum))
        const lateCost = overdueDays > 0
            ? calculateAccumulatedInterest(
                unpaidStatement,
                card.defaultRate,
                overdueDays,
                { kkdfRate: card.kkdfRate, bsmvRate: card.bsmvRate },
            )
            : { total: 0 }

        return [{
            id: `card-minimum:${latestStatement.id}`,
            type: 'CARD_MINIMUM',
            sourceId: latestStatement.id,
            name: card.cardName,
            sourceLabel: 'Kredi kartı',
            amount: roundMoney(minimumDue + lateCost.total),
            baseAmount: minimumDue,
            overdueCost: roundMoney(lateCost.total),
            overdueDays,
            dueDate: latestStatement.dueDate.toISOString(),
            balanceAfterPayment: roundMoney(Math.max(0, currentDebt - minimumDue)),
            note: overdueDays > 0 ? 'Asgari ödeme gecikmiş' : 'Asgari ödeme',
        }]
    })

    const personalDebtViews: DebtView[] = payables.map((payable) => ({
        id: `payable-${payable.id}`,
        entityId: payable.id,
        sourceKind: 'PERSONAL_RP',
        sourceLabel: 'Kişiler sayfasından yansıyor',
        canEdit: true,
        canDelete: true,
        navigateHref: `/people/${payable.person.id}`,
        navigateLabel: 'Kişiyi aç',
        name: payable.person.name,
        subtitle: payable.description,
        type: 'PERSONAL',
        totalBalance: payable.originalAmount,
        remainingBalance: payable.remainingAmount,
        interestRate: 0,
        minPaymentRate: 0,
        kkdfRate: 0,
        bsmvRate: 0,
        dueDate: payable.dueDate?.toISOString() ?? null,
        paymentPlan: [],
        personId: payable.person.id,
    }))

    const personalReceivableViews: DebtView[] = receivables.map((receivable) => ({
        id: `receivable-${receivable.id}`,
        entityId: receivable.id,
        sourceKind: 'PERSONAL_RP',
        sourceLabel: 'Bana borcu var',
        canEdit: false,
        canDelete: false,
        navigateHref: `/people/${receivable.person.id}`,
        navigateLabel: 'Tahsilatı aç',
        name: receivable.person.name,
        subtitle: receivable.description,
        type: 'PERSONAL',
        totalBalance: receivable.originalAmount,
        remainingBalance: receivable.remainingAmount,
        interestRate: 0,
        minPaymentRate: 0,
        kkdfRate: 0,
        bsmvRate: 0,
        dueDate: receivable.dueDate?.toISOString() ?? null,
        paymentPlan: [],
        personId: receivable.person.id,
    }))

    const kmhDebtViews: DebtView[] = kmhAccounts.flatMap((account) => {
            const usedAmount = roundMoney(Math.max(account.balance * -1, 0))
            const principal = roundMoney(account.kmhStatementPrincipal ?? usedAmount)

            if (principal <= 0) {
                return []
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
            const periodDebt = hasStatement ? statement.periodDebt : usedAmount
            const dueDate = account.kmhNextPaymentDate ?? toNextMonthlyDate(account.kmhPaymentDueDay)

            return [{
                id: `kmh-${account.id}`,
                entityId: account.id,
                sourceKind: 'KMH_ACCOUNT',
                sourceLabel: 'Hesaplardan yansıyor',
                canEdit: false,
                canDelete: false,
                navigateHref: '/accounts',
                navigateLabel: 'Hesabı aç',
                name: `${account.name} KMH`,
                subtitle: account.bankName ?? 'Kredili mevduat hesabı',
                type: 'KMH',
                limit: account.kmhLimit,
                cutOffDay: account.kmhCutOffDay,
                paymentDueDay: account.kmhPaymentDueDay,
                totalBalance: periodDebt,
                remainingBalance: periodDebt,
                interestRate: account.kmhInterestRate ?? 4.25,
                minPaymentRate: 0.05,
                kkdfRate: 0.15,
                bsmvRate: 0.15,
                totalPrincipal: principal,
                kmhStatementDate: account.kmhStatementDate?.toISOString() ?? null,
                kmhStatementInterest: hasStatement ? statement.interestWithTax : null,
                kmhMinimumPayment: account.kmhMinimumPayment ?? (hasStatement ? statement.minimumPayment : null),
                kmhNextCutOffDate: account.kmhNextCutOffDate?.toISOString() ?? null,
                kmhNextPaymentDate: account.kmhNextPaymentDate?.toISOString() ?? null,
                kmhLateInterestRate: account.kmhLateInterestRate ?? 4.55,
                dueDate: dueDate?.toISOString() ?? null,
                paymentPlan: [],
                accountId: account.id,
            } satisfies DebtView]
        })

    const loanPaymentObligations: DebtPaymentObligation[] = manualDebtViews.flatMap((debt) => {
        if (debt.type !== 'LOAN') return []
        const nextInstallment = debt.paymentPlan?.find((plan) => !plan.isPaid)
        if (!nextInstallment) return []

        const dueDate = new Date(nextInstallment.dueDate)
        const overdueDays = daysOverdue(dueDate)

        return [{
            id: `loan-installment:${nextInstallment.id}`,
            type: 'LOAN_INSTALLMENT',
            sourceId: nextInstallment.id,
            name: debt.name,
            sourceLabel: 'Kredi taksidi',
            amount: nextInstallment.amount,
            baseAmount: nextInstallment.amount,
            overdueCost: 0,
            overdueDays,
            dueDate: nextInstallment.dueDate,
            balanceAfterPayment: roundMoney(Math.max(0, debt.remainingBalance - nextInstallment.amount)),
            note: `${nextInstallment.installmentNo}. taksit`,
        }]
    })

    const kmhPaymentObligations: DebtPaymentObligation[] = kmhAccounts.flatMap((account) => {
        const usedAmount = roundMoney(Math.max(account.balance * -1, 0))
        const principal = roundMoney(account.kmhStatementPrincipal ?? usedAmount)
        if (principal <= 0) return []

        const dueDate = account.kmhNextPaymentDate ?? toNextMonthlyDate(account.kmhPaymentDueDay)
        if (!dueDate) return []

        const statement = calculateKmhStatement(
            principal,
            account.kmhInterestRate ?? 4.25,
            30,
            { kkdfRate: 0.15, bsmvRate: 0.15 },
            account.kmhStatementInterest,
        )
        const minimumDue = roundMoney(account.kmhMinimumPayment ?? statement.minimumPayment)
        if (minimumDue <= 0) return []

        const lateCost = calculateKmhLateCost(
            principal,
            account.kmhLateInterestRate ?? 4.55,
            daysOverdue(dueDate),
            { kkdfRate: 0.15, bsmvRate: 0.15 },
        )

        return [{
            id: `kmh-minimum:${account.id}`,
            type: 'KMH_MINIMUM',
            sourceId: account.id,
            name: `${account.name} KMH`,
            sourceLabel: 'KMH asgari',
            amount: roundMoney(minimumDue + lateCost.total),
            baseAmount: minimumDue,
            overdueCost: lateCost.total,
            overdueDays: lateCost.overdueDays,
            dueDate: dueDate.toISOString(),
            balanceAfterPayment: roundMoney(Math.max(0, statement.periodDebt - minimumDue)),
            note: lateCost.overdueDays > 0 ? 'Asgari ödeme gecikmiş' : 'Asgari ödeme',
        }]
    })

    const debts = [
        ...creditCardDebtViews,
        ...kmhDebtViews,
        ...personalReceivableViews,
        ...personalDebtViews,
        ...manualDebtViews,
    ].sort((left, right) => right.remainingBalance - left.remainingBalance)

    return {
        debts,
        people,
        paymentObligations: [
            ...cardPaymentObligations,
            ...kmhPaymentObligations,
            ...loanPaymentObligations,
        ].sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()),
    }
}
