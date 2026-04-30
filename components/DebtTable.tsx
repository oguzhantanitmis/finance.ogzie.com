'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AlertCircle, Banknote, Calendar, ChevronDown, ChevronUp, CreditCard, Landmark, Pencil, Trash2 } from 'lucide-react'

import { calculateAccumulatedInterest, calculateMinPayment } from '@/lib/banking-engine'
import { formatCategoryLabel } from '@/lib/ui-text'
import type { DebtView } from '@/lib/debt-views'
import { cn, formatCurrency } from '@/lib/utils'

export default function DebtTable({
    debts,
    onEdit,
    onDelete,
}: {
    debts: DebtView[]
    onEdit: (debt: DebtView) => void
    onDelete: (debtId: string) => void
}) {
    const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null)

    return (
        <div className="space-y-4">
            {debts.map((debt) => {
                const isCard = debt.type === 'CREDIT_CARD'
                const isLoan = debt.type === 'LOAN'
                const isKMH = debt.type === 'KMH'
                const utilization = debt.limit ? (debt.remainingBalance / debt.limit) * 100 : 0
                const minPayment = isCard ? calculateMinPayment(debt.limit || 0, debt.remainingBalance) : 0
                const monthlyInterest = calculateAccumulatedInterest(debt.remainingBalance, debt.interestRate, 30)
                const dailyInterest = isKMH ? calculateAccumulatedInterest(debt.remainingBalance, debt.interestRate, 1) : null

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
                                        {debt.dueDate ? (
                                            <div className="flex justify-between text-sm">
                                                <span style={{ color: 'var(--text-secondary)' }}>Vade</span>
                                                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{new Date(debt.dueDate).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium pb-2" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Maliyet Analizi</h4>
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
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium pb-2" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>Ödeme Durumu</h4>
                                        {isCard ? (
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

                                {isLoan && debt.paymentPlan && debt.paymentPlan.length > 0 ? (
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
                                                        <th>Anapara</th>
                                                        <th>Faiz+Vergi</th>
                                                        <th>Durum</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {debt.paymentPlan.map((item) => {
                                                        const isPast = new Date(item.dueDate) < new Date()
                                                        return (
                                                            <tr key={item.id} className={cn(item.isPaid && 'opacity-50 grayscale')}>
                                                                <td className="font-medium">{item.installmentNo}</td>
                                                                <td style={{ color: 'var(--text-secondary)' }}>{new Date(item.dueDate).toLocaleDateString('tr-TR')}</td>
                                                                <td className="font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.amount, 'TRY')}</td>
                                                                <td className="font-mono tabular-nums" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(item.principalAmount, 'TRY')}</td>
                                                                <td className="font-mono tabular-nums" style={{ color: 'var(--accent-danger)' }}>{formatCurrency(item.interestAmount + item.taxAmount, 'TRY')}</td>
                                                                <td>
                                                                    {item.isPaid ? (
                                                                        <span className="status-badge status-badge-success">Ödendi</span>
                                                                    ) : isPast ? (
                                                                        <span className="status-badge status-badge-danger"><AlertCircle className="w-3 h-3" /> Gecikmiş</span>
                                                                    ) : (
                                                                        <span className="status-badge status-badge-neutral">Bekliyor</span>
                                                                    )}
                                                                </td>
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
        </div>
    )
}
