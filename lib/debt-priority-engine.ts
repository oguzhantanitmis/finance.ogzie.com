'use server'

import { getCardFinancialSnapshot } from '@/lib/card-balance'
import { prisma } from '@/lib/prisma'
import { getEffectiveRates } from '@/lib/card-finance-settings-service'

export type Strategy = 'SAFE' | 'AVALANCHE' | 'SNOWBALL'

export interface DebtItem {
    id: string
    name: string
    type: 'credit_card' | 'debt' | 'receivable_payable'
    balance: number
    minPayment: number
    interestRate: number
    dueDate: Date | null
    suggestedPayment: number
    priority: number
}

export interface PaymentPlan {
    strategy: Strategy
    items: DebtItem[]
    totalMinPayment: number
    totalAvailable: number
    surplus: number
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    warnings: string[]
}

/**
 * Tüm borçları toplar: kredi kartları + borçlar + verecekler
 */
async function collectAllDebts(userId: string): Promise<DebtItem[]> {
    const [cards, debts, payables] = await Promise.all([
        prisma.creditCard.findMany({
            where: { userId, status: 'ACTIVE' },
            include: {
                transactions: {
                    select: { type: true, amount: true },
                },
                payments: {
                    select: { amount: true },
                },
                statements: { orderBy: { periodEnd: 'desc' }, take: 1 },
            },
        }),
        prisma.debt.findMany({
            where: { userId },
            select: { id: true, name: true, remainingBalance: true, interestRate: true },
        }),
        prisma.receivablePayable.findMany({
            where: { userId, type: 'PAYABLE', status: { not: 'CLOSED' } },
            include: { person: { select: { name: true } } },
        }),
    ])

    const items: DebtItem[] = []

    for (const card of cards) {
        const snapshot = getCardFinancialSnapshot(card)
        const balance = snapshot.currentDebt
        if (balance <= 0) continue

        const rates = await getEffectiveRates(userId, card.id)

        items.push({
            id: card.id,
            name: card.cardName,
            type: 'credit_card',
            balance,
            minPayment: snapshot.minimumPayment,
            interestRate: rates.contractualRate,
            dueDate: snapshot.dueDate,
            suggestedPayment: snapshot.minimumPayment,
            priority: 0,
        })
    }

    for (const debt of debts) {
        if (debt.remainingBalance <= 0) continue
        items.push({
            id: debt.id,
            name: debt.name,
            type: 'debt',
            balance: debt.remainingBalance,
            minPayment: 0,
            interestRate: debt.interestRate ?? 0,
            dueDate: null,
            suggestedPayment: 0,
            priority: 0,
        })
    }

    for (const rp of payables) {
        items.push({
            id: rp.id,
            name: `${rp.person.name}: ${rp.description}`,
            type: 'receivable_payable',
            balance: rp.remainingAmount,
            minPayment: 0,
            interestRate: 0,
            dueDate: rp.dueDate,
            suggestedPayment: 0,
            priority: 0,
        })
    }

    return items
}

/**
 * Safe Mode: Asgari ödeme + yaklaşan vadeler önce
 */
function applySafeStrategy(items: DebtItem[], available: number): DebtItem[] {
    const sorted = [...items].sort((a, b) => {
        // Vadesi yaklaşan önce
        if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime()
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        // Sonra kredi kartları önce (asgari ödeme zorunlu)
        if (a.type === 'credit_card' && b.type !== 'credit_card') return -1
        if (b.type === 'credit_card' && a.type !== 'credit_card') return 1
        return b.minPayment - a.minPayment
    })

    let remaining = available
    return sorted.map((item, i) => {
        const payment = Math.min(item.minPayment, remaining)
        remaining -= payment
        return { ...item, suggestedPayment: +payment.toFixed(2), priority: i + 1 }
    })
}

/**
 * Avalanche Mode: En yüksek faiz oranından başla
 */
function applyAvalancheStrategy(items: DebtItem[], available: number): DebtItem[] {
    // Önce asgari ödemeleri karşıla
    let remaining = available
    const withMins = items.map((item) => {
        const min = Math.min(item.minPayment, remaining)
        remaining -= min
        return { ...item, suggestedPayment: +min.toFixed(2) }
    })

    // Kalan parayı en yüksek faize dağıt
    const sorted = [...withMins].sort((a, b) => b.interestRate - a.interestRate)
    return sorted.map((item, i) => {
        if (remaining > 0 && item.balance > item.suggestedPayment) {
            const extra = Math.min(remaining, item.balance - item.suggestedPayment)
            remaining -= extra
            return { ...item, suggestedPayment: +(item.suggestedPayment + extra).toFixed(2), priority: i + 1 }
        }
        return { ...item, priority: i + 1 }
    })
}

/**
 * Snowball Mode: En küçük borçtan başla
 */
function applySnowballStrategy(items: DebtItem[], available: number): DebtItem[] {
    let remaining = available
    const withMins = items.map((item) => {
        const min = Math.min(item.minPayment, remaining)
        remaining -= min
        return { ...item, suggestedPayment: +min.toFixed(2) }
    })

    const sorted = [...withMins].sort((a, b) => a.balance - b.balance)
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
    availableCash?: number
): Promise<PaymentPlan> {
    const items = await collectAllDebts(userId)

    // Kullanılabilir nakit
    let totalAvailable: number
    if (availableCash !== undefined) {
        totalAvailable = availableCash
    } else {
        const accounts = await prisma.account.findMany({
            where: { userId, isActive: true, type: { in: ['BANK_ACCOUNT', 'CASH', 'WALLET'] } },
            select: { balance: true },
        })
        totalAvailable = accounts.reduce((sum, a) => sum + a.balance, 0)
    }

    const totalMinPayment = items.reduce((sum, i) => sum + i.minPayment, 0)
    const warnings: string[] = []

    if (totalAvailable < totalMinPayment) {
        warnings.push(`Kullanılabilir nakit (${totalAvailable.toFixed(0)} TL) asgari ödemeleri (${totalMinPayment.toFixed(0)} TL) karşılamıyor!`)
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
        totalAvailable < totalMinPayment * 0.5 ? 'CRITICAL' :
        totalAvailable < totalMinPayment ? 'HIGH' :
        totalAvailable < totalMinPayment * 2 ? 'MEDIUM' : 'LOW'

    return {
        strategy,
        items: prioritized,
        totalMinPayment: +totalMinPayment.toFixed(2),
        totalAvailable: +totalAvailable.toFixed(2),
        surplus: +(totalAvailable - totalMinPayment).toFixed(2),
        riskLevel,
        warnings,
    }
}
