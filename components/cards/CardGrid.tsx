'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Award, Check, ArrowRight, Percent } from 'lucide-react'
import { getLimitWarningLevel, getLimitWarningColor } from '@/lib/card-engine/types'
import { formatCurrency } from '@/lib/utils'
import CreditCardVisual from './CreditCardVisual'

interface CardData {
    id: string
    cardName: string
    bankName: string
    last4Digits: string
    cardNetwork: string
    color: string
    cardProgram?: string | null
    totalLimit: number
    availableLimit?: number | null
    currentDebt?: number | null
    status: string
    rewardsPoints: number
    cutOffDay: number
    paymentDueDay: number
    transactions: Array<{ type: string; amount: number }>
    payments: Array<{ amount: number }>
    statements: Array<{ statementBalance: number; minimumPayment: number; dueDate: string | Date; status: string }>
}



function calculateDebt(card: CardData): number {
    if (card.currentDebt && card.currentDebt > 0) return card.currentDebt
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
            <div className="fintech-card p-12 text-center max-w-lg mx-auto mt-8 border border-dashed border-zinc-800">
                <div className="text-6xl mb-4 animate-bounce">💳</div>
                <h2 className="text-xl font-bold mb-2">Henüz kart eklenmedi</h2>
                <p className="text-zinc-500 mb-6 text-sm">Kredi kartlarınızı ekleyerek limitlerinizi, harcamalarınızı ve asgari faiz yükümlülüklerinizi tek panelden yönetmeye başlayın.</p>
            </div>
        )
    }

    // Dashboard Calculations
    const totalLimit = cards.reduce((sum, card) => sum + card.totalLimit, 0)
    const totalDebt = cards.reduce((sum, card) => sum + calculateDebt(card), 0)
    const totalAvailable = Math.max(totalLimit - totalDebt, 0)
    const overallUtilization = totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0
    const totalPoints = cards.reduce((sum, card) => sum + card.rewardsPoints, 0)

    // Find closest payment
    const paymentsDue = cards
        .map(card => {
            const days = getDaysUntilDue(card)
            const debt = calculateDebt(card)
            return { card, days, debt }
        })
        .filter(item => item.days !== null && item.debt > 0)
        .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))

    const closestPayment = paymentsDue[0] || null

    return (
        <div className="space-y-10">
            {/* LIMITS OVERVIEW DASHBOARD */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
                {/* Statistics Card */}
                <div className="fintech-card p-6 lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800/80">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px]" />
                    <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px]" />
                    
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Percent className="w-4 h-4 text-blue-500" /> Kredi Kartı Limit ve Kullanım Dağılımı
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <p className="text-zinc-500 text-xs mb-1 font-medium">Toplam Kart Limiti</p>
                            <p className="text-2xl font-bold font-mono text-white privacy-blur">{formatCurrency(totalLimit)}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 text-xs mb-1 font-medium">Toplam Güncel Borç</p>
                            <p className="text-2xl font-bold font-mono text-orange-400 privacy-blur">{formatCurrency(totalDebt)}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 text-xs mb-1 font-medium">Kullanılabilir Limit</p>
                            <p className="text-2xl font-bold font-mono text-emerald-400 privacy-blur">{formatCurrency(totalAvailable)}</p>
                        </div>
                    </div>

                    {/* Progress utilization bar */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400 font-semibold">Toplam Limit Kullanım Oranı</span>
                            <span className={`font-mono font-bold ${overallUtilization > 80 ? 'text-red-400' : overallUtilization > 50 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                %{overallUtilization.toFixed(1)}
                            </span>
                        </div>
                        <div className="w-full h-3 bg-zinc-800/80 rounded-full overflow-hidden p-[2px] border border-zinc-700/20">
                            <div 
                                className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r"
                                style={{ 
                                    width: `${Math.min(overallUtilization, 100)}%`,
                                    backgroundImage: overallUtilization > 80 
                                        ? 'linear-gradient(90deg, #3b82f6, #f87171)' 
                                        : 'linear-gradient(90deg, #34d399, #3b82f6)',
                                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Quick Info & Alerts Card */}
                <div className="flex flex-col gap-4">
                    {/* Rewards Summary */}
                    <div className="fintech-card p-5 bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-lg">
                                🏆
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider leading-none">Toplam Mil / Puan Değeri</p>
                                <p className="text-xl font-bold text-amber-500 mt-1 font-mono">{totalPoints.toLocaleString('tr-TR')} Puan</p>
                            </div>
                        </div>
                        <Award className="w-8 h-8 text-amber-500/30" />
                    </div>

                    {/* Next Payment Warning */}
                    {closestPayment ? (
                        <div className={`fintech-card p-5 border flex-1 flex flex-col justify-between ${
                            closestPayment.days !== null && closestPayment.days <= 3 
                                ? 'bg-red-500/5 border-red-500/20 text-red-400' 
                                : closestPayment.days !== null && closestPayment.days <= 7 
                                    ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400' 
                                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
                        }`}>
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                                    closestPayment.days !== null && closestPayment.days <= 3 
                                        ? 'bg-red-500/10 border border-red-500/20' 
                                        : 'bg-yellow-500/10 border border-yellow-500/20'
                                }`}>
                                    {closestPayment.days !== null && closestPayment.days <= 3 ? '🚨' : '📅'}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 leading-none">Yaklaşan Kart Ödemesi</p>
                                    <p className="text-sm font-bold text-white mt-1.5">{closestPayment.card.cardName}</p>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        Borç: <span className="font-mono font-semibold text-white privacy-blur">{formatCurrency(closestPayment.debt)}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs border-t border-zinc-800/60 pt-2.5">
                                <span className="font-semibold text-zinc-400">Son Ödeme Günü:</span>
                                <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                                    closestPayment.days !== null && closestPayment.days <= 3 
                                        ? 'bg-red-500/20 text-red-400 animate-pulse' 
                                        : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                    {closestPayment.days !== null && closestPayment.days > 0 
                                        ? `${closestPayment.days} gün kaldı` 
                                        : closestPayment.days === 0 
                                            ? 'BUGÜN' 
                                            : `${Math.abs(closestPayment.days ?? 0)} gün gecikti`}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="fintech-card p-5 bg-emerald-500/5 border-emerald-500/10 text-emerald-400 flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <Check className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 leading-none">Ödeme Durumu</p>
                                    <p className="text-sm font-bold text-white mt-1">Tüm Ekstreler Temiz</p>
                                    <p className="text-xs text-zinc-400 mt-0.5">Yakın zamanda ödemesi gereken kartınız bulunmuyor.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* CARDS LIST GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {cards.map((card, index) => {
                    const debt = calculateDebt(card)
                    const utilization = card.totalLimit > 0 ? (debt / card.totalLimit) * 100 : 0
                    const warningLevel = getLimitWarningLevel(utilization)
                    const warningColor = getLimitWarningColor(warningLevel)
                    const daysUntil = getDaysUntilDue(card)

                    return (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.05 }}
                            className="fintech-card p-6 flex flex-col justify-between group hover:border-zinc-700/80 transition-all duration-300 relative overflow-hidden bg-zinc-950/80"
                        >
                            {/* Glow ambient background matching card color */}
                            <div 
                                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[70px] opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"
                                style={{ background: card.color }}
                            />

                            <div>
                                {/* Elegant 3D Credit Card Render */}
                                <div className="flex justify-center mb-6">
                                    <Link href={`/cards/${card.id}`} className="w-full flex justify-center">
                                        <CreditCardVisual card={card} flippable={false} />
                                    </Link>
                                </div>

                                {/* Limits & Available Credit */}
                                <div className="space-y-4 mb-6">
                                    {/* Progress Utilization */}
                                    <div>
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="text-zinc-500 font-semibold">Limit Kullanımı</span>
                                            <span style={{ color: warningColor }} className="font-mono font-bold">
                                                %{utilization.toFixed(1)}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden p-[1px]">
                                            <div 
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${Math.min(utilization, 100)}%`,
                                                    background: `linear-gradient(90deg, ${card.color}, ${warningColor})`
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 font-medium">
                                            <span>Borç: <strong className="text-zinc-300 font-mono privacy-blur">{formatCurrency(debt)}</strong></span>
                                            <span>Kalan: <strong className="text-emerald-400 font-mono privacy-blur">{formatCurrency(card.availableLimit ?? (card.totalLimit - debt))}</strong></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer Summary */}
                            <div className="border-t border-zinc-900/80 pt-4 flex items-center justify-between">
                                {/* Due Date Alert Indicator */}
                                {daysUntil !== null ? (
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide ${
                                        daysUntil <= 3 
                                            ? 'bg-red-500/10 border border-red-500/20 text-red-400' 
                                            : daysUntil <= 7 
                                                ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' 
                                                : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                                    }`}>
                                        {daysUntil > 0 
                                            ? `${daysUntil} gün kaldı` 
                                            : daysUntil === 0 
                                                ? 'Ödeme Günü!' 
                                                : `${Math.abs(daysUntil)} gün gecikti`}
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5" /> Temiz
                                    </span>
                                )}

                                {/* Card Details Link */}
                                <Link 
                                    href={`/cards/${card.id}`}
                                    className="flex items-center gap-1 text-xs font-bold text-zinc-300 hover:text-white transition-colors"
                                >
                                    Detaylar <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
