import type { DebtType } from '@prisma/client'

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

export interface DebtPersonOption {
    id: string
    name: string
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

export async function getDebtWorkspaceData(userId: string): Promise<{
    debts: DebtView[]
    people: DebtPersonOption[]
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
                        dueDate: true,
                        statementBalance: true,
                        minimumPayment: true,
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

    const manualDebtViews: DebtView[] = manualDebts.map((debt) => ({
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
        paymentPlan: debt.paymentPlan.map((plan) => ({
            ...plan,
            dueDate: plan.dueDate.toISOString(),
        })),
    }))

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
            const usedAmount = Math.max(account.balance * -1, 0)

            if (usedAmount <= 0) {
                return []
            }

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
                totalBalance: usedAmount,
                remainingBalance: usedAmount,
                interestRate: account.kmhInterestRate ?? 4.25,
                minPaymentRate: 1,
                kkdfRate: 0.15,
                bsmvRate: 0.15,
                dueDate: toNextMonthlyDate(account.kmhPaymentDueDay)?.toISOString() ?? null,
                paymentPlan: [],
                accountId: account.id,
            } satisfies DebtView]
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
    }
}
