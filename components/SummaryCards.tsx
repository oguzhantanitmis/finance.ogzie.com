'use client'

import React from 'react'
import { formatCurrency, cn } from '@/lib/utils'
import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet2 } from 'lucide-react'

interface StatCardProps {
    title: string
    value: number
    change?: string
    isPositive?: boolean
    icon?: React.ElementType
}

export function StatCard({ title, value, change, isPositive = true, icon: Icon }: StatCardProps) {

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
                        isPositive ? "text-emerald-500" : "text-rose-500"
                    )}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                title="Planlanan Gelir"
                value={data.plannedIncome}
                change="Nakit girişi"
                isPositive={true}
                icon={Wallet2}
            />
            <StatCard
                title="Sabit Yük"
                value={data.fixedCommitments}
                change="Abonelik + sabit gider"
                isPositive={false}
                icon={Landmark}
            />
            <StatCard
                title="Borç Baskısı"
                value={data.debtCommitments}
                change="Bu ay ödenecek"
                isPositive={false}
                icon={ArrowDownLeft}
            />
            <StatCard
                title="Serbest Nakit"
                value={data.freeCash}
                change={data.freeCash >= 0 ? "Hareket alanı" : "Acil dengeleme gerekli"}
                isPositive={data.freeCash >= 0}
                icon={ArrowUpRight}
            />
        </div>
    )
}
