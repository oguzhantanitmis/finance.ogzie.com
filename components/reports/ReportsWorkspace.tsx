'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
    Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { LucideIcon } from 'lucide-react'
import {
    ArrowDownLeft, ArrowUpRight, Calendar, CreditCard, Flame,
    Layers, Minus, Receipt, ShieldAlert, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react'

import { cn, formatCurrency } from '@/lib/utils'

// ─── Tipler ───────────────────────────────────────────────────────────────
interface Bundle {
    monthly: { month: string; income: number; expense: number; net: number }[]
    expenses: { type: string; amount: number }[]
    netWorthHistory: { date: string; netWorth: number; score: number; totalAssets?: number; totalDebts?: number }[]
    dashboard: {
        kpis: {
            income: number; expense: number; collections: number; debtPayments: number
            cardPayments: number; interestPaid: number; kmhCost: number; netCashFlow: number
            overdueCount: number; upcomingCount: number
        }
        receivables: { id: string; person: string; title: string; remaining: number; overdueInstallments: number }[]
        payables:    { id: string; person: string; title: string; remaining: number; overdueInstallments: number }[]
        cards:       { id: string; name: string; bankName: string; currentDebt: number; utilization: number; minimumPayment: number; dueDate: string | null }[]
        people:      { id: string; name: string; receivable: number; payable: number; net: number }[]
    } | null
    category: { category: string; amount: number }[]
    daily: { date: string; income: number; expense: number; net: number }[]
    comparison: {
        thisMonth: { income: number; expense: number; net: number; txCount: number }
        lastMonth: { income: number; expense: number; net: number; txCount: number }
        change: { income: number; expense: number; net: number; txCount: number }
    } | null
    topDays: {
        topIncomeDays:  { date: string; income: number; expense: number }[]
        topExpenseDays: { date: string; income: number; expense: number }[]
    }
    typeMix: { type: string; amount: number; percent: number }[]
}

const TYPE_LABEL: Record<string, string> = {
    INCOME: 'Gelir', EXPENSE: 'Gider', COLLECTION: 'Tahsilat', PAYMENT_TO_PERSON: 'Kişiye Ödeme',
    CARD_PAYMENT: 'Kart Ödemesi', SUBSCRIPTION_PAYMENT: 'Abonelik', DEBT_PAYMENT: 'Borç Ödemesi',
    TRANSFER: 'Transfer', BALANCE_ADJUSTMENT: 'Bakiye Düzeltme', RECURRING_PAYMENT: 'Sabit Gider',
    RECEIVABLE_COLLECTED: 'Alacak Tahsilatı', PAYABLE_PAID: 'Verecek Ödendi',
}

const CHART_COLORS = [
    'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
    'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)',
    '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
]

function formatMonthLabel(month: string) {
    const [y, m] = month.split('-')
    const names = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
    return `${names[Number(m) - 1]} ${y.slice(2)}`
}

function formatDayLabel(date: string) {
    const d = new Date(date)
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

// ─── Yardımcı: Premium tooltip ────────────────────────────────────────────
type TooltipPayload = { name?: string; value?: number; color?: string; dataKey?: string; payload?: Record<string, unknown> }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
    if (!active || !payload || payload.length === 0) return null
    return (
        <div className="fintech-card fintech-card-elevated px-3 py-2.5 text-xs"
            style={{ background: 'var(--bg-card)', minWidth: '160px' }}>
            {label && <p className="font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{label}</p>}
            <div className="space-y-1">
                {payload.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                        </span>
                        <span className="tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {typeof p.value === 'number' ? formatCurrency(p.value, 'TRY') : p.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── KPI Kartı ────────────────────────────────────────────────────────────
function KpiCard({
    label, value, delta, icon: Icon, tone, isCount = false,
}: {
    label: string
    value: number
    delta?: number
    icon: LucideIcon
    tone: 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'neutral'
    isCount?: boolean
}) {
    const colorMap: Record<typeof tone, string> = {
        success: 'var(--accent-success)',
        danger:  'var(--accent-danger)',
        warning: 'var(--accent-warning)',
        info:    'var(--accent-info)',
        purple:  'var(--accent-purple)',
        neutral: 'var(--text-primary)',
    }
    const bgMap: Record<typeof tone, string> = {
        success: 'var(--accent-success-bg)',
        danger:  'var(--accent-danger-bg)',
        warning: 'var(--accent-warning-bg)',
        info:    'var(--accent-info-bg)',
        purple:  'var(--accent-purple-bg)',
        neutral: 'var(--bg-elevated)',
    }

    const TrendIcon = delta === undefined ? null : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
    const trendColor = delta === undefined ? undefined : delta > 0 ? 'var(--accent-success)' : delta < 0 ? 'var(--accent-danger)' : 'var(--text-muted)'

    return (
        <div className="fintech-card p-5 hover:border-[var(--border-hover)] transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: bgMap[tone] }}
                >
                    <Icon className="w-4 h-4" style={{ color: colorMap[tone] }} />
                </div>
                {delta !== undefined && TrendIcon && (
                    <span className="flex items-center gap-0.5 text-xs font-semibold tabular-nums" style={{ color: trendColor }}>
                        <TrendIcon className="w-3 h-3" />
                        {Math.abs(delta).toFixed(1)}%
                    </span>
                )}
            </div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                {label}
            </p>
            <p className={cn('text-2xl font-bold tabular-nums', !isCount && 'privacy-blur')}
                style={{ color: colorMap[tone] }}>
                {isCount ? value : formatCurrency(value, 'TRY')}
            </p>
        </div>
    )
}

// ─── Kart sarmalayıcı ─────────────────────────────────────────────────────
function ChartCard({
    title, subtitle, icon: Icon, iconTone = 'info', children, className,
}: {
    title: string
    subtitle?: string
    icon?: LucideIcon
    iconTone?: 'info' | 'success' | 'danger' | 'warning' | 'purple'
    children: React.ReactNode
    className?: string
}) {
    const bgMap = {
        info: 'var(--accent-info-bg)', success: 'var(--accent-success-bg)',
        danger: 'var(--accent-danger-bg)', warning: 'var(--accent-warning-bg)',
        purple: 'var(--accent-purple-bg)',
    }
    const fgMap = {
        info: 'var(--accent-info)', success: 'var(--accent-success)',
        danger: 'var(--accent-danger)', warning: 'var(--accent-warning)',
        purple: 'var(--accent-purple)',
    }
    return (
        <div className={cn('fintech-card p-6', className)}>
            <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    {Icon && (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bgMap[iconTone] }}>
                            <Icon className="w-4 h-4" style={{ color: fgMap[iconTone] }} />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
                    </div>
                </div>
            </div>
            {children}
        </div>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex items-center justify-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
            {message}
        </div>
    )
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────
export default function ReportsWorkspace({
    bundle, periodMonths,
}: {
    bundle: Bundle
    periodMonths: number
}) {
    const router = useRouter()
    const params = useSearchParams()

    function changePeriod(p: 3 | 6 | 12) {
        const next = new URLSearchParams(params.toString())
        next.set('p', String(p))
        router.push(`/reports?${next.toString()}`)
    }

    // ─── Türetilmiş veri ──────────────────────────────────────────────────
    const monthlyChartData = useMemo(
        () => bundle.monthly.map(m => ({
            month: formatMonthLabel(m.month),
            Gelir: m.income,
            Gider: m.expense,
            Net: m.net,
        })),
        [bundle.monthly]
    )

    const dailyChartData = useMemo(
        () => bundle.daily.map(d => ({
            date: formatDayLabel(d.date),
            Gelir: d.income,
            Gider: d.expense,
            Net: d.net,
        })),
        [bundle.daily]
    )

    const netWorthChartData = useMemo(
        () => bundle.netWorthHistory.slice(-30).map(s => ({
            date: formatDayLabel(s.date),
            Varlık: s.totalAssets ?? 0,
            Borç: s.totalDebts ?? 0,
            Net: s.netWorth,
            Skor: s.score,
        })),
        [bundle.netWorthHistory]
    )

    const categoryData = useMemo(
        () => bundle.category.slice(0, 8).map(c => ({
            category: c.category.length > 20 ? c.category.slice(0, 18) + '…' : c.category,
            amount: c.amount,
        })),
        [bundle.category]
    )

    const typeMixData = useMemo(
        () => bundle.typeMix.slice(0, 6).map(t => ({
            name: TYPE_LABEL[t.type] ?? t.type,
            value: t.amount,
            percent: t.percent,
        })),
        [bundle.typeMix]
    )

    const totalIncome  = bundle.monthly.reduce((s, m) => s + m.income, 0)
    const totalExpense = bundle.monthly.reduce((s, m) => s + m.expense, 0)
    const totalNet     = totalIncome - totalExpense
    const savingRate   = totalIncome > 0 ? (totalNet / totalIncome) * 100 : 0

    return (
        <div className="space-y-6">

            {/* ═══════════ HERO METRICS — Bu ay vs Geçen ay ═══════════ */}
            {bundle.comparison && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                        label="Bu Ay Gelir"
                        value={bundle.comparison.thisMonth.income}
                        delta={bundle.comparison.change.income}
                        icon={ArrowDownLeft}
                        tone="success"
                    />
                    <KpiCard
                        label="Bu Ay Gider"
                        value={bundle.comparison.thisMonth.expense}
                        delta={bundle.comparison.change.expense}
                        icon={ArrowUpRight}
                        tone="danger"
                    />
                    <KpiCard
                        label="Net Akış"
                        value={bundle.comparison.thisMonth.net}
                        delta={bundle.comparison.change.net}
                        icon={TrendingUp}
                        tone={bundle.comparison.thisMonth.net >= 0 ? 'success' : 'danger'}
                    />
                    <KpiCard
                        label="İşlem Sayısı"
                        value={bundle.comparison.thisMonth.txCount}
                        delta={bundle.comparison.change.txCount}
                        icon={Receipt}
                        tone="info"
                        isCount
                    />
                </div>
            )}

            {/* ═══════════ Dönem seçici + Toplam stripi ═══════════ */}
            <div className="fintech-card p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Dönem:</span>
                        <div className="filter-group">
                            {([3, 6, 12] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => changePeriod(p)}
                                    className={cn('filter-tab', periodMonths === p && 'filter-tab-active')}
                                >
                                    {p} ay
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-success)' }} />
                            <span style={{ color: 'var(--text-muted)' }}>Toplam Gelir:</span>
                            <span className="font-bold tabular-nums privacy-blur" style={{ color: 'var(--accent-success)' }}>
                                {formatCurrency(totalIncome, 'TRY')}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-danger)' }} />
                            <span style={{ color: 'var(--text-muted)' }}>Toplam Gider:</span>
                            <span className="font-bold tabular-nums privacy-blur" style={{ color: 'var(--accent-danger)' }}>
                                {formatCurrency(totalExpense, 'TRY')}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span style={{ color: 'var(--text-muted)' }}>Tasarruf:</span>
                            <span
                                className={cn('font-bold tabular-nums', savingRate >= 0 ? 'text-[var(--accent-success)]' : 'text-[var(--accent-danger)]')}
                            >
                                %{savingRate.toFixed(1)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════ 1. SATIR: Aylık trend (büyük) + Tip mix (donut) ═══════════ */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <ChartCard
                    title="Aylık Gelir-Gider Trendi"
                    subtitle={`Son ${periodMonths} ay`}
                    icon={TrendingUp}
                    iconTone="info"
                    className="xl:col-span-2"
                >
                    {monthlyChartData.length === 0 ? <EmptyState message="Henüz veri yok." /> : (
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={monthlyChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                                    <defs>
                                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="var(--accent-success)" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="var(--accent-success)" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="var(--accent-danger)" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="var(--accent-danger)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey="Gelir" stroke="var(--accent-success)" strokeWidth={2} fill="url(#incomeGrad)" />
                                    <Area type="monotone" dataKey="Gider" stroke="var(--accent-danger)"  strokeWidth={2} fill="url(#expenseGrad)" />
                                    <Line type="monotone" dataKey="Net" stroke="var(--accent-info)" strokeWidth={2.5}
                                        dot={{ fill: 'var(--accent-info)', r: 4 }} activeDot={{ r: 6 }} />
                                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </ChartCard>

                <ChartCard
                    title="İşlem Türü Dağılımı"
                    subtitle="Son 30 gün"
                    icon={Layers}
                    iconTone="purple"
                >
                    {typeMixData.length === 0 ? <EmptyState message="Henüz işlem yok." /> : (
                        <>
                            <div className="h-60 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={typeMixData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                            {typeMixData.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: 'var(--text-muted)' }}>Toplam</span>
                                    <span className="text-xl font-bold tabular-nums privacy-blur" style={{ color: 'var(--text-primary)' }}>
                                        {formatCurrency(typeMixData.reduce((s, t) => s + t.value, 0), 'TRY')}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 space-y-1.5">
                                {typeMixData.map((t, i) => (
                                    <div key={t.name} className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-2 min-w-0">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                            <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{t.name}</span>
                                        </span>
                                        <span className="font-semibold tabular-nums shrink-0 ml-2" style={{ color: 'var(--text-primary)' }}>
                                            %{t.percent}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </ChartCard>
            </div>

            {/* ═══════════ 2. SATIR: Günlük nakit akışı (büyük) + Kategori bar ═══════════ */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <ChartCard
                    title="Günlük Nakit Akışı"
                    subtitle="Son 90 gün"
                    icon={Wallet}
                    iconTone="info"
                    className="xl:col-span-2"
                >
                    {dailyChartData.length === 0 ? <EmptyState message="Henüz günlük veri yok." /> : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                                    <defs>
                                        <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="var(--accent-info)" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="var(--accent-info)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                                        interval={Math.floor(dailyChartData.length / 12) || 0} />
                                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey="Net" stroke="var(--accent-info)" strokeWidth={2} fill="url(#netGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </ChartCard>

                <ChartCard
                    title="Top Kategoriler"
                    subtitle="Son 30 gün gider"
                    icon={Flame}
                    iconTone="danger"
                >
                    {categoryData.length === 0 ? <EmptyState message="Kategori verisi yok." /> : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                                    <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                                    <YAxis type="category" dataKey="category" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                                        axisLine={false} tickLine={false} width={90} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="amount" name="Tutar" fill="var(--accent-danger)" radius={[0, 6, 6, 0]} barSize={14}>
                                        {categoryData.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </ChartCard>
            </div>

            {/* ═══════════ 3. SATIR: Net varlık + Yoğun günler ═══════════ */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <ChartCard
                    title="Net Varlık Trendi"
                    subtitle="Son 30 snapshot"
                    icon={TrendingUp}
                    iconTone="success"
                    className="xl:col-span-2"
                >
                    {netWorthChartData.length === 0 ? (
                        <EmptyState message="Henüz sağlık snapshot'ı yok. Dashboard ziyareti ile otomatik kaydedilir." />
                    ) : (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={netWorthChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                                    <defs>
                                        <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="var(--accent-success)" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="var(--accent-success)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey="Net" stroke="var(--accent-success)" strokeWidth={2} fill="url(#nwGrad)" />
                                    <Line type="monotone" dataKey="Skor" stroke="var(--accent-purple)" strokeWidth={2}
                                        dot={false} yAxisId={0} />
                                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </ChartCard>

                <ChartCard
                    title="Yoğun Günler"
                    subtitle="Son 60 gün"
                    icon={Calendar}
                    iconTone="warning"
                >
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: 'var(--accent-success)' }}>
                                En Yüksek Gelir
                            </h4>
                            {bundle.topDays.topIncomeDays.length === 0 ? (
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Veri yok.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {bundle.topDays.topIncomeDays.slice(0, 4).map((d, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg"
                                            style={{ background: 'var(--bg-hover)' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>
                                                {new Date(d.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                                            </span>
                                            <span className="font-bold tabular-nums privacy-blur" style={{ color: 'var(--accent-success)' }}>
                                                +{formatCurrency(d.income, 'TRY')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h4 className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: 'var(--accent-danger)' }}>
                                En Yüksek Gider
                            </h4>
                            {bundle.topDays.topExpenseDays.length === 0 ? (
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Veri yok.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {bundle.topDays.topExpenseDays.slice(0, 4).map((d, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg"
                                            style={{ background: 'var(--bg-hover)' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>
                                                {new Date(d.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                                            </span>
                                            <span className="font-bold tabular-nums privacy-blur" style={{ color: 'var(--accent-danger)' }}>
                                                -{formatCurrency(d.expense, 'TRY')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </ChartCard>
            </div>

            {/* ═══════════ 4. SATIR: Bu ay KPI grid (dashboard) ═══════════ */}
            {bundle.dashboard && (
                <ChartCard title="Bu Ay Detaylı KPI" subtitle="Operasyonel metrikler" icon={ShieldAlert} iconTone="warning">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <MiniKpi label="Gelir"          value={formatCurrency(bundle.dashboard.kpis.income, 'TRY')}          tone="success" />
                        <MiniKpi label="Gider"          value={formatCurrency(bundle.dashboard.kpis.expense, 'TRY')}         tone="danger" />
                        <MiniKpi label="Tahsilat"        value={formatCurrency(bundle.dashboard.kpis.collections, 'TRY')}     tone="success" />
                        <MiniKpi label="Borç Ödemesi"    value={formatCurrency(bundle.dashboard.kpis.debtPayments, 'TRY')}    tone="danger" />
                        <MiniKpi label="Kart Ödemesi"    value={formatCurrency(bundle.dashboard.kpis.cardPayments, 'TRY')}    tone="warning" />
                        <MiniKpi label="Ödenen Faiz"     value={formatCurrency(bundle.dashboard.kpis.interestPaid, 'TRY')}    tone="danger" />
                        <MiniKpi label="KMH Maliyeti"    value={formatCurrency(bundle.dashboard.kpis.kmhCost, 'TRY')}         tone="warning" />
                        <MiniKpi label="Net Akış"        value={formatCurrency(bundle.dashboard.kpis.netCashFlow, 'TRY')}     tone={bundle.dashboard.kpis.netCashFlow >= 0 ? 'success' : 'danger'} />
                        <MiniKpi label="Geciken"         value={`${bundle.dashboard.kpis.overdueCount}`}                       tone="danger" isCount />
                        <MiniKpi label="Yaklaşan"        value={`${bundle.dashboard.kpis.upcomingCount}`}                      tone="info" isCount />
                    </div>
                </ChartCard>
            )}

            {/* ═══════════ 5. SATIR: Alacak / Verecek / Kart ═══════════ */}
            {bundle.dashboard && (bundle.dashboard.receivables.length + bundle.dashboard.payables.length + bundle.dashboard.cards.length > 0) && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <ChartCard title="Alacaklar" subtitle="Top açık alacaklar" icon={ArrowDownLeft} iconTone="success">
                        {bundle.dashboard.receivables.length === 0
                            ? <EmptyState message="Açık alacak yok." />
                            : <ListRows
                                rows={bundle.dashboard.receivables.slice(0, 6).map(r => ({
                                    key: r.id, title: r.person,
                                    subtitle: `${r.title}${r.overdueInstallments ? ` · ${r.overdueInstallments} gecikmiş` : ''}`,
                                    value: r.remaining, tone: 'success',
                                }))} />}
                    </ChartCard>

                    <ChartCard title="Verecekler" subtitle="Top açık verecekler" icon={ArrowUpRight} iconTone="danger">
                        {bundle.dashboard.payables.length === 0
                            ? <EmptyState message="Açık verecek yok." />
                            : <ListRows
                                rows={bundle.dashboard.payables.slice(0, 6).map(p => ({
                                    key: p.id, title: p.person,
                                    subtitle: `${p.title}${p.overdueInstallments ? ` · ${p.overdueInstallments} gecikmiş` : ''}`,
                                    value: p.remaining, tone: 'danger',
                                }))} />}
                    </ChartCard>

                    <ChartCard title="Kredi Kartları" subtitle="Aktif borç" icon={CreditCard} iconTone="warning">
                        {bundle.dashboard.cards.length === 0
                            ? <EmptyState message="Aktif kart borcu yok." />
                            : <ListRows
                                rows={bundle.dashboard.cards.slice(0, 6).map(c => ({
                                    key: c.id, title: c.name,
                                    subtitle: `${c.bankName} · Doluluk %${c.utilization}`,
                                    value: c.currentDebt,
                                    tone: c.utilization >= 80 ? 'danger' : 'warning',
                                }))} />}
                    </ChartCard>
                </div>
            )}

            {/* ═══════════ 6. SATIR: Aylık detay tablo ═══════════ */}
            <ChartCard title="Aylık Detay Tablo" subtitle={`Son ${periodMonths} ay`} icon={Receipt} iconTone="info">
                {bundle.monthly.length === 0 ? <EmptyState message="Henüz veri yok." /> : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Ay</th>
                                    <th className="text-right">Gelir</th>
                                    <th className="text-right">Gider</th>
                                    <th className="text-right">Net</th>
                                    <th className="text-right">Tasarruf Oranı</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bundle.monthly.map(m => {
                                    const saving = m.income > 0 ? (m.net / m.income) * 100 : 0
                                    return (
                                        <tr key={m.month}>
                                            <td className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatMonthLabel(m.month)}</td>
                                            <td className="text-right tabular-nums privacy-blur" style={{ color: 'var(--accent-success)' }}>
                                                {formatCurrency(m.income, 'TRY')}
                                            </td>
                                            <td className="text-right tabular-nums privacy-blur" style={{ color: 'var(--accent-danger)' }}>
                                                {formatCurrency(m.expense, 'TRY')}
                                            </td>
                                            <td className={cn('text-right font-bold tabular-nums privacy-blur',
                                                m.net >= 0 ? 'text-[var(--accent-success)]' : 'text-[var(--accent-danger)]')}>
                                                {formatCurrency(m.net, 'TRY')}
                                            </td>
                                            <td className={cn('text-right tabular-nums',
                                                saving >= 0 ? 'text-[var(--accent-success)]' : 'text-[var(--accent-danger)]')}>
                                                %{saving.toFixed(1)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </ChartCard>
        </div>
    )
}

// ─── Mini KPI (5'lik grid'de) ─────────────────────────────────────────────
function MiniKpi({ label, value, tone, isCount = false }: {
    label: string; value: string; tone: 'success' | 'danger' | 'warning' | 'info'; isCount?: boolean
}) {
    const colorMap = {
        success: 'var(--accent-success)',
        danger:  'var(--accent-danger)',
        warning: 'var(--accent-warning)',
        info:    'var(--accent-info)',
    }
    return (
        <div className="rounded-xl p-3" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}>
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                {label}
            </p>
            <p className={cn('text-base font-bold tabular-nums', !isCount && 'privacy-blur')}
                style={{ color: colorMap[tone] }}>
                {value}
            </p>
        </div>
    )
}

function ListRows({
    rows,
}: {
    rows: { key: string; title: string; subtitle: string; value: number; tone: 'success' | 'danger' | 'warning' }[]
}) {
    const colorMap = {
        success: 'var(--accent-success)',
        danger:  'var(--accent-danger)',
        warning: 'var(--accent-warning)',
    }
    return (
        <div className="space-y-2">
            {rows.map(r => (
                <div key={r.key} className="flex items-center justify-between gap-3 py-2.5 px-1"
                    style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <div className="min-w-0">
                        <p className="font-medium truncate text-sm" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{r.subtitle}</p>
                    </div>
                    <span className="font-bold tabular-nums privacy-blur text-sm shrink-0" style={{ color: colorMap[r.tone] }}>
                        {formatCurrency(r.value, 'TRY')}
                    </span>
                </div>
            ))}
        </div>
    )
}
