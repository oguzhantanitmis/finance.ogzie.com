'use client'

import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreakdownItem {
    score: number; weight: number; detail: string
}

interface Props {
    result: {
        score: number
        level: string
        isReady: boolean
        breakdown: Record<string, BreakdownItem>
        improvements: string[]
        trend: 'improving' | 'declining' | 'stable'
    }
}

const CRITERIA_LABELS: Record<string, string> = {
    creditUtilization: 'Kart Limit Kullanımı',
    debtToIncomeRatio: 'Borç / Gelir Oranı',
    minPaymentDependency: 'Asgari Ödeme Bağımlılığı',
    overduePayments: 'Geciken Ödemeler',
    fixedExpenseRatio: 'Sabit Gider Yükü',
    monthlyCashSurplus: 'Aylık Nakit Fazlası',
}

const LEVEL_LABELS: Record<string, { text: string; color: string }> = {
    EXCELLENT: { text: 'Mükemmel', color: 'text-emerald-400' },
    GOOD: { text: 'İyi', color: 'text-sky-400' },
    MODERATE: { text: 'Orta', color: 'text-amber-400' },
    HIGH: { text: 'Yüksek Risk', color: 'text-red-400' },
    CRITICAL: { text: 'Kritik', color: 'text-red-500' },
}

export default function HealthScoreWorkspace({ result }: Props) {
    const levelMeta = LEVEL_LABELS[result.level] ?? LEVEL_LABELS.MODERATE

    if (!result.isReady) {
        return (
            <div className="fintech-card p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-5">
                    <Activity className="w-7 h-7 text-zinc-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Sağlık puanı için veri yetersiz</h2>
                <p className="text-zinc-400 max-w-2xl mx-auto leading-7">
                    Gelir, borç, kart, hesap veya düzenli gider verisi olmadan gerçek zamanlı finansal sağlık puanı üretmiyorum.
                </p>
                <div className="mt-6 space-y-2">
                    {result.improvements.map((tip, i) => (
                        <p key={i} className="text-sm text-zinc-300">• {tip}</p>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div>
            {/* Ana Skor */}
            <div className="fintech-card p-8 flex flex-col items-center mb-8">
                <div className="relative w-40 h-40 mb-6">
                    <svg className="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                        <circle cx="50" cy="50" r="42" fill="none"
                            stroke={result.score >= 80 ? '#34d399' : result.score >= 60 ? '#38bdf8' : result.score >= 40 ? '#fbbf24' : '#f87171'}
                            strokeWidth="6" strokeLinecap="round"
                            strokeDasharray={`${result.score * 2.64} 264`}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-white privacy-blur">{result.score}</span>
                        <span className="text-xs text-zinc-500">/100</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={cn('text-xl font-bold', levelMeta.color)}>{levelMeta.text}</span>
                    {result.trend === 'improving' && <TrendingUp className="w-5 h-5 text-emerald-400" />}
                    {result.trend === 'declining' && <TrendingDown className="w-5 h-5 text-red-400" />}
                    {result.trend === 'stable' && <Minus className="w-5 h-5 text-zinc-400" />}
                </div>
            </div>

            {/* Kriter Detayları */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                {Object.entries(result.breakdown).map(([key, item]) => {
                    const barColor = item.score >= 70 ? 'bg-emerald-400' : item.score >= 40 ? 'bg-amber-400' : 'bg-red-400'
                    return (
                        <div key={key} className="fintech-card p-5">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-white">{CRITERIA_LABELS[key] ?? key}</h3>
                                <span className="text-xs text-zinc-500">%{item.weight} ağırlık</span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full mb-2">
                                <div className={cn('h-full rounded-full', barColor)} style={{ width: `${item.score}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400 privacy-blur">{item.detail}</span>
                                <span className="font-semibold text-white privacy-blur">{item.score}/100</span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* İyileştirme Önerileri */}
            <div className="fintech-card p-6">
                <h2 className="font-semibold text-white mb-4">İyileştirme Önerileri</h2>
                <div className="space-y-3">
                    {result.improvements.map((tip, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                            <Activity className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                            <p className="text-zinc-300">{tip}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
