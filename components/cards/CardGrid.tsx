'use client'

import React from 'react'
import Link from 'next/link'
import { getLimitWarningLevel, getLimitWarningColor } from '@/lib/card-engine/types'

interface CardData {
    id: string
    cardName: string
    bankName: string
    last4Digits: string
    color: string
    totalLimit: number
    status: string
    rewardsPoints: number
    cutOffDay: number

    paymentDueDay: number
    transactions: Array<{ type: string; amount: number }>
    payments: Array<{ amount: number }>
    statements: Array<{ statementBalance: number; minimumPayment: number; dueDate: string | Date; status: string }>
}

function formatCurrency(n: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)
}

function calculateDebt(card: CardData): number {
    const charges = card.transactions
        .filter(t => t.type !== 'REFUND')
        .reduce((s, t) => s + t.amount, 0)
    const refunds = card.transactions
        .filter(t => t.type === 'REFUND')
        .reduce((s, t) => s + t.amount, 0)
    const payments = card.payments.reduce((s, p) => s + p.amount, 0)
    return Math.max(charges - refunds - payments, 0)
}

function getDaysUntilDue(card: CardData): number | null {
    const stmt = card.statements[0]
    if (!stmt || stmt.status === 'PAID') return null
    const due = new Date(stmt.dueDate)
    const now = new Date()
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function CardGrid({ cards }: { cards: CardData[] }) {
    if (cards.length === 0) {
        return (
            <div className="fintech-card p-12 text-center">
                <div className="text-6xl mb-4">💳</div>
                <h2 className="text-xl font-semibold mb-2">Henüz kart eklenmedi</h2>
                <p className="text-zinc-500 mb-6">Kredi kartlarını ekleyerek takibe başla.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {cards.map(card => {
                const debt = calculateDebt(card)
                const utilization = card.totalLimit > 0 ? (debt / card.totalLimit) * 100 : 0
                const level = getLimitWarningLevel(utilization)
                const color = getLimitWarningColor(level)
                const daysUntil = getDaysUntilDue(card)
                const latestStmt = card.statements[0]

                return (
                    <Link
                        key={card.id}
                        href={`/cards/${card.id}`}
                        className="fintech-card p-6 group hover:border-white/20 transition-all duration-300 relative overflow-hidden"
                    >
                        {/* Glow Effect */}
                        <div
                            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity"
                            style={{ background: card.color }}
                        />

                        {/* Header */}
                        <div className="flex items-start justify-between mb-4 relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-full" style={{ background: card.color }} />
                                    <span className="font-bold text-white">{card.cardName}</span>
                                </div>
                                <span className="text-zinc-500 text-sm">{card.bankName}</span>
                            </div>
                            <div className="text-zinc-500 font-mono text-sm">
                                •••• {card.last4Digits}
                            </div>
                        </div>

                        {/* Puanlar */}
                        {card.rewardsPoints > 0 && (
                            <div className="mb-3 flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full w-fit">
                                <span className="text-lg">⭐</span>
                                <span className="text-xs font-bold text-amber-500">{card.rewardsPoints.toLocaleString('tr-TR')} Puan</span>
                            </div>
                        )}


                        {/* Borç */}
                        <div className="mb-4 relative z-10">
                            <p className="text-zinc-500 text-xs mb-1">Güncel Borç</p>
                            <p className="text-2xl font-bold font-mono privacy-blur">
                                {formatCurrency(debt)}
                            </p>
                        </div>

                        {/* Limit Kullanım Barı */}
                        <div className="mb-4 relative z-10">
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-zinc-500">Limit Kullanımı</span>
                                <span style={{ color }} className="font-mono font-semibold">
                                    %{utilization.toFixed(1)}
                                </span>
                            </div>
                            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${Math.min(utilization, 100)}%`,
                                        background: `linear-gradient(90deg, ${card.color}, ${color})`,
                                    }}
                                />
                            </div>
                            <p className="text-zinc-600 text-xs mt-1 font-mono privacy-blur">
                                {formatCurrency(card.totalLimit - debt)} kullanılabilir
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs relative z-10">
                            {daysUntil !== null ? (
                                <span className={`px-2 py-1 rounded-lg font-medium ${daysUntil <= 3 ? 'bg-red-500/20 text-red-400' :
                                    daysUntil <= 7 ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-zinc-800 text-zinc-400'
                                    }`}>
                                    {daysUntil > 0 ? `${daysUntil} gün kaldı` : daysUntil === 0 ? 'BUGÜN!' : `${Math.abs(daysUntil)} gün gecikti`}
                                </span>
                            ) : (
                                <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium">
                                    ✓ Temiz
                                </span>
                            )}

                            {latestStmt && (
                                <span className="text-zinc-500 font-mono privacy-blur">
                                    Asgari: {formatCurrency(latestStmt.minimumPayment)}
                                </span>
                            )}
                        </div>
                    </Link>
                )
            })}
        </div>
    )
}
