import { prisma } from '@/lib/prisma'
import { endOfMonth, startOfMonth } from 'date-fns'
import { EXCLUDE_OGZIE_FORECAST as EXCLUDE_FORECAST } from '@/lib/ogzie-forecast-filter'

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
        where: { userId, date: { gte: startDate }, ...EXCLUDE_FORECAST },
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
        where: { userId, amount: { lt: 0 }, date: { gte: thirtyDaysAgo }, ...EXCLUDE_FORECAST },
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

/**
 * Son N gün için kategori bazlı toplam (top 10).
 * Pie/bar chart için optimize.
 */
export async function getCategoryBreakdown(userId: string, days = 30) {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const entries = await prisma.ledgerEntry.findMany({
        where: { userId, amount: { lt: 0 }, date: { gte: since }, ...EXCLUDE_FORECAST },
        select: { category: true, amount: true },
    })

    const byCategory = new Map<string, number>()
    for (const e of entries) {
        const cat = e.category?.trim() || 'Kategorisiz'
        byCategory.set(cat, (byCategory.get(cat) ?? 0) + Math.abs(e.amount))
    }

    return Array.from(byCategory.entries())
        .map(([category, amount]) => ({ category, amount: +amount.toFixed(2) }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
}

/**
 * Son 90 gün günlük gelir/gider toplamları — heatmap + günlük trend.
 */
export async function getDailyCashflow(userId: string, days = 90) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const entries = await prisma.ledgerEntry.findMany({
        where: { userId, date: { gte: since }, ...EXCLUDE_FORECAST },
        select: { date: true, amount: true },
        orderBy: { date: 'asc' },
    })

    const buckets = new Map<string, { income: number; expense: number }>()
    for (const e of entries) {
        const day = e.date.toISOString().slice(0, 10) // YYYY-MM-DD
        if (!buckets.has(day)) buckets.set(day, { income: 0, expense: 0 })
        const b = buckets.get(day)!
        if (e.amount > 0) b.income += e.amount
        else b.expense += Math.abs(e.amount)
    }

    return Array.from(buckets.entries())
        .map(([date, v]) => ({
            date,
            income: +v.income.toFixed(2),
            expense: +v.expense.toFixed(2),
            net: +(v.income - v.expense).toFixed(2),
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Bu ay vs geçen ay karşılaştırması — yüzdesel değişim.
 */
export async function getPeriodComparison(userId: string) {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    async function sumPeriod(start: Date, end: Date) {
        const entries = await prisma.ledgerEntry.findMany({
            where: { userId, date: { gte: start, lte: end }, ...EXCLUDE_FORECAST },
            select: { amount: true, type: true },
        })
        const income = entries.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0)
        const expense = entries.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0)
        const txCount = entries.length
        return {
            income: +income.toFixed(2),
            expense: +expense.toFixed(2),
            net: +(income - expense).toFixed(2),
            txCount,
        }
    }

    const [thisMonth, lastMonth] = await Promise.all([
        sumPeriod(thisMonthStart, now),
        sumPeriod(lastMonthStart, lastMonthEnd),
    ])

    function pctChange(curr: number, prev: number): number {
        if (prev === 0) return curr > 0 ? 100 : 0
        return +(((curr - prev) / Math.abs(prev)) * 100).toFixed(1)
    }

    return {
        thisMonth,
        lastMonth,
        change: {
            income: pctChange(thisMonth.income, lastMonth.income),
            expense: pctChange(thisMonth.expense, lastMonth.expense),
            net: pctChange(thisMonth.net, lastMonth.net),
            txCount: pctChange(thisMonth.txCount, lastMonth.txCount),
        },
    }
}

/**
 * En yoğun harcama/gelir günleri — top 5 her biri.
 */
export async function getTopDays(userId: string, days = 60) {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const entries = await prisma.ledgerEntry.findMany({
        where: { userId, date: { gte: since }, ...EXCLUDE_FORECAST },
        select: { date: true, amount: true, description: true, type: true },
    })

    const dayMap = new Map<string, { income: number; expense: number; topTx?: { desc: string; amount: number } }>()
    for (const e of entries) {
        const day = e.date.toISOString().slice(0, 10)
        if (!dayMap.has(day)) dayMap.set(day, { income: 0, expense: 0 })
        const d = dayMap.get(day)!
        if (e.amount > 0) d.income += e.amount
        else d.expense += Math.abs(e.amount)
    }

    const all = Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v }))
    return {
        topIncomeDays: all.filter(d => d.income > 0).sort((a, b) => b.income - a.income).slice(0, 5),
        topExpenseDays: all.filter(d => d.expense > 0).sort((a, b) => b.expense - a.expense).slice(0, 5),
    }
}

/**
 * İşlem türlerinin yüzdesel dağılımı — donut için.
 */
export async function getTransactionTypeMix(userId: string, days = 30) {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const entries = await prisma.ledgerEntry.findMany({
        where: { userId, date: { gte: since }, ...EXCLUDE_FORECAST },
        select: { type: true, amount: true },
    })

    const byType = new Map<string, number>()
    for (const e of entries) {
        byType.set(e.type, (byType.get(e.type) ?? 0) + Math.abs(e.amount))
    }
    const total = Array.from(byType.values()).reduce((s, n) => s + n, 0)

    return Array.from(byType.entries())
        .map(([type, amount]) => ({
            type,
            amount: +amount.toFixed(2),
            percent: total > 0 ? +((amount / total) * 100).toFixed(1) : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
}

export async function getProfessionalReportDashboard(userId: string, date = new Date()) {
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)

    const [
        ledger,
        receivables,
        payables,
        cardPayments,
        interestAccruals,
        manualInterest,
        cards,
        installments,
        people,
        marketRates,
    ] = await Promise.all([
        prisma.ledgerEntry.findMany({
            where: { userId, date: { gte: monthStart, lte: monthEnd }, ...EXCLUDE_FORECAST },
            select: { type: true, amount: true, category: true, date: true, accountId: true, creditCardId: true },
        }),
        prisma.receivablePayable.findMany({
            where: { userId, type: 'RECEIVABLE', status: { not: 'CLOSED' } },
            include: { person: { select: { name: true } }, installments: true },
        }),
        prisma.receivablePayable.findMany({
            where: { userId, type: 'PAYABLE', status: { not: 'CLOSED' } },
            include: { person: { select: { name: true } }, installments: true },
        }),
        prisma.cardPayment.findMany({
            where: { creditCard: { userId }, paymentDate: { gte: monthStart, lte: monthEnd } },
            select: { amount: true },
        }),
        prisma.interestAccrual.findMany({
            where: { creditCard: { userId }, calculatedAt: { gte: monthStart, lte: monthEnd } },
            select: { totalCost: true, type: true, calculatedAt: true },
        }),
        prisma.creditCardInterestRecord.findMany({
            where: { card: { userId }, createdAt: { gte: monthStart, lte: monthEnd } },
            select: { amount: true, interestType: true, createdAt: true },
        }),
        prisma.creditCard.findMany({
            where: { userId, status: { not: 'CLOSED' } },
            include: {
                transactions: { select: { type: true, amount: true } },
                payments: { select: { amount: true } },
                statements: { orderBy: { statementDate: 'desc' }, take: 1 },
            },
        }),
        prisma.rPInstallment.findMany({
            where: { receivablePayable: { userId }, status: { in: ['PENDING', 'PARTIAL_PAID', 'OVERDUE'] } },
            include: { receivablePayable: { include: { person: { select: { name: true } } } } },
            orderBy: { dueDate: 'asc' },
        }),
        prisma.person.findMany({
            where: { userId, isActive: true },
            include: { receivablesPayables: { where: { status: { not: 'CLOSED' } } } },
            orderBy: { name: 'asc' },
        }),
        prisma.marketRate.findMany({
            where: { userId },
            orderBy: [{ rateDate: 'desc' }, { createdAt: 'desc' }],
            take: 20,
        }),
    ])

    const income = ledger.filter((entry) => entry.amount > 0 && entry.type === 'INCOME').reduce((sum, entry) => sum + entry.amount, 0)
    const expense = ledger.filter((entry) => entry.amount < 0 && entry.type === 'EXPENSE').reduce((sum, entry) => sum + Math.abs(entry.amount), 0)
    const collections = ledger.filter((entry) => entry.type === 'COLLECTION').reduce((sum, entry) => sum + Math.max(entry.amount, 0), 0)
    const debtPayments = ledger
        .filter((entry) => ['PAYMENT_TO_PERSON', 'DEBT_PAYMENT'].includes(entry.type))
        .reduce((sum, entry) => sum + Math.abs(entry.amount), 0)
    const cardPaymentTotal = cardPayments.reduce((sum, payment) => sum + payment.amount, 0)
    const interestTotal = interestAccruals.reduce((sum, item) => sum + item.totalCost, 0) + manualInterest.reduce((sum, item) => sum + item.amount, 0)
    const upcoming = installments.filter((item) => item.dueDate >= monthStart && item.dueDate <= monthEnd)
    const overdue = installments.filter((item) => item.status === 'OVERDUE' || item.dueDate < new Date())

    return {
        month: monthStart.toISOString(),
        kpis: {
            income: +income.toFixed(2),
            expense: +expense.toFixed(2),
            collections: +collections.toFixed(2),
            debtPayments: +debtPayments.toFixed(2),
            cardPayments: +cardPaymentTotal.toFixed(2),
            interestPaid: +interestTotal.toFixed(2),
            kmhCost: 0,
            netCashFlow: +(income + collections - expense - debtPayments - cardPaymentTotal - interestTotal).toFixed(2),
            overdueCount: overdue.length,
            upcomingCount: upcoming.length,
        },
        receivables: receivables.map((item) => ({
            id: item.id,
            person: item.person.name,
            title: item.title ?? item.description,
            remaining: item.remainingAmount,
            overdueInstallments: item.installments.filter((installment) => installment.status === 'OVERDUE').length,
        })),
        payables: payables.map((item) => ({
            id: item.id,
            person: item.person.name,
            title: item.title ?? item.description,
            remaining: item.remainingAmount,
            overdueInstallments: item.installments.filter((installment) => installment.status === 'OVERDUE').length,
        })),
        cards: cards.map((card) => {
            const charges = card.transactions.filter((tx) => tx.type !== 'REFUND').reduce((sum, tx) => sum + tx.amount, 0)
            const refunds = card.transactions.filter((tx) => tx.type === 'REFUND').reduce((sum, tx) => sum + tx.amount, 0)
            const payments = card.payments.reduce((sum, payment) => sum + payment.amount, 0)
            const currentDebt = card.currentDebt && card.currentDebt > 0 ? card.currentDebt : Math.max(charges - refunds - payments, 0)
            return {
                id: card.id,
                name: card.cardName,
                bankName: card.bankName,
                currentDebt,
                utilization: card.totalLimit > 0 ? +(currentDebt / card.totalLimit * 100).toFixed(1) : 0,
                minimumPayment: card.statements[0]?.minimumPayment ?? Math.max(currentDebt * card.minPaymentRate, 0),
                dueDate: card.dueDate?.toISOString() ?? card.statements[0]?.dueDate.toISOString() ?? null,
            }
        }),
        people: people.map((person) => {
            const receivable = person.receivablesPayables.filter((item) => item.type === 'RECEIVABLE').reduce((sum, item) => sum + item.remainingAmount, 0)
            const payable = person.receivablesPayables.filter((item) => item.type === 'PAYABLE').reduce((sum, item) => sum + item.remainingAmount, 0)
            return {
                id: person.id,
                name: person.name,
                receivable,
                payable,
                net: receivable - payable,
            }
        }).sort((a, b) => Math.abs(b.net) - Math.abs(a.net)),
        marketRates: marketRates.map((rate) => ({
            id: rate.id,
            code: rate.currencyCode,
            buyRate: rate.buyRate,
            sellRate: rate.sellRate,
            rateDate: rate.rateDate.toISOString(),
            createdAt: rate.createdAt.toISOString(),
        })),
    }
}
