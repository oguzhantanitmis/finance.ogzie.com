import React from 'react'
import Navbar from '@/components/Navbar'
import SummaryCards from '@/components/SummaryCards'
import DashboardCharts from '@/components/DashboardCharts'
import ActionButtons from '@/components/ActionButtons'
import AIHeader from '@/components/AIHeader'
import InsightFeed from '@/components/InsightFeed'

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { calculateRiskScore } from '@/lib/finance-risk-score'
import { getMarketRates, calculateAssetValue } from '@/lib/market-data'

export const dynamic = 'force-dynamic'

async function getData() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  try {
    const assets = await prisma.asset.findMany()
    const debts = await prisma.debt.findMany()
    const creditCards = await prisma.creditCard.findMany({
      include: {
        transactions: true,
        payments: true,
      }
    })
    const marketRates = await getMarketRates()
    const insights = await prisma.aIInsight.findMany({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 3
    })
    const subscriptions = await prisma.subscription.findMany()


    // Toplam Varlık (TL Değerleme)
    const totalAssets = assets.reduce((acc: number, a: any) => acc + calculateAssetValue(a.amount, a.type, a.currency, marketRates), 0)

    // Konvansiyonel Borç
    const convDebt = debts.reduce((acc: number, d: any) => acc + d.remainingBalance, 0)

    // Kart Borcu
    const cardDebt = creditCards.reduce((acc: number, card: any) => {
      const charges = card.transactions
        .filter((t: any) => t.type !== 'REFUND')
        .reduce((s: number, t: any) => s + t.amount, 0)

      const refunds = card.transactions
        .filter((t: any) => t.type === 'REFUND')
        .reduce((s: number, t: any) => s + t.amount, 0)

      const payments = card.payments
        .reduce((s: number, p: any) => s + p.amount, 0)

      return acc + Math.max(charges - refunds - payments, 0)
    }, 0)

    const totalDebts = convDebt + cardDebt
    const netWorth = totalAssets - totalDebts

    // Gerçek Risk Analizi
    const risk = calculateRiskScore(assets, debts, marketRates, creditCards)

    // Mock history for now (Net worth tabanlı)
    const history = [
      { name: 'Oca', value: netWorth * 0.9 },
      { name: 'Şub', value: netWorth * 0.95 },
      { name: 'Mar', value: netWorth }
    ]

    const distribution = assets.map((a: any) => ({ name: a.name, value: calculateAssetValue(a.amount, a.type, a.currency, marketRates) }))

    if (cardDebt > 0) {
      distribution.push({ name: 'Kart Borcu', value: -cardDebt })
    }

    return {
      netWorth,
      totalAssets,
      totalDebts,
      riskScore: risk.score,
      history,
      distribution,
      insights,
      subscriptions
    }

  } catch (error) {
    console.error("Data fetch error:", error)
    return {
      netWorth: 0,
      totalAssets: 0,
      totalDebts: 0,
      riskScore: 0,
      history: [],
      distribution: []
    }
  }
}

export default async function Home() {
  const data = await getData()

  if (!data && process.env.NODE_ENV !== 'development') {
    redirect('/login')
  }

  // Fallback for dev mode if auth is skipped or fails
  const safeData = data || {
    netWorth: 0,
    totalAssets: 0,
    totalDebts: 0,
    riskScore: 0,
    history: [],
    distribution: [],
    insights: [],
    subscriptions: []
  }




  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20 pb-20 md:pb-0">
      <Navbar />

      <main className="md:ml-64 p-6 md:p-10 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Hoş Geldin, Patron</h1>
            <p className="text-zinc-500">Finansal imparatorluğun seni bekliyor.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center font-bold">
              OT
            </div>
          </div>
        </header>

        <AIHeader summary="Varlıkların geçen aya göre artış trendinde. AI analizlerin için daha fazla veriye ihtiyacım var." />

        <InsightFeed insights={safeData.insights || []} />

        <ActionButtons />
        <SummaryCards data={safeData} />
        <DashboardCharts history={safeData.history} distribution={safeData.distribution} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="fintech-card p-6">
            <h3 className="font-medium mb-6">Yaklaşan Ödemeler</h3>
            {(safeData.subscriptions || []).length > 0 ? (

              <div className="space-y-4">
                {(safeData.subscriptions || []).slice(0, 3).map((sub: any) => (

                  <div key={sub.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="font-medium">{sub.name}</p>
                      <p className="text-xs text-zinc-500">{new Date(sub.nextPayment).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <p className="font-bold">{sub.amount.toLocaleString('tr-TR', { style: 'currency', currency: sub.currency })}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">Yaklaşan ödeme bulunmuyor.</p>
            )}
          </div>


          <div className="fintech-card p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full" />
            <h3 className="font-medium mb-6 relative z-10">AI Tavsiyesi</h3>
            <p className="text-zinc-400 text-sm relative z-10">
              Veri girişi yaptıkça sana özel tavsiyeler oluşturacağım. Varlık ve borçlarını ekleyerek başlayabilirsin.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
