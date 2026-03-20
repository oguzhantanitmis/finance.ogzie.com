import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react'

import type { DashboardInsight } from '@/lib/dashboard-insights'

const TYPE_META = {
    ALERT: {
        icon: AlertTriangle,
        cardClassName: 'border-red-500/20 bg-red-500/5',
        iconClassName: 'bg-red-500/15 text-red-400',
    },
    WARNING: {
        icon: TrendingUp,
        cardClassName: 'border-amber-500/20 bg-amber-500/5',
        iconClassName: 'bg-amber-500/15 text-amber-400',
    },
    INFO: {
        icon: Sparkles,
        cardClassName: 'border-white/8 bg-white/[0.03]',
        iconClassName: 'bg-white/10 text-white',
    },
    SUCCESS: {
        icon: CheckCircle2,
        cardClassName: 'border-emerald-500/20 bg-emerald-500/5',
        iconClassName: 'bg-emerald-500/15 text-emerald-400',
    },
}

export default function DashboardInsights({ insights }: { insights: DashboardInsight[] }) {
    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-zinc-400" />
                <h2 className="font-semibold text-lg tracking-tight">Akıllı Finansal İçgörüler</h2>
                <span className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
                    {insights.length} öneri
                </span>
            </div>

            {insights.length === 0 ? (
                <div className="fintech-card p-6 text-center text-zinc-400">
                    Bu bölüm için yeterli veri bulunamadı. Yeni kayıtlar geldikçe öneriler burada görünecek.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {insights.map((insight) => {
                        const meta = TYPE_META[insight.type]
                        const Icon = meta.icon
                        return (
                            <div key={insight.id} className={`fintech-card p-5 flex flex-col ${meta.cardClassName}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-lg ${meta.iconClassName}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <h3 className="font-semibold text-[15px]">{insight.title}</h3>
                                </div>
                                <p className="text-sm text-zinc-400 leading-relaxed flex-1">{insight.content}</p>
                                {insight.href && insight.actionLabel ? (
                                    <Link href={insight.href} className="inline-flex items-center gap-2 text-sm text-white mt-4">
                                        {insight.actionLabel} →
                                    </Link>
                                ) : null}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
