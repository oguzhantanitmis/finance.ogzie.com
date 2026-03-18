'use server'

import { prisma } from '@/lib/prisma'
import { getAvailableCash } from '@/lib/account-service'

export interface SimulationResult {
    currentState: { cash: number; totalDebt: number; monthlyExpense: number }
    projectedState: { cash: number; totalDebt: number; monthlyExpense: number }
    cashImpact: number
    debtImpact: number
    recommendation: string
}

export async function simulateCancelSubscriptions(
    userId: string,
    subscriptionIds: string[]
): Promise<SimulationResult> {
    const subs = await prisma.subscription.findMany({
        where: { id: { in: subscriptionIds }, userId },
        select: { name: true, monthlyNormalizedAmount: true, amount: true },
    })

    const monthlySavings = subs.reduce((s, sub) => s + (sub.monthlyNormalizedAmount ?? sub.amount), 0)
    const cash = await getAvailableCash(userId)

    return {
        currentState: { cash, totalDebt: 0, monthlyExpense: monthlySavings },
        projectedState: { cash: cash + monthlySavings, totalDebt: 0, monthlyExpense: 0 },
        cashImpact: monthlySavings,
        debtImpact: 0,
        recommendation: `${subs.length} abonelik iptal edilirse aylık ${monthlySavings.toFixed(2)} TL tasarruf sağlanır.`,
    }
}

export async function simulateExtraPayment(
    userId: string,
    debtId: string,
    extraAmount: number
): Promise<SimulationResult> {
    const debt = await prisma.debt.findUniqueOrThrow({ where: { id: debtId } })
    const cash = await getAvailableCash(userId)
    const newBalance = Math.max(0, debt.remainingBalance - extraAmount)

    return {
        currentState: { cash, totalDebt: debt.remainingBalance, monthlyExpense: 0 },
        projectedState: { cash: cash - extraAmount, totalDebt: newBalance, monthlyExpense: 0 },
        cashImpact: -extraAmount,
        debtImpact: -(debt.remainingBalance - newBalance),
        recommendation: newBalance === 0
            ? `${debt.name} tamamen kapatılır!`
            : `${debt.name} borcu ${newBalance.toFixed(2)} TL'ye düşer.`,
    }
}

export async function simulateIncomeChange(
    userId: string,
    newMonthlyIncome: number
): Promise<SimulationResult> {
    const incomes = await prisma.incomeSource.findMany({ where: { userId }, select: { amount: true, billingCycle: true } })
    const currentIncome = incomes.reduce((s, i) => s + (i.billingCycle === 'YEARLY' ? i.amount / 12 : i.amount), 0)
    const cash = await getAvailableCash(userId)
    const diff = newMonthlyIncome - currentIncome

    return {
        currentState: { cash, totalDebt: 0, monthlyExpense: currentIncome },
        projectedState: { cash: cash + diff, totalDebt: 0, monthlyExpense: newMonthlyIncome },
        cashImpact: diff,
        debtImpact: 0,
        recommendation: diff > 0
            ? `Gelir artışı aylık ${diff.toFixed(2)} TL fazla nakit sağlar.`
            : `Gelir düşüşü aylık ${Math.abs(diff).toFixed(2)} TL eksik nakit yaratır.`,
    }
}
