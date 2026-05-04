import { BillingCycle, RecordStatus } from '@prisma/client'
import { endOfMonth, isWithinInterval, startOfMonth } from 'date-fns'

import { calculateAccumulatedInterest } from '@/lib/banking-engine'
import { getCardFinancialSnapshot } from '@/lib/card-balance'
import { prisma } from '@/lib/prisma'

const ACTIVE_RECORD_STATUSES = [RecordStatus.ACTIVE, RecordStatus.PAUSED]

export interface HealthScoreResult {
    score: number
    level: string
    isReady: boolean
    breakdown: {
        creditUtilization: { score: number; weight: number; detail: string }
        debtToIncomeRatio: { score: number; weight: number; detail: string }
        minPaymentDependency: { score: number; weight: number; detail: string }
        overduePayments: { score: number; weight: number; detail: string }
        fixedExpenseRatio: { score: number; weight: number; detail: string }
        monthlyCashSurplus: { score: number; weight: number; detail: string }
    }
    improvements: string[]
    trend: 'improving' | 'declining' | 'stable'
}

function createEmptyHealthScore(message: string): HealthScoreResult {
    return {
        score: 0,
        level: 'MODERATE',
        isReady: false,
        breakdown: {
            creditUtilization: { score: 0, weight: 20, detail: 'Veri yok' },
            debtToIncomeRatio: { score: 0, weight: 25, detail: 'Veri yok' },
            minPaymentDependency: { score: 0, weight: 15, detail: 'Veri yok' },
            overduePayments: { score: 0, weight: 15, detail: 'Veri yok' },
            fixedExpenseRatio: { score: 0, weight: 10, detail: 'Veri yok' },
            monthlyCashSurplus: { score: 0, weight: 15, detail: 'Veri yok' },
        },
        improvements: [message],
        trend: 'stable',
    }
}

function normalizeMonthlyAmount(amount: number, billingCycle: BillingCycle) {
    return billingCycle === BillingCycle.YEARLY ? amount / 12 : amount
}

function scoreByThresholds(value: number, thresholds: Array<{ max: number; score: number }>, fallback: number) {
    for (const threshold of thresholds) {
        if (value <= threshold.max) {
            return threshold.score
        }
    }

    return fallback
}

function estimateDebtMonthlyLoad(
    debt: {
        remainingBalance: number
        type: string
        remainingInstallments: number | null
        installments: number | null
        minPaymentRate: number
        interestRate: number
        paymentDueDay: number | null
        dueDate: Date | null
        paymentPlan: Array<{ amount: number; dueDate: Date; isPaid: boolean }>
    },
    monthStart: Date,
    monthEnd: Date,
) {
    const thisMonthInstallments = debt.paymentPlan.filter((plan) =>
        !plan.isPaid && isWithinInterval(plan.dueDate, { start: monthStart, end: monthEnd }),
    )

    if (thisMonthInstallments.length > 0) {
        return thisMonthInstallments.reduce((sum, item) => sum + item.amount, 0)
    }

    if (debt.type === 'LOAN') {
        const remainingInstallments = debt.remainingInstallments ?? debt.installments ?? 0
        if (remainingInstallments > 0) {
            return debt.remainingBalance / remainingInstallments
        }
    }

    if (debt.type === 'KMH') {
        return calculateAccumulatedInterest(debt.remainingBalance, debt.interestRate, 30).total
    }

    if (debt.type === 'CREDIT_CARD') {
        const safeRate = Math.max(debt.minPaymentRate || 0.2, 0.2)
        return debt.remainingBalance * safeRate
    }

    if (debt.dueDate && debt.dueDate <= monthEnd) {
        return debt.remainingBalance
    }

    if (debt.paymentDueDay) {
        const safeRate = Math.max(debt.minPaymentRate || 0.1, 0.1)
        return debt.remainingBalance * safeRate
    }

    return 0
}

function getLevelFromScore(score: number) {
    if (score >= 80) return 'EXCELLENT'
    if (score >= 60) return 'GOOD'
    if (score >= 40) return 'MODERATE'
    if (score >= 20) return 'HIGH'
    return 'CRITICAL'
}

export async function calculateHealthScore(userId: string): Promise<HealthScoreResult> {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    const [cards, incomes, subscriptions, recurring, accounts, payables, debts, snapshots] = await Promise.all([
        prisma.creditCard.findMany({
            where: { userId, status: 'ACTIVE' },
            include: {
                transactions: { select: { type: true, amount: true } },
                payments: { select: { amount: true } },
                statements: {
                    orderBy: { periodEnd: 'desc' },
                    take: 1,
                    select: {
                        statementBalance: true,
                        minimumPayment: true,
                        dueDate: true,
                        paymentsReceived: true,
                        status: true,
                    },
                },
            },
        }),
        prisma.incomeSource.findMany({
            where: { userId, status: { in: ACTIVE_RECORD_STATUSES } },
            select: { amount: true, billingCycle: true },
        }),
        prisma.subscription.findMany({
            where: { userId, isActive: true, status: { in: ACTIVE_RECORD_STATUSES } },
            select: { amount: true, monthlyNormalizedAmount: true, billingCycle: true, nextPayment: true },
        }),
        prisma.recurringExpense.findMany({
            where: { userId, status: { in: ACTIVE_RECORD_STATUSES } },
            select: { amount: true, billingCycle: true, nextPayment: true },
        }),
        prisma.account.findMany({
            where: { userId, isActive: true },
            select: { balance: true, hasKmh: true, kmhInterestRate: true },
        }),
        prisma.receivablePayable.findMany({
            where: {
                userId,
                type: 'PAYABLE',
                status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] },
            },
            select: { remainingAmount: true, dueDate: true, status: true },
        }),
        prisma.debt.findMany({
            where: { userId },
            select: {
                remainingBalance: true,
                type: true,
                remainingInstallments: true,
                installments: true,
                minPaymentRate: true,
                interestRate: true,
                paymentDueDay: true,
                dueDate: true,
                paymentPlan: {
                    where: { isPaid: false },
                    select: { amount: true, dueDate: true, isPaid: true },
                },
            },
        }),
        prisma.healthSnapshot.findMany({
            where: { userId },
            orderBy: { calculatedAt: 'desc' },
            take: 2,
            select: { score: true },
        }),
    ])

    const cardSnapshots = cards.map((card) => getCardFinancialSnapshot(card, now))
    const monthlyIncome = incomes.reduce((sum, income) => sum + normalizeMonthlyAmount(income.amount, income.billingCycle), 0)
    const subscriptionLoad = subscriptions.reduce(
        (sum, subscription) => sum + (subscription.monthlyNormalizedAmount ?? normalizeMonthlyAmount(subscription.amount, subscription.billingCycle)),
        0,
    )
    const recurringLoad = recurring.reduce((sum, expense) => sum + normalizeMonthlyAmount(expense.amount, expense.billingCycle), 0)
    const fixedExpense = subscriptionLoad + recurringLoad

    const liquidReserve = accounts.reduce((sum, account) => sum + Math.max(account.balance, 0), 0)
    const kmhUsage = accounts
        .filter((account) => account.hasKmh)
        .reduce((sum, account) => sum + Math.max(account.balance * -1, 0), 0)
    const kmhMonthlyCost = accounts
        .filter((account) => account.hasKmh)
        .reduce((sum, account) => {
            const usage = Math.max(account.balance * -1, 0)
            if (usage <= 0) return sum
            return sum + calculateAccumulatedInterest(usage, account.kmhInterestRate ?? 4.25, 30).total
        }, 0)

    const totalCardDebt = cardSnapshots.reduce((sum, snapshot) => sum + snapshot.currentDebt, 0)
    const totalCardLimit = cards.reduce((sum, card) => sum + card.totalLimit, 0)
    const totalCardMinimumDue = cardSnapshots.reduce((sum, snapshot) => sum + snapshot.minimumPayment, 0)
    const manualDebtBalance = debts.reduce((sum, debt) => sum + debt.remainingBalance, 0)
    const personalPayableBalance = payables.reduce((sum, payable) => sum + payable.remainingAmount, 0)
    const totalDebtBalance = totalCardDebt + manualDebtBalance + personalPayableBalance + kmhUsage

    const manualDebtMonthlyLoad = debts.reduce(
        (sum, debt) => sum + estimateDebtMonthlyLoad(debt, monthStart, monthEnd),
        0,
    )
    const personalDebtMonthlyLoad = payables.reduce((sum, payable) => {
        if (payable.dueDate && payable.dueDate <= monthEnd) {
            return sum + payable.remainingAmount
        }

        return sum
    }, 0)
    const monthlyDebtLoad = totalCardMinimumDue + manualDebtMonthlyLoad + personalDebtMonthlyLoad + kmhMonthlyCost

    const overdueCards = cardSnapshots.filter((snapshot) => snapshot.isOverdue).length
    const overdueDebts = debts.reduce((sum, debt) => {
        const overdueInstallments = debt.paymentPlan.filter((plan) => !plan.isPaid && plan.dueDate < now).length
        if (overdueInstallments > 0) return sum + overdueInstallments
        if (debt.dueDate && debt.dueDate < now && debt.remainingBalance > 0) return sum + 1
        return sum
    }, 0)
    const overduePayables = payables.filter((payable) => payable.status === 'OVERDUE' || (payable.dueDate && payable.dueDate < now)).length
    const overdueRecurring = recurring.filter((expense) => expense.nextPayment < now).length
    const overdueSubscriptions = subscriptions.filter((subscription) => subscription.nextPayment < now).length
    const overdueCount = overdueCards + overdueDebts + overduePayables + overdueRecurring + overdueSubscriptions

    const hasMeaningfulData =
        monthlyIncome > 0 ||
        fixedExpense > 0 ||
        totalDebtBalance > 0 ||
        liquidReserve > 0 ||
        cards.length > 0

    if (!hasMeaningfulData) {
        return createEmptyHealthScore('Sağlık puanı için önce gelir, hesap, kart, borç veya gider verisi ekleyin.')
    }

    const utilization = totalCardLimit > 0 ? (totalCardDebt / totalCardLimit) * 100 : (totalCardDebt > 0 ? 100 : 0)
    const debtRatio = monthlyIncome > 0 ? (totalDebtBalance / monthlyIncome) * 100 : (totalDebtBalance > 0 ? 999 : 0)
    const minDependencyRatio = monthlyDebtLoad > 0 ? (totalCardMinimumDue / monthlyDebtLoad) * 100 : 0
    const fixedExpenseRatio = monthlyIncome > 0 ? (fixedExpense / monthlyIncome) * 100 : (fixedExpense > 0 ? 100 : 0)
    const monthlyCashSurplus = monthlyIncome - fixedExpense - monthlyDebtLoad
    const surplusRatio = monthlyIncome > 0 ? (monthlyCashSurplus / monthlyIncome) * 100 : (monthlyCashSurplus >= 0 ? 0 : -100)

    const cuScore = scoreByThresholds(utilization, [
        { max: 30, score: 100 },
        { max: 50, score: 70 },
        { max: 80, score: 40 },
    ], 10)

    const drScore = scoreByThresholds(debtRatio, [
        { max: 50, score: 100 },
        { max: 100, score: 70 },
        { max: 200, score: 40 },
    ], 10)

    const mpScore = monthlyDebtLoad === 0
        ? 100
        : scoreByThresholds(minDependencyRatio, [
            { max: 30, score: 100 },
            { max: 55, score: 70 },
            { max: 80, score: 40 },
        ], 10)

    const odScore = overdueCount === 0
        ? 100
        : overdueCount <= 2
            ? 60
            : overdueCount <= 5
                ? 30
                : 10

    const feScore = scoreByThresholds(fixedExpenseRatio, [
        { max: 40, score: 100 },
        { max: 60, score: 60 },
        { max: 75, score: 30 },
    ], 10)

    let csScore = surplusRatio >= 20
        ? 100
        : surplusRatio >= 10
            ? 70
            : surplusRatio >= 0
                ? 40
                : 10

    if (monthlyDebtLoad > 0 && liquidReserve < monthlyDebtLoad) {
        csScore = Math.max(10, csScore - 20)
    }

    const score = Math.round(
        cuScore * 0.20 +
        drScore * 0.25 +
        mpScore * 0.15 +
        odScore * 0.15 +
        feScore * 0.10 +
        csScore * 0.15,
    )

    const improvements: string[] = []
    if (cuScore < 70) improvements.push('Kart kullanım oranını düşür. Mümkünse toplam limit kullanımını %30 bandına çek.')
    if (drScore < 70) improvements.push('Toplam borç yükün gelire göre yüksek. Kredi, KMH ve şahsi borç tarafında azaltım planı çıkar.')
    if (mpScore < 70) improvements.push('Aylık borç yükünün büyük kısmı kart minimumlarından oluşuyor. Minimum yerine anapara azaltan ödeme planı kur.')
    if (odScore < 100) improvements.push(`${overdueCount} gecikmiş yük görünüyor. Önce gecikmiş borçları kapat.`)
    if (feScore < 70) improvements.push('Sabit gider yükü yüksek. Abonelik ve düzenli giderleri tekrar sadeleştir.')
    if (csScore < 70) improvements.push('Aylık nakit fazlası zayıf. Geliri artır veya bu ayın zorunlu yükünü azalt.')
    if (monthlyDebtLoad > 0 && liquidReserve < monthlyDebtLoad) improvements.push('Likidite tamponun bu ayki borç yükünü karşılamıyor. Hesap bakiyesi tamponu oluştur.')
    if (improvements.length === 0) improvements.push('Sağlık puanı dengeli. Bir sonraki hedef likidite tamponunu büyütmek olabilir.')

    const previousScore = snapshots[1]?.score ?? score
    const trend = score > previousScore ? 'improving' : score < previousScore ? 'declining' : 'stable'

    return {
        score,
        level: getLevelFromScore(score),
        isReady: true,
        breakdown: {
            creditUtilization: { score: cuScore, weight: 20, detail: `Güncel kart kullanım %${utilization.toFixed(0)}` },
            debtToIncomeRatio: { score: drScore, weight: 25, detail: `Toplam borç / aylık gelir %${debtRatio.toFixed(0)}` },
            minPaymentDependency: { score: mpScore, weight: 15, detail: `Kart minimumlarının borç yükündeki payı %${minDependencyRatio.toFixed(0)}` },
            overduePayments: { score: odScore, weight: 15, detail: `${overdueCount} gecikmiş yük` },
            fixedExpenseRatio: { score: feScore, weight: 10, detail: `Sabit gider / gelir %${fixedExpenseRatio.toFixed(0)}` },
            monthlyCashSurplus: { score: csScore, weight: 15, detail: `Aylık denge ${monthlyCashSurplus.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}` },
        },
        improvements: improvements.slice(0, 4),
        trend,
    }
}

export async function saveHealthSnapshot(userId: string, result: HealthScoreResult) {
    if (!result.isReady) {
        return
    }

    const [accounts, debts, cards, payables] = await Promise.all([
        prisma.account.findMany({
            where: { userId, isActive: true },
            select: { balance: true, hasKmh: true },
        }),
        prisma.debt.findMany({ where: { userId }, select: { remainingBalance: true } }),
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
        prisma.receivablePayable.findMany({
            where: { userId, type: 'PAYABLE', status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] } },
            select: { remainingAmount: true },
        }),
    ])

    const totalAssets = accounts.reduce((sum, account) => sum + Math.max(account.balance, 0), 0)
    const kmhUsage = accounts
        .filter((account) => account.hasKmh)
        .reduce((sum, account) => sum + Math.max(account.balance * -1, 0), 0)
    const totalDebts =
        debts.reduce((sum, debt) => sum + debt.remainingBalance, 0) +
        cards.reduce((sum, card) => sum + getCardFinancialSnapshot(card).currentDebt, 0) +
        payables.reduce((sum, payable) => sum + payable.remainingAmount, 0) +
        kmhUsage

    await prisma.healthSnapshot.create({
        data: {
            userId,
            score: result.score,
            level: result.level,
            totalAssets,
            totalDebts,
            netWorth: totalAssets - totalDebts,
            liquidityRatio: totalDebts > 0 ? totalAssets / totalDebts : 99,
            leverageRatio: totalAssets > 0 ? totalDebts / totalAssets : (totalDebts > 0 ? 99 : 0),
            improvementTips: result.improvements,
            breakdown: result.breakdown as object,
        },
    })
}
