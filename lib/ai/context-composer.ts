'use server'

import { prisma } from '@/lib/prisma'
import { getTotalBalance, getAvailableCash } from '@/lib/account-service'
import { getRPSummary } from '@/lib/people-service'
import { calculateHealthScore } from '@/lib/health-score-service'
import { formatCurrency } from '@/lib/utils'

/**
 * Kullanıcının tüm finansal verisini AI'a context olarak hazırlar.
 */
export async function composeFinancialContext(userId: string): Promise<string> {
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
        recentLedger,
    ] = await Promise.all([
        getTotalBalance(userId),
        getAvailableCash(userId),
        getRPSummary(userId),
        calculateHealthScore(userId),
        prisma.creditCard.findMany({
            where: { userId, status: 'ACTIVE' },
            include: { statements: { orderBy: { periodEnd: 'desc' }, take: 1, select: { statementBalance: true, minimumPayment: true, dueDate: true } } },
        }),
        prisma.debt.findMany({ where: { userId }, select: { name: true, remainingBalance: true, interestRate: true } }),
        prisma.subscription.findMany({ where: { userId, isActive: true }, select: { name: true, amount: true, monthlyNormalizedAmount: true, billingCycle: true } }),
        prisma.recurringExpense.findMany({ where: { userId }, select: { name: true, amount: true, billingCycle: true } }),
        prisma.incomeSource.findMany({ where: { userId }, select: { name: true, amount: true, billingCycle: true } }),
        prisma.account.findMany({ where: { userId, isActive: true }, select: { name: true, type: true, balance: true, currency: true } }),
        prisma.financialGoal.findMany({ where: { userId, status: 'GOAL_ACTIVE' }, select: { title: true, targetAmount: true, currentAmount: true, targetDate: true } }),
        prisma.ledgerEntry.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 10, select: { type: true, amount: true, description: true, date: true } }),
    ])

    const lines: string[] = []

    lines.push('=== FİNANSAL DURUM ÖZETİ ===')
    lines.push(`Toplam bakiye: ${formatCurrency(totalBalance, 'TRY')}`)
    lines.push(`Kullanılabilir nakit: ${formatCurrency(availableCash, 'TRY')}`)
    lines.push(`Toplam alacak: ${formatCurrency(rpSummary.totalReceivable, 'TRY')}`)
    lines.push(`Toplam verecek: ${formatCurrency(rpSummary.totalPayable, 'TRY')}`)
    lines.push(`Gecikmiş ödeme: ${rpSummary.overdueCount}`)
    lines.push('')

    lines.push(`=== FİNANSAL SAĞLIK: ${healthScore.score}/100 (${healthScore.level}) ===`)
    for (const tip of healthScore.improvements) lines.push(`  - ${tip}`)
    lines.push('')

    if (accounts.length > 0) {
        lines.push('=== HESAPLAR ===')
        for (const a of accounts) lines.push(`  ${a.name} (${a.type}): ${formatCurrency(a.balance, a.currency)}`)
        lines.push('')
    }

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

    if (debts.length > 0) {
        lines.push('=== BORÇLAR ===')
        for (const d of debts) lines.push(`  ${d.name}: ${formatCurrency(d.remainingBalance, 'TRY')}${d.interestRate ? ` (%${d.interestRate} faiz)` : ''}`)
        lines.push('')
    }

    const monthlyIncome = incomes.reduce((s, i) => s + (i.billingCycle === 'YEARLY' ? i.amount / 12 : i.amount), 0)
    const subMonthly = subscriptions.reduce((s, sub) => s + (sub.monthlyNormalizedAmount ?? sub.amount), 0)
    const recMonthly = recurring.reduce((s, r) => s + (r.billingCycle === 'YEARLY' ? r.amount / 12 : r.amount), 0)

    lines.push('=== AYLIK GELİR-GİDER ===')
    lines.push(`  Aylık gelir: ${formatCurrency(monthlyIncome, 'TRY')}`)
    lines.push(`  Abonelik yükü: ${formatCurrency(subMonthly, 'TRY')}`)
    lines.push(`  Sabit gider: ${formatCurrency(recMonthly, 'TRY')}`)
    lines.push(`  Toplam sabit yük: ${formatCurrency(subMonthly + recMonthly, 'TRY')}`)
    lines.push('')

    if (goals.length > 0) {
        lines.push('=== AKTİF HEDEFLER ===')
        for (const g of goals) {
            const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0
            lines.push(`  ${g.title}: ${formatCurrency(g.currentAmount, 'TRY')} / ${formatCurrency(g.targetAmount, 'TRY')} (%${pct}) - hedef: ${g.targetDate.toLocaleDateString('tr-TR')}`)
        }
        lines.push('')
    }

    if (recentLedger.length > 0) {
        lines.push('=== SON 10 İŞLEM ===')
        for (const e of recentLedger) {
            lines.push(`  ${e.date.toLocaleDateString('tr-TR')} | ${e.type} | ${formatCurrency(e.amount, 'TRY')} | ${e.description ?? ''}`)
        }
    }

    return lines.join('\n')
}
