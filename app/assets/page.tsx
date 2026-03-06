import Navbar from '@/components/Navbar'
import { prisma } from '@/lib/prisma'
import { Wallet, TrendingUp, DollarSign } from 'lucide-react'
import AssetsClientWrapper from './AssetsClientWrapper'
import { getMarketRates, calculateAssetValue } from '@/lib/market-data'
import { getCurrentUser } from '@/lib/server-auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AssetsPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const assets = await prisma.asset.findMany({
        where: { userId: user.id },
        orderBy: { amount: 'desc' }
    })

    const rates = await getMarketRates()

    const assetsWithValuation = assets.map(asset => {
        const valueInTL = calculateAssetValue(asset.amount, asset.type, asset.currency, rates)
        return { ...asset, valueInTL }
    })
    const totalAssetsValue = assetsWithValuation.reduce((sum, asset) => sum + asset.valueInTL, 0)

    const formatCurrency = (amount: number, currency: string = 'TRY') => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount)
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            <Navbar />
            <main className="md:ml-72 p-6 md:p-10 max-w-[1600px] mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Varlık Yönetimi</h1>
                        <p className="text-zinc-500">Canlı kurlar ile anlık net varlık takibi.</p>
                    </div>
                    <AssetsClientWrapper />
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="fintech-card p-6 bg-gradient-to-br from-green-900/20 to-black border-green-900/30">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-green-500/20 rounded-full text-green-400">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <h3 className="text-zinc-400 font-medium">Toplam Varlıklar</h3>
                        </div>
                        <p className="text-3xl font-bold text-white privacy-blur">{formatCurrency(totalAssetsValue)}</p>
                        <div className="flex items-center gap-2 mt-2 text-green-400 text-sm">
                            <TrendingUp className="w-4 h-4" />
                            <span>Canlı Hesaplandı</span>
                        </div>
                    </div>

                    <div className="fintech-card p-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <h3 className="text-zinc-400 font-medium">Dolar Kuru (Mock)</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">{formatCurrency(rates.USD)}</p>
                    </div>
                </div>

                <div className="fintech-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#1a1a1a] text-zinc-400">
                                <tr>
                                    <th className="p-4 font-medium">Varlık</th>
                                    <th className="p-4 font-medium">Tür</th>
                                    <th className="p-4 font-medium">Miktar</th>
                                    <th className="p-4 font-medium">Birim Değer (Tahmini)</th>
                                    <th className="p-4 font-medium text-right">Toplam Değer (TL)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {assetsWithValuation.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-medium text-white flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                                {asset.type === 'GOLD' ? '🥇' : asset.type === 'CRYPTO' ? '₿' : asset.type === 'FX' ? '💱' : '💵'}
                                            </div>
                                            {asset.name}
                                        </td>
                                        <td className="p-4 text-zinc-400">
                                            <span className="bg-white/5 px-2 py-1 rounded text-xs border border-white/5">
                                                {asset.type}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-zinc-300">
                                            {asset.amount} <span className="text-zinc-500 text-xs">{asset.currency}</span>
                                        </td>
                                        <td className="p-4 font-mono text-zinc-400">
                                            {asset.type === 'GOLD' ? formatCurrency(rates.GA) :
                                                asset.currency === 'USD' ? formatCurrency(rates.USD) :
                                                    '-'}
                                        </td>
                                        <td className="p-4 font-mono font-bold text-white text-right privacy-blur">
                                            {formatCurrency(asset.valueInTL)}
                                        </td>
                                    </tr>
                                ))}
                                {assetsWithValuation.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-zinc-500">
                                            Henüz varlık eklenmemiş.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    )
}
