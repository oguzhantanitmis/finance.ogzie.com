'use server'

import { prisma } from '@/lib/prisma'

export interface MonthlyReport {
    month: string
    income: number
    expense: number
    net: number
    byCategory: { category: string; amount: number }[]
    byType: { type: string; amount: number }[]
}

export async function getMonthlyReports(userId: string, months: number = 6): Promise<MonthlyReport[]> {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)

    const entries = await prisma.ledgerEntry.findMany({
        where: { userId, date: { gte: startDate } },
        select: { amount: true, type: true, category: true, date: true },
        orderBy: { date: 'asc' },
    })

    const monthMap = new Map<string, { income: number; expense: number; categories: Map<string, number>; types: Map<string, number> }>()

    for (const e of entries) {
        const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`
        if (!monthMap.has(key)) monthMap.set(key, { income: 0, expense: 0, categories: new Map(), types: new Map() })
        const m = monthMap.get(key)!
        if (e.amount > 0) m.income += e.amount; else m.expense += Math.abs(e.amount)
        const cat = e.category ?? 'Diğer'
        m.categories.set(cat, (m.categories.get(cat) ?? 0) + Math.abs(e.amount))
        m.types.set(e.type, (m.types.get(e.type) ?? 0) + e.amount)
    }

    return Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
            month,
            income: +data.income.toFixed(2),
            expense: +data.expense.toFixed(2),
            net: +(data.income - data.expense).toFixed(2),
            byCategory: Array.from(data.categories.entries()).map(([category, amount]) => ({ category, amount: +amount.toFixed(2) })).sort((a, b) => b.amount - a.amount),
            byType: Array.from(data.types.entries()).map(([type, amount]) => ({ type, amount: +amount.toFixed(2) })).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
        }))
}

export async function getNetWorthHistory(userId: string) {
    const snapshots = await prisma.healthSnapshot.findMany({
        where: { userId },
        orderBy: { calculatedAt: 'asc' },
        select: { calculatedAt: true, totalAssets: true, totalDebts: true, netWorth: true, score: true },
    })
    return snapshots.map((s) => ({
        date: s.calculatedAt.toISOString(),
        totalAssets: s.totalAssets,
        totalDebts: s.totalDebts,
        netWorth: s.netWorth,
        score: s.score,
    }))
}

export async function getExpenseBreakdown(userId: string) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const entries = await prisma.ledgerEntry.findMany({
        where: { userId, amount: { lt: 0 }, date: { gte: thirtyDaysAgo } },
        select: { type: true, amount: true },
    })

    const byType = new Map<string, number>()
    for (const e of entries) {
        byType.set(e.type, (byType.get(e.type) ?? 0) + Math.abs(e.amount))
    }

    return Array.from(byType.entries())
        .map(([type, amount]) => ({ type, amount: +amount.toFixed(2) }))
        .sort((a, b) => b.amount - a.amount)
}
