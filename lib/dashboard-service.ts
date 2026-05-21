import { getCardFinancialSnapshot } from '@/lib/card-balance'
import { prisma } from '@/lib/prisma'
import { getTotalBalance, getAvailableCash } from '@/lib/account-service'
import { getRPSummary } from '@/lib/people-service'

export interface DashboardData {
    totalBalance: number
    availableCash: number
    totalDebt: number
    totalReceivable: number
    totalPayable: number
    netPosition: number
    totalCardDebt: number
    totalSubscriptionMonthly: number
    totalRecurringMonthly: number
    overdueCount: number
    recentTransactions: Array<{
        id: string; type: string; amount: number; description: string | null; date: string; currency: string
    }>
    upcomingPayments: Array<{
        name: string; amount: number; date: string; type: string
    }>
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
    const [
        totalBalance,
        availableCash,
        rpSummary,
        debts,
        cards,
        subscriptions,
        recurringExpenses,
        recentLedger,
    ] = await Promise.all([
        getTotalBalance(userId),
        getAvailableCash(userId),
        getRPSummary(userId),
        prisma.debtAccount.findMany({ where: { userId, status: { not: 'CLOSED' } }, select: { currentBalance: true } }),
        prisma.creditCard.findMany({
            where: { userId, status: 'ACTIVE' },
            include: {
                transactions: { select: { type: true, amount: true } },
                payments: { select: { amount: true } },
                statements: {
                    orderBy: { periodEnd: 'desc' },
                    take: 1,
                    select: { statementBalance: true, minimumPayment: true, dueDate: true, paymentsReceived: true, status: true },
                },
            },
        }),
        prisma.subscription.findMany({
            where: { userId, isActive: true, status: 'ACTIVE' },
            select: { name: true, amount: true, monthlyNormalizedAmount: true, nextPayment: true, billingCycle: true },
        }),
        prisma.recurringExpense.findMany({
            where: { userId },
            select: { name: true, amount: true, nextPayment: true, billingCycle: true },
        }),
        prisma.ledgerEntry.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
            take: 10,
            select: { id: true, type: true, amount: true, description: true, date: true, currency: true },
        }),
    ])

    const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0)
    const totalCardDebt = cards.reduce((sum, card) => sum + getCardFinancialSnapshot(card).currentDebt, 0)
    const totalSubscriptionMonthly = subscriptions.reduce((sum, s) => sum + (s.monthlyNormalizedAmount ?? s.amount), 0)
    const totalRecurringMonthly = recurringExpenses.reduce((sum, r) => sum + (r.billingCycle === 'YEARLY' ? r.amount / 12 : r.amount), 0)

    const netPosition = totalBalance + rpSummary.totalReceivable - totalDebt - totalCardDebt - rpSummary.totalPayable

    const upcomingPayments: DashboardData['upcomingPayments'] = []
    for (const sub of subscriptions) {
        upcomingPayments.push({ name: sub.name, amount: sub.amount, date: sub.nextPayment.toISOString(), type: 'subscription' })
    }
    for (const rec of recurringExpenses) {
        upcomingPayments.push({ name: rec.name, amount: rec.amount, date: rec.nextPayment.toISOString(), type: 'recurring' })
    }
    upcomingPayments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return {
        totalBalance: +totalBalance.toFixed(2),
        availableCash: +availableCash.toFixed(2),
        totalDebt: +totalDebt.toFixed(2),
        totalReceivable: +rpSummary.totalReceivable.toFixed(2),
        totalPayable: +rpSummary.totalPayable.toFixed(2),
        netPosition: +netPosition.toFixed(2),
        totalCardDebt: +totalCardDebt.toFixed(2),
        totalSubscriptionMonthly: +totalSubscriptionMonthly.toFixed(2),
        totalRecurringMonthly: +totalRecurringMonthly.toFixed(2),
        overdueCount: rpSummary.overdueCount,
        recentTransactions: recentLedger.map((e) => ({
            id: e.id, type: e.type, amount: e.amount, description: e.description, date: e.date.toISOString(), currency: e.currency,
        })),
        upcomingPayments: upcomingPayments.slice(0, 8),
    }
}
