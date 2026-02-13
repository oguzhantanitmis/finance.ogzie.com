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

const COLORS = ['#ffffff', '#2a2a2a', '#3f3f3f', '#525252', '#737373']

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-xl shadow-2xl">
                <p className="text-xs text-zinc-500 mb-1">{label}</p>
                <p className="text-sm font-bold">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(payload[0].value)}</p>
            </div>
        )
    }
    return null
}

export default function DashboardCharts({ history, distribution }: { history: any[], distribution: any[] }) {
    const [mounted, setMounted] = useState(false)
    const { hideAmounts } = useFinance()

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return <div className="h-[300px] w-full bg-zinc-900/10 animate-pulse rounded-2xl" />

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Net Worth History */}
            <div className="lg:col-span-2 fintech-card p-6">
                <h3 className="text-sm font-medium text-zinc-500 mb-6">Net Değer Gelişimi</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a1a1a" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#525252', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis hide />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#ffffff"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Distribution */}
            <div className="fintech-card p-6">
                <h3 className="text-sm font-medium text-zinc-500 mb-6">Varlık Dağılımı</h3>
                <div className="h-[240px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={distribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {distribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Dağılım</span>
                        <span className="text-lg font-bold">Portföy</span>
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    {distribution.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="text-zinc-400">{item.name}</span>
                            </div>
                            <span className={cn("font-medium", hideAmounts && "blur-sm")}>
                                %{Math.round((item.value / distribution.reduce((a, b) => a + b.value, 0)) * 100)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
