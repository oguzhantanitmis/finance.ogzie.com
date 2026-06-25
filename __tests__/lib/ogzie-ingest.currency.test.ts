import { describe, it, expect } from 'vitest'

import { calculateAssetValue, type MarketRates } from '@/lib/market-data'

// Ingest route'unun para/tip mantığını saf fonksiyonlarla aynalar. Route'taki
// dönüşüm `calculateAssetValue` + cents/100 + kur-geçerlilik kontrolü üzerinden
// işler; burada bu çekirdek kuralları sözleşmeye göre doğrularız.

const RATES: MarketRates = {
    USD: 32,
    EUR: 35,
    GBP: 41,
    GA: 2500,
    BTC: 0,
    ETH: 0,
    source: 'TEST',
    updatedAt: new Date('2026-06-25T00:00:00.000Z'),
    rateDate: new Date('2026-06-25T00:00:00.000Z'),
}

/** Route'taki amountTRY türetmesinin saf kopyası (test odaklı). */
function toAmountTRY(amountCents: number, currency: string, rates: MarketRates) {
    const amount = amountCents / 100
    const cur = currency.toUpperCase()
    if (cur === 'TRY') return { amount: amount, amountTRY: amount, rateUsed: 1 }
    const amountTRY = calculateAssetValue(amount, 'FIAT', cur, rates)
    const rateUsed = amount !== 0 ? amountTRY / amount : 0
    return { amount, amountTRY, rateUsed }
}

/** Route'un reddetme koşulu. */
function rejected(amountTRY: number, rateUsed: number) {
    return !Number.isFinite(amountTRY) || amountTRY <= 0 || !Number.isFinite(rateUsed) || rateUsed <= 0
}

describe('ogzie ingest — para dönüşümü', () => {
    it('cents/100 ile tutarı türetir', () => {
        const { amount } = toAmountTRY(12345, 'TRY', RATES)
        expect(amount).toBe(123.45)
    })

    it('TRY çevirmez (kur uygulanmaz, rateUsed=1)', () => {
        const r = toAmountTRY(100000, 'TRY', RATES)
        expect(r.amountTRY).toBe(1000)
        expect(r.rateUsed).toBe(1)
        expect(rejected(r.amountTRY, r.rateUsed)).toBe(false)
    })

    it('USD → amount * rates.USD', () => {
        // 50.00 USD * 32 = 1600 TRY
        const r = toAmountTRY(5000, 'USD', RATES)
        expect(r.amountTRY).toBeCloseTo(1600, 6)
        expect(r.rateUsed).toBeCloseTo(32, 6)
        expect(rejected(r.amountTRY, r.rateUsed)).toBe(false)
    })

    it('EUR → amount * rates.EUR', () => {
        const r = toAmountTRY(10000, 'EUR', RATES) // 100 EUR * 35
        expect(r.amountTRY).toBeCloseTo(3500, 6)
    })

    it('küçük harf currency normalize edilir (usd)', () => {
        const r = toAmountTRY(5000, 'usd', RATES)
        expect(r.amountTRY).toBeCloseTo(1600, 6)
    })

    it('rate=0 → reject (kur yok)', () => {
        const zero: MarketRates = { ...RATES, USD: 0 }
        const r = toAmountTRY(5000, 'USD', zero)
        // calculateAssetValue USD=0 → 0 TRY → reddedilmeli
        expect(rejected(r.amountTRY, r.rateUsed)).toBe(true)
    })

    it('bilinmeyen currency calculateAssetValue tarafından çevrilmez → rateUsed=1 (kabul)', () => {
        // calculateAssetValue bilinmeyen tipte amount'u döndürür → rateUsed=1.
        // (Sözleşme TRY/USD/EUR/... bekler; defansif davranış.)
        const r = toAmountTRY(5000, 'ZZZ', RATES)
        expect(r.rateUsed).toBeCloseTo(1, 6)
        expect(rejected(r.amountTRY, r.rateUsed)).toBe(false)
    })
})

describe('ogzie ingest — tip eşleme', () => {
    // Route'taki mapLedgerType ile aynı kurallar.
    function mapLedgerType(assetType: string, direction: string): 'EXPENSE' | 'COLLECTION' | null {
        if (assetType === 'domain') return 'EXPENSE'
        if (assetType === 'service' && direction === 'in') return 'COLLECTION'
        if (direction === 'out') return 'EXPENSE'
        return null
    }

    it('domain → EXPENSE (yön ne olursa olsun)', () => {
        expect(mapLedgerType('domain', 'out')).toBe('EXPENSE')
        expect(mapLedgerType('domain', 'in')).toBe('EXPENSE')
    })

    it('service + in → COLLECTION', () => {
        expect(mapLedgerType('service', 'in')).toBe('COLLECTION')
    })

    it('service + out → EXPENSE', () => {
        expect(mapLedgerType('service', 'out')).toBe('EXPENSE')
    })
})
