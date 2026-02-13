'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, AlertCircle, CreditCard, Landmark, Banknote, Calendar } from 'lucide-react'
import { calculateAccumulatedInterest, calculateMinPayment, TAX_RATES } from '@/lib/banking-engine'

// Prisma Tipleri tam olarak client'ta olmayabilir, o yüzden manuel interface tanımlıyoruz veya any geçiyoruz şimdilik.
// Doğrusu genereated tipleri kullanmak ama import sorunları yaşamamak için:
interface DebtV2 {
    id: string
    name: string
    type: 'CREDIT_CARD' | 'LOAN' | 'KMH' | 'PERSONAL' | 'MANUAL'
    limit?: number | null
    cutOffDay?: number | null
    paymentDueDay?: number | null
    totalBalance: number // Kart için dönem borcu, Kredi için çekilen tutar
    remainingBalance: number // Güncel borç
    interestRate: number
    minPaymentRate: number
    kkdfRate: number
    bsmvRate: number
    paymentPlan?: any[]
}

const DebtTable = ({ debts }: { debts: DebtV2[] }) => {
    const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null)

    const toggleExpand = (id: string) => {
        setExpandedDebtId(expandedDebtId === id ? null : id)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount)
    }

    return (
        <div className="space-y-4">
            {debts.map((debt) => {
                const isCard = debt.type === 'CREDIT_CARD'
                const isLoan = debt.type === 'LOAN'
                const isKMH = debt.type === 'KMH'

                let monthlyInterestCost = 0
                let dailyInterestCost = 0
                let taxCost = 0
                let minPayment = 0
                let utilization = 0

                if (isCard) {
                    minPayment = calculateMinPayment(debt.limit || 0, debt.remainingBalance)
                    utilization = debt.limit ? (debt.remainingBalance / debt.limit) * 100 : 0
                    const calc = calculateAccumulatedInterest(debt.remainingBalance, debt.interestRate, 30)
                    monthlyInterestCost = calc.interest
                    taxCost = calc.tax
                } else if (isKMH) {
                    utilization = debt.limit ? (debt.remainingBalance / debt.limit) * 100 : 0
                    const calcMonthly = calculateAccumulatedInterest(debt.remainingBalance, debt.interestRate, 30)
                    const calcDaily = calculateAccumulatedInterest(debt.remainingBalance, debt.interestRate, 1)
                    monthlyInterestCost = calcMonthly.interest
                    dailyInterestCost = calcDaily.interest
                    taxCost = calcMonthly.tax
                }


                // Kredi için ödeme planından bakacağız (veya basit hesap)
                // Şimdilik kredide aylık maliyeti plana göre göstermek gerekir ama basitçe faiz oranı * kalan anapara diyebiliriz
                if (isLoan) {
                    const calc = calculateAccumulatedInterest(debt.remainingBalance, debt.interestRate, 30)
                    monthlyInterestCost = calc.interest // Yaklaşık
                    taxCost = calc.tax
                }

                const totalMonthlyCost = monthlyInterestCost + taxCost

                return (
                    <div key={debt.id} className="fintech-card overflow-hidden transition-all duration-300">
                        {/* Header Row */}
                        <div
                            className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5"
                            onClick={() => toggleExpand(debt.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900 border border-white/10",
                                    isCard && "text-blue-400",
                                    isLoan && "text-purple-400",
                                    isKMH && "text-orange-400"
                                )}>
                                    {isCard && <CreditCard className="w-5 h-5" />}
                                    {isLoan && <Landmark className="w-5 h-5" />}
                                    {isKMH && <Banknote className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{debt.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                                        <span className="bg-white/10 px-2 py-0.5 rounded text-white">{debt.type.replace('_', ' ')}</span>
                                        {debt.interestRate > 0 && <span>Faiz: %{debt.interestRate}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500">Güncel Borç</p>
                                    <p className="font-mono text-xl font-bold privacy-blur">{formatCurrency(debt.remainingBalance)}</p>
                                    {(isCard || isKMH) && debt.limit && (
                                        <div className="w-24 bg-zinc-800 h-1 rounded-full mt-1 ml-auto">
                                            <div
                                                className={cn("h-1 rounded-full", utilization > 80 ? "bg-rose-500" : utilization > 50 ? "bg-amber-500" : "bg-emerald-500")}
                                                style={{ width: `${Math.min(utilization, 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {expandedDebtId === debt.id ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedDebtId === debt.id && (
                            <div className="border-t border-white/5 bg-black/20 p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    {/* Column 1: Temel Bilgiler */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-zinc-500 border-b border-white/10 pb-2">Hesap Detayları</h4>

                                        {debt.limit && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-400">Limit</span>
                                                <span className="font-mono privacy-blur">{formatCurrency(debt.limit)}</span>
                                            </div>
                                        )}
                                        {debt.cutOffDay && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-400">Hesap Kesim</span>
                                                <span className="font-mono text-white">Her ayın {debt.cutOffDay}. günü</span>
                                            </div>
                                        )}
                                        {debt.paymentDueDay && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-400">Son Ödeme</span>
                                                <span className="font-mono text-white">Her ayın {debt.paymentDueDay}. günü</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Column 2: Maliyet Analizi */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-zinc-500 border-b border-white/10 pb-2">Maliyet Analizi (Simülasyon)</h4>
                                        {isKMH && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-400">Günlük Faiz</span>
                                                <span className="font-mono text-red-300 privacy-blur">{formatCurrency(dailyInterestCost)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-400">Aylık Faiz</span>
                                            <span className="font-mono text-neutral-300 privacy-blur">{formatCurrency(monthlyInterestCost)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-400">Vergi (KKDF+BSMV)</span>
                                            <span className="font-mono text-neutral-300 privacy-blur">{formatCurrency(taxCost)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                                            <span className="text-white font-medium">Toplam Aylık "Kayıp"</span>
                                            <span className="font-mono text-rose-500 font-bold privacy-blur">{formatCurrency(totalMonthlyCost)}</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-600 mt-1">*{isKMH ? 'Güncel eksi bakiye' : 'Borcun hiç ödenmemesi'} üzerinden hesaplanmıştır.</p>
                                    </div>


                                    {/* Column 3: Aksiyon / Durum */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-zinc-500 border-b border-white/10 pb-2">Ödeme Durumu</h4>

                                        {isCard && (
                                            <div className="bg-zinc-900 border border-white/5 p-3 rounded-lg">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-xs text-zinc-400">Asgari Ödeme (%{(debt.minPaymentRate * 100).toFixed(0)})</span>
                                                    <span className="text-sm font-bold text-white">{formatCurrency(minPayment)}</span>
                                                </div>
                                                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2">
                                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '20%' }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Loan Payment Plan Table */}
                                {isLoan && debt.paymentPlan && debt.paymentPlan.length > 0 && (
                                    <div className="mt-6">
                                        <h4 className="text-sm font-medium text-zinc-500 mb-3 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" /> Ödeme Planı
                                        </h4>
                                        <div className="overflow-x-auto border border-white/5 rounded-xl">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-[#1a1a1a] text-zinc-400">
                                                    <tr>
                                                        <th className="p-3">Taksit</th>
                                                        <th className="p-3">Tarih</th>
                                                        <th className="p-3">Tutar</th>
                                                        <th className="p-3">Anapara</th>
                                                        <th className="p-3">Faiz+Vergi</th>
                                                        <th className="p-3">Durum</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 bg-black/40">
                                                    {debt.paymentPlan.map((p) => {
                                                        const isPast = new Date(p.dueDate) < new Date()
                                                        return (
                                                            <tr key={p.id} className={cn("hover:bg-white/5", p.isPaid && "opacity-50 grayscale")}>
                                                                <td className="p-3 font-medium">{p.installmentNo}</td>
                                                                <td className="p-3 text-zinc-400">{new Date(p.dueDate).toLocaleDateString('tr-TR')}</td>
                                                                <td className="p-3 font-mono text-white">{formatCurrency(p.amount)}</td>
                                                                <td className="p-3 font-mono text-zinc-400">{formatCurrency(p.principalAmount)}</td>
                                                                <td className="p-3 font-mono text-red-300">{formatCurrency(p.interestAmount + p.taxAmount)}</td>
                                                                <td className="p-3">
                                                                    {p.isPaid ? (
                                                                        <span className="text-green-500 font-bold">Ödendi</span>
                                                                    ) : isPast ? (
                                                                        <span className="text-red-500 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Gecikmiş</span>
                                                                    ) : (
                                                                        <span className="text-zinc-500">Bekliyor</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default DebtTable
