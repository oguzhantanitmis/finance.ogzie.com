'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CreditCard, TrendingDown, Receipt, DollarSign, Plus, Trash2, AlertTriangle, Star } from 'lucide-react'
import { makeCardPayment, addCardTransaction, deleteCreditCard, updateCardPoints } from '@/app/cards/actions'

import { useRouter } from 'next/navigation'
import { analyzeInterestForPeriod, simulateMinimumPaymentTrap } from '@/lib/card-engine/interest-engine'
import { formatCostBreakdown } from '@/lib/card-engine/tax-engine'
import { previewPayment } from '@/lib/card-engine/payment-engine'
import { getLimitWarningLevel, getLimitWarningColor } from '@/lib/card-engine/types'

function formatCurrency(n: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)
}

function formatDate(d: string | Date): string {
    return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

interface CardDetailProps {
    card: {
        id: string
        cardName: string
        bankName: string
        last4Digits: string
        cardNetwork: string
        color: string
        status: string
        totalLimit: number
        cashAdvanceLimit: number
        cutOffDay: number
        paymentDueDay: number
        contractualRate: number
        defaultRate: number
        cashAdvanceRate: number
        kkdfRate: number
        bsmvRate: number
        minPaymentRate: number
        rewardsPoints: number
        currentDebt: number

        statementBalance: number
        minimumPayment: number
        availableLimit: number
        utilizationPercent: number
        transactions: Array<{
            id: string
            type: string
            description: string
            merchant: string | null
            amount: number
            transactionDate: string
            isCashAdvance: boolean
            totalInstallments: number
        }>
        payments: Array<{
            id: string
            amount: number
            paymentDate: string
            description: string | null
        }>
        statements: Array<{
            id: string
            statementDate: string
            dueDate: string
            statementBalance: number
            minimumPayment: number
            paymentsReceived: number
            interestCharged: number
            taxCharged: number
            status: string
        }>
    }
}

export default function CardDetailView({ card }: CardDetailProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'statements' | 'payment'>('overview')
    const [paymentAmount, setPaymentAmount] = useState('')
    const [showAddTransaction, setShowAddTransaction] = useState(false)
    const [loading, setLoading] = useState(false)

    const level = getLimitWarningLevel(card.utilizationPercent)
    const warningColor = getLimitWarningColor(level)

    // Ödeme önizleme
    const payAmt = parseFloat(paymentAmount) || 0
    const preview = payAmt > 0 ? previewPayment({
        paymentAmount: payAmt,
        currentDebt: card.currentDebt,
        statementBalance: card.statementBalance,
        minimumPayment: card.minimumPayment,
        interestAndTaxAccrued: 0,
        cashAdvanceBalance: 0,
        postStatementCharges: 0,
        contractualRate: card.contractualRate,
        kkdfRate: card.kkdfRate,
        bsmvRate: card.bsmvRate,
    }) : null

    // Faiz maliyeti
    const interestAnalysis = card.currentDebt > 0 ? analyzeInterestForPeriod({
        statementBalance: card.statementBalance || card.currentDebt,
        minimumPayment: card.minimumPayment,
        paymentMade: 0,
        contractualRate: card.contractualRate,
        defaultRate: card.defaultRate,
        days: 30,
        kkdfRate: card.kkdfRate,
        bsmvRate: card.bsmvRate,
    }) : null

    const costBreakdown = interestAnalysis
        ? formatCostBreakdown(interestAnalysis.totalInterest.interest, card.kkdfRate, card.bsmvRate)
        : null

    // Asgari ödeme tuzağı simülasyonu
    const minimumTrap = card.currentDebt > 0 ? simulateMinimumPaymentTrap({
        currentDebt: card.currentDebt,
        minPaymentRate: card.minPaymentRate,
        contractualRate: card.contractualRate,
        kkdfRate: card.kkdfRate,
        bsmvRate: card.bsmvRate,
    }) : null

    async function handlePayment() {
        if (payAmt <= 0) return
        setLoading(true)
        await makeCardPayment({
            creditCardId: card.id,
            amount: payAmt,
            description: payAmt >= card.statementBalance ? 'Tam Ödeme' : payAmt >= card.minimumPayment ? 'Asgari Üstü Ödeme' : 'Kısmi Ödeme',
        })
        setPaymentAmount('')
        setLoading(false)
        router.refresh()
    }

    async function handleAddTransaction(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData(e.currentTarget)
        await addCardTransaction({
            creditCardId: card.id,
            type: fd.get('type') as string,
            description: fd.get('description') as string,
            merchant: fd.get('merchant') as string || undefined,
            amount: parseFloat(fd.get('amount') as string),
            isCashAdvance: fd.get('type') === 'CASH_ADVANCE',
        })
        setShowAddTransaction(false)
        setLoading(false)
        router.refresh()
    }

    async function handleDelete() {
        if (!confirm('Bu kartı silmek istediğinize emin misiniz?')) return
        await deleteCreditCard(card.id)
        router.push('/cards')
    }

    const tabs = [
        { key: 'overview' as const, label: 'Genel', icon: <CreditCard className="w-4 h-4" /> },
        { key: 'transactions' as const, label: 'İşlemler', icon: <Receipt className="w-4 h-4" /> },
        { key: 'statements' as const, label: 'Ekstreler', icon: <TrendingDown className="w-4 h-4" /> },
        { key: 'payment' as const, label: 'Ödeme Yap', icon: <DollarSign className="w-4 h-4" /> },
    ]

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/cards" className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ background: card.color }} />
                        <h1 className="text-2xl font-bold">{card.cardName}</h1>
                        <span className="text-zinc-500 font-mono text-sm">•••• {card.last4Digits}</span>
                    </div>
                    <p className="text-zinc-500 text-sm mt-1">{card.bankName} · {card.cardNetwork}</p>
                </div>
                <button onClick={handleDelete} className="p-2 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            {/* Puan Float & Kontrol */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-amber-500/30 rounded-2xl w-fit">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                        ⭐
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest leading-none">Toplam Puan</p>
                        <p className="text-lg font-bold text-amber-500 leading-tight">{card.rewardsPoints.toLocaleString('tr-TR')}</p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        const newPoints = prompt('Yeni puanı girin:', card.rewardsPoints.toString())
                        if (newPoints !== null) {
                            updateCardPoints(card.id, parseFloat(newPoints))
                        }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/5 rounded-2xl text-xs font-semibold hover:bg-zinc-800 transition-all"
                >
                    <Star className="w-4 h-4 text-amber-500" /> Puanı Güncelle
                </button>
            </div>


            {/* Kart Visu */}

            <div
                className="rounded-2xl p-6 mb-8 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${card.color}22, ${card.color}08)`, border: `1px solid ${card.color}33` }}
            >
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-30" style={{ background: card.color }} />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                    <div>
                        <p className="text-zinc-400 text-xs mb-1">Güncel Borç</p>
                        <p className="text-2xl font-bold font-mono privacy-blur">{formatCurrency(card.currentDebt)}</p>
                    </div>
                    <div>
                        <p className="text-zinc-400 text-xs mb-1">Dönem Borcu</p>
                        <p className="text-xl font-bold font-mono privacy-blur">{formatCurrency(card.statementBalance)}</p>
                    </div>
                    <div>
                        <p className="text-zinc-400 text-xs mb-1">Asgari Ödeme</p>
                        <p className="text-xl font-bold font-mono privacy-blur" style={{ color: card.minimumPayment > 0 ? '#F97316' : '#22C55E' }}>
                            {formatCurrency(card.minimumPayment)}
                        </p>
                    </div>
                    <div>
                        <p className="text-zinc-400 text-xs mb-1">Kullanılabilir Limit</p>
                        <p className="text-xl font-bold font-mono privacy-blur">{formatCurrency(card.availableLimit)}</p>
                    </div>
                </div>

                {/* Limit Bar */}
                <div className="mt-6 relative z-10">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-zinc-400">Limit Kullanımı</span>
                        <span style={{ color: warningColor }} className="font-mono font-bold">%{card.utilizationPercent.toFixed(1)}</span>
                    </div>
                    <div className="w-full h-3 bg-black/30 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${Math.min(card.utilizationPercent, 100)}%`,
                                background: `linear-gradient(90deg, ${card.color}, ${warningColor})`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.key
                            ? 'bg-white text-black'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Faiz Maliyeti */}
                    {costBreakdown && (
                        <div className="fintech-card p-6">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <TrendingDown className="w-5 h-5 text-red-400" />
                                {costBreakdown.label} (30 Gün Tahmini)
                            </h3>
                            <div className="space-y-3">
                                {costBreakdown.items.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-zinc-400 text-sm">{item.name} {item.rate !== '-' ? `(${item.rate})` : ''}</span>
                                        <span className="font-mono text-white privacy-blur">{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
                                    <span className="text-white font-semibold">TOPLAM MALİYET</span>
                                    <span className="font-mono font-bold text-red-400 privacy-blur">{formatCurrency(costBreakdown.total)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Asgari Ödeme Tuzağı */}
                    {minimumTrap && minimumTrap.months > 1 && (
                        <div className="fintech-card p-6 border-yellow-500/20">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                Asgari Ödeme Tuzağı Analizi
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-zinc-900 rounded-xl p-4">
                                    <p className="text-zinc-500 text-xs">Kapanma Süresi</p>
                                    <p className="text-xl font-bold text-yellow-400">{minimumTrap.months} ay</p>
                                </div>
                                <div className="bg-zinc-900 rounded-xl p-4">
                                    <p className="text-zinc-500 text-xs">Toplam Ödenecek</p>
                                    <p className="text-xl font-bold font-mono privacy-blur">{formatCurrency(minimumTrap.totalPaid)}</p>
                                </div>
                                <div className="bg-zinc-900 rounded-xl p-4">
                                    <p className="text-zinc-500 text-xs">Toplam Faiz</p>
                                    <p className="text-xl font-bold text-red-400 font-mono privacy-blur">{formatCurrency(minimumTrap.totalInterest)}</p>
                                </div>
                                <div className="bg-zinc-900 rounded-xl p-4">
                                    <p className="text-zinc-500 text-xs">Toplam Vergi</p>
                                    <p className="text-xl font-bold text-orange-400 font-mono privacy-blur">{formatCurrency(minimumTrap.totalTax)}</p>
                                </div>
                            </div>
                            <p className="text-zinc-500 text-sm mt-4">
                                ⚠️ Sadece asgari ödeme yaparsan, bu borcu kapatman <strong className="text-yellow-400">{minimumTrap.months} ay</strong> sürer
                                ve <strong className="text-red-400">{formatCurrency(minimumTrap.totalInterest + minimumTrap.totalTax)}</strong> ekstra maliyet ödersin.
                            </p>
                        </div>
                    )}

                    {/* Kart Detayları */}
                    <div className="fintech-card p-6">
                        <h3 className="font-semibold mb-4">📋 Kart Detayları</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-zinc-500">Toplam Limit:</span> <span className="font-mono privacy-blur">{formatCurrency(card.totalLimit)}</span></div>
                            <div><span className="text-zinc-500">Nakit Avans Limiti:</span> <span className="font-mono privacy-blur">{formatCurrency(card.cashAdvanceLimit)}</span></div>
                            <div><span className="text-zinc-500">Hesap Kesim:</span> <span className="font-mono">Her ayın {card.cutOffDay}. günü</span></div>
                            <div><span className="text-zinc-500">Son Ödeme:</span> <span className="font-mono">Her ayın {card.paymentDueDay}. günü</span></div>
                            <div><span className="text-zinc-500">Akdi Faiz:</span> <span className="font-mono">%{card.contractualRate}/ay</span></div>
                            <div><span className="text-zinc-500">Gecikme Faizi:</span> <span className="font-mono">%{card.defaultRate}/ay</span></div>
                            <div><span className="text-zinc-500">N. Avans Faizi:</span> <span className="font-mono">%{card.cashAdvanceRate}/ay</span></div>
                            <div><span className="text-zinc-500">Asgari Oran:</span> <span className="font-mono">%{(card.minPaymentRate * 100).toFixed(0)}</span></div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'transactions' && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Son İşlemler</h3>
                        <button
                            onClick={() => setShowAddTransaction(!showAddTransaction)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 text-sm hover:bg-zinc-800 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> İşlem Ekle
                        </button>
                    </div>

                    {showAddTransaction && (
                        <form onSubmit={handleAddTransaction} className="fintech-card p-6 mb-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-zinc-400">Tür</label>
                                    <select name="type" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm mt-1">
                                        <option value="PURCHASE">Alışveriş</option>
                                        <option value="INSTALLMENT_PURCHASE">Taksitli Alışveriş</option>
                                        <option value="CASH_ADVANCE">Nakit Avans</option>
                                        <option value="FEE">Ücret/Komisyon</option>
                                        <option value="REFUND">İade</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400">Tutar (₺)</label>
                                    <input name="amount" type="number" step="0.01" required className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white font-mono text-sm mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-zinc-400">Açıklama</label>
                                <input name="description" required placeholder="Migros Market" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm mt-1" />
                            </div>
                            <div>
                                <label className="text-sm text-zinc-400">Mağaza (opsiyonel)</label>
                                <input name="merchant" placeholder="Migros" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm mt-1" />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-sm disabled:opacity-50">
                                {loading ? 'Ekleniyor...' : 'İşlem Kaydet'}
                            </button>
                        </form>
                    )}

                    {card.transactions.length === 0 ? (
                        <div className="fintech-card p-8 text-center text-zinc-500">Henüz işlem yok.</div>
                    ) : (
                        <div className="space-y-2">
                            {card.transactions.map(tx => (
                                <div key={tx.id} className="fintech-card p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${tx.type === 'REFUND' ? 'bg-emerald-500/20 text-emerald-400' :
                                            tx.isCashAdvance ? 'bg-purple-500/20 text-purple-400' :
                                                'bg-zinc-800 text-zinc-400'
                                            }`}>
                                            {tx.type === 'REFUND' ? '↩' : tx.isCashAdvance ? '💵' : tx.type === 'FEE' ? '📄' : '🛒'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{tx.description}</p>
                                            <p className="text-xs text-zinc-500">
                                                {formatDate(tx.transactionDate)}
                                                {tx.merchant && ` · ${tx.merchant}`}
                                                {tx.totalInstallments > 1 && ` · ${tx.totalInstallments} taksit`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`font-mono font-bold text-sm privacy-blur ${tx.type === 'REFUND' ? 'text-emerald-400' : 'text-white'
                                        }`}>
                                        {tx.type === 'REFUND' ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'statements' && (
                <div>
                    <h3 className="font-semibold mb-4">📂 Ekstre Geçmişi</h3>
                    {card.statements.length === 0 ? (
                        <div className="fintech-card p-8 text-center text-zinc-500">Henüz ekstre oluşturulmadı.</div>
                    ) : (
                        <div className="space-y-3">
                            {card.statements.map(stmt => {
                                const statusColor = stmt.status === 'PAID' ? 'text-emerald-400' :
                                    stmt.status === 'OVERDUE' ? 'text-red-400' :
                                        stmt.status === 'OPEN' ? 'text-yellow-400' : 'text-zinc-400'
                                const statusLabel = stmt.status === 'PAID' ? 'ÖDENDİ' :
                                    stmt.status === 'OVERDUE' ? 'GECİKMİŞ' :
                                        stmt.status === 'OPEN' ? 'AÇIK' : 'KAPANDI'

                                return (
                                    <div key={stmt.id} className="fintech-card p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="font-medium">{formatDate(stmt.statementDate)}</p>
                                                <p className="text-zinc-500 text-xs">Son Ödeme: {formatDate(stmt.dueDate)}</p>
                                            </div>
                                            <span className={`text-sm font-bold ${statusColor}`}>{statusLabel}</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            <div>
                                                <span className="text-zinc-500 text-xs">Dönem Borcu</span>
                                                <p className="font-mono font-bold privacy-blur">{formatCurrency(stmt.statementBalance)}</p>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 text-xs">Asgari</span>
                                                <p className="font-mono privacy-blur">{formatCurrency(stmt.minimumPayment)}</p>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 text-xs">Ödemeler</span>
                                                <p className="font-mono text-emerald-400 privacy-blur">{formatCurrency(stmt.paymentsReceived)}</p>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 text-xs">Faiz + Vergi</span>
                                                <p className="font-mono text-red-400 privacy-blur">{formatCurrency(stmt.interestCharged + stmt.taxCharged)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'payment' && (
                <div className="max-w-lg">
                    <div className="fintech-card p-6 mb-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-400" />
                            Ödeme Yap
                        </h3>

                        <div className="grid grid-cols-3 gap-3 mb-6 text-sm">
                            <div className="bg-zinc-900 rounded-xl p-3 text-center">
                                <p className="text-zinc-500 text-xs">Güncel Borç</p>
                                <p className="font-mono font-bold privacy-blur">{formatCurrency(card.currentDebt)}</p>
                            </div>
                            <div className="bg-zinc-900 rounded-xl p-3 text-center">
                                <p className="text-zinc-500 text-xs">Dönem Borcu</p>
                                <p className="font-mono font-bold privacy-blur">{formatCurrency(card.statementBalance)}</p>
                            </div>
                            <div className="bg-zinc-900 rounded-xl p-3 text-center">
                                <p className="text-zinc-500 text-xs">Asgari</p>
                                <p className="font-mono font-bold text-orange-400 privacy-blur">{formatCurrency(card.minimumPayment)}</p>
                            </div>
                        </div>

                        {/* Hızlı Seçenekler */}
                        <div className="flex gap-2 mb-4 flex-wrap">
                            {card.currentDebt > 0 && (
                                <>
                                    <button
                                        onClick={() => setPaymentAmount(card.currentDebt.toFixed(2))}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30"
                                    >
                                        Tamamını Öde
                                    </button>
                                    {card.statementBalance > 0 && (
                                        <button
                                            onClick={() => setPaymentAmount(card.statementBalance.toFixed(2))}
                                            className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/30"
                                        >
                                            Dönem Borcunu Öde
                                        </button>
                                    )}
                                    {card.minimumPayment > 0 && (
                                        <button
                                            onClick={() => setPaymentAmount(card.minimumPayment.toFixed(2))}
                                            className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-medium hover:bg-yellow-500/30"
                                        >
                                            Asgari Öde
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="text-sm text-zinc-400 mb-1 block">Ödeme Tutarı (₺)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={paymentAmount}
                                onChange={e => setPaymentAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-lg focus:border-white/30 outline-none"
                            />
                        </div>

                        {/* Ödeme Önizleme */}
                        {preview && (
                            <div className="bg-zinc-900 rounded-xl p-4 mb-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Kalan Borç</span>
                                    <span className="font-mono privacy-blur">{formatCurrency(preview.remainingDebt)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Asgari Karşılandı?</span>
                                    <span className={preview.minimumSatisfied ? 'text-emerald-400' : 'text-red-400'}>
                                        {preview.minimumSatisfied ? '✅ Evet' : '❌ Hayır'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Tahmini Faiz (30g)</span>
                                    <span className="font-mono text-red-400 privacy-blur">{formatCurrency(preview.projectedInterest.totalCost)}</span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handlePayment}
                            disabled={payAmt <= 0 || loading}
                            className="w-full py-3.5 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all disabled:opacity-30"
                        >
                            {loading ? 'İşleniyor...' : 'Ödemeyi Onayla'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
