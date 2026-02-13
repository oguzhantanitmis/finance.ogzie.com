// Basit Mock Data Servisi
// İleride burası TCMB veya başka bir API'ye bağlanabilir.

export interface MarketRates {
    USD: number
    EUR: number
    GBP: number
    GA: number // Gram Altın
    BTC: number
    ETH: number
}

export async function getMarketRates(): Promise<MarketRates> {
    // Simüle edilmiş veriler (API çağrısı yerine)
    // Gerçek hayatta burası `fetch('https://api.vis.com/rates')` olur.

    // Rastgele hafif değişim simülasyonu
    const randomF = (base: number) => base + (Math.random() * 0.5 - 0.25)

    return {
        USD: randomF(32.85),
        EUR: randomF(35.40),
        GBP: randomF(41.50),
        GA: randomF(2450), // 2450 TL
        BTC: randomF(68500), // USD
        ETH: randomF(3500)   // USD
    }
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
