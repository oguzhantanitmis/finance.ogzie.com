import { getMarketTicker, refreshEvdsRates } from '@/lib/evds-service'
import { prisma } from '@/lib/prisma'

export interface MarketRates {
    USD: number
    EUR: number
    GBP: number
    GA: number // Gram Altın
    BTC: number
    ETH: number
    source: string | null
    updatedAt: Date | null
    rateDate: Date | null
}

const EMPTY_MARKET_RATES: MarketRates = {
    USD: 0,
    EUR: 0,
    GBP: 0,
    GA: 0,
    BTC: 0,
    ETH: 0,
    source: null,
    updatedAt: null,
    rateDate: null,
}

const RATE_CODES = {
    USD: 'USDTRY',
    EUR: 'EURTRY',
    GBP: 'GBPTRY',
    GA: 'XAU_GRAM',
} as const

function getRateValue(rate: { buyRate: number | null, sellRate: number | null } | null | undefined) {
    return rate?.sellRate ?? rate?.buyRate ?? 0
}

function hasFiatRate(rates: MarketRates) {
    return rates.USD > 0 || rates.EUR > 0 || rates.GBP > 0
}

async function readStoredMarketRates(userId: string): Promise<MarketRates> {
    const rows = await prisma.marketRate.findMany({
        where: {
            userId,
            currencyCode: { in: Object.values(RATE_CODES) },
        },
        orderBy: [
            { rateDate: 'desc' },
            { createdAt: 'desc' },
        ],
    })

    const latestByCode = new Map<string, (typeof rows)[number]>()
    for (const row of rows) {
        if (!latestByCode.has(row.currencyCode)) {
            latestByCode.set(row.currencyCode, row)
        }
    }

    const latestMeta = Array.from(latestByCode.values()).sort((a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime(),
    )[0]

    return {
        ...EMPTY_MARKET_RATES,
        USD: getRateValue(latestByCode.get(RATE_CODES.USD)),
        EUR: getRateValue(latestByCode.get(RATE_CODES.EUR)),
        GBP: getRateValue(latestByCode.get(RATE_CODES.GBP)),
        GA: getRateValue(latestByCode.get(RATE_CODES.GA)),
        source: latestMeta?.source ?? null,
        updatedAt: latestMeta?.createdAt ?? null,
        rateDate: latestMeta?.rateDate ?? null,
    }
}

export async function getMarketRates(userId?: string): Promise<MarketRates> {
    if (!userId) return EMPTY_MARKET_RATES

    await getMarketTicker(userId).catch(() => null)

    let rates = await readStoredMarketRates(userId)
    if (hasFiatRate(rates)) return rates

    await refreshEvdsRates(userId).catch(() => null)
    rates = await readStoredMarketRates(userId)

    return rates
}

export function calculateAssetValue(amount: number, type: string, currency: string, rates: MarketRates): number {
    // TL ise direkt değer
    if (currency === 'TRY' || currency === 'TL') return amount

    // Döviz ise
    if (currency === 'USD') return amount * rates.USD
    if (currency === 'EUR') return amount * rates.EUR
    if (currency === 'GBP') return amount * rates.GBP

    // Altın ise (Gram)
    if (type === 'GOLD' || currency === 'XAU' || currency === 'GA') return amount * rates.GA

    // Kripto ise (Genelde USD üzerinden hesaplanır, sonra TL'ye çevrilir)
    if (currency === 'BTC') return amount * rates.BTC * rates.USD
    if (currency === 'ETH') return amount * rates.ETH * rates.USD
    if (currency === 'USDT') return amount * rates.USD

    // Bilinmeyen tip
    return amount
}
