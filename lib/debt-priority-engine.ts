'use server'

import { endOfMonth, isWithinInterval, startOfMonth } from 'date-fns'

import { getEffectiveRates } from '@/lib/card-finance-settings-service'
import { prisma } from '@/lib/prisma'

export type Strategy = 'SAFE' | 'AVALANCHE' | 'SNOWBALL'

export interface DebtItem {
    id: string
    name: string
    type: 'credit_card' | 'debt' | 'receivable_payable'
    balance: number
    requiredPayment: number
    interestRate: number
    dueDate: Date | null
    suggestedPayment: number
    priority: number
    detail?: {
        statementBalance?: number
    }
}

export interface PaymentPlan {
    strategy: Strategy
    items: DebtItem[]
    totalRequiredPayment: number
    totalAvailable: number
    surplus: number
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    warnings: string[]
}

async function collectAllDebts(userId: string, monthDate: Date): Promise<DebtItem[]> {
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)

    const [cards, debts, payables] = await Promise.all([
        prisma.creditCard.findMany({
            where: { userId, status: 'ACTIVE' },
            include: {
                statements: {
                    orderBy: { periodEnd: 'desc' },
                    take: 1,
                },
            },
        }),
        prisma.debt.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                remainingBalance: true,
                interestRate: true,
                dueDate: true,
                paymentPlan: {
                    where: { isPaid: false },
                    orderBy: { dueDate: 'asc' },
                    select: {
                        id: true,
                        amount: true,
                        dueDate: true,
                    },
                },
            },
        }),
        prisma.receivablePayable.findMany({
            where: { userId, type: 'PAYABLE', status: { not: 'CLOSED' } },
            include: { person: { select: { name: true } } },
        }),
    ])

    const items: DebtItem[] = []

    for (const card of cards) {
        const stmt = card.statements[0]
        const balance = stmt?.statementBalance ?? 0
        if (balance <= 0) continue

        const rates = await getEffectiveRates(userId, card.id)
        const requiredPayment = +(balance * rates.minPaymentRate).toFixed(2)

        items.push({
            id: card.id,
            name: card.cardName,
            type: 'credit_card',
            balance,
            requiredPayment: Math.max(requiredPayment, 1),
            interestRate: rates.contractualRate,
            dueDate: stmt?.dueDate ?? null,
            suggestedPayment: requiredPayment,
            priority: 0,
            detail: {
                statementBalance: stmt?.statementBalance ?? balance,
            },
        })
    }

    for (const debt of debts) {
        if (debt.remainingBalance <= 0) continue

        const monthPlans = debt.paymentPlan.filter((plan) =>
            isWithinInterval(plan.dueDate, { start: monthStart, end: monthEnd }),
        )
        const firstUnpaidPlan = debt.paymentPlan[0] ?? null
        const requiredPayment = monthPlans.length > 0
            ? monthPlans.reduce((sum, plan) => sum + plan.amount, 0)
            : firstUnpaidPlan?.amount ?? (
                debt.dueDate && isWithinInterval(debt.dueDate, { start: monthStart, end: monthEnd })
                    ? debt.remainingBalance
                    : 0
            )

        items.push({
            id: debt.id,
            name: debt.name,
            type: 'debt',
            balance: debt.remainingBalance,
            requiredPayment: +requiredPayment.toFixed(2),
            interestRate: debt.interestRate ?? 0,
            dueDate: firstUnpaidPlan?.dueDate ?? debt.dueDate ?? null,
            suggestedPayment: +requiredPayment.toFixed(2),
            priority: 0,
        })
    }

    for (const rp of payables) {
        const requiredPayment = rp.dueDate && isWithinInterval(rp.dueDate, { start: monthStart, end: monthEnd })
            ? rp.remainingAmount
            : 0

        items.push({
            id: rp.id,
            name: `${rp.person.name}: ${rp.description}`,
            type: 'receivable_payable',
            balance: rp.remainingAmount,
            requiredPayment,
            interestRate: 0,
            dueDate: rp.dueDate,
            suggestedPayment: 0,
            priority: 0,
        })
    }

    return items
}

function applySafeStrategy(items: DebtItem[], available: number): DebtItem[] {
    const sorted = [...items].sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime()
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        if (a.type === 'credit_card' && b.type !== 'credit_card') return -1
        if (b.type === 'credit_card' && a.type !== 'credit_card') return 1
        return b.requiredPayment - a.requiredPayment
    })

    let remaining = available
    return sorted.map((item, i) => {
        const payment = Math.min(item.requiredPayment, remaining)
        remaining -= payment
        return { ...item, suggestedPayment: +payment.toFixed(2), priority: i + 1 }
    })
}

function applyAvalancheStrategy(items: DebtItem[], available: number): DebtItem[] {
    let remaining = available
    const withRequired = items.map((item) => {
        const requiredPayment = Math.min(item.requiredPayment, remaining)
        remaining -= requiredPayment
        return { ...item, suggestedPayment: +requiredPayment.toFixed(2) }
    })

    const sorted = [...withRequired].sort((a, b) => b.interestRate - a.interestRate)
    return sorted.map((item, i) => {
        if (remaining > 0 && item.balance > item.suggestedPayment) {
            const extra = Math.min(remaining, item.balance - item.suggestedPayment)
            remaining -= extra
            return { ...item, suggestedPayment: +(item.suggestedPayment + extra).toFixed(2), priority: i + 1 }
        }
        return { ...item, priority: i + 1 }
    })
}

function applySnowballStrategy(items: DebtItem[], available: number): DebtItem[] {
    let remaining = available
    const withRequired = items.map((item) => {
        const requiredPayment = Math.min(item.requiredPayment, remaining)
        remaining -= requiredPayment
        return { ...item, suggestedPayment: +requiredPayment.toFixed(2) }
    })

    const sorted = [...withRequired].sort((a, b) => a.balance - b.balance)
    return sorted.map((item, i) => {
        if (remaining > 0 && item.balance > item.suggestedPayment) {
            const extra = Math.min(remaining, item.balance - item.suggestedPayment)
            remaining -= extra
            return { ...item, suggestedPayment: +(item.suggestedPayment + extra).toFixed(2), priority: i + 1 }
        }
        return { ...item, priority: i + 1 }
    })
}

export async function generatePaymentPlan(
    userId: string,
    strategy: Strategy = 'SAFE',
    availableCash?: number,
    monthDate = new Date(),
): Promise<PaymentPlan> {
    const items = await collectAllDebts(userId, monthDate)

    let totalAvailable: number
    if (availableCash !== undefined) {
        totalAvailable = availableCash
    } else {
        const accounts = await prisma.account.findMany({
            where: { userId, isActive: true, type: { in: ['BANK_ACCOUNT', 'CASH', 'WALLET'] } },
            select: { balance: true },
        })
        totalAvailable = accounts.reduce((sum, account) => sum + account.balance, 0)
    }

    const totalRequiredPayment = items.reduce((sum, item) => sum + item.requiredPayment, 0)
    const warnings: string[] = []

    if (totalAvailable < totalRequiredPayment) {
        warnings.push(`Kullanılabilir nakit (${totalAvailable.toFixed(0)} TL) zorunlu ödemeleri (${totalRequiredPayment.toFixed(0)} TL) karşılamıyor!`)
    }

    let prioritized: DebtItem[]
    switch (strategy) {
        case 'AVALANCHE':
            prioritized = applyAvalancheStrategy(items, totalAvailable)
            break
        case 'SNOWBALL':
            prioritized = applySnowballStrategy(items, totalAvailable)
            break
        default:
            prioritized = applySafeStrategy(items, totalAvailable)
    }

    const riskLevel =
        totalAvailable < totalRequiredPayment * 0.5 ? 'CRITICAL' :
        totalAvailable < totalRequiredPayment ? 'HIGH' :
        totalAvailable < totalRequiredPayment * 2 ? 'MEDIUM' : 'LOW'

    return {
        strategy,
        items: prioritized,
        totalRequiredPayment: +totalRequiredPayment.toFixed(2),
        totalAvailable: +totalAvailable.toFixed(2),
        surplus: +(totalAvailable - totalRequiredPayment).toFixed(2),
        riskLevel,
        warnings,
    }
}
