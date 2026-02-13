'use client'

import React from 'react'
import { formatCurrency, cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, ShieldCheck } from 'lucide-react'

interface StatCardProps {
    title: string
    value: number
    change?: string
    isTrendUp?: boolean
    icon?: React.ElementType
}

export function StatCard({ title, value, change, isTrendUp, icon: Icon }: StatCardProps) {

    return (
        <div className="fintech-card p-6 flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center justify-between mb-4">
                <span className="text-zinc-500 text-sm font-medium">{title}</span>
                {Icon && <Icon className="w-5 h-5 text-zinc-600" />}
            </div>
            <div>
                <div className="text-2xl font-bold tracking-tight transition-all duration-300 privacy-blur">
                    {formatCurrency(value)}
                </div>
                {change && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs mt-1 font-medium",
                        isTrendUp ? "text-emerald-500" : "text-rose-500"
                    )}>
                        {isTrendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {change}
                    </div>
                )}
            </div>
        </div>
    )
}

export default function SummaryCards({ data }: { data: any }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                title="Net Değer"
                value={data.netWorth}
                change="+%3.2 vs geçen ay"
                isTrendUp={true}
            />
            <StatCard
                title="Toplam Varlık"
                value={data.totalAssets}
            />
            <StatCard
                title="Toplam Borç"
                value={data.totalDebts}
                change="-%1.2 Azalma"
                isTrendUp={true}
            />
            <StatCard
                title="Risk Skoru"
                value={data.riskScore}
                icon={ShieldCheck}
            />
        </div>
    )
}
