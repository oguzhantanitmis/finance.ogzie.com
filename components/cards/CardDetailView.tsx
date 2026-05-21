'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    ArrowLeft, CreditCard, TrendingDown, Receipt, DollarSign, 
    Plus, Trash2, AlertTriangle, Pencil, Search, 
    Calendar, Sparkles, Tag, CheckCircle2 
} from 'lucide-react'
import { makeCardPayment, addCardTransaction, deleteCreditCard, updateCardPoints } from '@/app/cards/actions'
import { useRouter } from 'next/navigation'
import { analyzeInterestForPeriod, simulateMinimumPaymentTrap } from '@/lib/card-engine/interest-engine'
import { formatCostBreakdown } from '@/lib/card-engine/tax-engine'
import { previewPayment } from '@/lib/card-engine/payment-engine'
import { getLimitWarningLevel, getLimitWarningColor } from '@/lib/card-engine/types'
import CardFormModal from '@/components/cards/CardFormModal'
import CreditCardVisual from './CreditCardVisual'

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

// Local simulation helper for custom monthly payment amounts
function simulateFixedMonthlyPayment(
    currentDebt: number, 
    paymentAmount: number, 
    contractualRate: number, 
    kkdfRate: number, 
    bsmvRate: number
) {
    if (paymentAmount <= 0) return { months: 999, totalPaid: 0, totalInterest: 0, infinite: true }
    
    let remaining = currentDebt
    let totalPaid = 0
    let totalInterest = 0
    let months = 0
    
    // Safety check: Monthly interest + tax accumulation on the remaining balance
    const monthlyRate = contractualRate / 100
    const taxFactor = 1 + kkdfRate + bsmvRate
    const firstMonthInterest = (remaining * monthlyRate * 30) / 30 * taxFactor // Approx 1 month
    
    if (paymentAmount <= firstMonthInterest) {
        return { months: 999, totalPaid: 0, totalInterest: 0, infinite: true }
    }

    while (remaining > 0.05 && months < 360) {
        const payment = Math.min(paymentAmount, remaining)
        totalPaid += payment
        remaining -= payment
        
        if (remaining > 0.05) {
            // Apply standard interest on remainder
            const interestVal = (remaining * contractualRate * 30) / 3000
            const taxes = interestVal * (kkdfRate + bsmvRate)
            const totalCost = interestVal + taxes
            totalInterest += totalCost
            remaining += totalCost
        }
        months++
    }

    return {
        months,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        infinite: months >= 360
    }
}

export default function CardDetailView({ card }: CardDetailProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'statements' | 'payment'>('overview')
    const [paymentAmount, setPaymentAmount] = useState('')
    const [showAddTransaction, setShowAddTransaction] = useState(false)
    const [showEditCard, setShowEditCard] = useState(false)
    const [loading, setLoading] = useState(false)

    // Transaction search and filter states
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('ALL')

    // Interactive payment simulator states
    const [simulatedPayment, setSimulatedPayment] = useState<number>(card.minimumPayment || 100)

    const level = getLimitWarningLevel(card.utilizationPercent)
    const warningColor = getLimitWarningColor(level)

    // Active calculations based on slider payment
    const sliderInterestAnalysis = useMemo(() => {
        if (card.currentDebt <= 0) return null
        return analyzeInterestForPeriod({
            statementBalance: card.statementBalance || card.currentDebt,
            minimumPayment: card.minimumPayment,
            paymentMade: simulatedPayment,
            contractualRate: card.contractualRate,
            defaultRate: card.defaultRate,
            days: 30,
            kkdfRate: card.kkdfRate,
            bsmvRate: card.bsmvRate,
        })
    }, [card, simulatedPayment])

    const sliderCostBreakdown = useMemo(() => {
        if (!sliderInterestAnalysis) return null
        return formatCostBreakdown(
            sliderInterestAnalysis.totalInterest.interest, 
            card.kkdfRate, 
            card.bsmvRate
        )
    }, [sliderInterestAnalysis, card])

    const sliderFixedPaymentSim = useMemo(() => {
        if (card.currentDebt <= 0) return null
        return simulateFixedMonthlyPayment(
            card.currentDebt,
            simulatedPayment,
            card.contractualRate,
            card.kkdfRate,
            card.bsmvRate
        )
    }, [card, simulatedPayment])

    // Standard static simulations
    const minimumTrap = useMemo(() => {
        if (card.currentDebt <= 0) return null
        return simulateMinimumPaymentTrap({
            currentDebt: card.currentDebt,
            minPaymentRate: card.minPaymentRate,
            contractualRate: card.contractualRate,
            kkdfRate: card.kkdfRate,
            bsmvRate: card.bsmvRate,
        })
    }, [card])

    // Payment Preview
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

    // Filtered transactions
    const filteredTransactions = useMemo(() => {
        return card.transactions.filter(tx => {
            const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (tx.merchant && tx.merchant.toLowerCase().includes(searchTerm.toLowerCase()))
            
            const matchesType = typeFilter === 'ALL' || tx.type === typeFilter
            return matchesSearch && matchesType
        })
    }, [card.transactions, searchTerm, typeFilter])

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
        { key: 'overview' as const, label: 'Genel Bakış', icon: <CreditCard className="w-4 h-4" /> },
        { key: 'transactions' as const, label: 'İşlemler', icon: <Receipt className="w-4 h-4" /> },
        { key: 'statements' as const, label: 'Ekstre Geçmişi', icon: <TrendingDown className="w-4 h-4" /> },
        { key: 'payment' as const, label: 'Ödeme Yap', icon: <DollarSign className="w-4 h-4" /> },
    ]

    return (
        <div className="space-y-8">
            {/* Header Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/cards" className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-zinc-400 hover:text-white" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold tracking-tight text-white">{card.cardName}</span>
                            <span className="text-zinc-500 font-mono text-sm px-2.5 py-0.5 rounded bg-zinc-900">•••• {card.last4Digits}</span>
                        </div>
                        <p className="text-zinc-500 text-xs mt-1">
                            {card.bankName} · {card.cardNetwork}
                        </p>
                    </div>
                </div>

                {/* Edit & Delete Buttons */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowEditCard(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850 transition-all text-xs font-semibold"
                    >
                        <Pencil className="w-4 h-4" /> Kartı Düzenle
                    </button>
                    <button 
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-all text-xs font-semibold"
                    >
                        <Trash2 className="w-4 h-4" /> Sil
                    </button>
                </div>
            </div>

            {/* Premium Split Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* LEFT COLUMN: 3D CARD VISUAL & MAIN STATS (4/12 width) */}
                <div className="lg:col-span-4 flex flex-col gap-6 items-center lg:items-stretch">
                    
                    {/* Interactive 3D Digital Card */}
                    <div className="w-full flex flex-col items-center p-6 rounded-2xl bg-zinc-950 border border-zinc-900">
                        <CreditCardVisual card={card} flippable={true} className="shadow-2xl scale-[1.03]" />
                        <div className="mt-4 text-[10px] text-zinc-500 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Tıkla & Arkasını Çevir
                        </div>
                    </div>

                    {/* Quick Stats Panel */}
                    <div className="w-full fintech-card p-5 space-y-4 bg-zinc-950/80 border-zinc-900">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-900/80">
                            <span className="text-zinc-500 text-xs font-semibold">Limit Durumu</span>
                            <span style={{ color: warningColor }} className="text-xs font-extrabold font-mono">%{card.utilizationPercent.toFixed(1)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Güncel Borç</span>
                                <p className="text-lg font-bold font-mono text-white mt-1 privacy-blur">{formatCurrency(card.currentDebt)}</p>
                            </div>
                            <div>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Dönem Borcu</span>
                                <p className="text-lg font-bold font-mono text-zinc-300 mt-1 privacy-blur">{formatCurrency(card.statementBalance)}</p>
                            </div>
                            <div>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Asgari Ödeme</span>
                                <p className="text-lg font-bold font-mono text-orange-400 mt-1 privacy-blur">{formatCurrency(card.minimumPayment)}</p>
                            </div>
                            <div>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Kalan Limit</span>
                                <p className="text-lg font-bold font-mono text-emerald-400 mt-1 privacy-blur">{formatCurrency(card.availableLimit)}</p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden p-[1px]">
                            <div 
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${Math.min(card.utilizationPercent, 100)}%`,
                                    background: `linear-gradient(90deg, ${card.color}, ${warningColor})`
                                }}
                            />
                        </div>
                    </div>

                    {/* Reward Points Actions */}
                    <div className="w-full fintech-card p-5 bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 text-base">
                                🏆
                            </div>
                            <div>
                                <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider leading-none">Ödül Puanları</p>
                                <p className="text-base font-bold text-amber-500 mt-1.5 font-mono">{card.rewardsPoints.toLocaleString('tr-TR')} Puan</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                const newPoints = prompt('Yeni puanı girin:', card.rewardsPoints.toString())
                                if (newPoints !== null && !isNaN(parseFloat(newPoints))) {
                                    updateCardPoints(card.id, parseFloat(newPoints))
                                    router.refresh()
                                }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-850 transition-all uppercase tracking-wider"
                        >
                            Güncelle
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN: CONTENT TAB PANELS (8/12 width) */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* Premium Glass Tabs Navigation */}
                    <div className="flex gap-1.5 p-1 bg-zinc-950 border border-zinc-900 rounded-2xl overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider ${
                                    activeTab === tab.key
                                        ? 'bg-white text-black shadow-lg font-extrabold'
                                        : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Panels with Framer Motion AnimatePresence */}
                    <div className="min-h-[400px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.25 }}
                            >
                                {/* OVERVIEW TAB */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-6">
                                        
                                        {/* INTERACTIVE INTEREST SIMULATOR PANEL */}
                                        {card.currentDebt > 0 && (
                                            <div className="fintech-card p-6 border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-950/40 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
                                                
                                                <h3 className="text-sm font-bold mb-5 flex items-center gap-2 text-white">
                                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                                    Akıllı Ödeme ve Faiz Simülatörü
                                                </h3>

                                                <p className="text-xs text-zinc-400 mb-6">
                                                    Aşağıdaki kaydırıcıyı sürükleyerek yapacağınız ödemenin borç kapanma süresi, ödenecek toplam faiz ve sonraki dönem ekstre maliyeti üzerindeki etkisini anlık olarak gözlemleyebilirsiniz.
                                                </p>

                                                {/* Interactive Slider Input */}
                                                <div className="space-y-4 mb-6">
                                                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                                                        <span className="text-zinc-500">Planlanan Ödeme Tutarı</span>
                                                        <span className="text-amber-400 font-mono text-sm privacy-blur">{formatCurrency(simulatedPayment)}</span>
                                                    </div>
                                                    
                                                    <input 
                                                        type="range"
                                                        min={Math.max(card.minimumPayment || 50, 50)}
                                                        max={card.currentDebt}
                                                        step={50}
                                                        value={simulatedPayment}
                                                        onChange={(e) => setSimulatedPayment(Number(e.target.value))}
                                                        className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none focus:ring-0"
                                                    />

                                                    <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-mono">
                                                        <span>Asgari ({formatCurrency(card.minimumPayment)})</span>
                                                        <span>Borç Tamamı ({formatCurrency(card.currentDebt)})</span>
                                                    </div>
                                                </div>

                                                {/* Simulation Results Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                                                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Borcun Kapanma Süresi</span>
                                                        <p className="text-lg font-bold text-white mt-2">
                                                            {sliderFixedPaymentSim?.infinite ? (
                                                                <span className="text-red-400 text-sm font-semibold">Sonsuz Döngü ⚠️</span>
                                                            ) : (
                                                                `${sliderFixedPaymentSim?.months} Ay`
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                                                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Toplam Ödenecek Faiz/Vergi</span>
                                                        <p className="text-lg font-bold text-amber-500 mt-2 font-mono privacy-blur">
                                                            {sliderFixedPaymentSim?.infinite ? '-' : formatCurrency(sliderFixedPaymentSim?.totalInterest ?? 0)}
                                                        </p>
                                                    </div>

                                                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                                                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Sonraki Ay Faiz Yükü</span>
                                                        <p className="text-lg font-bold text-red-400 mt-2 font-mono privacy-blur">
                                                            {formatCurrency(sliderInterestAnalysis?.totalInterest.totalCost ?? 0)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Educational Alerts Banner */}
                                                {sliderFixedPaymentSim?.infinite ? (
                                                    <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-2xl flex gap-3 text-red-400 text-xs">
                                                        <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
                                                        <div>
                                                            <strong className="font-extrabold uppercase tracking-wide">Kritik Uyarı: Sonsuz Borç Döngüsü!</strong>
                                                            <p className="mt-1 text-zinc-400 leading-normal">
                                                                Planlanan ödeme tutarınız, birikecek aylık faiz ve vergi yükünü karşılamaya yetmiyor. Bu ödeme miktarı ile kart borcunuz **hiçbir zaman kapanmayacaktır**. Lütfen aylık ödeme tutarınızı artırın.
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : simulatedPayment === card.minimumPayment && minimumTrap && minimumTrap.months > 3 ? (
                                                    <div className="p-4 bg-yellow-950/20 border border-yellow-900/30 rounded-2xl flex gap-3 text-yellow-400 text-xs">
                                                        <AlertTriangle className="w-5 h-5 shrink-0" />
                                                        <div>
                                                            <strong className="font-extrabold uppercase tracking-wide">Asgari Ödeme Tuzağı Algılandı!</strong>
                                                            <p className="mt-1 text-zinc-400 leading-normal">
                                                                Sadece asgari ödeme yapmaya devam ederseniz, bu borcu kapatmanız tam <strong className="text-yellow-400">{minimumTrap.months} ay</strong> sürecek ve ek olarak <strong className="text-red-400">{formatCurrency(minimumTrap.totalInterest + minimumTrap.totalTax)}</strong> faiz/vergi maliyeti ödeyeceksiniz.
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 bg-emerald-950/10 border border-emerald-900/20 rounded-2xl flex gap-3 text-emerald-400 text-xs">
                                                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                                                        <div>
                                                            <strong className="font-extrabold uppercase tracking-wide">Sağlıklı Geri Ödeme Planı</strong>
                                                            <p className="mt-1 text-zinc-400 leading-normal">
                                                                Tebrikler! Belirlediğiniz ödeme tutarı, asgari ödemenin üzerinde olup borcunuzu makul bir sürede ({sliderFixedPaymentSim?.months} ay) kapatmanıza olanak tanır.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Cost breakdown checklist */}
                                        {sliderCostBreakdown && simulatedPayment < card.statementBalance && (
                                            <div className="fintech-card p-6 border-zinc-800">
                                                <h4 className="font-semibold mb-4 text-sm text-zinc-400 uppercase tracking-wider">Sonraki Dönem Faiz Detayları (30 Gün Tahmini)</h4>
                                                <div className="space-y-3 text-xs">
                                                    {sliderCostBreakdown.items.map((item, i) => (
                                                        <div key={i} className="flex justify-between items-center text-zinc-400 border-b border-zinc-900 pb-2">
                                                            <span>{item.name} {item.rate !== '-' ? `(${item.rate})` : ''}</span>
                                                            <span className="font-mono text-white privacy-blur">{formatCurrency(item.amount)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between items-center pt-2 text-sm">
                                                        <span className="font-bold text-white uppercase tracking-wider">Sonraki Dönem Ekstre İlavesi</span>
                                                        <span className="font-mono font-extrabold text-red-400 privacy-blur">{formatCurrency(sliderCostBreakdown.total)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Card detailed configurations list */}
                                        <div className="fintech-card p-6 border-zinc-900">
                                            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-zinc-300">📋 Kart Detay ve Faiz Ayarları</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 text-xs text-zinc-400 font-medium">
                                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                                    <span>Toplam Limit</span> 
                                                    <span className="font-mono text-white privacy-blur">{formatCurrency(card.totalLimit)}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                                    <span>Nakit Avans Limiti</span> 
                                                    <span className="font-mono text-white privacy-blur">{formatCurrency(card.cashAdvanceLimit)}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                                    <span>Hesap Kesim Günü</span> 
                                                    <span className="font-mono text-white">Her ayın {card.cutOffDay}. günü</span>
                                                </div>
                                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                                    <span>Son Ödeme Günü</span> 
                                                    <span className="font-mono text-white">Her ayın {card.paymentDueDay}. günü</span>
                                                </div>
                                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                                    <span>Akdi Faiz Oranı</span> 
                                                    <span className="font-mono text-white">%{card.contractualRate}/ay</span>
                                                </div>
                                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                                    <span>Gecikme Faiz Oranı</span> 
                                                    <span className="font-mono text-white">%{card.defaultRate}/ay</span>
                                                </div>
                                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                                    <span>Asgari Ödeme Oranı</span> 
                                                    <span className="font-mono text-white">%{(card.minPaymentRate * 100).toFixed(0)}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                                    <span>Yasal Vergiler (KKDF + BSMV)</span> 
                                                    <span className="font-mono text-white">%{(card.kkdfRate * 100).toFixed(0)} + %{(card.bsmvRate * 100).toFixed(0)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TRANSACTIONS TAB */}
                                {activeTab === 'transactions' && (
                                    <div className="space-y-6">
                                        
                                        {/* Action Bar (Search, filter & add transaction button) */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            
                                            {/* Search input */}
                                            <div className="relative flex-1 max-w-sm">
                                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input 
                                                    type="text" 
                                                    placeholder="İşlemlerde ara..." 
                                                    value={searchTerm}
                                                    onChange={e => setSearchTerm(e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold text-white focus:border-zinc-700 outline-none transition-colors placeholder-zinc-650"
                                                />
                                            </div>

                                            {/* Filter pills and Add Button */}
                                            <div className="flex items-center gap-3 self-end md:self-auto">
                                                <select 
                                                    value={typeFilter}
                                                    onChange={e => setTypeFilter(e.target.value)}
                                                    className="bg-zinc-950 border border-zinc-900 text-zinc-400 text-xs font-bold rounded-xl py-2 px-3 outline-none"
                                                >
                                                    <option value="ALL">Tüm İşlemler</option>
                                                    <option value="PURCHASE">Alışveriş</option>
                                                    <option value="INSTALLMENT_PURCHASE">Taksitli</option>
                                                    <option value="CASH_ADVANCE">Nakit Avans</option>
                                                    <option value="FEE">Ücret/Faiz</option>
                                                    <option value="REFUND">İadeler</option>
                                                </select>

                                                <button
                                                    onClick={() => setShowAddTransaction(!showAddTransaction)}
                                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all text-xs font-extrabold"
                                                >
                                                    <Plus className="w-4 h-4" /> İşlem Ekle
                                                </button>
                                            </div>
                                        </div>

                                        {/* Add Transaction Form Modal (Inline overlay) */}
                                        {showAddTransaction && (
                                            <form onSubmit={handleAddTransaction} className="fintech-card p-6 bg-zinc-950 border-zinc-900 space-y-4 animate-fade-in-up">
                                                <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 mb-1 border-b border-zinc-900 pb-2">Yeni Kart Harcaması Kaydet</h4>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="form-label">İşlem Türü</label>
                                                        <select name="type" className="form-input">
                                                            <option value="PURCHASE">Alışveriş</option>
                                                            <option value="INSTALLMENT_PURCHASE">Taksitli Alışveriş</option>
                                                            <option value="CASH_ADVANCE">Nakit Avans</option>
                                                            <option value="FEE">Ekstre Ücreti / Komisyon</option>
                                                            <option value="REFUND">Harcama İadesi</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="form-label">Harcama Tutarı (₺)</label>
                                                        <input name="amount" type="number" step="0.01" required className="form-input font-mono" placeholder="0.00" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="form-label">Açıklama</label>
                                                        <input name="description" required placeholder="Market Alışverişi, Fatura vb." className="form-input" />
                                                    </div>
                                                    <div>
                                                        <label className="form-label">Üye İş Yeri / Mağaza (Opsiyonel)</label>
                                                        <input name="merchant" placeholder="Trendyol, Migros vb." className="form-input" />
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 justify-end pt-2 border-t border-zinc-900">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setShowAddTransaction(false)} 
                                                        className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white"
                                                    >
                                                        İptal
                                                    </button>
                                                    <button 
                                                        type="submit" 
                                                        disabled={loading} 
                                                        className="px-5 py-2 text-xs font-bold bg-white text-black rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-40"
                                                    >
                                                        {loading ? 'Kaydediliyor...' : 'Harcamayı Kaydet'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}

                                        {/* Transactions List */}
                                        {filteredTransactions.length === 0 ? (
                                            <div className="fintech-card p-12 text-center text-zinc-500 border border-zinc-900 bg-zinc-950/40">
                                                🔍 Arama kriterlerinize uyan işlem bulunamadı.
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {filteredTransactions.map(tx => {
                                                    const isRefund = tx.type === 'REFUND'
                                                    const isCash = tx.isCashAdvance
                                                    const isFee = tx.type === 'FEE'

                                                    return (
                                                        <div key={tx.id} className="fintech-card p-4 flex items-center justify-between bg-zinc-950/80 border-zinc-900/60 hover:border-zinc-800 transition-colors group">
                                                            <div className="flex items-center gap-3.5">
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base transition-colors ${
                                                                    isRefund 
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                                        : isCash 
                                                                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                                                            : isFee
                                                                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                                                : 'bg-zinc-900 text-zinc-500 border border-zinc-800 group-hover:border-zinc-700'
                                                                }`}>
                                                                    {isRefund ? '↩' : isCash ? '💵' : isFee ? '📄' : '🛒'}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs sm:text-sm font-bold text-white">{tx.description}</p>
                                                                    <p className="text-[10px] text-zinc-500 mt-1 font-semibold flex items-center gap-1">
                                                                        <span>{formatDate(tx.transactionDate)}</span>
                                                                        {tx.merchant && (
                                                                            <>
                                                                                <span className="text-zinc-700">•</span>
                                                                                <span className="text-zinc-400 flex items-center gap-0.5"><Tag className="w-3 h-3 text-zinc-500" /> {tx.merchant}</span>
                                                                            </>
                                                                        )}
                                                                        {tx.totalInstallments > 1 && (
                                                                            <>
                                                                                <span className="text-zinc-700">•</span>
                                                                                <span className="text-amber-400 font-bold">{tx.totalInstallments} Taksit</span>
                                                                            </>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span className={`font-mono font-bold text-sm privacy-blur ${isRefund ? 'text-emerald-400' : 'text-white'}`}>
                                                                {isRefund ? '+' : '-'}{formatCurrency(tx.amount)}
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* STATEMENTS TAB */}
                                {activeTab === 'statements' && (
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-sm uppercase tracking-wider text-zinc-400">📂 Dönem Ekstreleri Geçmişi</h3>
                                        {card.statements.length === 0 ? (
                                            <div className="fintech-card p-12 text-center text-zinc-500 border border-zinc-900 bg-zinc-950/40">
                                                Ekstre geçmişiniz bulunmuyor. Ekstre kesildiğinde burada görünecektir.
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {card.statements.map(stmt => {
                                                    const isPaid = stmt.status === 'PAID'
                                                    const isOverdue = stmt.status === 'OVERDUE'

                                                    return (
                                                        <div key={stmt.id} className="fintech-card p-5 bg-zinc-950/80 border-zinc-900/80 hover:border-zinc-800 transition-colors">
                                                            <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className="w-4 h-4 text-zinc-500" />
                                                                    <div>
                                                                        <p className="text-xs font-bold text-white">{formatDate(stmt.statementDate)} Ekstresi</p>
                                                                        <p className="text-[10px] text-zinc-500 mt-0.5">Vade Tarihi: {formatDate(stmt.dueDate)}</p>
                                                                    </div>
                                                                </div>
                                                                <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                                                    isPaid 
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                                        : isOverdue 
                                                                            ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' 
                                                                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                                }`}>
                                                                    {isPaid ? 'ÖDENDİ' : isOverdue ? 'GECİKMİŞ' : 'AÇIK EKSTRE'}
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium text-zinc-500">
                                                                <div>
                                                                    <span className="text-[10px] uppercase font-bold tracking-wider">Ekstre Borcu</span>
                                                                    <p className="text-sm font-bold font-mono text-white mt-1 privacy-blur">{formatCurrency(stmt.statementBalance)}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-[10px] uppercase font-bold tracking-wider">Asgari Ödeme</span>
                                                                    <p className="text-sm font-bold font-mono text-orange-400 mt-1 privacy-blur">{formatCurrency(stmt.minimumPayment)}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-[10px] uppercase font-bold tracking-wider">Yapılan Ödeme</span>
                                                                    <p className="text-sm font-bold font-mono text-emerald-400 mt-1 privacy-blur">{formatCurrency(stmt.paymentsReceived)}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-[10px] uppercase font-bold tracking-wider">Faiz & Vergi</span>
                                                                    <p className="text-sm font-bold font-mono text-red-400 mt-1 privacy-blur">{formatCurrency(stmt.interestCharged + stmt.taxCharged)}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* PAYMENT TAB */}
                                {activeTab === 'payment' && (
                                    <div className="max-w-lg space-y-6">
                                        <div className="fintech-card p-6 bg-zinc-950 border-zinc-900">
                                            <h3 className="text-sm font-bold mb-5 flex items-center gap-2 text-white">
                                                <DollarSign className="w-4 h-4 text-emerald-400" />
                                                Kredi Kartı Borç Ödemesi
                                            </h3>

                                            {/* Fast Payment options */}
                                            <div className="grid grid-cols-3 gap-3 mb-6 text-xs text-center font-bold">
                                                <button
                                                    onClick={() => setPaymentAmount(card.currentDebt.toFixed(2))}
                                                    className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 hover:border-zinc-700 transition-colors flex flex-col justify-between items-center gap-1.5"
                                                >
                                                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Güncel Borç</span>
                                                    <span className="font-mono text-white privacy-blur">{formatCurrency(card.currentDebt)}</span>
                                                    <span className="text-[8px] text-emerald-400 font-bold uppercase">Hepsini Öde</span>
                                                </button>
                                                <button
                                                    onClick={() => setPaymentAmount(card.statementBalance.toFixed(2))}
                                                    className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 hover:border-zinc-700 transition-colors flex flex-col justify-between items-center gap-1.5"
                                                >
                                                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Ekstre Borcu</span>
                                                    <span className="font-mono text-white privacy-blur">{formatCurrency(card.statementBalance)}</span>
                                                    <span className="text-[8px] text-blue-400 font-bold uppercase">Dönemi Kapat</span>
                                                </button>
                                                <button
                                                    onClick={() => setPaymentAmount(card.minimumPayment.toFixed(2))}
                                                    className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 hover:border-zinc-700 transition-colors flex flex-col justify-between items-center gap-1.5"
                                                >
                                                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Asgari Ödeme</span>
                                                    <span className="font-mono text-orange-400 privacy-blur">{formatCurrency(card.minimumPayment)}</span>
                                                    <span className="text-[8px] text-amber-500 font-bold uppercase">Asgari Yatır</span>
                                                </button>
                                            </div>

                                            {/* Numeric input */}
                                            <div className="space-y-2 mb-6">
                                                <label className="form-label">Ödenecek Tutar (₺)</label>
                                                <input 
                                                    type="number"
                                                    step="0.01"
                                                    value={paymentAmount}
                                                    onChange={e => setPaymentAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-lg outline-none focus:border-zinc-700 transition-colors placeholder-zinc-700"
                                                />
                                            </div>

                                            {/* Live Payment Preview Panel */}
                                            {preview && (
                                                <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 mb-6 space-y-2.5 text-xs text-zinc-400">
                                                    <div className="flex justify-between">
                                                        <span>Kalan Borç</span>
                                                        <span className="font-mono text-white font-semibold privacy-blur">{formatCurrency(preview.remainingDebt)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span>Asgari Koşulu Karşılandı mı?</span>
                                                        <span className={`font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider ${
                                                            preview.minimumSatisfied 
                                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                        }`}>
                                                            {preview.minimumSatisfied ? 'EVET' : 'HAYIR'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Sonraki Dönem Tahmini Faiz (30g)</span>
                                                        <span className="font-mono text-red-400 font-bold privacy-blur">{formatCurrency(preview.projectedInterest.totalCost)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={handlePayment}
                                                disabled={payAmt <= 0 || loading}
                                                className="w-full py-3.5 rounded-xl bg-white text-black font-extrabold hover:bg-zinc-200 transition-all text-xs uppercase tracking-widest disabled:opacity-40 disabled:hover:bg-white"
                                            >
                                                {loading ? 'Ödeme Kaydediliyor...' : 'Ödemeyi Onayla ve Kaydet'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* EDIT CARD FORM MODAL */}
            {showEditCard && (
                <CardFormModal 
                    card={{
                        id: card.id,
                        cardName: card.cardName,
                        bankName: card.bankName,
                        last4Digits: card.last4Digits,
                        cardNetwork: card.cardNetwork,
                        color: card.color,
                        status: card.status,
                        totalLimit: card.totalLimit,
                        cashAdvanceLimit: card.cashAdvanceLimit,
                        cutOffDay: card.cutOffDay,
                        paymentDueDay: card.paymentDueDay,
                        contractualRate: card.contractualRate,
                        defaultRate: card.defaultRate,
                        cashAdvanceRate: card.cashAdvanceRate,
                        kkdfRate: card.kkdfRate,
                        bsmvRate: card.bsmvRate,
                        minPaymentRate: card.minPaymentRate,
                        rewardsPoints: card.rewardsPoints,
                    }}
                    onClose={() => {
                        setShowEditCard(false)
                        router.refresh()
                    }}
                />
            )}
        </div>
    )
}
