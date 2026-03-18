'use server'

import { prisma } from '@/lib/prisma'

export interface HealthScoreResult {
    score: number
    level: string
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

export async function calculateHealthScore(userId: string): Promise<HealthScoreResult> {
    const [cards, incomes, subscriptions, recurring, accounts, rps, snapshots] = await Promise.all([
        prisma.creditCard.findMany({
            where: { userId, status: 'ACTIVE' },
            include: { statements: { orderBy: { periodEnd: 'desc' }, take: 1 } },
        }),
        prisma.incomeSource.findMany({ where: { userId }, select: { amount: true, billingCycle: true } }),
        prisma.subscription.findMany({ where: { userId, isActive: true }, select: { monthlyNormalizedAmount: true, amount: true } }),
        prisma.recurringExpense.findMany({ where: { userId }, select: { amount: true, billingCycle: true } }),
        prisma.account.findMany({ where: { userId, isActive: true }, select: { balance: true } }),
        prisma.receivablePayable.findMany({
            where: { userId, status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] } },
            select: { status: true, dueDate: true },
        }),
        prisma.healthSnapshot.findMany({ where: { userId }, orderBy: { calculatedAt: 'desc' }, take: 2, select: { score: true } }),
    ])

    const monthlyIncome = incomes.reduce((s, i) => s + (i.billingCycle === 'YEARLY' ? i.amount / 12 : i.amount), 0)
    const totalLimit = cards.reduce((s, c) => s + c.totalLimit, 0)
    const totalCardDebt = cards.reduce((s, c) => s + (c.statements[0]?.statementBalance ?? 0), 0)
    const totalMinPayment = cards.reduce((s, c) => s + (c.statements[0]?.minimumPayment ?? 0), 0)
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
    const subMonthly = subscriptions.reduce((s, sub) => s + (sub.monthlyNormalizedAmount ?? sub.amount), 0)
    const recMonthly = recurring.reduce((s, r) => s + (r.billingCycle === 'YEARLY' ? r.amount / 12 : r.amount), 0)
    const fixedExpense = subMonthly + recMonthly
    const overdueCount = rps.filter((r) => r.status === 'OVERDUE' || (r.dueDate && r.dueDate < new Date())).length

    // 1. Kart limit kullanımı (%20)
    const utilization = totalLimit > 0 ? (totalCardDebt / totalLimit) * 100 : 0
    const cuScore = utilization <= 30 ? 100 : utilization <= 50 ? 70 : utilization <= 80 ? 40 : 10

    // 2. Borç/gelir oranı (%25)
    const debtRatio = monthlyIncome > 0 ? (totalCardDebt / monthlyIncome) * 100 : (totalCardDebt > 0 ? 100 : 50)
    const drScore = debtRatio <= 30 ? 100 : debtRatio <= 50 ? 70 : debtRatio <= 80 ? 40 : 10

    // 3. Asgari ödeme bağımlılığı (%15)
    const mpScore = totalCardDebt === 0 ? 100 : totalMinPayment >= totalCardDebt * 0.8 ? 100 : totalMinPayment >= totalCardDebt * 0.4 ? 60 : 20

    // 4. Geciken borçlar (%15)
    const odScore = overdueCount === 0 ? 100 : overdueCount <= 2 ? 50 : 10

    // 5. Sabit gider yükü (%10)
    const feRatio = monthlyIncome > 0 ? (fixedExpense / monthlyIncome) * 100 : (fixedExpense > 0 ? 100 : 50)
    const feScore = feRatio <= 40 ? 100 : feRatio <= 60 ? 60 : feRatio <= 70 ? 30 : 10

    // 6. Aylık nakit fazlası (%15)
    const surplus = monthlyIncome - fixedExpense - totalMinPayment
    const csRatio = monthlyIncome > 0 ? (surplus / monthlyIncome) * 100 : 0
    const csScore = csRatio >= 20 ? 100 : csRatio >= 10 ? 70 : csRatio >= 0 ? 40 : 10

    const score = Math.round(cuScore * 0.20 + drScore * 0.25 + mpScore * 0.15 + odScore * 0.15 + feScore * 0.10 + csScore * 0.15)

    const level = score >= 80 ? 'EXCELLENT' : score >= 60 ? 'GOOD' : score >= 40 ? 'MODERATE' : score >= 20 ? 'HIGH' : 'CRITICAL'

    // İyileştirme önerileri
    const improvements: string[] = []
    if (cuScore < 70) improvements.push('Kart limit kullanımını %30 altına düşürmeye çalışın.')
    if (drScore < 70) improvements.push('Toplam borç/gelir oranınızı azaltın — ek gelir veya borç ödeme hızlandırın.')
    if (odScore < 100) improvements.push(`${overdueCount} gecikmiş ödemeniz var — en kısa sürede kapatın.`)
    if (feScore < 70) improvements.push('Sabit gider yükünüz yüksek — gereksiz abonelikleri iptal edin.')
    if (csScore < 70) improvements.push('Aylık nakit fazlanız düşük — harcamaları gözden geçirin.')
    if (improvements.length === 0) improvements.push('Finansal durumunuz iyi görünüyor! Tasarruf hedefi koyabilirsiniz.')

    const previousScore = snapshots[1]?.score ?? score
    const trend = score > previousScore ? 'improving' : score < previousScore ? 'declining' : 'stable'

    return {
        score,
        level,
        breakdown: {
            creditUtilization: { score: cuScore, weight: 20, detail: `Limit kullanım: %${utilization.toFixed(0)}` },
            debtToIncomeRatio: { score: drScore, weight: 25, detail: `Borç/gelir: %${debtRatio.toFixed(0)}` },
            minPaymentDependency: { score: mpScore, weight: 15, detail: `Asgari ödeme oranı` },
            overduePayments: { score: odScore, weight: 15, detail: `${overdueCount} gecikme` },
            fixedExpenseRatio: { score: feScore, weight: 10, detail: `Sabit gider: %${feRatio.toFixed(0)}` },
            monthlyCashSurplus: { score: csScore, weight: 15, detail: `Nakit fazla: %${csRatio.toFixed(0)}` },
        },
        improvements: improvements.slice(0, 3),
        trend,
    }
}

export async function saveHealthSnapshot(userId: string, result: HealthScoreResult) {
    const accounts = await prisma.account.findMany({ where: { userId, isActive: true }, select: { balance: true } })
    const debts = await prisma.debt.findMany({ where: { userId }, select: { remainingBalance: true } })
    const totalAssets = accounts.reduce((s, a) => s + a.balance, 0)
    const totalDebts = debts.reduce((s, d) => s + d.remainingBalance, 0)

    await prisma.healthSnapshot.create({
        data: {
            userId,
            score: result.score,
            level: result.level,
            totalAssets,
            totalDebts,
            netWorth: totalAssets - totalDebts,
            liquidityRatio: totalDebts > 0 ? totalAssets / totalDebts : 99,
            leverageRatio: totalAssets > 0 ? totalDebts / totalAssets : 0,
            improvementTips: result.improvements,
            breakdown: result.breakdown as object,
        },
    })
}
