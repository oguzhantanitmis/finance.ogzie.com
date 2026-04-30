import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Sparkles, TrendingUp, ArrowRight } from 'lucide-react'

import type { DashboardInsight } from '@/lib/dashboard-insights'

const TYPE_META = {
    ALERT: {
        icon: AlertTriangle,
        accentVar: '--accent-danger',
        bgVar: '--accent-danger-bg',
        borderVar: '--accent-danger-border',
    },
    WARNING: {
        icon: TrendingUp,
        accentVar: '--accent-warning',
        bgVar: '--accent-warning-bg',
        borderVar: '--accent-warning-border',
    },
    INFO: {
        icon: Sparkles,
        accentVar: '--accent-info',
        bgVar: '--accent-info-bg',
        borderVar: '--accent-info-border',
    },
    SUCCESS: {
        icon: CheckCircle2,
        accentVar: '--accent-success',
        bgVar: '--accent-success-bg',
        borderVar: '--accent-success-border',
    },
}

export default function DashboardInsights({ insights }: { insights: DashboardInsight[] }) {
    return (
        <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-purple-bg)' }}>
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
                </div>
                <div>
                    <h2 className="font-semibold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        Akıllı Finansal İçgörüler
                    </h2>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {insights.length} öneri tespit edildi
                    </span>
                </div>
            </div>

            {insights.length === 0 ? (
                <div className="fintech-card p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                    <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm">
                        Bu bölüm için yeterli veri bulunamadı. Yeni kayıtlar geldikçe öneriler burada görünecek.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
                    {insights.map((insight) => {
                        const meta = TYPE_META[insight.type]
                        const Icon = meta.icon
                        return (
                            <div
                                key={insight.id}
                                className="fintech-card p-5 flex flex-col relative overflow-hidden group"
                                style={{
                                    background: `var(${meta.bgVar})`,
                                    borderColor: `var(${meta.borderVar})`,
                                }}
                            >
                                {/* Accent top line */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
                                    style={{ background: `var(${meta.accentVar})` }}
                                />

                                <div className="flex items-center gap-3 mb-3">
                                    <div
                                        className="p-2 rounded-lg"
                                        style={{
                                            background: `var(${meta.bgVar})`,
                                            color: `var(${meta.accentVar})`,
                                        }}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <h3
                                        className="font-semibold text-[14px] leading-tight"
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        {insight.title}
                                    </h3>
                                </div>

                                <p className="text-[13px] leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>
                                    {insight.content}
                                </p>

                                {insight.href && insight.actionLabel ? (
                                    <Link
                                        href={insight.href}
                                        className="inline-flex items-center gap-2 text-[13px] font-medium mt-4 group/link transition-colors cursor-pointer"
                                        style={{ color: `var(${meta.accentVar})` }}
                                    >
                                        {insight.actionLabel}
                                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
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
