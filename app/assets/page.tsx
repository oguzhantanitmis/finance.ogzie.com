import PageShell from '@/components/PageShell'
import { prisma } from '@/lib/prisma'
import { getMarketRates, calculateAssetValue } from '@/lib/market-data'
import { getCurrentUser } from '@/lib/server-auth'
import { redirect } from 'next/navigation'
import AssetsWorkspace from '@/components/assets/AssetsWorkspace'

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

    const rates = await getMarketRates(user.id)

    const assetsWithValuation = assets.map(asset => {
        const valueInTL = asset.lastValue && asset.lastValue > 0
            ? asset.lastValue
            : calculateAssetValue(asset.amount, asset.type, asset.currency, rates)
        return { ...asset, valueInTL }
    })
    const totalAssetsValue = assetsWithValuation.reduce((sum, asset) => sum + asset.valueInTL, 0)

    return (
        <PageShell width="genis">
            <AssetsWorkspace
                assets={assetsWithValuation.map((asset) => ({
                    id: asset.id,
                    name: asset.name,
                    type: asset.type,
                    amount: asset.amount,
                    currency: asset.currency,
                    unitPrice: asset.unitPrice ?? null,
                    lastValue: asset.lastValue ?? null,
                    valueInTL: asset.valueInTL,
                }))}
                totalAssetsValue={totalAssetsValue}
                rates={{
                    USD: rates.USD,
                    EUR: rates.EUR,
                    GBP: rates.GBP,
                    GA: rates.GA,
                    BTC: rates.BTC,
                    ETH: rates.ETH,
                }}
                ratesSource={rates.source}
                ratesUpdatedAt={rates.updatedAt?.toISOString() ?? null}
            />
        </PageShell>
    )
}
