'use client'

import { useState } from 'react'
import { Shield, TrendingDown, Snowflake, AlertTriangle, ChevronRight, CalendarClock, Flame, Target } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import type { PaymentPlan, Strategy } from '@/lib/debt-priority-engine'

const STRATEGY_META: Record<Strategy, { label: string; desc: string; icon: typeof Shield; color: string }> = {
    SAFE: { label: 'Güvenli Mod', desc: 'Asgari ödemeler + yaklaşan vadeler önce', icon: Shield, color: 'text-[color:var(--accent-info)]' },
    AVALANCHE: { label: 'Çığ Modu', desc: 'En yüksek faizli borç önce — toplam faiz minimize', icon: TrendingDown, color: 'text-[color:var(--accent-warning)]' },
    SNOWBALL: { label: 'Kartopu Modu', desc: 'En küçük borç önce — motivasyon etkisi', icon: Snowflake, color: 'text-[color:var(--accent-purple)]' },
    CASHFLOW: { label: 'Nakit Akışı', desc: 'Vadesi yakın ve ay içi baskısı yüksek borçlar önce', icon: CalendarClock, color: 'text-[color:var(--accent-info)]' },
    RISK: { label: 'Risk Öncelikli', desc: 'Gecikmiş, yüksek faizli, kart/KMH borçları önce', icon: Flame, color: 'text-[color:var(--accent-danger)]' },
    GOAL: { label: 'Hedef Odaklı', desc: 'Aktif hedeflere göre borç ödeme kapasitesini dengeler', icon: Target, color: 'text-[color:var(--accent-success)]' },
}

const RISK_META: Record<string, { label: string; color: string }> = {
    LOW: { label: 'Düşük Risk', color: 'text-[color:var(--accent-success)] bg-emerald-500/10' },
    MEDIUM: { label: 'Orta Risk', color: 'text-[color:var(--accent-warning)] bg-amber-500/10' },
    HIGH: { label: 'Yüksek Risk', color: 'text-[color:var(--accent-danger)] bg-red-500/10' },
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
            <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-4 mb-8">
                <div className="fintech-card p-4 lg:p-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Toplam Asgari</p>
                    <p className="text-xl lg:text-2xl font-bold text-[color:var(--accent-danger)] privacy-blur">{formatCurrency(plan.totalMinPayment, 'TRY')}</p>
                </div>
                <div className="fintech-card p-4 lg:p-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Kullanılabilir</p>
                    <p className="text-xl lg:text-2xl font-bold privacy-blur" style={{ color: 'var(--text-primary)' }}>{formatCurrency(plan.totalAvailable, 'TRY')}</p>
                </div>
                <div className="fintech-card p-4 lg:p-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Fazla / Açık</p>
                    <p className={cn('text-xl lg:text-2xl font-bold privacy-blur', plan.surplus >= 0 ? 'text-[color:var(--accent-success)]' : 'text-[color:var(--accent-danger)]')}>
                        {formatCurrency(plan.surplus, 'TRY')}
                    </p>
                </div>
                <div className="fintech-card p-4 lg:p-5 flex flex-col justify-between min-h-[92px]">
                    <p className="text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Risk</p>
                    <span className={cn('text-sm md:text-base font-bold px-3 py-1 rounded-xl w-fit', risk.color)}>{risk.label}</span>
                </div>
                <div className="fintech-card p-4 lg:p-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Tahmini bitiş</p>
                    <p className="text-base lg:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{plan.estimatedFinishDate ? new Date(plan.estimatedFinishDate).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }) : '-'}</p>
                </div>
                <div className="fintech-card p-4 lg:p-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Faiz tasarrufu</p>
                    <p className="text-base lg:text-lg font-bold text-[color:var(--accent-success)] privacy-blur">{formatCurrency(plan.interestSavingEstimate, 'TRY')}</p>
                </div>
            </div>

            <div className="fintech-card p-5 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)' }}>Strateji analizi</p>
                        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Bana en mantıklı plan: {STRATEGY_META[activeStrategy].label}</h2>
                        <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>{plan.rationale}</p>
                    </div>
                    <div className="text-sm min-w-[240px]">
                        <p style={{ color: 'var(--text-muted)' }}>Son 3 ay gelir ortalaması ve düzenli giderlerden sonra hesaplanan borç ödeme kapasitesi:</p>
                        <p className="text-2xl font-bold text-[color:var(--accent-success)] privacy-blur mt-1">{formatCurrency(plan.monthlyDebtBudget, 'TRY')}</p>
                    </div>
                </div>
            </div>

            {/* Uyarılar */}
            {plan.warnings.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 space-y-2">
                    {plan.warnings.map((w, i) => (
                        <p key={i} className="flex items-start gap-2 text-sm text-[color:var(--accent-danger)]">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {w}
                        </p>
                    ))}
                </div>
            )}

            {/* Strateji Seçimi */}
            <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-4 mb-8">
                {(['SAFE', 'AVALANCHE', 'SNOWBALL', 'CASHFLOW', 'RISK', 'GOAL'] as Strategy[]).map((s) => {
                    const meta = STRATEGY_META[s]
                    const Icon = meta.icon
                    const isActive = activeStrategy === s
                    return (
                        <button
                            key={s}
                            onClick={() => setActiveStrategy(s)}
                            className={cn(
                                'fintech-card p-5 text-left transition-all w-full cursor-pointer',
                                isActive ? 'border-white/30 bg-[var(--bg-active)]' : 'opacity-60 hover:opacity-80'
                            )}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <Icon className={cn('w-5 h-5 shrink-0', meta.color)} />
                                <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{meta.label}</h3>
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{meta.desc}</p>
                        </button>
                    )
                })}
            </div>

            {/* Ödeme Planı Listesi */}
            {plan.items.length === 0 ? (
                <div className="fintech-card p-16 text-center" style={{ color: 'var(--text-secondary)' }}>
                    Aktif borcunuz bulunmuyor. 🎉
                </div>
            ) : (
                <div className="space-y-3">
                    {plan.items.map((item) => (
                        <div key={item.id} className="fintech-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {item.priority}
                                </div>
                                <div>
                                    <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.name}</h4>
                                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                                        <span>{item.type === 'credit_card' ? 'Kredi Kartı' : item.type === 'debt' ? 'Borç' : 'Verecek'}</span>
                                        {item.interestRate > 0 && <span>%{item.interestRate} faiz</span>}
                                        {item.dueDate && <span className="privacy-blur">Vade: {new Date(item.dueDate).toLocaleDateString('tr-TR')}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Borç</p>
                                    <p className="font-bold privacy-blur" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.balance, 'TRY')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Asgari</p>
                                    <p className="font-semibold privacy-blur" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(item.minPayment, 'TRY')}</p>
                                </div>
                                <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                <div className="text-right">
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Önerilen</p>
                                    <p className="font-bold text-[color:var(--accent-success)] privacy-blur">{formatCurrency(item.suggestedPayment, 'TRY')}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
