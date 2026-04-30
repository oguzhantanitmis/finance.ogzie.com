'use client'

import React, { useEffect, useState } from 'react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts'
import { useFinance } from './FinanceContext'
import { cn } from '@/lib/utils'
import { TrendingUp, PieChart as PieChartIcon } from 'lucide-react'

const CHART_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
    'var(--chart-6)',
]

/* Resolved CSS variable colors for Recharts (needs actual hex at render) */
function useCSSVar(varName: string, fallback: string) {
    const [value, setValue] = useState(fallback)
    useEffect(() => {
        const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
        if (computed) setValue(computed)
    }, [varName])
    return value
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div
                className="px-4 py-3 rounded-xl shadow-2xl border text-sm"
                style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-default)',
                }}
            >
                <p className="text-xs mb-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(payload[0].value)}
                </p>
            </div>
        )
    }
    return null
}

const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div
                className="px-4 py-3 rounded-xl shadow-2xl border text-sm"
                style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-default)',
                }}
            >
                <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>{payload[0].name}</p>
                <p className="font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(payload[0].value)}
                </p>
            </div>
        )
    }
    return null
}

export default function DashboardCharts({ history, distribution }: { history: any[], distribution: any[] }) {
    const [mounted, setMounted] = useState(false)
    const { hideAmounts } = useFinance()

    const primaryColor = useCSSVar('--chart-1', '#3b82f6')
    const gridColor = useCSSVar('--chart-grid', 'rgba(255,255,255,0.05)')
    const textMuted = useCSSVar('--text-muted', '#52525b')

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 fintech-card p-6">
                    <div className="h-[300px] w-full rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
                </div>
                <div className="fintech-card p-6">
                    <div className="h-[300px] w-full rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
                </div>
            </div>
        )
    }

    const totalDistribution = distribution.reduce((a, b) => a + b.value, 0)

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Net Worth History */}
            <div className="lg:col-span-2 fintech-card p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-info-bg)' }}>
                        <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent-info)' }} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Net Değer Gelişimi</h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aylık bakiye trendi</p>
                    </div>
                </div>

                {history.length === 0 ? (
                    <div className="h-[280px] flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                        <p className="text-sm">Henüz yeterli geçmiş verisi yok.</p>
                    </div>
                ) : (
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={primaryColor} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: textMuted, fontSize: 11 }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={primaryColor}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                    dot={false}
                                    activeDot={{ r: 5, stroke: primaryColor, strokeWidth: 2, fill: 'var(--bg-card)' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Distribution */}
            <div className="fintech-card p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-purple-bg)' }}>
                        <PieChartIcon className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Varlık Dağılımı</h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Portföy oranları</p>
                    </div>
                </div>

                {distribution.length === 0 ? (
                    <div className="h-[240px] flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                        <p className="text-sm">Veri bulunamadı.</p>
                    </div>
                ) : (
                    <>
                        <div className="h-[200px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={distribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={78}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {distribution.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={`var(--chart-${(index % 6) + 1})`} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                                    Dağılım
                                </span>
                                <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Portföy</span>
                            </div>
                        </div>

                        <div className="mt-4 space-y-2.5">
                            {distribution.map((item, index) => {
                                const pct = totalDistribution > 0 ? Math.round((item.value / totalDistribution) * 100) : 0
                                return (
                                    <div key={item.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2.5">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: `var(--chart-${(index % 6) + 1})` }}
                                            />
                                            <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Progress mini bar */}
                                            <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${pct}%`,
                                                        background: `var(--chart-${(index % 6) + 1})`,
                                                    }}
                                                />
                                            </div>
                                            <span className={cn("font-semibold tabular-nums", hideAmounts && "blur-sm")} style={{ color: 'var(--text-primary)' }}>
                                                %{pct}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
