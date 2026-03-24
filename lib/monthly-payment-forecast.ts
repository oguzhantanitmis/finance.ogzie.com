import { BillingCycle, RecordStatus } from '@prisma/client'
import {
    endOfMonth,
    isBefore,
    startOfDay,
    startOfMonth,
} from 'date-fns'

import type {
    MonthlyPaymentForecast,
    MonthlyPaymentItem,
    MonthlyPaymentStatus,
} from '@/lib/finance-os-types'
import { prisma } from '@/lib/prisma'
import { formatDateInputValue, formatMonthInputValue } from '@/lib/utils'

const ACTIVE_RECORD_STATUSES = [RecordStatus.ACTIVE, RecordStatus.PAUSED]

function getMonthBounds(monthDate: Date) {
    const month = startOfMonth(monthDate)
    return {
        month,
        monthEnd: endOfMonth(monthDate),
    }
}

function getDueStatus(
    dueDate: Date,
    isPaid: boolean,
    now: Date,
): MonthlyPaymentStatus {
    if (isPaid) return 'PAID'
    return isBefore(startOfDay(dueDate), startOfDay(now)) ? 'OVERDUE' : 'OPEN'
}

function mapCardStatementStatus(
    statement: {
        status: string
        dueDate: Date
        minimumPayment: number
        paymentsReceived: number
    },
    now: Date,
): MonthlyPaymentStatus {
    if (statement.status === 'PAID' || statement.status === 'CLOSED') {
        return 'PAID'
    }

    if (statement.status === 'OVERDUE') {
        return 'OVERDUE'
    }

    if (
        isBefore(startOfDay(statement.dueDate), startOfDay(now)) &&
        statement.paymentsReceived < statement.minimumPayment
    ) {
        return 'OVERDUE'
    }

    return 'OPEN'
}

function compareStatusPriority(left: MonthlyPaymentStatus, right: MonthlyPaymentStatus) {
    const priority: Record<MonthlyPaymentStatus, number> = {
        OVERDUE: 0,
        OPEN: 1,
        PLANNED: 2,
        PAID: 3,
    }

    return priority[left] - priority[right]
}

function sortMonthlyPaymentItems(items: MonthlyPaymentItem[]) {
    return [...items].sort((left, right) => {
        const byStatus = compareStatusPriority(left.status, right.status)
        if (byStatus !== 0) return byStatus
        return left.dueDate.getTime() - right.dueDate.getTime()
    })
}

function getDaysInMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

export function resolveDashboardMonth(rawMonth: string | null | undefined, now = new Date()) {
    const currentMonth = startOfMonth(now)

    if (!rawMonth) {
        return currentMonth
    }

    const normalized = /^\d{4}-\d{2}$/.test(rawMonth)
        ? `${rawMonth}-01`
        : rawMonth

    const parsed = new Date(normalized)
    if (Number.isNaN(parsed.getTime())) {
        return currentMonth
    }

    const targetMonth = startOfMonth(parsed)
    if (targetMonth < currentMonth) {
        return currentMonth
    }

    return targetMonth
}

export function getMonthQueryValue(monthDate: Date) {
    return formatDateInputValue(startOfMonth(monthDate))
}

export function getMonthInputValue(monthDate: Date) {
    return formatMonthInputValue(startOfMonth(monthDate))
}

function getProjectedMonthlyDueDate(
    targetMonth: Date,
    nextPayment: Date,
    billingCycle: BillingCycle,
    billingAnchorDay?: number | null,
) {
    const monthStart = startOfMonth(targetMonth)
    const nextMonthStart = startOfMonth(nextPayment)

    if (monthStart < nextMonthStart) {
        return null
    }

    if (billingCycle === BillingCycle.YEARLY) {
        if (
            monthStart.getMonth() !== nextMonthStart.getMonth() ||
            monthStart.getFullYear() < nextMonthStart.getFullYear()
        ) {
            return null
        }
    }

    const day = Math.min(
        billingAnchorDay ?? nextPayment.getDate(),
        getDaysInMonth(monthStart),
    )

    return new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        day,
        nextPayment.getHours(),
        nextPayment.getMinutes(),
        nextPayment.getSeconds(),
        nextPayment.getMilliseconds(),
    )
}

function buildForecastSummary(month: Date, items: MonthlyPaymentItem[]): MonthlyPaymentForecast {
    const totalScheduled = items.reduce((sum, item) => sum + item.amount, 0)
    const totalPaid = items
        .filter((item) => item.status === 'PAID')
        .reduce((sum, item) => sum + item.amount, 0)
    const totalOpen = items
        .filter((item) => item.status === 'OPEN')
        .reduce((sum, item) => sum + item.amount, 0)
    const totalOverdue = items
        .filter((item) => item.status === 'OVERDUE')
        .reduce((sum, item) => sum + item.amount, 0)
    const totalPlanned = items
        .filter((item) => item.status === 'PLANNED')
        .reduce((sum, item) => sum + item.amount, 0)

    return {
        month,
        items: sortMonthlyPaymentItems(items),
        totalScheduled: +totalScheduled.toFixed(2),
        totalPaid: +totalPaid.toFixed(2),
        totalOpen: +totalOpen.toFixed(2),
        totalOverdue: +totalOverdue.toFixed(2),
        totalPlanned: +totalPlanned.toFixed(2),
    }
}

export async function getMonthlyPaymentForecast(
    userId: string,
    monthDate = new Date(),
): Promise<MonthlyPaymentForecast> {
    const now = new Date()
    const { month, monthEnd } = getMonthBounds(monthDate)

    const [loanInstallments, cardStatements, manualDebts, subscriptions, recurringExpenses] = await Promise.all([
        prisma.paymentPlan.findMany({
            where: {
                debt: { userId, type: 'LOAN' },
                dueDate: { gte: month, lte: monthEnd },
            },
            include: {
                debt: {
                    select: { id: true, name: true },
                },
            },
            orderBy: [{ dueDate: 'asc' }, { installmentNo: 'asc' }],
        }),
        prisma.cardStatement.findMany({
            where: {
                creditCard: { userId, status: 'ACTIVE' },
                dueDate: { gte: month, lte: monthEnd },
            },
            include: {
                creditCard: {
                    select: {
                        id: true,
                        cardName: true,
                    },
                },
            },
            orderBy: { dueDate: 'asc' },
        }),
        prisma.debt.findMany({
            where: {
                userId,
                isPaid: false,
                dueDate: { gte: month, lte: monthEnd },
                paymentPlan: { none: {} },
            },
            select: {
                id: true,
                name: true,
                type: true,
                remainingBalance: true,
                dueDate: true,
            },
            orderBy: { dueDate: 'asc' },
        }),
        prisma.subscription.findMany({
            where: {
                userId,
                isActive: true,
                status: { in: ACTIVE_RECORD_STATUSES },
            },
            select: {
                id: true,
                name: true,
                amount: true,
                currency: true,
                billingCycle: true,
                billingAnchorDay: true,
                nextPayment: true,
                autopay: true,
                category: true,
            },
            orderBy: { nextPayment: 'asc' },
        }),
        prisma.recurringExpense.findMany({
            where: {
                userId,
                status: { in: ACTIVE_RECORD_STATUSES },
            },
            select: {
                id: true,
                name: true,
                amount: true,
                currency: true,
                billingCycle: true,
                billingAnchorDay: true,
                nextPayment: true,
                autopay: true,
                category: true,
                isEssential: true,
            },
            orderBy: { nextPayment: 'asc' },
        }),
    ])

    const items: MonthlyPaymentItem[] = [
        ...loanInstallments.map((item) => ({
            id: item.id,
            source: 'loan_installment' as const,
            name: item.debt.name,
            amount: item.amount,
            currency: 'TRY',
            dueDate: item.dueDate,
            status: getDueStatus(item.dueDate, item.isPaid, now),
            isEstimated: false,
            detail: {
                installmentNo: item.installmentNo,
                principalAmount: item.principalAmount,
                interestAmount: item.interestAmount,
                taxAmount: item.taxAmount,
                paidDate: item.paidDate,
            },
            navigateHref: '/debts',
        })),
        ...cardStatements.map((statement) => ({
            id: statement.id,
            source: 'card_statement' as const,
            name: statement.creditCard.cardName,
            amount: statement.minimumPayment,
            currency: 'TRY',
            dueDate: statement.dueDate,
            status: mapCardStatementStatus(statement, now),
            isEstimated: false,
            detail: {
                statementBalance: statement.statementBalance,
                minimumPayment: statement.minimumPayment,
                cardStatus: statement.status,
            },
            navigateHref: `/cards/${statement.creditCard.id}`,
        })),
        ...manualDebts.map((debt) => ({
            id: debt.id,
            source: 'manual_debt' as const,
            name: debt.name,
            amount: debt.remainingBalance,
            currency: 'TRY',
            dueDate: debt.dueDate!,
            status: isBefore(startOfDay(debt.dueDate!), startOfDay(now)) ? 'OVERDUE' as MonthlyPaymentStatus : 'OPEN' as MonthlyPaymentStatus,
            isEstimated: false,
            detail: {
                category: debt.type,
                currentStatus: debt.type,
            },
            navigateHref: '/debts',
        })),
        ...subscriptions.flatMap((subscription) => {
            const dueDate = getProjectedMonthlyDueDate(
                month,
                subscription.nextPayment,
                subscription.billingCycle,
                subscription.billingAnchorDay,
            )

            if (!dueDate) return []

            return [{
                id: `subscription-${subscription.id}-${getMonthQueryValue(month)}`,
                source: 'subscription' as const,
                name: subscription.name,
                amount: subscription.amount,
                currency: subscription.currency,
                dueDate,
                status: 'PLANNED' as const,
                isEstimated: true,
                detail: {
                    billingCycle: subscription.billingCycle,
                    autopay: subscription.autopay,
                    category: subscription.category,
                    note: 'Tahmini yenileme',
                },
                navigateHref: '/subscriptions',
            }]
        }),
        ...recurringExpenses.flatMap((expense) => {
            const dueDate = getProjectedMonthlyDueDate(
                month,
                expense.nextPayment,
                expense.billingCycle,
                expense.billingAnchorDay,
            )

            if (!dueDate) return []

            return [{
                id: `recurring-${expense.id}-${getMonthQueryValue(month)}`,
                source: 'recurring' as const,
                name: expense.name,
                amount: expense.amount,
                currency: expense.currency,
                dueDate,
                status: 'PLANNED' as const,
                isEstimated: true,
                detail: {
                    billingCycle: expense.billingCycle,
                    autopay: expense.autopay,
                    category: expense.category,
                    note: expense.isEssential ? 'Tahmini sabit gider' : 'Tahmini düzenli gider',
                },
                navigateHref: '/recurring',
            }]
        }),
    ]

    return buildForecastSummary(month, items)
}
