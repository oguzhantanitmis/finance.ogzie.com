import { prisma } from '@/lib/prisma'
import { endOfMonth, startOfMonth } from 'date-fns'

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
            where: { userId, date: { gte: monthStart, lte: monthEnd } },
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
