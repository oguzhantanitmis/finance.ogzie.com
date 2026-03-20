'use client'

import { useState } from 'react'
import { AlertCircle, Banknote, Calendar, ChevronDown, ChevronUp, CreditCard, Landmark, Pencil, Trash2 } from 'lucide-react'

import { calculateAccumulatedInterest, calculateMinPayment } from '@/lib/banking-engine'
import { formatCategoryLabel } from '@/lib/ui-text'
import { cn, formatCurrency } from '@/lib/utils'

export interface DebtView {
    id: string
    name: string
    type: 'CREDIT_CARD' | 'LOAN' | 'KMH' | 'PERSONAL' | 'MANUAL'
    limit?: number | null
    cutOffDay?: number | null
    paymentDueDay?: number | null
    totalBalance: number
    remainingBalance: number
    interestRate: number
    minPaymentRate: number
    kkdfRate: number
    bsmvRate: number
    totalPrincipal?: number | null
    installments?: number | null
    remainingInstallments?: number | null
    dueDate?: string | null
    paymentPlan?: Array<{
        id: string
        installmentNo: number
        amount: number
        principalAmount: number
        interestAmount: number
        taxAmount: number
        dueDate: string
        isPaid: boolean
    }>
}

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
                                className="flex items-center justify-between gap-4 flex-1 text-left hover:bg-white/5 rounded-2xl -m-2 p-2 transition-colors"
                                onClick={() => setExpandedDebtId(expandedDebtId === debt.id ? null : debt.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        'w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900 border border-white/10',
                                        isCard && 'text-blue-400',
                                        isLoan && 'text-purple-400',
                                        isKMH && 'text-orange-400',
                                    )}>
                                        {isCard ? <CreditCard className="w-5 h-5" /> : isLoan ? <Landmark className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{debt.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                                            <span className="bg-white/10 px-2 py-0.5 rounded text-white">{formatCategoryLabel(debt.type)}</span>
                                            {debt.interestRate > 0 ? <span>Faiz: %{debt.interestRate}</span> : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-xs text-zinc-500">Güncel Borç</p>
                                        <p className="font-mono text-xl font-bold privacy-blur">{formatCurrency(debt.remainingBalance, 'TRY')}</p>
                                        {(isCard || isKMH) && debt.limit ? (
                                            <div className="w-24 bg-zinc-800 h-1 rounded-full mt-1 ml-auto">
                                                <div
                                                    className={cn('h-1 rounded-full', utilization > 80 ? 'bg-rose-500' : utilization > 50 ? 'bg-amber-500' : 'bg-emerald-500')}
                                                    style={{ width: `${Math.min(utilization, 100)}%` }}
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                    {expandedDebtId === debt.id ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
                                </div>
                            </button>

                            <div className="flex items-center gap-2">
                                <button onClick={() => onEdit(debt)} className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => onDelete(debt.id)} className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {expandedDebtId === debt.id ? (
                            <div className="border-t border-white/5 bg-black/20 p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-zinc-500 border-b border-white/10 pb-2">Hesap Detayları</h4>
                                        {debt.limit ? (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-400">Limit</span>
                                                <span className="font-mono privacy-blur">{formatCurrency(debt.limit, 'TRY')}</span>
                                            </div>
                                        ) : null}
                                        {debt.cutOffDay ? (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-400">Hesap Kesim</span>
                                                <span className="font-mono text-white">Her ayın {debt.cutOffDay}. günü</span>
                                            </div>
                                        ) : null}
                                        {debt.paymentDueDay ? (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-400">Son Ödeme</span>
                                                <span className="font-mono text-white">Her ayın {debt.paymentDueDay}. günü</span>
                                            </div>
                                        ) : null}
                                        {debt.dueDate ? (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-400">Vade</span>
                                                <span className="font-mono text-white">{new Date(debt.dueDate).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-zinc-500 border-b border-white/10 pb-2">Maliyet Analizi</h4>
                                        {dailyInterest ? (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-400">Günlük Faiz</span>
                                                <span className="font-mono text-red-300 privacy-blur">{formatCurrency(dailyInterest.interest + dailyInterest.tax, 'TRY')}</span>
                                            </div>
                                        ) : null}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-400">Aylık Faiz</span>
                                            <span className="font-mono text-neutral-300 privacy-blur">{formatCurrency(monthlyInterest.interest, 'TRY')}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-400">Vergi (KKDF+BSMV)</span>
                                            <span className="font-mono text-neutral-300 privacy-blur">{formatCurrency(monthlyInterest.tax, 'TRY')}</span>
                                        </div>
                                        <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                                            <span className="text-white font-medium">Toplam Aylık Yük</span>
                                            <span className="font-mono text-rose-500 font-bold privacy-blur">{formatCurrency(monthlyInterest.total, 'TRY')}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-zinc-500 border-b border-white/10 pb-2">Ödeme Durumu</h4>
                                        {isCard ? (
                                            <div className="bg-zinc-900 border border-white/5 p-3 rounded-lg">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-xs text-zinc-400">Asgari Ödeme</span>
                                                    <span className="text-sm font-bold text-white">{formatCurrency(minPayment, 'TRY')}</span>
                                                </div>
                                                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2">
                                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(debt.minPaymentRate * 100, 100)}%` }} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-zinc-900 border border-white/5 p-3 rounded-lg text-sm text-zinc-400">
                                                Bu kayıt için tahmini maliyet ve kalan bakiye gösteriliyor.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isLoan && debt.paymentPlan && debt.paymentPlan.length > 0 ? (
                                    <div className="mt-6">
                                        <h4 className="text-sm font-medium text-zinc-500 mb-3 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" /> Ödeme Planı
                                        </h4>
                                        <div className="overflow-x-auto border border-white/5 rounded-xl">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-[#1a1a1a] text-zinc-400">
                                                    <tr>
                                                        <th className="p-3">Taksit</th>
                                                        <th className="p-3">Tarih</th>
                                                        <th className="p-3">Tutar</th>
                                                        <th className="p-3">Anapara</th>
                                                        <th className="p-3">Faiz+Vergi</th>
                                                        <th className="p-3">Durum</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 bg-black/40">
                                                    {debt.paymentPlan.map((item) => {
                                                        const isPast = new Date(item.dueDate) < new Date()
                                                        return (
                                                            <tr key={item.id} className={cn('hover:bg-white/5', item.isPaid && 'opacity-50 grayscale')}>
                                                                <td className="p-3 font-medium">{item.installmentNo}</td>
                                                                <td className="p-3 text-zinc-400">{new Date(item.dueDate).toLocaleDateString('tr-TR')}</td>
                                                                <td className="p-3 font-mono text-white">{formatCurrency(item.amount, 'TRY')}</td>
                                                                <td className="p-3 font-mono text-zinc-400">{formatCurrency(item.principalAmount, 'TRY')}</td>
                                                                <td className="p-3 font-mono text-red-300">{formatCurrency(item.interestAmount + item.taxAmount, 'TRY')}</td>
                                                                <td className="p-3">
                                                                    {item.isPaid ? (
                                                                        <span className="text-green-500 font-bold">Ödendi</span>
                                                                    ) : isPast ? (
                                                                        <span className="text-red-500 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Gecikmiş</span>
                                                                    ) : (
                                                                        <span className="text-zinc-500">Bekliyor</span>
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
