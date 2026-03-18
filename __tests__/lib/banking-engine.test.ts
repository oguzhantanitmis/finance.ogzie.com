import { describe, it, expect } from 'vitest'
import { calculateAccumulatedInterest, calculateMinPayment, calculateLoanSchedule, TAX_RATES } from '@/lib/banking-engine'

describe('calculateAccumulatedInterest', () => {
    it('10000 TL, %3.5 aylık faiz, 30 gün → doğru sonuç', () => {
        const result = calculateAccumulatedInterest(10000, 3.5, 30)
        // interest = (10000 * 3.5 * 30) / 3000 = 350
        expect(result.interest).toBe(350)
        // tax = 350 * (0.15 + 0.15) = 105
        expect(result.tax).toBe(105)
        expect(result.total).toBe(455)
    })

    it('0 TL anapara → 0 faiz', () => {
        const result = calculateAccumulatedInterest(0, 3.5, 30)
        expect(result.interest).toBe(0)
        expect(result.tax).toBe(0)
        expect(result.total).toBe(0)
    })

    it('0 gün → 0 faiz', () => {
        const result = calculateAccumulatedInterest(10000, 3.5, 0)
        expect(result.interest).toBe(0)
        expect(result.total).toBe(0)
    })

    it('15 gün → yarım ay faiz', () => {
        const result = calculateAccumulatedInterest(10000, 3.5, 15)
        // interest = (10000 * 3.5 * 15) / 3000 = 175
        expect(result.interest).toBe(175)
    })

    it('küçük tutar hassasiyeti (0.01 TL)', () => {
        const result = calculateAccumulatedInterest(100, 2.0, 1)
        // interest = (100 * 2.0 * 1) / 3000 = 0.0666...
        expect(result.interest).toBeCloseTo(0.07, 2)
    })

    it('yüksek tutar (1M TL)', () => {
        const result = calculateAccumulatedInterest(1000000, 4.0, 30)
        // interest = (1M * 4 * 30) / 3000 = 40000
        expect(result.interest).toBe(40000)
    })
})

describe('calculateMinPayment', () => {
    it('limit <= 50K → %20 oran', () => {
        expect(calculateMinPayment(30000, 10000)).toBe(2000) // 10000 * 0.20
        expect(calculateMinPayment(50000, 25000)).toBe(5000) // 25000 * 0.20
    })

    it('limit > 50K → %40 oran', () => {
        expect(calculateMinPayment(100000, 50000)).toBe(20000) // 50000 * 0.40
        expect(calculateMinPayment(50001, 10000)).toBe(4000) // 10000 * 0.40
    })

    it('0 borç → 0 asgari ödeme', () => {
        expect(calculateMinPayment(50000, 0)).toBe(0)
    })

    it('sınır değer: tam 50K limit', () => {
        const result = calculateMinPayment(50000, 10000)
        expect(result).toBe(2000) // %20
    })

    it('sınır değer: 50001 TL limit', () => {
        const result = calculateMinPayment(50001, 10000)
        expect(result).toBe(4000) // %40
    })
})

describe('calculateLoanSchedule', () => {
    it('faiz 0 → eşit taksitler, toplam = anapara', () => {
        const result = calculateLoanSchedule(12000, 0, 12)
        expect(result.monthlyPayment).toBe(1000)
        expect(result.totalPayment).toBe(12000)
        expect(result.plan).toHaveLength(12)
        expect(result.plan[0].principal).toBe(1000)
        expect(result.plan[0].interest).toBe(0)
    })

    it('faizli kredi → toplam ödeme > anapara', () => {
        const result = calculateLoanSchedule(100000, 2.5, 12)
        expect(result.totalPayment).toBeGreaterThan(100000)
        expect(result.plan).toHaveLength(12)
        expect(result.monthlyPayment).toBeGreaterThan(0)
    })

    it('son taksit sonrası kalan borç ~0', () => {
        const result = calculateLoanSchedule(50000, 3.0, 6)
        const lastItem = result.plan[result.plan.length - 1]
        expect(Math.abs(lastItem.remainingPrincipal)).toBeLessThan(1) // < 1 TL tolerans
    })

    it('tek taksit', () => {
        const result = calculateLoanSchedule(10000, 0, 1)
        expect(result.plan).toHaveLength(1)
        expect(result.plan[0].principal).toBe(10000)
    })

    it('taksit planında anapara toplamı ~ anapara', () => {
        const result = calculateLoanSchedule(60000, 2.0, 6)
        const totalPrincipalPaid = result.plan.reduce((s, i) => s + i.principal, 0)
        expect(totalPrincipalPaid).toBeCloseTo(60000, 0)
    })
})

describe('TAX_RATES', () => {
    it('sabitler doğru', () => {
        expect(TAX_RATES.KKDF).toBe(0.15)
        expect(TAX_RATES.BSMV).toBe(0.15)
    })
})
