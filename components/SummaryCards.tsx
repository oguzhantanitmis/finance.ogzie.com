'use client'

import React from 'react'
import { formatCurrency, cn } from '@/lib/utils'
import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet2, TrendingDown, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
    title: string
    value: number
    change?: string
    isPositive?: boolean
    icon?: LucideIcon
    accentClass?: string
}

export function StatCard({ title, value, change, isPositive = true, icon: Icon, accentClass = '' }: StatCardProps) {
    return (
        <div className={cn('kpi-card', accentClass)}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>
                    {title}
                </span>
                {Icon && (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                        <Icon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                )}
            </div>
            <div>
                <div className="text-2xl md:text-[1.75rem] font-bold tracking-tight transition-all duration-300 privacy-blur tabular-nums">
                    {formatCurrency(value)}
                </div>
                {change && (
                    <div className={cn(
                        "flex items-center gap-1.5 text-xs mt-2 font-medium",
                    )} style={{ color: isPositive ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {isPositive
                            ? <TrendingUp className="w-3.5 h-3.5" />
                            : <TrendingDown className="w-3.5 h-3.5" />
                        }
                        {change}
                    </div>
                )}
            </div>
        </div>
    )
}

interface SummaryCardData {
    plannedIncome: number
    fixedCommitments: number
    debtCommitments: number
    freeCash: number
}

export default function SummaryCards({ data }: { data: SummaryCardData }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            <StatCard
                title="Planlanan Gelir"
                value={data.plannedIncome}
                change="Nakit girişi"
                isPositive={true}
                icon={Wallet2}
                accentClass="kpi-card-success"
            />
            <StatCard
                title="Sabit Yük"
                value={data.fixedCommitments}
                change="Abonelik + sabit gider"
                isPositive={false}
                icon={Landmark}
                accentClass="kpi-card-warning"
            />
            <StatCard
                title="Borç Baskısı"
                value={data.debtCommitments}
                change="Bu ay ödenecek"
                isPositive={false}
                icon={ArrowDownLeft}
                accentClass="kpi-card-danger"
            />
            <StatCard
                title="Serbest Nakit"
                value={data.freeCash}
                change={data.freeCash >= 0 ? "Hareket alanı" : "Acil dengeleme gerekli"}
                isPositive={data.freeCash >= 0}
                icon={ArrowUpRight}
                accentClass={data.freeCash >= 0 ? 'kpi-card-success' : 'kpi-card-danger'}
            />
        </div>
    )
}
