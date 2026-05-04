import { prisma } from '@/lib/prisma'
import { getAvailableCash } from '@/lib/account-service'

// ============================================================
// Types
// ============================================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface SimulationResult {
    currentState: { cash: number; totalDebt: number; monthlyExpense: number }
    projectedState: { cash: number; totalDebt: number; monthlyExpense: number }
    cashImpact: number
    debtImpact: number
    recommendation: string
    riskLevel: RiskLevel
    projections?: MonthlyProjection[]
}

export interface MonthlyProjection {
    month: string
    cash: number
    debt: number
    netChange: number
}

// ============================================================
// Risk Assessment
// ============================================================

function assessRisk(cashAfter: number, debtAfter: number, monthlyIncome: number): RiskLevel {
    if (cashAfter < 0) return 'CRITICAL'
    if (monthlyIncome > 0 && debtAfter / monthlyIncome > 6) return 'CRITICAL'
    if (monthlyIncome > 0 && debtAfter / monthlyIncome > 3) return 'HIGH'
    if (cashAfter < monthlyIncome * 0.5) return 'MEDIUM'
    return 'LOW'
}

function getMonthName(offset: number): string {
    const date = new Date()
    date.setMonth(date.getMonth() + offset)
    return date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
}

// ============================================================
// Scenario 1: Cancel Subscriptions
// ============================================================

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
    const incomes = await prisma.incomeSource.findMany({ where: { userId }, select: { amount: true, billingCycle: true } })
    const monthlyIncome = incomes.reduce((s, i) => s + (i.billingCycle === 'YEARLY' ? i.amount / 12 : i.amount), 0)

    // 3 aylık projeksiyon
    const projections: MonthlyProjection[] = []
    let projectedCash = cash
    for (let i = 1; i <= 3; i++) {
        projectedCash += monthlySavings
        projections.push({
            month: getMonthName(i),
            cash: Math.round(projectedCash * 100) / 100,
            debt: 0,
            netChange: monthlySavings,
        })
    }

    return {
        currentState: { cash, totalDebt: 0, monthlyExpense: monthlySavings },
        projectedState: { cash: cash + monthlySavings, totalDebt: 0, monthlyExpense: 0 },
        cashImpact: monthlySavings,
        debtImpact: 0,
        recommendation: `${subs.length} abonelik iptal edilirse aylık ${monthlySavings.toFixed(2)} TL, yıllık ${(monthlySavings * 12).toFixed(2)} TL tasarruf sağlanır.`,
        riskLevel: 'LOW',
        projections,
    }
}

// ============================================================
// Scenario 2: Extra Debt Payment
// ============================================================

export async function simulateExtraPayment(
    userId: string,
    debtId: string,
    extraAmount: number
): Promise<SimulationResult> {
    const debt = await prisma.debt.findUniqueOrThrow({ where: { id: debtId } })
    const cash = await getAvailableCash(userId)
    const incomes = await prisma.incomeSource.findMany({ where: { userId }, select: { amount: true, billingCycle: true } })
    const monthlyIncome = incomes.reduce((s, i) => s + (i.billingCycle === 'YEARLY' ? i.amount / 12 : i.amount), 0)
    const newBalance = Math.max(0, debt.remainingBalance - extraAmount)
    const cashAfter = cash - extraAmount

    return {
        currentState: { cash, totalDebt: debt.remainingBalance, monthlyExpense: 0 },
        projectedState: { cash: cashAfter, totalDebt: newBalance, monthlyExpense: 0 },
        cashImpact: -extraAmount,
        debtImpact: -(debt.remainingBalance - newBalance),
        recommendation: newBalance === 0
            ? `${debt.name} tamamen kapatılır! Nakit ${cashAfter.toFixed(2)} TL'ye düşer.`
            : `${debt.name} borcu ${newBalance.toFixed(2)} TL'ye düşer.`,
        riskLevel: assessRisk(cashAfter, newBalance, monthlyIncome),
    }
}

// ============================================================
// Scenario 3: Income Change
// ============================================================

export async function simulateIncomeChange(
    userId: string,
    newMonthlyIncome: number
): Promise<SimulationResult> {
    const incomes = await prisma.incomeSource.findMany({ where: { userId }, select: { amount: true, billingCycle: true } })
    const currentIncome = incomes.reduce((s, i) => s + (i.billingCycle === 'YEARLY' ? i.amount / 12 : i.amount), 0)
    const cash = await getAvailableCash(userId)
    const diff = newMonthlyIncome - currentIncome

    // 3 aylık projeksiyon
    const projections: MonthlyProjection[] = []
    let projectedCash = cash
    for (let i = 1; i <= 3; i++) {
        projectedCash += diff
        projections.push({
            month: getMonthName(i),
            cash: Math.round(projectedCash * 100) / 100,
            debt: 0,
            netChange: diff,
        })
    }

    return {
        currentState: { cash, totalDebt: 0, monthlyExpense: currentIncome },
        projectedState: { cash: cash + diff, totalDebt: 0, monthlyExpense: newMonthlyIncome },
        cashImpact: diff,
        debtImpact: 0,
        recommendation: diff > 0
            ? `Gelir artışı aylık ${diff.toFixed(2)} TL fazla nakit sağlar. 3 ayda ${(diff * 3).toFixed(2)} TL birikir.`
            : `Gelir düşüşü aylık ${Math.abs(diff).toFixed(2)} TL eksik nakit yaratır.`,
        riskLevel: diff < 0 && Math.abs(diff) > currentIncome * 0.3 ? 'HIGH' : diff < 0 ? 'MEDIUM' : 'LOW',
        projections,
    }
}

// ============================================================
// Scenario 4: Card Payment Change (YENİ)
// ============================================================

export async function simulateCardPaymentChange(
    userId: string,
    cardId: string,
    paymentAmount: number
): Promise<SimulationResult> {
    const card = await prisma.creditCard.findUniqueOrThrow({
        where: { id: cardId },
        include: { statements: { orderBy: { periodEnd: 'desc' }, take: 1 } },
    })

    const currentDebt = card.statements[0]?.statementBalance ?? 0
    const minimumPayment = card.statements[0]?.minimumPayment ?? 0
    const cash = await getAvailableCash(userId)
    const incomes = await prisma.incomeSource.findMany({ where: { userId }, select: { amount: true, billingCycle: true } })
    const monthlyIncome = incomes.reduce((s, i) => s + (i.billingCycle === 'YEARLY' ? i.amount / 12 : i.amount), 0)

    const newDebt = Math.max(0, currentDebt - paymentAmount)
    const cashAfter = cash - paymentAmount

    // 3 aylık projeksiyon (basit faiz modeli)
    const monthlyRate = card.contractualRate / 100
    const projections: MonthlyProjection[] = []
    let projDebt = newDebt
    let projCash = cashAfter

    for (let i = 1; i <= 3; i++) {
        const interest = projDebt * monthlyRate
        projDebt = projDebt + interest - (paymentAmount > currentDebt ? 0 : paymentAmount)
        projDebt = Math.max(0, projDebt)
        projCash -= paymentAmount > currentDebt ? 0 : paymentAmount

        projections.push({
            month: getMonthName(i),
            cash: Math.round(projCash * 100) / 100,
            debt: Math.round(projDebt * 100) / 100,
            netChange: -(interest + paymentAmount),
        })
    }

    let recommendation: string
    if (paymentAmount >= currentDebt) {
        recommendation = `${card.cardName} kartı tamamen ödenir! Nakit ${cashAfter.toFixed(2)} TL'ye düşer.`
    } else if (paymentAmount <= minimumPayment) {
        recommendation = `⚠️ Sadece asgari ödeme yapılıyor. 3 ay sonra borç ${projections[2]?.debt.toFixed(2) ?? newDebt.toFixed(2)} TL olur (faiz etkisi).`
    } else {
        recommendation = `${card.cardName} borcu ${newDebt.toFixed(2)} TL'ye düşer. Asgari (${minimumPayment.toFixed(2)} TL) üzeri ödeme yaparak faiz yükünü azaltıyorsunuz.`
    }

    return {
        currentState: { cash, totalDebt: currentDebt, monthlyExpense: minimumPayment },
        projectedState: { cash: cashAfter, totalDebt: newDebt, monthlyExpense: 0 },
        cashImpact: -paymentAmount,
        debtImpact: -(currentDebt - newDebt),
        recommendation,
        riskLevel: assessRisk(cashAfter, newDebt, monthlyIncome),
        projections,
    }
}

// ============================================================
// Scenario 5: Minimum Payment Trap (YENİ)
// ============================================================

export async function simulateMinimumPaymentTrap(
    userId: string
): Promise<SimulationResult> {
    const cards = await prisma.creditCard.findMany({
        where: { userId, status: 'ACTIVE' },
        include: { statements: { orderBy: { periodEnd: 'desc' }, take: 1 } },
    })

    const cash = await getAvailableCash(userId)
    const incomes = await prisma.incomeSource.findMany({ where: { userId }, select: { amount: true, billingCycle: true } })
    const monthlyIncome = incomes.reduce((s, i) => s + (i.billingCycle === 'YEARLY' ? i.amount / 12 : i.amount), 0)

    let totalDebt = 0
    let totalMinPayment = 0
    let totalInterest3Months = 0

    const projections: MonthlyProjection[] = []
    let runningDebt = 0

    for (const card of cards) {
        const debt = card.statements[0]?.statementBalance ?? 0
        const minPay = card.statements[0]?.minimumPayment ?? 0
        totalDebt += debt
        totalMinPayment += minPay
        runningDebt += debt
    }

    // 3 aylık projeksiyon — sadece asgari ödenirse
    let projDebt = totalDebt
    for (let i = 1; i <= 3; i++) {
        let monthInterest = 0
        for (const card of cards) {
            const cardDebt = (card.statements[0]?.statementBalance ?? 0) * (projDebt / (totalDebt || 1))
            monthInterest += cardDebt * (card.contractualRate / 100)
        }
        totalInterest3Months += monthInterest
        projDebt = projDebt + monthInterest - totalMinPayment
        projDebt = Math.max(0, projDebt)

        projections.push({
            month: getMonthName(i),
            cash: Math.round((cash - totalMinPayment * i) * 100) / 100,
            debt: Math.round(projDebt * 100) / 100,
            netChange: -(totalMinPayment + monthInterest),
        })
    }

    const debtAfter3 = projections[2]?.debt ?? projDebt
    const interestPaid = Math.round(totalInterest3Months * 100) / 100

    return {
        currentState: { cash, totalDebt, monthlyExpense: totalMinPayment },
        projectedState: { cash: cash - totalMinPayment * 3, totalDebt: debtAfter3, monthlyExpense: totalMinPayment },
        cashImpact: -(totalMinPayment * 3),
        debtImpact: -(totalDebt - debtAfter3),
        recommendation: totalDebt > 0
            ? `⚠️ Sadece asgari ödeme yapılırsa 3 ayda ${interestPaid.toFixed(2)} TL faiz ödersiniz ve borç ${debtAfter3.toFixed(2)} TL'de kalır. Asgari üstü ödeme yaparak bu döngüyü kırın.`
            : 'Aktif kart borcu yok — asgari ödeme tuzağı riski bulunmuyor.',
        riskLevel: totalDebt > monthlyIncome * 2 ? 'CRITICAL' : totalDebt > monthlyIncome ? 'HIGH' : totalDebt > 0 ? 'MEDIUM' : 'LOW',
        projections,
    }
}
