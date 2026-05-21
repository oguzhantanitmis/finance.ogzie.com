import { prisma } from '@/lib/prisma'
import { getTotalBalance, getAvailableCash } from '@/lib/account-service'
import { getRPSummary } from '@/lib/people-service'
import { calculateHealthScore } from '@/lib/health-score-service'
import { getMonthlyReports } from '@/lib/report-service'
import { formatCurrency } from '@/lib/utils'

type RecentLedgerEntry = {
    type: string
    amount: number
    description: string | null
    date: Date
}

type MonthlyReportForContext = Awaited<ReturnType<typeof getMonthlyReports>>[number]

type HealthSnapshotForContext = {
    score: number
    calculatedAt: Date
}

/**
 * Kullanıcının tüm finansal verisini AI'a context olarak hazırlar.
 * mode='slim': Chat/QuickAction için kısa context (~50 satır, hızlı inference)
 * mode='full': Proaktif analiz için detaylı context (tarihsel trendler dahil)
 */
export async function composeFinancialContext(userId: string, mode: 'full' | 'slim' = 'full'): Promise<string> {
    // Core queries (always needed)
    const corePromises = [
        getTotalBalance(userId),
        getAvailableCash(userId),
        getRPSummary(userId),
        calculateHealthScore(userId),
        prisma.creditCard.findMany({
            where: { userId, status: 'ACTIVE' },
            include: { statements: { orderBy: { periodEnd: 'desc' }, take: 1, select: { statementBalance: true, minimumPayment: true, dueDate: true } } },
        }),
        prisma.debtAccount.findMany({
            where: { userId, status: { not: 'CLOSED' }, currentBalance: { gt: 0 } },
            select: { name: true, currentBalance: true, interestRate: true, sourceType: true, counterpartyName: true },
        }),
        prisma.subscription.findMany({ where: { userId, isActive: true }, select: { name: true, amount: true, monthlyNormalizedAmount: true, billingCycle: true, createdAt: true } }),
        prisma.recurringExpense.findMany({ where: { userId }, select: { name: true, amount: true, billingCycle: true } }),
        prisma.incomeSource.findMany({ where: { userId }, select: { name: true, amount: true, billingCycle: true } }),
        prisma.account.findMany({ where: { userId, isActive: true }, select: { name: true, type: true, balance: true, currency: true } }),
        prisma.financialGoal.findMany({ where: { userId, status: 'GOAL_ACTIVE' }, select: { id: true, title: true, targetAmount: true, currentAmount: true, targetDate: true, createdAt: true } }),
    ] as const

    const [
        totalBalance,
        availableCash,
        rpSummary,
        healthScore,
        cards,
        debts,
        subscriptions,
        recurring,
        incomes,
        accounts,
        goals,
    ] = await Promise.all(corePromises)

    let recentLedger: RecentLedgerEntry[] = []
    let monthlyReports: MonthlyReportForContext[] = []
    let healthSnapshots: HealthSnapshotForContext[] = []

    if (mode === 'full') {
        const [ledgerEntries, reports, snapshots] = await Promise.all([
            prisma.ledgerEntry.findMany({
                where: { userId },
                orderBy: { date: 'desc' },
                take: 10,
                select: { type: true, amount: true, description: true, date: true },
            }),
            getMonthlyReports(userId, 3),
            prisma.healthSnapshot.findMany({
                where: { userId },
                orderBy: { calculatedAt: 'desc' },
                take: 3,
                select: { score: true, calculatedAt: true },
            }),
        ])

        recentLedger = ledgerEntries
        monthlyReports = reports
        healthSnapshots = snapshots
    }

    const lines: string[] = []

    // Ana finansal durum
    lines.push('=== FİNANSAL DURUM ÖZETİ ===')
    lines.push(`Toplam bakiye: ${formatCurrency(totalBalance, 'TRY')}`)
    lines.push(`Kullanılabilir nakit: ${formatCurrency(availableCash, 'TRY')}`)
    lines.push(`Toplam alacak: ${formatCurrency(rpSummary.totalReceivable, 'TRY')}`)
    lines.push(`Toplam verecek: ${formatCurrency(rpSummary.totalPayable, 'TRY')}`)
    lines.push(`Gecikmiş ödeme: ${rpSummary.overdueCount}`)
    lines.push('')

    // Sağlık skoru
    lines.push(`=== FİNANSAL SAĞLIK: ${healthScore.score}/100 (${healthScore.level}) ===`)
    if (healthSnapshots.length >= 2) {
        const prevScore = healthSnapshots[1]?.score ?? healthScore.score
        const trend = healthScore.score > prevScore ? '↑ İyileşiyor' : healthScore.score < prevScore ? '↓ Düşüyor' : '→ Sabit'
        lines.push(`Trend: ${trend} (önceki: ${prevScore}/100)`)
    }
    for (const tip of healthScore.improvements) lines.push(`  - ${tip}`)
    lines.push('')

    // TARİHSEL TRENDLER (Yeni bölüm)
    if (monthlyReports.length > 0) {
        lines.push('=== TARİHSEL TRENDLER (Son 3 Ay) ===')
        const monthNames: Record<string, string> = {
            '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan',
            '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos',
            '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık'
        }

        for (const report of monthlyReports) {
            const [year, month] = report.month.split('-')
            const monthName = monthNames[month] ?? month
            const netSign = report.net >= 0 ? '+' : ''
            const warning = report.net < 0 ? ' ⚠️' : ''
            lines.push(`  ${monthName} ${year}: Gelir ${formatCurrency(report.income, 'TRY')}, Gider ${formatCurrency(report.expense, 'TRY')}, Net ${netSign}${formatCurrency(report.net, 'TRY')}${warning}`)
        }

        // Trend analizi
        if (monthlyReports.length >= 2) {
            const latest = monthlyReports[monthlyReports.length - 1]
            const previous = monthlyReports[monthlyReports.length - 2]
            const expenseChange = ((latest.expense - previous.expense) / previous.expense * 100).toFixed(0)
            const incomeChange = ((latest.income - previous.income) / previous.income * 100).toFixed(0)

            if (Math.abs(Number(expenseChange)) > 10) {
                lines.push(`  📊 Gider trendi: ${Number(expenseChange) > 0 ? '+' : ''}${expenseChange}% değişim`)
            }
            if (Math.abs(Number(incomeChange)) > 10) {
                lines.push(`  📊 Gelir trendi: ${Number(incomeChange) > 0 ? '+' : ''}${incomeChange}% değişim`)
            }
        }
        lines.push('')
    }

    // PATTERN TESPİTİ (Yeni bölüm)
    const patterns: string[] = []

    // Harcama kategori analizi
    if (monthlyReports.length >= 2) {
        const latest = monthlyReports[monthlyReports.length - 1]
        const previous = monthlyReports[monthlyReports.length - 2]

        // En yüksek artış gösteren kategori
        for (const cat of latest.byCategory.slice(0, 3)) {
            const prevCat = previous.byCategory.find((c: { category: string; amount: number }) => c.category === cat.category)
            if (prevCat && cat.amount > prevCat.amount * 1.3) {
                const increase = ((cat.amount - prevCat.amount) / prevCat.amount * 100).toFixed(0)
                patterns.push(`${cat.category} kategorisi %${increase} arttı`)
            }
        }
    }

    // Yeni abonelikler (son 30 gün)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const newSubs = subscriptions.filter(s => s.createdAt > thirtyDaysAgo)
    if (newSubs.length > 0) {
        patterns.push(`Son 30 günde ${newSubs.length} yeni abonelik eklendi`)
    }

    // Kart kullanım artışı
    const totalCardDebt = cards.reduce((sum, c) => sum + (c.statements[0]?.statementBalance ?? 0), 0)
    const totalCardLimit = cards.reduce((sum, c) => sum + c.totalLimit, 0)
    const cardUtilization = totalCardLimit > 0 ? (totalCardDebt / totalCardLimit * 100) : 0
    if (cardUtilization > 70) {
        patterns.push(`Kart kullanım oranı yüksek: %${cardUtilization.toFixed(0)}`)
    }

    if (patterns.length > 0) {
        lines.push('=== PATTERN TESPİTİ ===')
        for (const p of patterns) lines.push(`  - ${p}`)
        lines.push('')
    }

    // HEDEF HIZI ANALİZİ (Yeni bölüm)
    if (goals.length > 0) {
        lines.push('=== HEDEF HIZI ANALİZİ ===')
        for (const g of goals) {
            const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0
            const remaining = g.targetAmount - g.currentAmount
            const daysUntilTarget = Math.ceil((g.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            const daysSinceStart = Math.ceil((Date.now() - g.createdAt.getTime()) / (1000 * 60 * 60 * 24))

            // Aylık birikim hızı tahmini
            const monthsSinceStart = daysSinceStart / 30
            const monthlyRate = monthsSinceStart > 0 ? g.currentAmount / monthsSinceStart : 0
            const monthsNeeded = monthlyRate > 0 ? remaining / monthlyRate : Infinity
            const projectedCompletion = new Date()
            projectedCompletion.setMonth(projectedCompletion.getMonth() + Math.ceil(monthsNeeded))

            lines.push(`  "${g.title}": %${pct} tamamlandı`)
            lines.push(`    Kalan: ${formatCurrency(remaining, 'TRY')} | Hedef: ${g.targetDate.toLocaleDateString('tr-TR')} | Gün: ${daysUntilTarget}`)

            if (monthlyRate > 0) {
                lines.push(`    Aylık birikim hızı: ${formatCurrency(monthlyRate, 'TRY')}`)
                if (projectedCompletion > g.targetDate) {
                    const delayMonths = Math.ceil((projectedCompletion.getTime() - g.targetDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
                    lines.push(`    ⚠️ Bu hızla ${delayMonths} ay gecikmeli tamamlanır`)
                } else {
                    lines.push(`    ✅ Bu hızla zamanında tamamlanır`)
                }
            }
        }
        lines.push('')
    }

    // Hesaplar
    if (accounts.length > 0) {
        lines.push('=== HESAPLAR ===')
        for (const a of accounts) lines.push(`  ${a.name} (${a.type}): ${formatCurrency(a.balance, a.currency)}`)
        lines.push('')
    }

    // Kredi kartları
    if (cards.length > 0) {
        lines.push('=== KREDİ KARTLARI ===')
        for (const c of cards) {
            const stmt = c.statements[0]
            const debt = stmt?.statementBalance ?? 0
            const util = c.totalLimit > 0 ? ((debt / c.totalLimit) * 100).toFixed(0) : '0'
            lines.push(`  ${c.cardName}: borç ${formatCurrency(debt, 'TRY')}, limit ${formatCurrency(c.totalLimit, 'TRY')}, kullanım %${util}`)
            if (stmt?.dueDate) lines.push(`    Son ödeme: ${stmt.dueDate.toLocaleDateString('tr-TR')}, asgari: ${formatCurrency(stmt.minimumPayment, 'TRY')}`)
        }
        lines.push('')
    }

    // Borçlar
    if (debts.length > 0) {
        lines.push('=== BORÇLAR ===')
        for (const d of debts) {
            const label = d.counterpartyName ? `${d.name} (${d.counterpartyName})` : d.name
            lines.push(`  ${label}: ${formatCurrency(d.currentBalance, 'TRY')}${d.interestRate ? ` (%${d.interestRate} faiz)` : ''}`)
        }
        lines.push('')
    }

    // Aylık gelir-gider
    const monthlyIncome = incomes.reduce((s, i) => s + (i.billingCycle === 'YEARLY' ? i.amount / 12 : i.amount), 0)
    const subMonthly = subscriptions.reduce((s, sub) => s + (sub.monthlyNormalizedAmount ?? sub.amount), 0)
    const recMonthly = recurring.reduce((s, r) => s + (r.billingCycle === 'YEARLY' ? r.amount / 12 : r.amount), 0)

    lines.push('=== AYLIK GELİR-GİDER ===')
    lines.push(`  Aylık gelir: ${formatCurrency(monthlyIncome, 'TRY')}`)
    lines.push(`  Abonelik yükü: ${formatCurrency(subMonthly, 'TRY')}`)
    lines.push(`  Sabit gider: ${formatCurrency(recMonthly, 'TRY')}`)
    lines.push(`  Toplam sabit yük: ${formatCurrency(subMonthly + recMonthly, 'TRY')}`)
    const freeCash = monthlyIncome - subMonthly - recMonthly
    lines.push(`  Serbest nakit: ${formatCurrency(freeCash, 'TRY')}${freeCash < 0 ? ' ⚠️ NEGATİF' : ''}`)
    lines.push('')

    // Son işlemler
    if (recentLedger.length > 0) {
        lines.push('=== SON 10 İŞLEM ===')
        for (const e of recentLedger) {
            lines.push(`  ${e.date.toLocaleDateString('tr-TR')} | ${e.type} | ${formatCurrency(e.amount, 'TRY')} | ${e.description ?? ''}`)
        }
    }

    return lines.join('\n')
}
