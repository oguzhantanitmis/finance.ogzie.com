'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AlertCircle, Banknote, Calendar, CheckCircle2, ChevronDown, ChevronUp, CreditCard, Landmark, Pencil, RotateCcw, Trash2 } from 'lucide-react'

import { calculateAccumulatedInterest, calculateKmhLateCost, calculateMinPayment } from '@/lib/banking-engine'
import { formatCategoryLabel } from '@/lib/ui-text'
import type { DebtView } from '@/lib/debt-views'
import { cn, formatCurrency } from '@/lib/utils'

function normalizeRate(value: number | null | undefined) {
    const normalized = value ?? 0
    return normalized > 1 ? normalized / 100 : normalized
}

function roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100
}

function daysOverdue(dateInput?: string | null) {
    if (!dateInput) return 0
    const dueDate = new Date(dateInput)
    if (Number.isNaN(dueDate.getTime())) return 0

    const dayMs = 24 * 60 * 60 * 1000
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime()
    return Math.max(0, Math.floor((today - due) / dayMs))
}

function splitTaxAmount(taxAmount: number, kkdfRate: number, bsmvRate: number) {
    const totalTaxRate = kkdfRate + bsmvRate
    if (totalTaxRate <= 0) return { kkdf: 0, bsmv: 0 }

    const kkdf = roundMoney(taxAmount * (kkdfRate / totalTaxRate))
    return {
        kkdf,
        bsmv: roundMoney(taxAmount - kkdf),
    }
}

function buildLoanDisplayRows(debt: DebtView) {
    const kkdfRate = normalizeRate(debt.kkdfRate)
    const bsmvRate = normalizeRate(debt.bsmvRate)
    const paymentPlan = getCanonicalPaymentPlan(debt)
    let remainingPrincipal = debt.totalPrincipal ?? paymentPlan.reduce((total, item) => total + item.principalAmount, 0) ?? debt.remainingBalance

    return paymentPlan.map((item) => {
        const taxes = splitTaxAmount(item.taxAmount, kkdfRate, bsmvRate)
        remainingPrincipal = roundMoney(Math.max(0, remainingPrincipal - item.principalAmount))

        return {
            ...item,
            kkdf: taxes.kkdf,
            bsmv: taxes.bsmv,
            remainingPrincipal,
        }
    })
}

function getCanonicalPaymentPlan(debt: DebtView) {
    const rows = debt.paymentPlan ?? []
    if (debt.type !== 'LOAN' || rows.length <= 1) return rows

    const preferredStart = debt.dueDate ? new Date(debt.dueDate).getTime() : null
    const byInstallment = new Map<number, typeof rows[number]>()

    rows.forEach((row) => {
        const existing = byInstallment.get(row.installmentNo)
        if (!existing) {
            byInstallment.set(row.installmentNo, row)
            return
        }

        const score = (item: typeof row) => {
            const dateScore = new Date(item.dueDate).getTime()
            const preferredScore = preferredStart && dateScore >= preferredStart ? 10_000_000_000_000 : 0
            return preferredScore + dateScore
        }

        if (score(row) > score(existing)) {
            byInstallment.set(row.installmentNo, row)
        }
    })

    return Array.from(byInstallment.values()).sort((left, right) => left.installmentNo - right.installmentNo)
}

export default function DebtTable({
    debts,
    onEdit,
    onDelete,
    onToggleInstallment,
    pendingInstallmentId,
}: {
    debts: DebtView[]
    onEdit: (debt: DebtView) => void
    onDelete: (debtId: string) => void
    onToggleInstallment?: (paymentPlanId: string, paid: boolean) => void
    pendingInstallmentId?: string | null
}) {
    const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'ALL' | 'PERSONAL' | 'CARD' | 'KMH' | 'INSTALLMENT' | 'OVERDUE' | 'RISKY' | 'CLOSED'>('ALL')
    const visibleDebts = debts.filter((debt) => {
        const matchesSearch = !search || `${debt.name} ${debt.subtitle ?? ''}`.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'))
        if (!matchesSearch) return false
        if (filter === 'PERSONAL') return debt.sourceKind === 'PERSONAL_RP'
        if (filter === 'CARD') return debt.type === 'CREDIT_CARD'
        if (filter === 'KMH') return debt.type === 'KMH'
        if (filter === 'INSTALLMENT') return Boolean(debt.paymentPlan?.length)
        if (filter === 'OVERDUE') return Boolean(debt.dueDate && new Date(debt.dueDate) < new Date())
        if (filter === 'RISKY') {
            const utilizationBalance = debt.type === 'KMH' ? (debt.totalPrincipal ?? debt.remainingBalance) : debt.remainingBalance
            return debt.interestRate >= 4 || (debt.limit ? (utilizationBalance / debt.limit) >= 0.8 : false)
        }
        if (filter === 'CLOSED') return debt.remainingBalance <= 0
        return debt.remainingBalance > 0
    })

    return (
        <div className="space-y-4">
            <div className="fintech-card p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Borç, kişi, kurum ara..."
                    className="form-input lg:max-w-xs"
                />
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {([
                        ['ALL', 'Tümü'],
                        ['PERSONAL', 'Bana/Ben borçluyum'],
                        ['CARD', 'Kredi kartı'],
                        ['KMH', 'KMH'],
                        ['INSTALLMENT', 'Taksitli'],
                        ['OVERDUE', 'Geciken'],
                        ['RISKY', 'Riskli'],
                        ['CLOSED', 'Kapanmış'],
                    ] as const).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setFilter(key)}
                            className={cn('filter-tab', filter === key && 'filter-tab-active')}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {visibleDebts.map((debt) => {
                const isCard = debt.type === 'CREDIT_CARD'
                const isLoan = debt.type === 'LOAN'
                const isKMH = debt.type === 'KMH'
                const minPayment = isCard ? calculateMinPayment(debt.limit || 0, debt.remainingBalance) : 0
                const taxRates = { kkdfRate: normalizeRate(debt.kkdfRate), bsmvRate: normalizeRate(debt.bsmvRate) }
                const interestBase = isKMH ? (debt.totalPrincipal ?? debt.remainingBalance) : debt.remainingBalance
                const monthlyInterest = calculateAccumulatedInterest(interestBase, debt.interestRate, 30, taxRates)
                const dailyInterest = isKMH ? calculateAccumulatedInterest(interestBase, debt.interestRate, 1, taxRates) : null
                const kmhPrincipal = isKMH ? (debt.totalPrincipal ?? Math.max(0, debt.remainingBalance - (debt.kmhStatementInterest ?? 0))) : 0
                const utilization = debt.limit ? ((isKMH ? kmhPrincipal : debt.remainingBalance) / debt.limit) * 100 : 0
                const kmhInterestWithTax = isKMH ? (debt.kmhStatementInterest ?? monthlyInterest.total) : 0
                const kmhMinimumPayment = isKMH
                    ? (debt.kmhMinimumPayment ?? roundMoney((kmhPrincipal * debt.minPaymentRate) + kmhInterestWithTax))
                    : 0
                const kmhLateCost = isKMH
                    ? calculateKmhLateCost(
                        kmhPrincipal,
                        debt.kmhLateInterestRate ?? 4.55,
                        daysOverdue(debt.dueDate),
                        taxRates,
                    )
                    : { overdueDays: 0, total: 0 }
                const kmhPeriodDebt = isKMH ? roundMoney(kmhPrincipal + kmhInterestWithTax) : 0
                const loanRows = isLoan ? buildLoanDisplayRows(debt) : []
                const loanPaidCount = loanRows.filter((item) => item.isPaid).length
                const loanRemainingRows = loanRows.filter((item) => !item.isPaid)
                const nextLoanRow = loanRemainingRows[0] ?? null
                const loanMonthlyPayment = nextLoanRow?.amount ?? loanRows[0]?.amount ?? 0
                const loanTotalInterest = roundMoney(loanRows.reduce((total, item) => total + item.interestAmount, 0))
                const loanTotalTax = roundMoney(loanRows.reduce((total, item) => total + item.kkdf + item.bsmv, 0))
                const loanRemainingPrincipal = loanPaidCount > 0
                    ? loanRows[loanPaidCount - 1]?.remainingPrincipal ?? 0
                    : debt.totalPrincipal ?? loanRows.reduce((total, item) => total + item.principalAmount, 0)
                const firstUnpaidInstallmentId = nextLoanRow?.id ?? null
                const lastPaidInstallmentId = [...loanRows].reverse().find((item) => item.isPaid)?.id ?? null

                return (
                    <div key={debt.id} className="fintech-card overflow-hidden transition-all duration-300">
                        <div className="p-5 flex items-center justify-between gap-4">
                            <button
                                type="button"
                                className="flex items-center justify-between gap-4 flex-1 text-left rounded-2xl -m-2 p-2 transition-colors cursor-pointer"
                                style={{ ['--hover-bg' as string]: 'var(--bg-hover)' }}
                                onClick={() => setExpandedDebtId(expandedDebtId === debt.id ? null : debt.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{
                                            background: isCard ? 'var(--accent-info-bg)' : isLoan ? 'var(--accent-purple-bg)' : isKMH ? 'var(--accent-warning-bg)' : 'var(--bg-elevated)',
                                            color: isCard ? 'var(--accent-info)' : isLoan ? 'var(--accent-purple)' : isKMH ? 'var(--accent-warning)' : 'var(--text-muted)',
                                        }}
                                    >
                                        {isCard ? <CreditCard className="w-5 h-5" /> : isLoan ? <Landmark className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{debt.name}</h3>
                                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                                            <span className="status-badge status-badge-neutral">{formatCategoryLabel(debt.type)}</span>
                                            <span>{debt.sourceLabel}</span>
                                            {debt.interestRate > 0 ? <span>Faiz: %{debt.interestRate}</span> : null}
                                        </div>
                                        {debt.subtitle ? <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{debt.subtitle}</p> : null}
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Güncel Borç</p>
                                        <p className="font-mono text-xl font-bold privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(debt.remainingBalance, 'TRY')}</p>
                                        {(isCard || isKMH) && debt.limit ? (
                                            <div className="w-24 h-1 rounded-full mt-1 ml-auto" style={{ background: 'var(--bg-elevated)' }}>
                                                <div
                                                    className="h-1 rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.min(utilization, 100)}%`,
                                                        background: utilization > 80 ? 'var(--accent-danger)' : utilization > 50 ? 'var(--accent-warning)' : 'var(--accent-success)',
                                                    }}
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                    {expandedDebtId === debt.id
                                        ? <ChevronUp className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                                        : <ChevronDown className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />}
                                </div>
                            </button>

                            <div className="flex items-center gap-2">
                                {debt.navigateHref && debt.navigateLabel ? (
                                    <Link
                                        href={debt.navigateHref}
                                        className="px-3 py-2 rounded-xl text-xs cursor-pointer"
                                        style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                                    >
                                        {debt.navigateLabel}
                                    </Link>
                                ) : null}
                                {debt.canEdit ? (
                                    <button onClick={() => onEdit(debt)} className="p-2 rounded-xl cursor-pointer transition-colors" style={{ color: 'var(--text-muted)' }}>
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                ) : null}
                                {debt.canDelete ? (
                                    <button onClick={() => onDelete(debt.id)} className="p-2 rounded-xl cursor-pointer transition-colors" style={{ color: 'var(--text-muted)' }}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        {expandedDebtId === debt.id ? (
                            <div className="p-6" style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-hover)' }}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium pb-2" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Hesap Detayları</h4>
                                        {debt.limit ? (
                                            <div className="flex justify-between text-sm">
                                                <span style={{ color: 'var(--text-secondary)' }}>Limit</span>
                                                <span className="font-mono privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(debt.limit, 'TRY')}</span>
                                            </div>
                                        ) : null}
                                        {debt.cutOffDay ? (
                                            <div className="flex justify-between text-sm">
                                                <span style={{ color: 'var(--text-secondary)' }}>Hesap Kesim</span>
                                                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>Her ayın {debt.cutOffDay}. günü</span>
                                            </div>
                                        ) : null}
                                        {debt.paymentDueDay ? (
                                            <div className="flex justify-between text-sm">
                                                <span style={{ color: 'var(--text-secondary)' }}>Son Ödeme</span>
                                                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>Her ayın {debt.paymentDueDay}. günü</span>
                                            </div>
                                        ) : null}
                                        {isKMH && debt.kmhStatementDate ? (
                                            <div className="flex justify-between text-sm">
                                                <span style={{ color: 'var(--text-secondary)' }}>Dönem Kesimi</span>
                                                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{new Date(debt.kmhStatementDate).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                        ) : null}
                                        {isKMH && debt.totalPrincipal ? (
                                            <div className="flex justify-between text-sm">
                                                <span style={{ color: 'var(--text-secondary)' }}>Anapara Borcu</span>
                                                <span className="font-mono privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(debt.totalPrincipal, 'TRY')}</span>
                                            </div>
                                        ) : null}
                                        {debt.dueDate ? (
                                            <div className="flex justify-between text-sm">
                                                <span style={{ color: 'var(--text-secondary)' }}>{isKMH ? 'Son Ödeme' : 'Vade'}</span>
                                                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{new Date(debt.dueDate).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                        ) : null}
                                        {isKMH && debt.kmhNextCutOffDate ? (
                                            <div className="flex justify-between text-sm">
                                                <span style={{ color: 'var(--text-secondary)' }}>Sonraki Kesim</span>
                                                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{new Date(debt.kmhNextCutOffDate).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium pb-2" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Maliyet Analizi</h4>
                                        {isLoan ? (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Aylık Taksit</span>
                                                    <span className="font-mono privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(loanMonthlyPayment, 'TRY')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Toplam Faiz</span>
                                                    <span className="font-mono privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(loanTotalInterest, 'TRY')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Toplam Vergi</span>
                                                    <span className="font-mono privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(loanTotalTax, 'TRY')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Kalan Anapara</span>
                                                    <span className="font-mono font-bold privacy-blur tabular-nums" style={{ color: 'var(--accent-danger)' }}>{formatCurrency(loanRemainingPrincipal, 'TRY')}</span>
                                                </div>
                                            </>
                                        ) : isKMH ? (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Günlük Tahmini Yük</span>
                                                    <span className="font-mono privacy-blur tabular-nums" style={{ color: 'var(--accent-danger)' }}>{dailyInterest ? formatCurrency(dailyInterest.total, 'TRY') : '-'}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Dönem Faizi + Vergi</span>
                                                    <span className="font-mono privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(kmhInterestWithTax, 'TRY')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Asgari Ödeme</span>
                                                    <span className="font-mono privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(kmhMinimumPayment, 'TRY')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Gecikme Artışı</span>
                                                    <span className="font-mono privacy-blur tabular-nums" style={{ color: kmhLateCost.total > 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                                                        {kmhLateCost.overdueDays > 0 ? `${formatCurrency(kmhLateCost.total, 'TRY')} / ${kmhLateCost.overdueDays} gün` : formatCurrency(0, 'TRY')}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Dönem Borcu</span>
                                                    <span className="font-mono font-bold privacy-blur tabular-nums" style={{ color: 'var(--accent-danger)' }}>{formatCurrency(kmhPeriodDebt + kmhLateCost.total, 'TRY')}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {dailyInterest ? (
                                                    <div className="flex justify-between text-sm">
                                                        <span style={{ color: 'var(--text-secondary)' }}>Günlük Faiz</span>
                                                        <span className="font-mono privacy-blur tabular-nums" style={{ color: 'var(--accent-danger)' }}>{formatCurrency(dailyInterest.interest + dailyInterest.tax, 'TRY')}</span>
                                                    </div>
                                                ) : null}
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Aylık Faiz</span>
                                                    <span className="font-mono privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(monthlyInterest.interest, 'TRY')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Vergi (KKDF+BSMV)</span>
                                                    <span className="font-mono privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(monthlyInterest.tax, 'TRY')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Toplam Aylık Yük</span>
                                                    <span className="font-mono font-bold privacy-blur tabular-nums" style={{ color: 'var(--accent-danger)' }}>{formatCurrency(monthlyInterest.total, 'TRY')}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium pb-2" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Ödeme Durumu</h4>
                                        {isLoan ? (
                                            <div className="p-3 rounded-lg space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Ödenen / Kalan</span>
                                                    <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{loanPaidCount} / {loanRemainingRows.length}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Toplam Vade</span>
                                                    <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{loanRows.length}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Sıradaki Taksit</span>
                                                    <span className="font-mono privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{nextLoanRow ? formatCurrency(nextLoanRow.amount, 'TRY') : '-'}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Sıradaki Vade</span>
                                                    <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{nextLoanRow ? new Date(nextLoanRow.dueDate).toLocaleDateString('tr-TR') : '-'}</span>
                                                </div>
                                            </div>
                                        ) : isKMH ? (
                                            <div className="p-3 rounded-lg space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Dönem Borcu</span>
                                                    <span className="font-mono privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(kmhPeriodDebt, 'TRY')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Asgari Ödeme</span>
                                                    <span className="font-mono privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(kmhMinimumPayment, 'TRY')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Gecikme Artışı</span>
                                                    <span className="font-mono privacy-blur tabular-nums" style={{ color: kmhLateCost.total > 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>{formatCurrency(kmhLateCost.total, 'TRY')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: 'var(--text-secondary)' }}>Son Ödeme</span>
                                                    <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('tr-TR') : '-'}</span>
                                                </div>
                                            </div>
                                        ) : isCard ? (
                                            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Asgari Ödeme</span>
                                                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(minPayment, 'TRY')}</span>
                                                </div>
                                                <div className="w-full h-1.5 rounded-full mt-2" style={{ background: 'var(--bg-hover)' }}>
                                                    <div className="h-1.5 rounded-full" style={{ width: `${Math.min(debt.minPaymentRate * 100, 100)}%`, background: 'var(--accent-info)' }} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                                Bu kayıt için tahmini maliyet ve kalan bakiye gösteriliyor.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isLoan && loanRows.length > 0 ? (
                                    <div className="mt-6">
                                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                            <Calendar className="w-4 h-4" /> Ödeme Planı
                                        </h4>
                                        <div className="data-table-wrapper">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Taksit</th>
                                                        <th>Tarih</th>
                                                        <th>Tutar</th>
                                                        <th>Faiz</th>
                                                        <th>KKDF</th>
                                                        <th>BSMV</th>
                                                        <th>Kalan Anapara</th>
                                                        <th>Durum</th>
                                                        {onToggleInstallment ? <th>İşlem</th> : null}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {loanRows.map((item) => {
                                                        const isPast = new Date(item.dueDate) < new Date()
                                                        const canMarkPaid = item.id === firstUnpaidInstallmentId
                                                        const canUndoPayment = item.id === lastPaidInstallmentId
                                                        const isPending = pendingInstallmentId === item.id
                                                        const lockActions = Boolean(pendingInstallmentId)
                                                        return (
                                                            <tr key={item.id} className={cn(item.isPaid && 'opacity-50 grayscale')}>
                                                                <td className="font-medium">{item.installmentNo}</td>
                                                                <td style={{ color: 'var(--text-secondary)' }}>{new Date(item.dueDate).toLocaleDateString('tr-TR')}</td>
                                                                <td className="font-mono tabular-nums privacy-blur" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.amount, 'TRY')}</td>
                                                                <td className="font-mono tabular-nums privacy-blur" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(item.interestAmount, 'TRY')}</td>
                                                                <td className="font-mono tabular-nums privacy-blur" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(item.kkdf, 'TRY')}</td>
                                                                <td className="font-mono tabular-nums privacy-blur" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(item.bsmv, 'TRY')}</td>
                                                                <td className="font-mono tabular-nums privacy-blur" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.remainingPrincipal, 'TRY')}</td>
                                                                <td>
                                                                    {item.isPaid ? (
                                                                        <span className="status-badge status-badge-success">Ödendi</span>
                                                                    ) : isPast ? (
                                                                        <span className="status-badge status-badge-danger"><AlertCircle className="w-3 h-3" /> Gecikmiş</span>
                                                                    ) : (
                                                                        <span className="status-badge status-badge-neutral">Bekliyor</span>
                                                                    )}
                                                                </td>
                                                                {onToggleInstallment ? (
                                                                    <td>
                                                                        {item.isPaid ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => onToggleInstallment(item.id, false)}
                                                                                disabled={!canUndoPayment || lockActions}
                                                                                title="Ödemeyi geri al"
                                                                                aria-label="Ödemeyi geri al"
                                                                                className="p-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                                                                style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                                                                            >
                                                                                <RotateCcw className={cn('w-4 h-4', isPending && 'animate-spin')} />
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => onToggleInstallment(item.id, true)}
                                                                                disabled={!canMarkPaid || lockActions}
                                                                                title="Ödendi olarak işaretle"
                                                                                aria-label="Ödendi olarak işaretle"
                                                                                className="p-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                                                                style={{ color: 'var(--accent-success)', border: '1px solid var(--border-subtle)' }}
                                                                            >
                                                                                <CheckCircle2 className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                ) : null}
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                )
            })}
            {visibleDebts.length === 0 ? (
                <div className="fintech-card p-10 text-center" style={{ color: 'var(--text-muted)' }}>Bu filtreye uygun kayıt yok.</div>
            ) : null}
        </div>
    )
}
