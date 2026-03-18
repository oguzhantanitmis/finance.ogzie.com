'use client'

import { useState } from 'react'
import { Shield, TrendingDown, Snowflake, AlertTriangle, ChevronRight } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import type { PaymentPlan, Strategy } from '@/lib/debt-priority-engine'

const STRATEGY_META: Record<Strategy, { label: string; desc: string; icon: typeof Shield; color: string }> = {
    SAFE: { label: 'Güvenli Mod', desc: 'Asgari ödemeler + yaklaşan vadeler önce', icon: Shield, color: 'text-sky-400' },
    AVALANCHE: { label: 'Çığ Modu', desc: 'En yüksek faizli borç önce — toplam faiz minimize', icon: TrendingDown, color: 'text-amber-400' },
    SNOWBALL: { label: 'Kartopu Modu', desc: 'En küçük borç önce — motivasyon etkisi', icon: Snowflake, color: 'text-purple-400' },
}

const RISK_META: Record<string, { label: string; color: string }> = {
    LOW: { label: 'Düşük Risk', color: 'text-emerald-400 bg-emerald-500/10' },
    MEDIUM: { label: 'Orta Risk', color: 'text-amber-400 bg-amber-500/10' },
    HIGH: { label: 'Yüksek Risk', color: 'text-red-400 bg-red-500/10' },
    CRITICAL: { label: 'Kritik', color: 'text-red-500 bg-red-500/20' },
}

interface Props {
    plans: Record<Strategy, PaymentPlan>
}

export default function PaymentPlanWorkspace({ plans }: Props) {
    const [activeStrategy, setActiveStrategy] = useState<Strategy>('SAFE')
    const plan = plans[activeStrategy]
    const risk = RISK_META[plan.riskLevel]

    return (
        <div>
            {/* Özet */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Toplam Asgari</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(plan.totalMinPayment, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Kullanılabilir</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(plan.totalAvailable, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Fazla / Açık</p>
                    <p className={cn('text-2xl font-bold', plan.surplus >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatCurrency(plan.surplus, 'TRY')}
                    </p>
                </div>
                <div className="fintech-card p-5 flex flex-col justify-between">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Risk</p>
                    <span className={cn('text-lg font-bold px-3 py-1 rounded-xl w-fit', risk.color)}>{risk.label}</span>
                </div>
            </div>

            {/* Uyarılar */}
            {plan.warnings.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 space-y-2">
                    {plan.warnings.map((w, i) => (
                        <p key={i} className="flex items-start gap-2 text-sm text-red-400">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {w}
                        </p>
                    ))}
                </div>
            )}

            {/* Strateji Seçimi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {(['SAFE', 'AVALANCHE', 'SNOWBALL'] as Strategy[]).map((s) => {
                    const meta = STRATEGY_META[s]
                    const Icon = meta.icon
                    const isActive = activeStrategy === s
                    return (
                        <button
                            key={s}
                            onClick={() => setActiveStrategy(s)}
                            className={cn(
                                'fintech-card p-5 text-left transition-all',
                                isActive ? 'border-white/30' : 'opacity-60 hover:opacity-80'
                            )}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <Icon className={cn('w-5 h-5', meta.color)} />
                                <h3 className="font-semibold text-white">{meta.label}</h3>
                            </div>
                            <p className="text-xs text-zinc-500">{meta.desc}</p>
                        </button>
                    )
                })}
            </div>

            {/* Ödeme Planı Listesi */}
            {plan.items.length === 0 ? (
                <div className="fintech-card p-16 text-center text-zinc-400">
                    Aktif borcunuz bulunmuyor. 🎉
                </div>
            ) : (
                <div className="space-y-3">
                    {plan.items.map((item) => (
                        <div key={item.id} className="fintech-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                                    {item.priority}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white">{item.name}</h4>
                                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                                        <span>{item.type === 'credit_card' ? 'Kredi Kartı' : item.type === 'debt' ? 'Borç' : 'Verecek'}</span>
                                        {item.interestRate > 0 && <span>%{item.interestRate} faiz</span>}
                                        {item.dueDate && <span>Vade: {new Date(item.dueDate).toLocaleDateString('tr-TR')}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500">Borç</p>
                                    <p className="font-bold text-white">{formatCurrency(item.balance, 'TRY')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500">Asgari</p>
                                    <p className="font-semibold text-zinc-400">{formatCurrency(item.minPayment, 'TRY')}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-600" />
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500">Önerilen</p>
                                    <p className="font-bold text-emerald-400">{formatCurrency(item.suggestedPayment, 'TRY')}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
