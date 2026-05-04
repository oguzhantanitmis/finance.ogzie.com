'use client'

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts'
import { useFinance } from './FinanceContext'
import { cn } from '@/lib/utils'

const COLORS = ['#ffffff', '#2a2a2a', '#3f3f3f', '#525252', '#737373', '#9ca3af', '#d4d4d8']
const DEBT_COLORS = ['#ef4444', '#b91c1c', '#7f1d1d', '#f87171', '#fca5a5']

type DistributionItem = {
    name: string
    value: number
}

type TooltipPayload = {
    name?: string
    value?: number
    payload?: DistributionItem
}

type ChartTooltipProps = {
    active?: boolean
    payload?: TooltipPayload[]
    hideAmounts: boolean
}

function ChartTooltip({ active, payload, hideAmounts }: ChartTooltipProps) {
    if (!active || !payload?.length) return null

    const item = payload[0]
    const name = item.name ?? item.payload?.name ?? ''
    const value = item.value ?? item.payload?.value ?? 0

    return (
        <div
            className="p-3 rounded-xl shadow-2xl"
            style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
            }}
        >
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{name}</p>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {hideAmounts ? '***' : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value)}
            </p>
        </div>
    )
}

function AmountTooltip({ active, payload, hideAmounts }: ChartTooltipProps) {
    if (!active || !payload?.length) return null

    const value = payload[0].value ?? 0

    return (
        <div
            className="p-3 rounded-xl shadow-xl"
            style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
            }}
        >
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {hideAmounts ? '***' : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value)}
            </p>
        </div>
    )
}

export default function AnalyticsCharts({
    assetDistribution,
    debtDistribution,
}: {
    assetDistribution: DistributionItem[]
    debtDistribution: DistributionItem[]
    conversionRates?: unknown
}) {
    const { hideAmounts } = useFinance()

    const totalAssets = assetDistribution.reduce((acc, curr) => acc + curr.value, 0)
    const totalDebts = debtDistribution.reduce((acc, curr) => acc + curr.value, 0)

    const comparisonData = [
        { name: 'Varlıklar', amount: totalAssets },
        { name: 'Borçlar', amount: totalDebts }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Asset Distribution */}
            <div className="fintech-card p-6">
                <h3 className="text-lg font-medium mb-6">Varlık Dağılımı</h3>
                <div className="h-[300px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={assetDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={110}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {assetDistribution.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip hideAmounts={hideAmounts} />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Toplam Varlık</span>
                        <span className={cn("text-2xl font-bold", hideAmounts && "blur-md")}>
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(totalAssets)}
                        </span>
                    </div>
                </div>
                <div className="mt-6 space-y-3">
                    {assetDistribution.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="text-zinc-300">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-zinc-500 text-xs">%{Math.round((item.value / totalAssets) * 100)}</span>
                                <span className={cn("font-medium", hideAmounts && "blur-sm")}>
                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(item.value)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Debt Distribution */}
            <div className="fintech-card p-6">
                <h3 className="text-lg font-medium mb-6">Borç Dağılımı</h3>
                <div className="h-[300px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={debtDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={110}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {debtDistribution.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={DEBT_COLORS[index % DEBT_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip hideAmounts={hideAmounts} />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Toplam Borç</span>
                        <span className={cn("text-2xl font-bold text-red-500", hideAmounts && "blur-md")}>
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(totalDebts)}
                        </span>
                    </div>
                </div>
                <div className="mt-6 space-y-3">
                    {debtDistribution.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEBT_COLORS[index % DEBT_COLORS.length] }} />
                                <span className="text-zinc-300">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-zinc-500 text-xs">%{Math.round((item.value / (totalDebts || 1)) * 100)}</span>
                                <span className={cn("font-medium", hideAmounts && "blur-sm")}>
                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(item.value)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Comparison Bar Chart */}
            <div className="fintech-card p-6 md:col-span-2">
                <h3 className="text-lg font-medium mb-6">Varlık vs Borç Durumu</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData} layout="vertical" barSize={40}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--chart-grid)" />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-secondary)' }} width={100} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                content={<AmountTooltip hideAmounts={hideAmounts} />}
                            />
                            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                                {comparisonData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#ffffff' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
