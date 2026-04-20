// Basit Mock Data Servisi
// İleride burası TCMB veya başka bir API'ye bağlanabilir.

const FALLBACK_RATES: MarketRates = {
    USD: 32.85,
    EUR: 35.4,
    GBP: 41.5,
    GA: 2450,
    BTC: 68500,
    ETH: 3500,
}

export interface MarketRates {
    USD: number
    EUR: number
    GBP: number
    GA: number // Gram Altın
    BTC: number
    ETH: number
}

export async function getMarketRates(): Promise<MarketRates> {
    const [fxResult, cryptoResult] = await Promise.allSettled([
        fetch('https://open.er-api.com/v6/latest/TRY', {
            next: { revalidate: 1800 },
        }).then(async (response) => {
            if (!response.ok) {
                throw new Error('FX source unavailable')
            }

            return response.json() as Promise<{
                result?: string
                rates?: Record<string, number>
            }>
        }),
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd', {
            next: { revalidate: 1800 },
        }).then(async (response) => {
            if (!response.ok) {
                throw new Error('Crypto source unavailable')
            }

            return response.json() as Promise<{
                bitcoin?: { usd?: number }
                ethereum?: { usd?: number }
            }>
        }),
    ])

    const rates: MarketRates = { ...FALLBACK_RATES }

    if (fxResult.status === 'fulfilled' && fxResult.value.result === 'success') {
        const usdPerTry = fxResult.value.rates?.USD
        const eurPerTry = fxResult.value.rates?.EUR
        const gbpPerTry = fxResult.value.rates?.GBP

        if (usdPerTry && eurPerTry && gbpPerTry) {
            rates.USD = +(1 / usdPerTry).toFixed(4)
            rates.EUR = +(1 / eurPerTry).toFixed(4)
            rates.GBP = +(1 / gbpPerTry).toFixed(4)
        }
    }

    if (cryptoResult.status === 'fulfilled') {
        const btc = cryptoResult.value.bitcoin?.usd
        const eth = cryptoResult.value.ethereum?.usd

        if (typeof btc === 'number' && Number.isFinite(btc)) {
            rates.BTC = btc
        }
        if (typeof eth === 'number' && Number.isFinite(eth)) {
            rates.ETH = eth
        }
    }

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
