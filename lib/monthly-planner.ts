import {
    BillingCycle,
    BudgetAlertState,
    RecordStatus,
} from '@prisma/client'
import {
    addDays,
    endOfMonth,
    isWithinInterval,
    startOfMonth,
} from 'date-fns'

import type {
    FinanceAlertView,
    MonthlyBudgetSummary,
    UpcomingObligation,
} from '@/lib/finance-os-types'
import { getDebtPaymentObligations } from '@/lib/debt-views'
import { getMarketRates, calculateAssetValue } from '@/lib/market-data'
import { prisma } from '@/lib/prisma'

const ACTIVE_STATUSES = [RecordStatus.ACTIVE, RecordStatus.PAUSED]

export function normalizeMonthlyAmount(amount: number, billingCycle: BillingCycle) {
    if (billingCycle === BillingCycle.YEARLY) {
        return amount / 12
    }

    return amount
}

function buildDebtCommitment(debt: {
    id: string
    name: string
    remainingBalance: number
    type: string
    paymentDueDay: number | null
    dueDate: Date | null
    minPaymentRate: number
    paymentPlan: Array<{ id: string, amount: number, dueDate: Date, isPaid: boolean }>
}, monthStart: Date, monthEnd: Date): UpcomingObligation[] {
    const obligations: UpcomingObligation[] = []
    const monthlyPlans = debt.paymentPlan.filter((plan) =>
        !plan.isPaid && isWithinInterval(plan.dueDate, { start: monthStart, end: monthEnd }),
    )

    monthlyPlans.forEach((plan) => {
        obligations.push({
            id: plan.id,
            source: 'debt',
            name: debt.name,
            amount: plan.amount,
            currency: 'TRY',
            dueDate: plan.dueDate,
            category: debt.type,
            note: 'Taksit',
        })
    })

    if (monthlyPlans.length === 0 && debt.paymentDueDay) {
        const dueDate = new Date(monthStart)
        dueDate.setDate(Math.min(debt.paymentDueDay, 28))
        obligations.push({
            id: debt.id,
            source: 'debt',
            name: debt.name,
            amount: Math.max(debt.remainingBalance * debt.minPaymentRate, 0),
            currency: 'TRY',
            dueDate,
            category: debt.type,
            note: 'Tahmini asgari odeme',
        })
    } else if (monthlyPlans.length === 0 && debt.dueDate && isWithinInterval(debt.dueDate, { start: monthStart, end: monthEnd })) {
        obligations.push({
            id: debt.id,
            source: 'debt',
            name: debt.name,
            amount: debt.remainingBalance,
            currency: 'TRY',
            dueDate: debt.dueDate,
            category: debt.type,
            note: 'Borclu odeme',
        })
    }

    return obligations
}

export async function getMonthlyBudgetSummary(userId: string, monthDate = new Date()): Promise<MonthlyBudgetSummary> {
    const month = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)
    const upcomingEnd = addDays(new Date(), 14)

    const [
        assets,
        debts,
        subscriptions,
        recurringExpenses,
        incomeSources,
        budgetMonth,
        alerts,
        rpInstallments,
        debtPaymentObligations,
    ] = await Promise.all([
        prisma.asset.findMany({ where: { userId } }),
        prisma.debt.findMany({
            where: { userId },
            include: {
                paymentPlan: {
                    where: { isPaid: false },
                },
            },
        }),
        prisma.subscription.findMany({
            where: { userId, status: { in: ACTIVE_STATUSES }, isActive: true },
            orderBy: { nextPayment: 'asc' },
        }),
        prisma.recurringExpense.findMany({
            where: { userId, status: { in: ACTIVE_STATUSES } },
            orderBy: { nextPayment: 'asc' },
        }),
        prisma.incomeSource.findMany({
            where: { userId, status: { in: ACTIVE_STATUSES } },
            orderBy: [{ isPrimary: 'desc' }, { amount: 'desc' }],
        }),
        prisma.budgetMonth.findUnique({
            where: { userId_month: { userId, month } },
        }),
        prisma.budgetAlert.findMany({
            where: { userId, state: BudgetAlertState.OPEN },
            orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
            take: 8,
        }),
        prisma.rPInstallment.findMany({
            where: {
                receivablePayable: { userId },
                status: { in: ['PENDING', 'PARTIAL_PAID', 'OVERDUE'] },
            },
            include: { receivablePayable: { include: { person: { select: { name: true } } } } },
            orderBy: { dueDate: 'asc' },
        }).catch(() => []),
        getDebtPaymentObligations(userId),
    ])

    const marketRates = await getMarketRates(userId)
    const totalAssets = assets.reduce(
        (sum, asset) => sum + calculateAssetValue(asset.amount, asset.type, asset.currency, marketRates),
        0,
    )
    const totalDebts = debts.reduce((sum, debt) => sum + debt.remainingBalance, 0)
    const netWorth = totalAssets - totalDebts

    const subscriptionViews = subscriptions.map((subscription) => ({
        id: subscription.id,
        name: subscription.name,
        amount: subscription.amount,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        nextPayment: subscription.nextPayment,
        monthlyNormalizedAmount:
            subscription.monthlyNormalizedAmount ??
            normalizeMonthlyAmount(subscription.amount, subscription.billingCycle),
        category: subscription.category,
        logoUrl: subscription.logoUrl,
        autopay: subscription.autopay,
        notes: subscription.notes,
        status: subscription.status,
    }))
    const recurringViews = recurringExpenses.map((expense) => ({
        id: expense.id,
        name: expense.name,
        amount: expense.amount,
        currency: expense.currency,
        billingCycle: expense.billingCycle,
        nextPayment: expense.nextPayment,
        category: expense.category,
        status: expense.status,
        isEssential: expense.isEssential,
        autopay: expense.autopay,
        notes: expense.notes,
    }))
    const incomeViews = incomeSources.map((income) => ({
        id: income.id,
        name: income.name,
        amount: income.amount,
        currency: income.currency,
        billingCycle: income.billingCycle,
        payday: income.payday,
        status: income.status,
        isPrimary: income.isPrimary,
    }))

    const subscriptionLoad = subscriptionViews.reduce(
        (sum, subscription) => sum + subscription.monthlyNormalizedAmount,
        0,
    )
    const recurringLoad = recurringViews.reduce(
        (sum, expense) => sum + normalizeMonthlyAmount(expense.amount, expense.billingCycle),
        0,
    )
    const plannedIncome = budgetMonth?.plannedIncome && budgetMonth.plannedIncome > 0
        ? budgetMonth.plannedIncome
        : incomeViews.reduce((sum, income) => sum + normalizeMonthlyAmount(income.amount, income.billingCycle), 0)

    const sourceDebtObligations: UpcomingObligation[] = debtPaymentObligations
        .filter((obligation) => isWithinInterval(new Date(obligation.dueDate), { start: month, end: monthEnd }) || obligation.overdueDays > 0)
        .map((obligation) => ({
            id: obligation.id,
            source: 'debt' as const,
            name: obligation.name,
            amount: obligation.amount,
            currency: 'TRY',
            dueDate: new Date(obligation.dueDate),
            category: obligation.sourceLabel,
            note: obligation.overdueDays > 0 ? `${obligation.note} - ${obligation.overdueDays} gün gecikti` : obligation.note,
        }))
    const manualDebtObligations = debts
        .filter((debt) => !['LOAN', 'CREDIT_CARD', 'KMH'].includes(debt.type))
        .flatMap((debt) => buildDebtCommitment(debt, month, monthEnd))
    const debtObligations = [...sourceDebtObligations, ...manualDebtObligations]
    const rpObligations: UpcomingObligation[] = rpInstallments
        .filter((installment) => isWithinInterval(installment.dueDate, { start: month, end: monthEnd }) || installment.status === 'OVERDUE')
        .map((installment) => ({
            id: installment.id,
            source: 'debt' as const,
            name: `${installment.receivablePayable.person.name} - ${installment.receivablePayable.title ?? installment.receivablePayable.description}`,
            amount: installment.remainingAmount,
            currency: installment.receivablePayable.currency,
            dueDate: installment.dueDate,
            category: installment.receivablePayable.type === 'RECEIVABLE' ? 'Beklenen tahsilat' : 'Yapılacak ödeme',
            note: `${installment.installmentNo}. taksit${installment.status === 'OVERDUE' ? ' - gecikti' : ''}`,
        }))
    const debtCommitments = budgetMonth?.debtCommitments && budgetMonth.debtCommitments > 0
        ? budgetMonth.debtCommitments
        : debtObligations.reduce((sum, debt) => sum + debt.amount, 0) + rpObligations.filter((item) => item.category === 'Yapılacak ödeme').reduce((sum, item) => sum + item.amount, 0)

    const fixedCommitments = budgetMonth?.fixedCommitments && budgetMonth.fixedCommitments > 0
        ? budgetMonth.fixedCommitments
        : subscriptionLoad + recurringLoad

    const freeCash = budgetMonth?.freeCash && budgetMonth.freeCash !== 0
        ? budgetMonth.freeCash
        : plannedIncome - fixedCommitments - debtCommitments

    const upcomingObligations: UpcomingObligation[] = [
        ...subscriptionViews
            .filter((subscription) =>
                isWithinInterval(subscription.nextPayment, { start: new Date(), end: upcomingEnd }),
            )
            .map((subscription) => ({
                id: subscription.id,
                source: 'subscription' as const,
                name: subscription.name,
                amount: subscription.amount,
                currency: subscription.currency,
                dueDate: subscription.nextPayment,
                category: subscription.category,
                note: subscription.billingCycle === BillingCycle.YEARLY ? 'Yillik yenileme' : 'Abonelik',
            })),
        ...recurringViews
            .filter((expense) => isWithinInterval(expense.nextPayment, { start: new Date(), end: upcomingEnd }))
            .map((expense) => ({
                id: expense.id,
                source: 'recurring' as const,
                name: expense.name,
                amount: expense.amount,
                currency: expense.currency,
                dueDate: expense.nextPayment,
                category: expense.category,
                note: expense.isEssential ? 'Sabit gider' : 'Duzenli gider',
            })),
        ...debtObligations.filter((obligation) =>
            obligation.dueDate < new Date() || isWithinInterval(obligation.dueDate, { start: new Date(), end: upcomingEnd }),
        ),
        ...rpObligations.filter((obligation) =>
            obligation.dueDate < new Date() || isWithinInterval(obligation.dueDate, { start: new Date(), end: upcomingEnd }),
        ),
    ].sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())

    const alertViews: FinanceAlertView[] = alerts.map((alert) => ({
        id: alert.id,
        type: alert.type,
        state: alert.state,
        title: alert.title,
        content: alert.content,
        dueDate: alert.dueDate,
    }))

    return {
        month,
        openingCash: budgetMonth?.openingCash ?? 0,
        plannedIncome,
        fixedCommitments,
        debtCommitments,
        plannedReceivableCollection: budgetMonth?.plannedReceivableCollection ?? 0,
        savingGoal: budgetMonth?.savingGoal ?? 0,
        debtPaymentBudget: budgetMonth?.debtPaymentBudget ?? 0,
        manualAdjustment: budgetMonth?.manualAdjustment ?? 0,
        freeCash,
        bufferTarget: budgetMonth?.bufferTarget ?? 0,
        notes: budgetMonth?.notes ?? null,
        recurringLoad,
        subscriptionLoad,
        totalAssets,
        totalDebts,
        netWorth,
        alerts: alertViews,
        subscriptions: subscriptionViews,
        recurringExpenses: recurringViews,
        incomeSources: incomeViews,
        upcomingObligations,
    }
}
