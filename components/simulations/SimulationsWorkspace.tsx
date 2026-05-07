'use client'

import { useState, useTransition } from 'react'
import { XCircle, DollarSign, TrendingUp, CreditCard, AlertTriangle, ArrowRight, Loader2, Shield, ShieldAlert, ShieldX } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import {
    simulateCancelSubscriptionsAction,
    simulateExtraPaymentAction,
    simulateIncomeChangeAction,
    simulateCardPaymentChangeAction,
    simulateMinimumPaymentTrapAction,
} from '@/app/simulations/actions'
import {
    type SimulationResult,
    type RiskLevel,
} from '@/lib/simulation-engine'

interface SubItem { id: string; name: string; monthly: number }
interface DebtItem { id: string; name: string; balance: number }
interface CardItem { id: string; name: string; debt: number; minPayment: number }

interface Props {
    subscriptions: SubItem[]
    debts: DebtItem[]
    cards: CardItem[]
    currentCash: number
    currentMonthlyIncome: number
}

type Scenario = 'cancel_subs' | 'extra_payment' | 'income_change' | 'card_payment' | 'min_payment_trap' | null

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; icon: typeof Shield; bg: string }> = {
    LOW: { label: 'Düşük Risk', color: 'text-[color:var(--accent-success)]', icon: Shield, bg: 'bg-emerald-500/10 border-emerald-500/20' },
    MEDIUM: { label: 'Orta Risk', color: 'text-[color:var(--accent-warning)]', icon: Shield, bg: 'bg-amber-500/10 border-amber-500/20' },
    HIGH: { label: 'Yüksek Risk', color: 'text-orange-400', icon: ShieldAlert, bg: 'bg-orange-500/10 border-orange-500/20' },
    CRITICAL: { label: 'Kritik Risk', color: 'text-[color:var(--accent-danger)]', icon: ShieldX, bg: 'bg-red-500/10 border-red-500/20' },
}

export default function SimulationsWorkspace({ subscriptions, debts, cards, currentCash, currentMonthlyIncome }: Props) {
    const [scenario, setScenario] = useState<Scenario>(null)
    const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set())
    const [extraPaymentDebtId, setExtraPaymentDebtId] = useState('')
    const [extraPaymentAmount, setExtraPaymentAmount] = useState(0)
    const [newIncome, setNewIncome] = useState(currentMonthlyIncome)
    const [selectedCardId, setSelectedCardId] = useState('')
    const [cardPaymentAmount, setCardPaymentAmount] = useState(0)
    const [result, setResult] = useState<SimulationResult | null>(null)
    const [isPending, startTransition] = useTransition()

    const toggleSub = (id: string) => {
        const copy = new Set(selectedSubs)
        if (copy.has(id)) {
            copy.delete(id)
        } else {
            copy.add(id)
        }
        setSelectedSubs(copy)
    }

    function runSimulation() {
        startTransition(async () => {
            try {
                let res: SimulationResult | null = null
                switch (scenario) {
                    case 'cancel_subs':
                        res = await simulateCancelSubscriptionsAction(Array.from(selectedSubs))
                        break
                    case 'extra_payment':
                        res = await simulateExtraPaymentAction(extraPaymentDebtId, extraPaymentAmount)
                        break
                    case 'income_change':
                        res = await simulateIncomeChangeAction(newIncome)
                        break
                    case 'card_payment':
                        res = await simulateCardPaymentChangeAction(selectedCardId, cardPaymentAmount)
                        break
                    case 'min_payment_trap':
                        res = await simulateMinimumPaymentTrapAction()
                        break
                }
                setResult(res)
            } catch (e) {
                console.error('Simulation error:', e)
            }
        })
    }

    // Client-side hesaplamalar (sunucu çağrısı olmadan önizleme)
    const cancelSavings = subscriptions.filter((s) => selectedSubs.has(s.id)).reduce((sum, s) => sum + s.monthly, 0)
    const selectedDebt = debts.find((d) => d.id === extraPaymentDebtId)
    const selectedCard = cards.find((c) => c.id === selectedCardId)
    const incomeChange = newIncome - currentMonthlyIncome
    const totalCardDebt = cards.reduce((s, c) => s + c.debt, 0)

    return (
        <div>
            {/* Senaryo Seçimi */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                <button onClick={() => { setScenario('cancel_subs'); setResult(null) }} className={cn('fintech-card p-5 text-left transition-all', scenario === 'cancel_subs' ? 'border-red-400/40 bg-red-500/5' : 'hover:border-[var(--border-default)]')}>
                    <XCircle className="w-6 h-6 text-[color:var(--accent-danger)] mb-3" />
                    <h3 className="font-semibold text-white mb-1 text-sm">Abonelik İptali</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Seçili abonelikleri iptal etsem?</p>
                </button>
                <button onClick={() => { setScenario('extra_payment'); setResult(null) }} className={cn('fintech-card p-5 text-left transition-all', scenario === 'extra_payment' ? 'border-emerald-400/40 bg-emerald-500/5' : 'hover:border-[var(--border-default)]')}>
                    <DollarSign className="w-6 h-6 text-[color:var(--accent-success)] mb-3" />
                    <h3 className="font-semibold text-white mb-1 text-sm">Ekstra Borç Ödeme</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Bir borca ekstra ödeme yapsam?</p>
                </button>
                <button onClick={() => { setScenario('income_change'); setResult(null) }} className={cn('fintech-card p-5 text-left transition-all', scenario === 'income_change' ? 'border-sky-400/40 bg-sky-500/5' : 'hover:border-[var(--border-default)]')}>
                    <TrendingUp className="w-6 h-6 text-[color:var(--accent-info)] mb-3" />
                    <h3 className="font-semibold text-white mb-1 text-sm">Gelir Değişimi</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Gelirim artsa/azalsa?</p>
                </button>
                <button onClick={() => { setScenario('card_payment'); setResult(null) }} className={cn('fintech-card p-5 text-left transition-all', scenario === 'card_payment' ? 'border-violet-400/40 bg-violet-500/5' : 'hover:border-[var(--border-default)]')}>
                    <CreditCard className="w-6 h-6 text-violet-400 mb-3" />
                    <h3 className="font-semibold text-white mb-1 text-sm">Kart Ödeme</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Farklı tutar ödesem?</p>
                </button>
                <button onClick={() => { setScenario('min_payment_trap'); setResult(null) }} className={cn('fintech-card p-5 text-left transition-all', scenario === 'min_payment_trap' ? 'border-amber-400/40 bg-amber-500/5' : 'hover:border-[var(--border-default)]')}>
                    <AlertTriangle className="w-6 h-6 text-[color:var(--accent-warning)] mb-3" />
                    <h3 className="font-semibold text-white mb-1 text-sm">Asgari Ödeme Tuzağı</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sadece asgari ödesem?</p>
                </button>
            </div>

            {/* Senaryo Panelleri */}
            {scenario === 'cancel_subs' && (
                <div className="fintech-card p-6 mb-6">
                    <h2 className="font-semibold text-white mb-4">Abonelikleri Seç</h2>
                    {subscriptions.length === 0 ? (
                        <p className="text-zinc-500 text-sm">Aktif abonelik yok.</p>
                    ) : (
                        <div className="space-y-2 mb-6">
                            {subscriptions.map((sub) => (
                                <label key={sub.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] cursor-pointer transition-all">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" checked={selectedSubs.has(sub.id)} onChange={() => toggleSub(sub.id)} className="rounded" />
                                        <span className="text-white">{sub.name}</span>
                                    </div>
                                    <span className="text-sm text-zinc-400 privacy-blur">{formatCurrency(sub.monthly, 'TRY')}/ay</span>
                                </label>
                            ))}
                        </div>
                    )}
                    {selectedSubs.size > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-4">
                            <p className="text-[color:var(--accent-success)] font-semibold text-lg mb-1 privacy-blur">Aylık tasarruf: {formatCurrency(cancelSavings, 'TRY')}</p>
                            <p className="text-[color:var(--accent-success)]/70 text-sm privacy-blur">Yıllık tasarruf: {formatCurrency(cancelSavings * 12, 'TRY')}</p>
                        </div>
                    )}
                    {selectedSubs.size > 0 && <SimulateButton onClick={runSimulation} loading={isPending} />}
                </div>
            )}

            {scenario === 'extra_payment' && (
                <div className="fintech-card p-6 mb-6">
                    <h2 className="font-semibold text-white mb-4">Ekstra Ödeme Simülasyonu</h2>
                    {debts.length === 0 ? (
                        <p className="text-zinc-500 text-sm">Aktif borç yok.</p>
                    ) : (
                        <div className="space-y-4">
                            <select value={extraPaymentDebtId} onChange={(e) => setExtraPaymentDebtId(e.target.value)} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white">
                                <option value="">Borç seçin</option>
                                {debts.map((d) => <option key={d.id} value={d.id}>{d.name} ({formatCurrency(d.balance, 'TRY')})</option>)}
                            </select>
                            <input type="number" value={extraPaymentAmount || ''} onChange={(e) => setExtraPaymentAmount(Number(e.target.value))} placeholder="Ekstra ödeme tutarı" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
                            {selectedDebt && extraPaymentAmount > 0 && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
                                    <p className="text-white font-semibold mb-2">{selectedDebt.name}</p>
                                    <p className="text-zinc-400 text-sm privacy-blur">Borç: {formatCurrency(selectedDebt.balance, 'TRY')} → {formatCurrency(Math.max(0, selectedDebt.balance - extraPaymentAmount), 'TRY')}</p>
                                    <p className="text-zinc-400 text-sm privacy-blur">Nakit: {formatCurrency(currentCash, 'TRY')} → {formatCurrency(currentCash - extraPaymentAmount, 'TRY')}</p>
                                    {selectedDebt.balance <= extraPaymentAmount && <p className="text-[color:var(--accent-success)] font-semibold mt-2">🎉 Bu borç tamamen kapanır!</p>}
                                </div>
                            )}
                            {selectedDebt && extraPaymentAmount > 0 && <SimulateButton onClick={runSimulation} loading={isPending} />}
                        </div>
                    )}
                </div>
            )}

            {scenario === 'income_change' && (
                <div className="fintech-card p-6 mb-6">
                    <h2 className="font-semibold text-white mb-4">Gelir Değişimi Simülasyonu</h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">Mevcut aylık gelir</p>
                            <p className="text-xl font-bold text-white mb-4 privacy-blur">{formatCurrency(currentMonthlyIncome, 'TRY')}</p>
                        </div>
                        <input type="number" value={newIncome || ''} onChange={(e) => setNewIncome(Number(e.target.value))} placeholder="Yeni aylık gelir" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
                        {newIncome !== currentMonthlyIncome && (
                            <>
                                <div className={cn('rounded-2xl p-5 border', incomeChange >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20')}>
                                    <p className={cn('font-semibold text-lg mb-1 privacy-blur', incomeChange >= 0 ? 'text-[color:var(--accent-success)]' : 'text-[color:var(--accent-danger)]')}>
                                        {incomeChange >= 0 ? '+' : ''}{formatCurrency(incomeChange, 'TRY')}/ay
                                    </p>
                                    <p className="text-zinc-400 text-sm privacy-blur">Yıllık etki: {incomeChange >= 0 ? '+' : ''}{formatCurrency(incomeChange * 12, 'TRY')}</p>
                                </div>
                                <SimulateButton onClick={runSimulation} loading={isPending} />
                            </>
                        )}
                    </div>
                </div>
            )}

            {scenario === 'card_payment' && (
                <div className="fintech-card p-6 mb-6">
                    <h2 className="font-semibold text-white mb-4">Kart Ödeme Simülasyonu</h2>
                    {cards.length === 0 ? (
                        <p className="text-zinc-500 text-sm">Aktif kredi kartı yok.</p>
                    ) : (
                        <div className="space-y-4">
                            <select value={selectedCardId} onChange={(e) => setSelectedCardId(e.target.value)} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white">
                                <option value="">Kart seçin</option>
                                {cards.map((c) => <option key={c.id} value={c.id}>{c.name} (Borç: {formatCurrency(c.debt, 'TRY')})</option>)}
                            </select>
                            {selectedCard && (
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-[var(--bg-hover)] rounded-xl p-3">
                                        <p className="text-zinc-500 text-xs mb-1">Kart Borcu</p>
                                        <p className="text-white font-bold privacy-blur">{formatCurrency(selectedCard.debt, 'TRY')}</p>
                                    </div>
                                    <div className="bg-[var(--bg-hover)] rounded-xl p-3">
                                        <p className="text-zinc-500 text-xs mb-1">Asgari Ödeme</p>
                                        <p className="text-[color:var(--accent-warning)] font-bold privacy-blur">{formatCurrency(selectedCard.minPayment, 'TRY')}</p>
                                    </div>
                                </div>
                            )}
                            <input type="number" value={cardPaymentAmount || ''} onChange={(e) => setCardPaymentAmount(Number(e.target.value))} placeholder="Ödeme tutarı" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
                            {selectedCard && cardPaymentAmount > 0 && <SimulateButton onClick={runSimulation} loading={isPending} />}
                        </div>
                    )}
                </div>
            )}

            {scenario === 'min_payment_trap' && (
                <div className="fintech-card p-6 mb-6">
                    <h2 className="font-semibold text-white mb-4">Asgari Ödeme Tuzağı Analizi</h2>
                    <p className="text-zinc-400 text-sm mb-4">
                        Tüm kredi kartlarında sadece asgari ödeme yapılırsa 3 ay sonra pozisyonunuz ne olur?
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-[var(--bg-hover)] rounded-xl p-3">
                            <p className="text-zinc-500 text-xs mb-1">Toplam Kart Borcu</p>
                            <p className="text-white font-bold privacy-blur">{formatCurrency(totalCardDebt, 'TRY')}</p>
                        </div>
                        <div className="bg-[var(--bg-hover)] rounded-xl p-3">
                            <p className="text-zinc-500 text-xs mb-1">Aktif Kart</p>
                            <p className="text-white font-bold">{cards.length}</p>
                        </div>
                    </div>
                    <SimulateButton onClick={runSimulation} loading={isPending} label="Tuzak Analizi Çalıştır" />
                </div>
            )}

            {/* Sonuç Paneli */}
            {result && (
                <div className="fintech-card p-6 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-white">Simülasyon Sonucu</h2>
                        <RiskBadge level={result.riskLevel} />
                    </div>

                    {/* Öneri */}
                    <div className={cn('rounded-2xl p-5 mb-6 border', RISK_CONFIG[result.riskLevel].bg)}>
                        <p className="text-white text-sm leading-relaxed">{result.recommendation}</p>
                    </div>

                    {/* Mevcut vs Projeksiyon */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-[var(--bg-hover)] rounded-xl p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">Mevcut Durum</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-zinc-400">Nakit</span><span className="text-white font-medium privacy-blur">{formatCurrency(result.currentState.cash, 'TRY')}</span></div>
                                {result.currentState.totalDebt > 0 && <div className="flex justify-between"><span className="text-zinc-400">Borç</span><span className="text-[color:var(--accent-danger)] font-medium privacy-blur">{formatCurrency(result.currentState.totalDebt, 'TRY')}</span></div>}
                                {result.currentState.monthlyExpense > 0 && <div className="flex justify-between"><span className="text-zinc-400">Aylık Yük</span><span className="text-zinc-300 font-medium privacy-blur">{formatCurrency(result.currentState.monthlyExpense, 'TRY')}</span></div>}
                            </div>
                        </div>
                        <div className="bg-[var(--bg-hover)] rounded-xl p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">Projeksiyon</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Nakit</span>
                                    <span className={cn('font-medium privacy-blur', result.cashImpact >= 0 ? 'text-[color:var(--accent-success)]' : 'text-[color:var(--accent-danger)]')}>{formatCurrency(result.projectedState.cash, 'TRY')}</span>
                                </div>
                                {result.projectedState.totalDebt > 0 && <div className="flex justify-between"><span className="text-zinc-400">Borç</span><span className="text-[color:var(--accent-danger)] font-medium privacy-blur">{formatCurrency(result.projectedState.totalDebt, 'TRY')}</span></div>}
                            </div>
                        </div>
                    </div>

                    {/* 3 Aylık Projeksiyon */}
                    {result.projections && result.projections.length > 0 && (
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">3 Aylık Projeksiyon</p>
                            <div className="grid grid-cols-3 gap-3">
                                {result.projections.map((p, i) => (
                                    <div key={i} className="bg-[var(--bg-hover)] rounded-xl p-3 text-center">
                                        <p className="text-xs text-zinc-500 mb-2">{p.month}</p>
                                        <p className="text-sm font-bold text-white privacy-blur">{formatCurrency(p.cash, 'TRY')}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>nakit</p>
                                        {p.debt > 0 && (
                                            <>
                                                <p className="text-sm font-bold text-[color:var(--accent-danger)] mt-1 privacy-blur">{formatCurrency(p.debt, 'TRY')}</p>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>borç</p>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
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

function SimulateButton({ onClick, loading, label }: { onClick: () => void; loading: boolean; label?: string }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className="w-full mt-4 py-3.5 rounded-2xl bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-all disabled:bg-zinc-700 disabled:text-zinc-400 flex items-center justify-center gap-2"
        >
            {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Hesaplanıyor...</>
            ) : (
                <><ArrowRight className="w-4 h-4" /> {label ?? 'Simülasyonu Çalıştır'}</>
            )}
        </button>
    )
}

function RiskBadge({ level }: { level: RiskLevel }) {
    const config = RISK_CONFIG[level]
    const Icon = config.icon
    return (
        <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold', config.bg, config.color)}>
            <Icon className="w-3.5 h-3.5" />
            {config.label}
        </div>
    )
}
