import React from 'react'
import Navbar from '@/components/Navbar'
import AnalyticsCharts from '@/components/AnalyticsCharts'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Asset {
    name: string
    amount: number
    currency: string
}

interface Debt {
    name: string
    remainingBalance: number
    type: string
}

async function getData() {
    const session = await getServerSession(authOptions)
    if (!session) return null

    try {
        const assets = await prisma.asset.findMany()
        const debts = await prisma.debt.findMany()

        // Conversion rates (Fixed for now, can be dynamic later)
        const rates: Record<string, number> = {
            'USD': 32,
            'EUR': 35,
            'GOLD': 2450,
            'TL': 1
        }

        const assetDistribution = assets.map((asset: Asset) => ({
            name: asset.name,
            value: asset.amount * (rates[asset.currency] || 1),
            originalAmount: asset.amount,
            currency: asset.currency
        })).sort((a: { value: number }, b: { value: number }) => b.value - a.value)

        const debtDistribution = debts.map((debt: Debt) => ({
            name: debt.name,
            value: debt.remainingBalance,
            type: debt.type
        })).sort((a: { value: number }, b: { value: number }) => b.value - a.value)

        return {
            assetDistribution,
            debtDistribution,
            rates
        }
    } catch (error) {
        console.error("Analytics data fetch error:", error)
        return {
            assetDistribution: [],
            debtDistribution: [],
            rates: {}
        }
    }
}

export default async function AnalyticsPage() {
    const data = await getData()

    if (!data && process.env.NODE_ENV !== 'development') {
        redirect('/login')
    }

    const safeData = data || { assetDistribution: [], debtDistribution: [], rates: {} }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white/20 pb-20 md:pb-0">
            <Navbar />

            <main className="md:ml-64 p-6 md:p-10 max-w-7xl mx-auto">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Finansal Analiz</h1>
                    <p className="text-zinc-500">Varlık ve borç dağılımlarının detaylı incelemesi.</p>
                </header>

                <AnalyticsCharts
                    assetDistribution={safeData.assetDistribution}
                    debtDistribution={safeData.debtDistribution}
                    conversionRates={safeData.rates}
                />
            </main>
        </div>
    )
}
