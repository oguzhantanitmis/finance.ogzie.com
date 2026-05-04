import { prisma } from '@/lib/prisma'
import { getEffectiveRates } from '@/lib/card-finance-settings-service'

export type Strategy = 'SAFE' | 'AVALANCHE' | 'SNOWBALL' | 'CASHFLOW' | 'RISK' | 'GOAL'

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
    monthlyDebtBudget: number
    estimatedFinishDate: string | null
    totalInterestEstimate: number
    interestSavingEstimate: number
    rationale: string
    pros: string[]
    cons: string[]
}

/**
 * Tüm borçları toplar: kredi kartları + borçlar + verecekler
 */
async function collectAllDebts(userId: string): Promise<DebtItem[]> {
    const [cards, debts, payables] = await Promise.all([
        prisma.creditCard.findMany({
            where: { userId, status: 'ACTIVE' },
            include: {
                transactions: { select: { type: true, amount: true } },
                payments: { select: { amount: true } },
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
        const stmt = card.statements[0]
        const charges = card.transactions.filter((tx) => tx.type !== 'REFUND').reduce((sum, tx) => sum + tx.amount, 0)
        const refunds = card.transactions.filter((tx) => tx.type === 'REFUND').reduce((sum, tx) => sum + tx.amount, 0)
        const payments = card.payments.reduce((sum, payment) => sum + payment.amount, 0)
        const balance = card.currentDebt && card.currentDebt > 0 ? card.currentDebt : (stmt?.statementBalance ?? Math.max(charges - refunds - payments, 0))
        if (balance <= 0) continue

        const rates = await getEffectiveRates(userId, card.id)
        const minPayment = +(balance * rates.minPaymentRate).toFixed(2)

        items.push({
            id: card.id,
            name: card.cardName,
            type: 'credit_card',
            balance,
            minPayment: Math.max(minPayment, 1),
            interestRate: rates.contractualRate,
            dueDate: card.dueDate ?? stmt?.dueDate ?? null,
            suggestedPayment: minPayment,
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

function applyCashflowStrategy(items: DebtItem[], available: number): DebtItem[] {
    const sorted = [...items].sort((a, b) => {
        const aDue = a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
        const bDue = b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
        if (aDue !== bDue) return aDue - bDue
        return b.balance * (b.interestRate + 1) - a.balance * (a.interestRate + 1)
    })
    return distributeByOrder(sorted, available)
}

function applyRiskStrategy(items: DebtItem[], available: number): DebtItem[] {
    const now = Date.now()
    const sorted = [...items].sort((a, b) => {
        const aOverdue = a.dueDate && a.dueDate.getTime() < now ? 1 : 0
        const bOverdue = b.dueDate && b.dueDate.getTime() < now ? 1 : 0
        if (aOverdue !== bOverdue) return bOverdue - aOverdue
        const aRisk = a.interestRate * 10 + (a.type === 'credit_card' ? 25 : 0) + (a.balance > 0 ? Math.log10(a.balance) : 0)
        const bRisk = b.interestRate * 10 + (b.type === 'credit_card' ? 25 : 0) + (b.balance > 0 ? Math.log10(b.balance) : 0)
        return bRisk - aRisk
    })
    return distributeByOrder(sorted, available)
}

function distributeByOrder(sorted: DebtItem[], available: number): DebtItem[] {
    let remaining = available
    const withMins = sorted.map((item) => {
        const min = Math.min(item.minPayment, remaining)
        remaining -= min
        return { ...item, suggestedPayment: +min.toFixed(2) }
    })

    return withMins.map((item, i) => {
        if (remaining > 0 && item.balance > item.suggestedPayment) {
            const extra = Math.min(remaining, item.balance - item.suggestedPayment)
            remaining -= extra
            return { ...item, suggestedPayment: +(item.suggestedPayment + extra).toFixed(2), priority: i + 1 }
        }
        return { ...item, priority: i + 1 }
    })
}

/**
 * GOAL stratejisi: Aktif hedeflerin aylık gereksinimini düşer, kalan bütçeyi risk sırasıyla borçlara dağıtır.
 * Hedef yoksa risk stratejisine fallback yapar.
 */
async function applyGoalStrategy(userId: string, items: DebtItem[], available: number): Promise<DebtItem[]> {
    const goals = await prisma.financialGoal.findMany({
        where: { userId, status: 'GOAL_ACTIVE' },
        select: { monthlyRequiredAmount: true, targetAmount: true, currentAmount: true, targetDate: true },
    })

    if (goals.length === 0) {
        return applyRiskStrategy(items, available)
    }

    // Hedeflere ayrılması gereken aylık tutarı hesapla
    const totalGoalReserve = goals.reduce((sum, goal) => {
        if (goal.monthlyRequiredAmount && goal.monthlyRequiredAmount > 0) return sum + goal.monthlyRequiredAmount
        const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0)
        const days = Math.max(1, Math.ceil((goal.targetDate.getTime() - Date.now()) / 86400000))
        const months = Math.max(1, days / 30)
        return sum + remaining / months
    }, 0)

    // Hedef bütçesini ayırdıktan sonra kalan borç bütçesi
    const debtBudget = Math.max(0, available - totalGoalReserve)

    return applyRiskStrategy(items, debtBudget)
}

async function estimateDebtBudget(userId: string) {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const [incomeEntries, recurring, subscriptions] = await Promise.all([
        prisma.ledgerEntry.findMany({
            where: { userId, type: 'INCOME', date: { gte: threeMonthsAgo } },
            select: { amount: true },
        }),
        prisma.recurringExpense.findMany({ where: { userId, status: 'ACTIVE' }, select: { amount: true, billingCycle: true } }),
        prisma.subscription.findMany({ where: { userId, status: 'ACTIVE', isActive: true }, select: { amount: true, monthlyNormalizedAmount: true, billingCycle: true } }),
    ])

    const avgIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0) / 3
    const fixedExpenses = recurring.reduce((sum, item) => sum + (item.billingCycle === 'YEARLY' ? item.amount / 12 : item.amount), 0)
        + subscriptions.reduce((sum, item) => sum + (item.monthlyNormalizedAmount ?? (item.billingCycle === 'YEARLY' ? item.amount / 12 : item.amount)), 0)
    return Math.max(0, avgIncome - fixedExpenses)
}

function estimatePlanMetrics(items: DebtItem[], monthlyBudget: number, strategy: Strategy) {
    const totalDebt = items.reduce((sum, item) => sum + item.balance, 0)
    const weightedMonthlyInterest = items.reduce((sum, item) => sum + item.balance * (item.interestRate / 100), 0)
    const months = monthlyBudget > 0 ? Math.ceil(totalDebt / monthlyBudget) : null
    const finish = months ? new Date() : null
    if (finish && months) finish.setMonth(finish.getMonth() + months)
    const strategyMultiplier = strategy === 'AVALANCHE' ? 0.72 : strategy === 'RISK' ? 0.78 : strategy === 'SNOWBALL' ? 0.92 : 0.85
    const totalInterestEstimate = months ? weightedMonthlyInterest * months * strategyMultiplier : 0
    const baselineInterest = months ? weightedMonthlyInterest * months : 0
    return {
        estimatedFinishDate: finish?.toISOString() ?? null,
        totalInterestEstimate: +totalInterestEstimate.toFixed(2),
        interestSavingEstimate: +(baselineInterest - totalInterestEstimate).toFixed(2),
    }
}

function strategyNarrative(strategy: Strategy) {
    if (strategy === 'AVALANCHE') return {
        rationale: 'En yüksek faizli borçları önce kapatarak toplam faiz maliyetini düşürür.',
        pros: ['Faiz maliyeti en düşük senaryo olur.', 'Kart/KMH gibi pahalı borçları hızlı azaltır.'],
        cons: ['Küçük borçların kapanması daha geç hissedilebilir.'],
    }
    if (strategy === 'SNOWBALL') return {
        rationale: 'En küçük borcu önce kapatarak motivasyon ve takip netliği üretir.',
        pros: ['Hızlı psikolojik kazanım sağlar.', 'Açık borç adedi hızla azalır.'],
        cons: ['Yüksek faizli borç beklerse toplam maliyet artabilir.'],
    }
    if (strategy === 'CASHFLOW') return {
        rationale: 'Bu ay vadesi yaklaşan ve nakit akışını bozma ihtimali yüksek ödemeleri öne alır.',
        pros: ['Gecikme riskini azaltır.', 'Ay içi nakit akışını daha öngörülebilir yapar.'],
        cons: ['Faiz optimizasyonu tek başına çığ yöntemi kadar agresif değildir.'],
    }
    if (strategy === 'RISK') return {
        rationale: 'Gecikmiş, yüksek faizli ve kart/KMH borçlarını birlikte puanlayarak önceliklendirir.',
        pros: ['En riskli borçları hızlı görünür yapar.', 'Gecikme ve faiz baskısını birlikte azaltır.'],
        cons: ['Düşük tutarlı bazı borçlar kısa vadede bekleyebilir.'],
    }
    if (strategy === 'GOAL') return {
        rationale: 'Aktif hedeflere ayrılması gereken aylık tutarı borç ödeme kapasitesiyle birlikte değerlendirir.',
        pros: ['Borç kapatma ve hedef uyumunu birlikte gösterir.', 'Hedef tarihi gerçekçi değilse erken uyarır.'],
        cons: ['Hedef verisi eksikse standart risk planına yaklaşır.'],
    }
    return {
        rationale: 'Asgari ödemeleri ve yaklaşan vadeleri önce güvenceye alır.',
        pros: ['Gecikme ihtimalini azaltır.', 'Temel ödeme güvenliği sağlar.'],
        cons: ['Toplam faiz maliyetini her zaman minimuma indirmez.'],
    }
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
    const monthlyDebtBudget = await estimateDebtBudget(userId)
    if (availableCash === undefined && monthlyDebtBudget > 0) {
        totalAvailable = monthlyDebtBudget
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
        case 'CASHFLOW':
            prioritized = applyCashflowStrategy(items, totalAvailable)
            break
        case 'RISK':
            prioritized = applyRiskStrategy(items, totalAvailable)
            break
        case 'GOAL':
            prioritized = await applyGoalStrategy(userId, items, totalAvailable)
            break
        default:
            prioritized = applySafeStrategy(items, totalAvailable)
    }

    const riskLevel =
        totalAvailable < totalMinPayment * 0.5 ? 'CRITICAL' :
        totalAvailable < totalMinPayment ? 'HIGH' :
        totalAvailable < totalMinPayment * 2 ? 'MEDIUM' : 'LOW'

    const metrics = estimatePlanMetrics(items, totalAvailable, strategy)
    const narrative = strategyNarrative(strategy)

    return {
        strategy,
        items: prioritized,
        totalMinPayment: +totalMinPayment.toFixed(2),
        totalAvailable: +totalAvailable.toFixed(2),
        surplus: +(totalAvailable - totalMinPayment).toFixed(2),
        riskLevel,
        warnings,
        monthlyDebtBudget: +monthlyDebtBudget.toFixed(2),
        ...metrics,
        ...narrative,
    }
}
