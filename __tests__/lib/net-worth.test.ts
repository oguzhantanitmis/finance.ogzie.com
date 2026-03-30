import { describe, it, expect } from 'vitest'
import { calculateNetWorth } from '@/lib/banking-engine'

describe('calculateNetWorth', () => {
    it('sadece nakit varlık', () => {
        const result = calculateNetWorth(
            [{ amount: 50000, unitPrice: null, currency: 'TRY', type: 'CASH' }],
            []
        )
        expect(result.totalAssets).toBe(50000)
        expect(result.totalDebts).toBe(0)
        expect(result.netWorth).toBe(50000)
    })

    it('banka hesabı', () => {
        const result = calculateNetWorth(
            [{ amount: 30000, unitPrice: null, currency: 'TRY', type: 'BANK' }],
            []
        )
        expect(result.totalAssets).toBe(30000)
    })

    it('borç varsa net worth düşer', () => {
        const result = calculateNetWorth(
            [{ amount: 100000, unitPrice: null, currency: 'TRY', type: 'BANK' }],
            [{ remainingBalance: 30000 }, { remainingBalance: 20000 }]
        )
        expect(result.totalDebts).toBe(50000)
        expect(result.netWorth).toBe(50000)
    })

    it('altın varlığı: unitPrice ile hesaplanır', () => {
        const result = calculateNetWorth(
            [{ amount: 10, unitPrice: 2500, currency: 'TRY', type: 'GOLD' }],
            []
        )
        // 10 gram * 2500 TL
        expect(result.totalAssets).toBe(25000)
    })

    it('altın varlığı: unitPrice yoksa varsayılan kullanılır', () => {
        const result = calculateNetWorth(
            [{ amount: 1, unitPrice: null, currency: 'TRY', type: 'GOLD' }],
            []
        )
        // Varsayılan GOLD_PRICE = 2450
        expect(result.totalAssets).toBe(2450)
    })

    it('döviz varlığı (USD)', () => {
        const result = calculateNetWorth(
            [{ amount: 1000, unitPrice: null, currency: 'USD', type: 'FX' }],
            []
        )
        // 1000 * 32.50 (mock rate)
        expect(result.totalAssets).toBe(32500)
    })

    it('döviz varlığı (EUR)', () => {
        const result = calculateNetWorth(
            [{ amount: 500, unitPrice: null, currency: 'EUR', type: 'FX' }],
            []
        )
        // 500 * 35.10
        expect(result.totalAssets).toBe(17550)
    })

    it('çoklu varlık + borç', () => {
        const result = calculateNetWorth(
            [
                { amount: 50000, unitPrice: null, currency: 'TRY', type: 'BANK' },
                { amount: 5, unitPrice: 2500, currency: 'TRY', type: 'GOLD' },
                { amount: 500, unitPrice: null, currency: 'USD', type: 'FX' },
            ],
            [{ remainingBalance: 25000 }]
        )
        // 50000 + 12500 + 16250 = 78750
        expect(result.totalAssets).toBe(78750)
        expect(result.totalDebts).toBe(25000)
        expect(result.netWorth).toBe(53750)
    })

    it('boş varlık ve borç → 0', () => {
        const result = calculateNetWorth([], [])
        expect(result.totalAssets).toBe(0)
        expect(result.totalDebts).toBe(0)
        expect(result.netWorth).toBe(0)
    })

    it('negatif net worth (borç > varlık)', () => {
        const result = calculateNetWorth(
            [{ amount: 10000, unitPrice: null, currency: 'TRY', type: 'CASH' }],
            [{ remainingBalance: 50000 }]
        )
        expect(result.netWorth).toBe(-40000)
    })
})

describe('formatNumber (utils)', () => {
    // Extra tests for utils.formatNumber
    it('formatNumber çalışır', async () => {
        const { formatNumber } = await import('@/lib/utils')
        const result = formatNumber(1234.567)
        expect(result).toContain('1')
        expect(result).toContain('234')
    })

    it('formatCurrency TL alias', async () => {
        const { formatCurrency } = await import('@/lib/utils')
        // TL → TRY dönüşümü
        const result = formatCurrency(100, 'TL')
        expect(result).toContain('100')
    })

    it('formatCurrency USD', async () => {
        const { formatCurrency } = await import('@/lib/utils')
        const result = formatCurrency(50, 'USD')
        expect(result).toBeDefined()
    })
})
