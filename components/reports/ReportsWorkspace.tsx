'use client'

import { ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
    INCOME: 'Gelir', EXPENSE: 'Gider', COLLECTION: 'Tahsilat', PAYMENT_TO_PERSON: 'Kişiye Ödeme',
    CARD_PAYMENT: 'Kart Ödeme', SUBSCRIPTION_PAYMENT: 'Abonelik', DEBT_PAYMENT: 'Borç Ödeme',
    TRANSFER: 'Transfer', BALANCE_ADJUSTMENT: 'Bakiye Düzeltme',
}

interface MonthlyData { month: string; income: number; expense: number; net: number; byCategory: { category: string; amount: number }[] }
interface ExpenseData { type: string; amount: number }
interface NetWorthData { date: string; netWorth: number; score: number }

interface Props {
    monthly: MonthlyData[]
    expenses: ExpenseData[]
    netWorthHistory: NetWorthData[]
}

export default function ReportsWorkspace({ monthly, expenses, netWorthHistory }: Props) {
    const totalIncome = monthly.reduce((s, m) => s + m.income, 0)
    const totalExpense = monthly.reduce((s, m) => s + m.expense, 0)

    return (
        <div>
            {/* Özet */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="fintech-card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Toplam Gelir (6 ay)</p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalIncome, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight className="w-4 h-4 text-red-400" />
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Toplam Gider (6 ay)</p>
                    </div>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpense, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-sky-400" />
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Net (6 ay)</p>
                    </div>
                    <p className={cn('text-2xl font-bold', totalIncome - totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatCurrency(totalIncome - totalExpense, 'TRY')}
                    </p>
                </div>
            </div>

            {/* Aylık Tablo */}
            <div className="fintech-card p-6 mb-6">
                <h2 className="font-semibold text-white mb-4">Aylık Gelir-Gider</h2>
                {monthly.length === 0 ? (
                    <p className="text-zinc-500 text-sm">Henüz yeterli veri yok.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-3 text-xs uppercase tracking-[0.25em] text-zinc-500">Ay</th>
                                    <th className="text-right py-3 text-xs uppercase tracking-[0.25em] text-zinc-500">Gelir</th>
                                    <th className="text-right py-3 text-xs uppercase tracking-[0.25em] text-zinc-500">Gider</th>
                                    <th className="text-right py-3 text-xs uppercase tracking-[0.25em] text-zinc-500">Net</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthly.map((m) => (
                                    <tr key={m.month} className="border-b border-white/5">
                                        <td className="py-3 text-white font-medium">{m.month}</td>
                                        <td className="py-3 text-right text-emerald-400">{formatCurrency(m.income, 'TRY')}</td>
                                        <td className="py-3 text-right text-red-400">{formatCurrency(m.expense, 'TRY')}</td>
                                        <td className={cn('py-3 text-right font-semibold', m.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                            {formatCurrency(m.net, 'TRY')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Son 30 Gün Harcama Kırılımı */}
                <div className="fintech-card p-6">
                    <h2 className="font-semibold text-white mb-4">Son 30 Gün Harcama Dağılımı</h2>
                    {expenses.length === 0 ? (
                        <p className="text-zinc-500 text-sm">Henüz harcama kaydı yok.</p>
                    ) : (
                        <div className="space-y-3">
                            {expenses.map((e) => {
                                const maxAmount = expenses[0]?.amount ?? 1
                                const pct = Math.round((e.amount / maxAmount) * 100)
                                return (
                                    <div key={e.type}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-zinc-300">{TYPE_LABELS[e.type] ?? e.type}</span>
                                            <span className="text-sm font-semibold text-white">{formatCurrency(e.amount, 'TRY')}</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/5 rounded-full">
                                            <div className="h-full bg-red-400/60 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Net Varlık Trendi */}
                <div className="fintech-card p-6">
                    <h2 className="font-semibold text-white mb-4">Net Varlık Geçmişi</h2>
                    {netWorthHistory.length === 0 ? (
                        <p className="text-zinc-500 text-sm">Henüz sağlık puanı geçmişi yok. Dashboard ziyaret edildikçe snapshot kaydedilir.</p>
                    ) : (
                        <div className="space-y-2">
                            {netWorthHistory.map((s, i) => (
                                <div key={i} className="flex items-center justify-between text-sm border-b border-white/5 py-2">
                                    <span className="text-zinc-400">{new Date(s.date).toLocaleDateString('tr-TR')}</span>
                                    <div className="flex items-center gap-4">
                                        <span className={cn('font-semibold', s.netWorth >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                            {formatCurrency(s.netWorth, 'TRY')}
                                        </span>
                                        <span className="text-xs text-zinc-500">Skor: {s.score}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
