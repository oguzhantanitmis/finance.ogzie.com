'use client'

import { useState } from 'react'
import { Zap, XCircle, DollarSign, TrendingUp } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface SubItem { id: string; name: string; monthly: number }
interface DebtItem { id: string; name: string; balance: number }

interface Props {
    subscriptions: SubItem[]
    debts: DebtItem[]
    currentCash: number
    currentMonthlyIncome: number
}

type Scenario = 'cancel_subs' | 'extra_payment' | 'income_change' | null

export default function SimulationsWorkspace({ subscriptions, debts, currentCash, currentMonthlyIncome }: Props) {
    const [scenario, setScenario] = useState<Scenario>(null)
    const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set())
    const [extraPaymentDebtId, setExtraPaymentDebtId] = useState('')
    const [extraPaymentAmount, setExtraPaymentAmount] = useState(0)
    const [newIncome, setNewIncome] = useState(currentMonthlyIncome)

    const toggleSub = (id: string) => {
        const copy = new Set(selectedSubs)
        copy.has(id) ? copy.delete(id) : copy.add(id)
        setSelectedSubs(copy)
    }

    // Basit client-side hesaplama
    const cancelSavings = subscriptions.filter((s) => selectedSubs.has(s.id)).reduce((sum, s) => sum + s.monthly, 0)
    const selectedDebt = debts.find((d) => d.id === extraPaymentDebtId)
    const incomeChange = newIncome - currentMonthlyIncome

    return (
        <div>
            {/* Senaryo Seçimi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button onClick={() => setScenario('cancel_subs')} className={cn('fintech-card p-5 text-left transition-all', scenario === 'cancel_subs' ? 'border-white/30' : 'hover:border-white/10')}>
                    <XCircle className="w-6 h-6 text-red-400 mb-3" />
                    <h3 className="font-semibold text-white mb-1">Abonelik İptali</h3>
                    <p className="text-xs text-zinc-500">Seçili abonelikleri iptal etsem ne kadar tasarruf ederim?</p>
                </button>
                <button onClick={() => setScenario('extra_payment')} className={cn('fintech-card p-5 text-left transition-all', scenario === 'extra_payment' ? 'border-white/30' : 'hover:border-white/10')}>
                    <DollarSign className="w-6 h-6 text-emerald-400 mb-3" />
                    <h3 className="font-semibold text-white mb-1">Ekstra Borç Ödemesi</h3>
                    <p className="text-xs text-zinc-500">Bir borca ekstra ödeme yapsam ne olur?</p>
                </button>
                <button onClick={() => setScenario('income_change')} className={cn('fintech-card p-5 text-left transition-all', scenario === 'income_change' ? 'border-white/30' : 'hover:border-white/10')}>
                    <TrendingUp className="w-6 h-6 text-sky-400 mb-3" />
                    <h3 className="font-semibold text-white mb-1">Gelir Değişimi</h3>
                    <p className="text-xs text-zinc-500">Gelirim artarsa/azalırsa durum nasıl etkilenir?</p>
                </button>
            </div>

            {/* Abonelik İptali */}
            {scenario === 'cancel_subs' && (
                <div className="fintech-card p-6 mb-6">
                    <h2 className="font-semibold text-white mb-4">Abonelikleri Seç</h2>
                    {subscriptions.length === 0 ? (
                        <p className="text-zinc-500 text-sm">Aktif abonelik yok.</p>
                    ) : (
                        <div className="space-y-2 mb-6">
                            {subscriptions.map((sub) => (
                                <label key={sub.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 hover:bg-white/5 cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" checked={selectedSubs.has(sub.id)} onChange={() => toggleSub(sub.id)} className="rounded" />
                                        <span className="text-white">{sub.name}</span>
                                    </div>
                                    <span className="text-sm text-zinc-400">{formatCurrency(sub.monthly, 'TRY')}/ay</span>
                                </label>
                            ))}
                        </div>
                    )}
                    {selectedSubs.size > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
                            <p className="text-emerald-400 font-semibold text-lg mb-1">Aylık tasarruf: {formatCurrency(cancelSavings, 'TRY')}</p>
                            <p className="text-emerald-400/70 text-sm">Yıllık tasarruf: {formatCurrency(cancelSavings * 12, 'TRY')}</p>
                            <p className="text-zinc-400 text-sm mt-2">Nakit: {formatCurrency(currentCash, 'TRY')} → {formatCurrency(currentCash + cancelSavings, 'TRY')}/ay</p>
                        </div>
                    )}
                </div>
            )}

            {/* Ekstra Borç Ödemesi */}
            {scenario === 'extra_payment' && (
                <div className="fintech-card p-6 mb-6">
                    <h2 className="font-semibold text-white mb-4">Ekstra Ödeme Simülasyonu</h2>
                    {debts.length === 0 ? (
                        <p className="text-zinc-500 text-sm">Aktif borç yok.</p>
                    ) : (
                        <div className="space-y-4">
                            <select value={extraPaymentDebtId} onChange={(e) => setExtraPaymentDebtId(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white">
                                <option value="">Borç seçin</option>
                                {debts.map((d) => <option key={d.id} value={d.id}>{d.name} ({formatCurrency(d.balance, 'TRY')})</option>)}
                            </select>
                            <input type="number" value={extraPaymentAmount || ''} onChange={(e) => setExtraPaymentAmount(Number(e.target.value))} placeholder="Ekstra ödeme tutarı" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                            {selectedDebt && extraPaymentAmount > 0 && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
                                    <p className="text-white font-semibold mb-2">{selectedDebt.name}</p>
                                    <p className="text-zinc-400 text-sm">Borç: {formatCurrency(selectedDebt.balance, 'TRY')} → {formatCurrency(Math.max(0, selectedDebt.balance - extraPaymentAmount), 'TRY')}</p>
                                    <p className="text-zinc-400 text-sm">Nakit: {formatCurrency(currentCash, 'TRY')} → {formatCurrency(currentCash - extraPaymentAmount, 'TRY')}</p>
                                    {selectedDebt.balance <= extraPaymentAmount && (
                                        <p className="text-emerald-400 font-semibold mt-2">🎉 Bu borç tamamen kapanır!</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Gelir Değişimi */}
            {scenario === 'income_change' && (
                <div className="fintech-card p-6 mb-6">
                    <h2 className="font-semibold text-white mb-4">Gelir Değişimi Simülasyonu</h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">Mevcut aylık gelir</p>
                            <p className="text-xl font-bold text-white mb-4">{formatCurrency(currentMonthlyIncome, 'TRY')}</p>
                        </div>
                        <input type="number" value={newIncome || ''} onChange={(e) => setNewIncome(Number(e.target.value))} placeholder="Yeni aylık gelir" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                        {newIncome !== currentMonthlyIncome && (
                            <div className={cn('rounded-2xl p-5 border', incomeChange >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20')}>
                                <p className={cn('font-semibold text-lg mb-1', incomeChange >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                    {incomeChange >= 0 ? '+' : ''}{formatCurrency(incomeChange, 'TRY')}/ay
                                </p>
                                <p className="text-zinc-400 text-sm">Yıllık etki: {incomeChange >= 0 ? '+' : ''}{formatCurrency(incomeChange * 12, 'TRY')}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!scenario && (
                <div className="fintech-card p-16 text-center text-zinc-400">
                    Yukarıdan bir senaryo seçerek başlayın.
                </div>
            )}
        </div>
    )
}
